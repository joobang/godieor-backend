// Hand-authored synthetic cases, independent of collected live output.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { inspectCatalog, readCatalog, applyObservations, reviewNetflixPremieres } from '../scripts/review-netflix-first-premieres.mjs';
import { netflixDiscoveries } from '../scripts/bridge-netflix-lineup.mjs';
const require = createRequire(import.meta.url);
const { merge, candidateId } = require('../dist/src/ott-candidates/domain/candidate.js');
const now = '2026-11-17T01:00:00Z';
const item = { title: '가상 신규 다큐', date: '2026-11-20', market: 'KR', contentKind: 'unknown',seasonNumber:null,
  premiereConfirmed:false,evidence:'Netflix videoID 12345678.' };
const snapshot = { platform:'netflix',sourceUrl:'https://about.netflix.com/ko/new-to-watch',observedAt:now,items:[item] };
const work = { '@type':'Movie',url:'https://www.netflix.com/kr/title/12345678',name:item.title,dateCreated:item.date,genre:'다큐멘터리' };
const page = (changes={}) => ({finalUrl:work.url,html:`<script type="application/ld+json">${JSON.stringify({...work,...changes})}</script>`});
function input() {
 const state={version:2,stage:'candidate-not-published',candidates:[],attempts:{}};
 const discoveries=netflixDiscoveries(snapshot);merge(state,discoveries,now);
 const c=state.candidates[0];
 return {state,row:{...inspectCatalog(item,page()),candidateId:c.id,revision:c.revisions.at(-1).token,videoId:'12345678',title:item.title,date:item.date}};
}
test('fresh same-work first date creates one review without guessing season or instant',()=>{
 const {state,row}=input();assert.equal(applyObservations(state,[row],now)[0].status,'new_review_created');
 const review=structuredClone(state.candidates[0].review);
 assert.equal(review.value.documentaryFormat,'movie');assert.equal(review.value.seasonNumber,null);assert.equal(review.value.localTime,null);
 assert.equal(applyObservations(state,[row],now)[0].status,'existing_review_preserved');assert.deepEqual(state.candidates[0].review,review);
});
test('series first release retains unknown season regardless of season count',()=>{
 const r=inspectCatalog(item,page({'@type':'TVSeries',numberOfSeasons:8,genre:'애니메이션'}));
 assert.equal(r.status,'verified_first_premiere');assert.equal(r.seasonNumber,null);assert.equal(r.animationFormat,'series');
});
test('old first date cannot authorize a newly listed season',()=>{
 assert.equal(inspectCatalog(item,page({dateCreated:'2025-11-20'})).status,'not_series_or_movie_first_date');
 assert.equal(inspectCatalog(item,page({dateCreated:null})).status,'first_date_missing');
 assert.equal(inspectCatalog(item,page({dateCreated:'2026-02-30'})).status,'first_date_missing');
});
test('wrong work, region, format and ambiguous metadata never approve',()=>{
 for(const changes of [{name:'다른 작품'},{url:'https://www.netflix.com/us/title/12345678'},{'@type':'VideoGame'}])
  assert.notEqual(inspectCatalog(item,page(changes)).status,'verified_first_premiere');
 const p=page();p.html+=p.html;assert.equal(inspectCatalog(item,p).status,'work_missing_or_ambiguous');
});
test('games, sports, bonuses and unknown or conflicting classification are held',()=>{
 for(const title of ['가상 보너스 콘텐츠','가상 The Game','WWE 가상']) assert.equal(inspectCatalog({...item,title},page()).status,'excluded_non_premiere');
 for(const genre of ['스포츠',null,['다큐멘터리','애니메이션']]) assert.notEqual(inspectCatalog(item,page({genre})).status,'verified_first_premiere');
});
test('candidate source revision changes during IO reject the review',()=>{
 const {state,row}=input();state.candidates[0].revisions.at(-1).token='a'.repeat(64);
 assert.equal(applyObservations(state,[row],now)[0].status,'candidate_changed_or_missing');assert.equal(state.candidates[0].review,null);
});
test('other source claims and canonical aliases prevent duplicate publication',()=>{
 const {state,row}=input();const alias={...row,candidateId:'b'.repeat(64)};
 assert.equal(applyObservations(state,[row,alias],now)[0].status,'existing_or_ambiguous_identity');
 const other=structuredClone(state.candidates[0]);other.id='b'.repeat(64);other.review={value:{platform:'netflix',title:item.title,evidence:''}};state.candidates.push(other);
 assert.equal(applyObservations(state,[row],now)[0].status,'existing_or_ambiguous_identity');
});
test('only same-host Korean canonical redirect binds a differing video ID',async()=>{
 let n=0;const result=await readCatalog('99999999',async()=>++n===1?new Response(null,{status:301,headers:{location:work.url}}):new Response(page().html));
 assert.equal(inspectCatalog(item,result).status,'verified_first_premiere');
 for(const location of ['https://evil.example/title/12345678','https://www.netflix.com/us/title/12345678'])
  await assert.rejects(readCatalog('99999999',async()=>new Response(null,{status:302,headers:{location}})));
});
test('transient failures retry but rate limits fail without blind retry',async()=>{
 let n=0;await readCatalog('12345678',async()=>++n<3?new Response(null,{status:503}):new Response(page().html),0);assert.equal(n,3);
 n=0;await assert.rejects(readCatalog('12345678',async()=>{n++;return new Response(null,{status:429});},0),/429/);assert.equal(n,1);
});
test('stale source snapshots are rejected before network or transaction',async()=>{
 await assert.rejects(reviewNetflixPremieres({...snapshot,observedAt:'2026-11-16T01:00:00Z'}, {now,months:['2026-11'],fetchImpl:()=>{throw Error('must not fetch');}}),/STALE/);
});
test('read-only preview and actual transaction preserve repeated publication eligibility',async()=>{
 const {state}=input();const repository={readState:async()=>structuredClone(state),transaction:async fn=>fn(state)};
 const opts={now,months:['2026-11'],repository,fetchImpl:async()=>new Response(page().html)};
 const dry=await reviewNetflixPremieres(snapshot,opts);assert.equal(dry.newReviews,1);assert.equal(state.candidates[0].review,null);
 assert.equal((await reviewNetflixPremieres(snapshot,{...opts,apply:true})).newReviews,1);
 assert.equal((await reviewNetflixPremieres(snapshot,{...opts,apply:true})).newReviews,0);
});
test('existing reviews remain frozen but failed current lookup remains an explicit gap',async()=>{
 const {state,row}=input();applyObservations(state,[row],now);
 state.candidates[0].revisions.at(-1).lineupEvidence.date='2026-11-19';
 const before=structuredClone(state.candidates[0].review);
 const repository={readState:async()=>structuredClone(state),transaction:async fn=>fn(state)};
 const result=await reviewNetflixPremieres(snapshot,{now,months:['2026-11'],repository,apply:true,fetchImpl:async()=>new Response(null,{status:404})});
 assert.equal(result.errors,1);assert.equal(result.rows[0].status,'existing_review_preserved');assert.equal(result.rows[0].observationStatus,'lookup_failed');
 assert.deepEqual(state.candidates[0].review,before);
});
test('valid non-padded official dates are normalized without changing calendar day',()=>{
 assert.equal(inspectCatalog({...item,date:'2026-11-06'},page({dateCreated:'2026-11-6'})).status,'verified_first_premiere');
 assert.equal(inspectCatalog(item,page({dateCreated:'2025-4-10'})).status,'not_series_or_movie_first_date');
});
