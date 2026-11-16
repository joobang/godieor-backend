import test from 'node:test';
import assert from 'node:assert/strict';
import {upcomingPrograms,collectUpcoming,upcomingLineup} from '../scripts/collect-tving-upcoming.mjs';
const next=(p)=>'<script id="__NEXT_DATA__" type="application/json">'+JSON.stringify({props:{pageProps:p}})+'</script>';
const home=(items=[{code:'P100',title:'가상 신작'}])=>next({bands:[{bandName:'공개 예정 콘텐츠',items}]});
const program=(patch={})=>next({programCode:'P100',programName:'가상 신작',openText:'11월 18일 공개',contentInfo:{code:'E200',program_code:'P100',broad_dt:'20261116',actor:['배우 A','배우 B'],category_name:'드라마'},...patch});
const fetcher=(h=home(),p=program())=>async(url)=>({ok:true,url,text:async()=>url==='https://www.tving.com/'?h:p});
function request({duplicateActor=false,conflict=false}={}){
 return async(path)=>{
  if(path==='/search/tv')return{total_pages:1,results:[{id:9,name:'가상 신작'}]};
  if(path==='/tv/9')return{id:9,name:'가상 신작',seasons:[{season_number:1,air_date:'2026-10-16'}]};
  if(path==='/tv/9/aggregate_credits')return{cast:duplicateActor?[{id:1,name:'배우 A'}]:[{id:1,name:'배우 A'},{id:2,name:'배우 B'}]};
  if(path==='/tv/9/season/1')return{season_number:1,air_date:'2026-10-16',episodes:[{episode_number:1,air_date:conflict?'2026-10-17':'2026-10-16'}]};
  throw Error('unexpected synthetic request');
 };
}
test('upcoming band is required and duplicate program cards do not inflate count',()=>{
 assert.equal(upcomingPrograms(home([{code:'P100',title:'가상 신작'},{code:'P100',title:'가상 신작'}])).length,1);
 assert.throws(()=>upcomingPrograms(next({bands:[]})),/SCOPE_CHANGED/);
});
test('global season date and Korean platform date are both retained without arbitrary month equality',async()=>{
 const r=await collectUpcoming(request(),fetcher());const row=r.rows[0];
 assert.equal(row.status,'new_identity_review_proposal');assert.equal(row.officialPlatformDate,'2026-11-18');
 assert.equal(row.matches[0].tmdbSeasonDate,'2026-10-16');assert.equal(row.matches[0].platformDateOffsetDays,33);
 assert.equal(row.publishingAllowed,false);
});
test('month-only claim is preserved as unresolved and never uses metadata day',async()=>{
 const r=await collectUpcoming(async()=>{throw Error('no TMDB call');},fetcher(home(),program({openText:'11월 공개'})));
 assert.equal(r.rows[0].status,'exact_platform_date_missing');assert.equal(r.rows[0].sourceClaims.length,0);
});
test('duplicate cast names cannot satisfy distinct actor identity gate',async()=>{
 const p=program({contentInfo:{code:'E200',program_code:'P100',broad_dt:'20261116',actor:['배우 A','배우 A'],category_name:'드라마'}});
 const r=await collectUpcoming(request({duplicateActor:true}),fetcher(home(),p));
 assert.equal(r.rows[0].status,'tmdb_identity_unconfirmed');assert.equal(r.newReviewProposals,0);
});
test('alternative official page for same reviewed TMDB event does not create a duplicate proposal',async()=>{
 const known={type:'tv',tmdbId:9,seasonNumber:1,platform:'tving',market:'KR',date:'2026-11-18',sourceUrl:'https://cjnews.cj.net/other/',reviewCandidateId:'synthetic-review',identityVerified:true};
 const r=await collectUpcoming(request(),fetcher(),{knownBindings:[known]});
 assert.equal(r.rows[0].status,'existing_review_identity_alternative_source');assert.equal(r.newReviewProposals,0);
});
test('episode-one disagreement and wrong home/program identity are held',async()=>{
 const r=await collectUpcoming(request({conflict:true}),fetcher());assert.equal(r.newReviewProposals,0);assert.equal(r.rows[0].seasonDateConflicts.length,1);
 const wrong=await collectUpcoming(request(),fetcher(home(),program({programName:'다른 작품'})));
 assert.equal(wrong.errors[0].error,'TVING_HOME_PROGRAM_TITLE_CHANGED');
});

test('complete official batch exports all rows as unapproved staging, including unresolved dates',async()=>{
 const report=await collectUpcoming(request(),fetcher());
 const lineup=upcomingLineup(report,'2026-11-16T00:00:00Z');
 assert.equal(lineup.items[0].date,'2026-11-18');assert.equal(lineup.items[0].premiereConfirmed,false);
 assert.equal(lineup.items[0].seasonNumber,null);
 assert.throws(()=>upcomingLineup({...report,errors:[{error:'timeout'}]},'2026-11-16T00:00:00Z'),/INCOMPLETE/);
});

test('two names for the same TMDB person cannot count as two actors',async()=>{
 const base=request();
 const samePerson=async(path)=>path==='/tv/9/aggregate_credits'?{cast:[{id:1,name:'배우 A',original_name:'배우 B'}]}:base(path);
 const r=await collectUpcoming(samePerson,fetcher());
 assert.equal(r.rows[0].status,'tmdb_identity_unconfirmed');
 assert.equal(r.rows[0].identityDiagnostics[0].matchedPeople.length,1);
});
