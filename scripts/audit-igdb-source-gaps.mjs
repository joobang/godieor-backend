#!/usr/bin/env node
// Read-only audit of selected missing release IDs. Never rebind events or infer cancellation.
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { atomicReport } from './run-provider-daily.mjs';
const require = createRequire(import.meta.url);
const norm = s => String(s ?? '').normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu,'');
const regions = { WORLD:[1,2,7,8],KR:[9],JP:[5],AU:[3],NZ:[4],CN:[6],BR:[10] };
export function releaseDate(r) {
  if(r.date_format!==0 || !Number.isSafeInteger(r.date))return null;
  const d=new Date(r.date*1000);if(!Number.isFinite(d.getTime()))return null;
  return d.getUTCFullYear()===r.y && d.getUTCMonth()+1===r.m ? d.toISOString().slice(0,10) : null;
}
export function classifyIgdbGaps(old,games,releases,direct,currentBindings=[],complete=true) {
  return old.map(o=>{
    const base={...o,automaticRebindingAllowed:false,databaseMutations:0};
    const g=games.filter(g=>String(g.id)===o.game_id);
    if(g.length!==1)return {...base,status:'game_missing_or_ambiguous'};
    const game=g[0],platform=Number(o.variant_key.split('-').at(-1));
    if(norm(game.name)!==norm(o.title))return {...base,status:'game_title_changed_review',currentTitle:game.name};
    const identity={gameId:game.id,title:game.name,gameType:game.game_type};
    if(game.game_type!==0)return {...base,status:'current_game_outside_main_game',currentGame:identity,originalReleaseStillFound:direct.some(r=>String(r.id)===o.release_id)};
    if(!complete||!Array.isArray(game.release_dates))return {...base,status:'current_release_query_incomplete',currentGame:identity};
    const known=direct.filter(r=>String(r.id)===o.release_id);
    if(known.length){const r=known[0];return {...base,status:known.length===1&&r.game?.id===game.id&&r.platform?.id===platform&&regions[o.release_market]?.includes(r.release_region)?'original_release_found':'original_release_identity_changed',currentGame:identity,observedDate:releaseDate(r)};}
    const candidates=releases.filter(r=>r.game?.id===game.id&&r.platform?.id===platform&&regions[o.release_market]?.includes(r.release_region));
    const claims=candidates.map(r=>({releaseId:r.id,platform:r.platform.id,region:r.release_region,dateFormat:r.date_format,
      date:releaseDate(r),announcedYear:Number.isSafeInteger(r.y)?r.y:null,announcedMonth:Number.isSafeInteger(r.m)?r.m:null,
      listedInGame:game.release_dates.includes(r.id),storedEventIds:currentBindings.filter(b=>b.release_id===String(r.id)&&b.variant_key===o.variant_key).map(b=>b.event_id)}));
    const status=claims.length!==1?'current_release_missing_or_multiple':!claims[0].listedInGame?'current_game_relation_mismatch':claims[0].date?'possible_successor_dated':'possible_successor_partial_or_undated';
    return {...base,status,currentGame:identity,originalReleaseRegion:null,
      reason:'Original numeric release_region was not persisted; a current game/platform match cannot prove an old release ID replacement.',
      possibleDuplicateStoredEvent:claims.some(c=>c.storedEventIds.some(id=>id!==o.event_id)),claims};
  });
}
export async function fetchIgdbRelations(old,request){
  const gameIds=[...new Set(old.map(o=>Number(o.game_id)))];
  const games=await request('games',`fields id,name,game_type,release_dates; where id = (${gameIds.join(',')}); limit 500;`);
  const fields='id,date,game.id,game.name,game.game_type,platform.id,platform.name,release_region,date_format,m,y';
  const direct=[];
  for(let i=0;i<old.length;i+=15)direct.push(...await request('release_dates',`fields ${fields}; where id = (${old.slice(i,i+15).map(o=>o.release_id).join(',')}); limit 500;`));
  const releases=[];let complete=false;
  for(let offset=0;offset<10000;offset+=500){
    const rows=await request('release_dates',`fields ${fields}; where game = (${gameIds.join(',')}); sort id asc; limit 500; offset ${offset};`);
    releases.push(...rows);if(rows.length<500){complete=true;break;}
  }
  return {games,direct,releases,complete};
}
export async function auditIgdbSources(manifest, { prisma,request,checkedAt=new Date().toISOString() }){
  if(!Array.isArray(manifest?.unseen)||!manifest.unseen.length||manifest.unseen.length>500)throw Error('INVALID_GAP_MANIFEST');
  const ids=manifest.unseen.map(r=>r.external_id);
  if(ids.some(id=>typeof id!=='string'||!/^\d+$/.test(id))||new Set(ids).size!==ids.length)throw Error('INVALID_GAP_MANIFEST');
  const sources=await prisma.event_source.findMany({where:{provider_key:'igdb',external_id:{in:ids}},select:{external_id:true,variant_key:true,event_id:true,
    event:{select:{title:true,local_date:true,release_market:true,content_id:true,content:{select:{content_source:{where:{provider_key:'igdb',content_type:'game'},select:{external_id:true}}}}}}}});
  if(sources.length!==ids.length||sources.some(s=>s.event.content?.content_source.length!==1))throw Error('PUBLISHED_BINDINGS_CHANGED');
  const old=sources.map(s=>({release_id:s.external_id,variant_key:s.variant_key,event_id:s.event_id,content_id:s.event.content_id,title:s.event.title,
    date:s.event.local_date?.toISOString().slice(0,10)??null,release_market:s.event.release_market,game_id:s.event.content.content_source[0].external_id}));
  old.sort((a,b)=>a.release_id.localeCompare(b.release_id));
  const observed=await fetchIgdbRelations(old,request);
  const releaseIds=[...new Set(observed.releases.map(r=>String(r.id)))];
  const bindings=await prisma.event_source.findMany({where:{provider_key:'igdb',external_id:{in:releaseIds}},select:{external_id:true,variant_key:true,event_id:true}});
  const rows=classifyIgdbGaps(old,observed.games,observed.releases,observed.direct,bindings.map(b=>({release_id:b.external_id,variant_key:b.variant_key,event_id:b.event_id})),observed.complete);
  const counts=Object.fromEntries([...new Set(rows.map(r=>r.status))].sort().map(s=>[s,rows.filter(r=>r.status===s).length]));
  return {kind:'igdb-source-gap-audit',scope:'selected prior release IDs, not all IGDB records',checkedAt,referenceInputUsed:false,
    manifestSha256:createHash('sha256').update(JSON.stringify(manifest)).digest('hex'),checked:rows.length,
    distinctGames:[...new Set(old.map(o=>o.game_id))].length,gamesFound:observed.games.length,directReleaseIdsFound:observed.direct.length,
    currentReleaseRows:observed.releases.length,currentReleaseQueryComplete:observed.complete,statusCounts:counts,
    possibleDuplicateStoredEvents:rows.filter(r=>r.possibleDuplicateStoredEvent).length,publishingAllowed:false,databaseMutations:0,
    officialSchema:'https://api-docs.igdb.com/#release-date',rows,observations:observed};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  let app;
  try{
    require('reflect-metadata');
    const {NestFactory}=require('@nestjs/core'),{DatabaseModule}=require('../dist/src/database/database.module.js'),{PrismaService}=require('../dist/src/database/prisma.service.js');
    const [input='docs/tasks/evidence/data73/unseen-source.json',output='work/igdb-source-gap-audit.json']=process.argv.slice(2);
    const manifest=JSON.parse(await readFile(input,'utf8'));
    if(!process.env.IGDB_CLIENT_ID||!process.env.IGDB_CLIENT_SECRET)throw Error('IGDB_AUTH_FAILED');
    const tokenResponse=await fetch('https://id.twitch.tv/oauth2/token',{method:'POST',body:new URLSearchParams({client_id:process.env.IGDB_CLIENT_ID??'',client_secret:process.env.IGDB_CLIENT_SECRET??'',grant_type:'client_credentials'}),signal:AbortSignal.timeout(15000)});
    if(!tokenResponse.ok)throw Error('IGDB_AUTH_FAILED');const token=(await tokenResponse.json()).access_token;if(typeof token!=='string'||!token)throw Error('IGDB_AUTH_FAILED');
    const request=async(endpoint,body)=>{await new Promise(r=>setTimeout(r,300));const r=await fetch('https://api.igdb.com/v4/'+endpoint,{method:'POST',headers:{'Client-ID':process.env.IGDB_CLIENT_ID,Authorization:'Bearer '+token,'Content-Type':'text/plain'},body,signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('IGDB_QUERY_FAILED');const rows=await r.json();if(!Array.isArray(rows))throw Error('IGDB_QUERY_FAILED');return rows;};
    app=await NestFactory.createApplicationContext(DatabaseModule,{logger:false,abortOnError:false});
    const result=await auditIgdbSources(manifest,{prisma:app.get(PrismaService),request});await atomicReport(output,result);
    console.log(JSON.stringify({output,checked:result.checked,gamesFound:result.gamesFound,directReleaseIdsFound:result.directReleaseIdsFound,statusCounts:result.statusCounts,possibleDuplicateStoredEvents:result.possibleDuplicateStoredEvents,databaseMutations:0}));process.exitCode=2;
  }catch(e){console.error('IGDB_SOURCE_AUDIT_FAILED:',['INVALID_GAP_MANIFEST','PUBLISHED_BINDINGS_CHANGED','IGDB_AUTH_FAILED','IGDB_QUERY_FAILED'].includes(e.message)?e.message:'AUDIT_FAILED');process.exitCode=1;}finally{await app?.close();}
}
