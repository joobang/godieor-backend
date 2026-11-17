#!/usr/bin/env node
// Real source replay against an archived unreviewed state in disposable PostgreSQL.
// The historical baseline and fresh snapshot are explicit inputs, never the product queue.
import 'reflect-metadata';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes, createHash } from 'node:crypto';
import { readFile, writeFile, mkdtemp, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { reviewNetflixPremieres } from './review-netflix-first-premieres.mjs';
import { bridgeNetflixLineup } from './bridge-netflix-lineup.mjs';
import { completeReviewedMappings } from './complete-reviewed-mappings.mjs';
const require = createRequire(import.meta.url);
const { NestFactory } = require('@nestjs/core');
const load = p => require(`../dist/src/${p}.js`);
const { ReviewedOttModule }=load('reviewed-ott/reviewed-ott.module');
const { ReviewedPublishService }=load('reviewed-ott/reviewed-publish.service');
const { ReviewedMappingRepository }=load('reviewed-ott/reviewed-mapping.repository');
const { ReviewedOttAdapter }=load('reviewed-ott/reviewed-ott.adapter');
const { CollectionRepository }=load('collection/collection.repository');
const { CollectionService }=load('collection/collection.service');
const { OttCandidatesRepository }=load('ott-candidates/ott-candidates.repository');
const { PrismaService }=load('database/prisma.service');
const { AppModule }=load('app.module');
const { configureHttp }=load('common/configure-http');
const [baselineState,baselineMappings,snapshotFile,output] = process.argv.slice(2);
if(!output) throw Error('Usage: node check-netflix-premiere-db.mjs archived-state archived-mappings fresh-netflix-snapshot output');
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const baseline=await read(baselineState), mappings=await read(baselineMappings), snapshot=await read(snapshotFile);
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const directory=await mkdtemp(join(tmpdir(),'godieor-data72-replay-'));
const container=`godieor-data72-${randomBytes(5).toString('hex')}`,password=randomBytes(24).toString('hex');
const pinned=/image:\s+(\S+)/.exec(await readFile('compose.yaml','utf8'))[1];
const image=process.env.GODIEOR_TEST_POSTGRES_IMAGE??pinned;
const docker=args=>execFileSync('docker',args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],env:{...process.env,POSTGRES_PASSWORD:password}}).trim();
let created=false,app,api;
try{
 await writeFile(join(directory,'state.json'),JSON.stringify(baseline));
 const mappingFile=join(directory,'mappings.json');await writeFile(mappingFile,JSON.stringify(mappings));
 const repository=new OttCandidatesRepository(directory);
 // No per-work allowlist or reference title list. Stage the complete fresh input.
 await bridgeNetflixLineup(snapshotFile,directory);
 const review=await reviewNetflixPremieres(snapshot,{directory,apply:true});
 const completed=completeReviewedMappings(await repository.readState(),mappings);
 assert.ok(completed.added>0,'archived baseline must contain at least one newly verifiable real source item');
 docker(['run','--pull=never','--rm','-d','--name',container,'-e','POSTGRES_USER=godieor','-e','POSTGRES_DB=godieor_data72','-e','POSTGRES_PASSWORD','-p','127.0.0.1::5432','--tmpfs','/var/lib/postgresql/data',image]);created=true;
 let ready=false;for(let i=0;i<60;i++){try{docker(['exec',container,'pg_isready','-U','godieor','-d','godieor_data72']);ready=true;break;}catch{}await new Promise(r=>setTimeout(r,250));}assert.ok(ready);
 const port=/:(\d+)$/.exec(docker(['port',container,'5432/tcp']))[1];
 process.env.DATABASE_URL=`postgresql://godieor:${password}@127.0.0.1:${port}/godieor_data72`;
 process.env.CURSOR_SIGNING_KEY=randomBytes(32).toString('hex');
 process.env.COLLECTION_SCHEDULE_ENABLED='false';process.env.COLLECTION_INCLUDE_FIXTURE='false';process.env.CATALOG_PROVIDER_ONLY='true';
 execFileSync(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy'],{stdio:'pipe',env:process.env});
 app=await NestFactory.createApplicationContext(ReviewedOttModule,{logger:false,abortOnError:false});
 const publisher=new ReviewedPublishService(repository,app.get(ReviewedMappingRepository),app.get(ReviewedOttAdapter),app.get(CollectionRepository),app.get(CollectionService));
 const prisma=app.get(PrismaService);
 assert.ok((await publisher.publish(mappingFile)).every(r=>r.status==='succeeded'));
 const before=await prisma.event.findMany({orderBy:{id:'asc'}});assert.equal(before.length,mappings.mappings.length);
 await writeFile(mappingFile,JSON.stringify(completed.completed));
 assert.ok((await publisher.publish(mappingFile)).every(r=>r.status==='succeeded'));
 const after=await prisma.event.findMany({orderBy:{id:'asc'}});
 assert.equal(after.length,before.length+completed.added);
 for(const previous of before)assert.deepEqual(after.find(e=>e.id===previous.id),previous);
 const addedKeys=completed.completed.mappings.slice(mappings.mappings.length),state=await repository.readState();
 api=await NestFactory.create(AppModule,{logger:false,abortOnError:false});configureHttp(api);await api.listen(0,'127.0.0.1');
 const checked=[];
 for(const m of addedKeys){
  const candidate=state.candidates.find(c=>c.id===m.candidateId),r=candidate.review.value;
  const original=snapshot.items.find(i=>`netflix-video:${/Netflix videoID (\d+)/.exec(i.evidence)?.[1]}`===candidate.itemKey);
  assert.equal(r.date,original.date);
  const source=await prisma.event_source.findFirst({where:{provider_key:'ott_reviewed',external_id:m.eventKey}});
  const event=after.find(e=>e.id===source.event_id);assert.equal(event.local_date.toISOString().slice(0,10),original.date);assert.equal(event.instant_at,null);
  assert.equal(await prisma.event_service.count({where:{event_id:event.id,service:'netflix'}}),1);
  const response=await fetch(`${await api.getUrl()}/v1/events/${event.id}`);assert.equal(response.status,200);
  const detail=(await response.json()).event;assert.equal(detail.time.date,original.date);assert.equal(detail.time.type,'date_only');assert.ok(detail.services.includes('netflix'));assert.equal(detail.season?.number??null,null);
  checked.push({title:r.title,date:original.date,season:null,status:response.status});
 }
 const changeCount=await prisma.event_change.count();
 const repeat=await reviewNetflixPremieres(snapshot,{directory,apply:true});assert.equal(repeat.newReviews,0);
 assert.equal(completeReviewedMappings(await repository.readState(),completed.completed).added,0);
 await publisher.publish(mappingFile);assert.deepEqual(await prisma.event.findMany({orderBy:{id:'asc'}}),after);assert.equal(await prisma.event_change.count(),changeCount);
 const report={kind:'real-source-archived-baseline-replay',independentApproval:false,observedAt:new Date().toISOString(),disposableDatabase:true,image,pinnedImageUsed:image===pinned,
  baselineStateSha256:sha(baseline),baselineMappingsSha256:sha(mappings),scheduleSha256:sha(snapshot),baselineEvents:before.length,afterNewAutomaticReviews:after.length,newInReplay:completed.added,
  currentProductNewPublications:0,existingRowsPreserved:true,repeatedNewReviews:0,repeatedNewMappings:0,repeatedRowsAndHistoryUnchanged:true,dateOnlyNoInstant:true,checked,
  firstReview:review,repeatStatusCounts:repeat.statusCounts};
 await mkdir(join(output,'..'),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({output,baselineEvents:before.length,newInReplay:completed.added,after:after.length,checkedDetails:checked.length,repeatedNewReviews:0,currentProductNewPublications:0,pinnedImageUsed:image===pinned}));
}finally{await api?.close();await app?.close();if(created)docker(['rm','-f',container]);await rm(directory,{recursive:true,force:true});}
