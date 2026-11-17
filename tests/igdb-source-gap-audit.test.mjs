import test from'node:test';import assert from'node:assert/strict';
import{classifyIgdbGaps,releaseDate,fetchIgdbRelations,auditIgdbSources}from'../scripts/audit-igdb-source-gaps.mjs';
const old={release_id:'11',variant_key:'world-6',event_id:'old-id',content_id:'old-content',title:'Synthetic Game',date:'2026-11-01',release_market:'WORLD',game_id:'100'};
const game={id:100,name:'Synthetic Game',game_type:0,release_dates:[22]};
const release={id:22,date:Date.parse('2026-11-20')/1000,game:{id:100},platform:{id:6},release_region:8,date_format:0,y:2026,m:11};
const classify=(g=[game],r=[release],direct=[],bindings=[])=>classifyIgdbGaps([old],g,r,direct,bindings)[0];
test('same game/platform successor remains review-only when original release region is missing',()=>{
 const r=classify(undefined,undefined,[],[{release_id:'22',variant_key:'world-6',event_id:'new-id'}]);assert.equal(r.status,'possible_successor_dated');assert.equal(r.automaticRebindingAllowed,false);assert.equal(r.databaseMutations,0);assert.equal(r.possibleDuplicateStoredEvent,true);assert.equal(r.claims[0].date,'2026-11-20');
});
test('partial dates and TBD never become fake calendar days',()=>{
 const r=classify(undefined,[{...release,date_format:3,date:Date.parse('2027-03-31')/1000,y:2027,m:3}]);assert.equal(r.status,'possible_successor_partial_or_undated');assert.equal(r.claims[0].date,null);assert.equal(releaseDate({...release,y:2027}),null);
});
test('other platform, territory, title and duplicate claims cannot prove replacement',()=>{
 assert.equal(classify(undefined,[{...release,platform:{id:48}}]).status,'current_release_missing_or_multiple');
 assert.equal(classify(undefined,[{...release,release_region:9}]).status,'current_release_missing_or_multiple');
 assert.equal(classify([{...game,name:'Other Game'}]).status,'game_title_changed_review');
 assert.equal(classify(undefined,[release,{...release,id:23}]).status,'current_release_missing_or_multiple');
});
test('game reclassification is explicit and original release can still exist',()=>{
 const r=classify([{...game,game_type:14}],undefined,[{...release,id:11}]);assert.equal(r.status,'current_game_outside_main_game');assert.equal(r.originalReleaseStillFound,true);
});
test('missing relations or incomplete pages cannot be called verified',()=>{
 assert.equal(classify([{...game,release_dates:[]}]).status,'current_game_relation_mismatch');
 assert.equal(classifyIgdbGaps([old],[game],[release],[],[],false)[0].status,'current_release_query_incomplete');
});
test('release relation fetch exhausts pages and directly rechecks original IDs',async()=>{
 const calls=[];let pages=0;const r=await fetchIgdbRelations([old],async(endpoint,q)=>{calls.push(q);if(endpoint==='games')return[game];if(q.includes('where id'))return[];return++pages===1?Array.from({length:500},(_,i)=>({...release,id:i+1})):[];});assert.equal(r.complete,true);assert.equal(pages,2);assert.ok(calls.some(q=>q.includes('offset 500')));assert.ok(calls.some(q=>q.includes('where id = (11)')));
});
test('invalid selected IDs fail before database or network access',async()=>{
 for(const manifest of [{unseen:[]},{unseen:[{external_id:'1;drop'}]},{unseen:[{external_id:'1'},{external_id:'1'}]}])await assert.rejects(auditIgdbSources(manifest,{prisma:null,request:()=>{throw Error('must not call');}}),/MANIFEST/);
});
