#!/usr/bin/env node
// Explicit provisional third-party fallback. Never reclassify as official first-premiere evidence.
import 'reflect-metadata';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const require = createRequire(import.meta.url);
const { NestFactory } = require('@nestjs/core');
const { ReviewedOttModule } = require('../dist/src/reviewed-ott/reviewed-ott.module.js');
const { CollectionRepository } = require('../dist/src/collection/collection.repository.js');
const { CollectionService } = require('../dist/src/collection/collection.service.js');
const { PrismaService } = require('../dist/src/database/prisma.service.js');
const { normalize } = require('../dist/src/collection/domain/provider-record.js');
const file = resolve(root, 'data/fallback/streampick-tmdb-20261117.json');
const input = JSON.parse(await readFile(file,'utf8'));
if (input.version !== 1 || input.referenceAuthority !== 'third_party_discovery_only' || input.market !== 'KR' || input.entries?.length !== 22) throw Error('INVALID_FALLBACK_MANIFEST');
const seen = new Set();
const records = input.entries.map(e => {
  if (e.officialKoreanPremiereConfirmed !== false || !['tmdb_season_kr_provider','tmdb_series_kr_provider','tmdb_date_only_no_kr_provider'].includes(e.verification)) throw Error('INVALID_VERIFICATION');
  const key = `${e.platform}:${e.tmdbId}:${e.seasonNumber}`;
  if (seen.has(key)) throw Error('DUPLICATE_FALLBACK_EVENT');
  seen.add(key);
  return normalize({externalId: `tmdb-tv-${e.tmdbId}-s${e.seasonNumber}-${e.platform}-KR`, variantKey: 'premiere',kind:'ott_season_premiere',ottCategory:'series',title:e.title,
   content:{externalId:`tmdb-tv-${e.tmdbId}`,kind:'drama',title:e.title},seasonNumber:e.seasonNumber,status:'scheduled',time:{type:'date_only',value:e.date},market:'KR',venueCountry:null,
   services:[e.platform],devices:[],home:null,away:null,sourceUrl:e.sourceUrl,sourceUpdatedAt:null}, {category:'ott',market:'KR'});
});
const published = process.argv.includes('--publish');
if (process.argv.some(arg=>arg.startsWith('--') && arg!=='--publish')) throw Error('UNKNOWN_FLAG');
const app = await NestFactory.createApplicationContext(ReviewedOttModule,{logger:false,abortOnError:false});
try {
 const repo=app.get(CollectionRepository),db=app.get(PrismaService);
 const provider='ott_fallback';
 const prior=await db.event_source.findMany({where:{provider_key:provider},select:{external_id:true,event_id:true}});
 const before=await db.event.count();
 const adapter={key:provider,name:'Provisional StreamPick+TMDB discovery (unverified Korean premieres)',origin:'provider',scopes:[{category:'ott',market:'KR'}],fetch:async()=>records};
 if (published) {
   // Avoid falsely claiming these as an official curated review. Dedicated source key remains provisional.
   await repo.register([adapter]);
   const outcomes=await new CollectionService(repo,[adapter]).collect('backfill',true);
   if(outcomes.some(o=>o.status!=='succeeded')) throw Error(`FALLBACK_PUBLISH_FAILED:${JSON.stringify(outcomes)}`);
 }
 const after=await db.event.count();
 const stored=await db.event_source.findMany({where:{provider_key:provider,external_id:{in:records.map(r=>r.externalId)}},include:{event:{include:{event_service:true,drama_season:true}}}});
 const verified=stored.filter(s=>{const record=records.find(r=>r.externalId===s.external_id);return s.event.release_market===record.market && s.event.local_date?.toISOString().slice(0,10)===record.time.value && s.event.drama_season?.season_number===record.seasonNumber && s.event.event_service.some(x=>x.service===record.services[0]);});
 console.log(JSON.stringify({mode:published?'publish':'dry_run',manifest:records.length,priorFallbackSources:prior.length,matchingStored:verified.length,dbEventsBefore:before,dbEventsAfter:after,delta:after-before,verification:'provisional_only',officialKoreanPremieresConfirmed:0,excluded:['tmdb-tv-387-s20','tmdb-tv-261102-s6']},null,2));
 if(published && verified.length!==22) process.exitCode=2;
} finally {await app.close();}
