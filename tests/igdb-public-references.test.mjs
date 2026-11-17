import test from 'node:test';
import assert from 'node:assert/strict';
import { comparePublicReferences, validateQueue, runReferenceAudit } from '../scripts/audit-igdb-public-references.mjs';

const a='11111111-1111-4111-8111-111111111111';
const b='22222222-2222-4222-8222-222222222222';
const row={ originalReleaseId:'11', variantKey:'world-6', publicEventId:a,
  possibleOtherPublicEventIds:[b], candidateReleaseIds:['22'], storedDate:'2026-11-03',
  market:'WORLD', originalSourceRegion:null, proposedDisposition:'hold_for_manual_review',
  automaticAliasAllowed:false, automaticMergeAllowed:false, automaticUnpublishAllowed:false,
  databaseMutations:0 };
const queue={kind:'igdb-source-review-queue', databaseMutations:0,publishingAllowed:false,
  requiresHumanReview:true,total:1,rows:[row]};
const snapshot={events:[
  {id:a,local_date:'2026-11-03',release_market:'WORLD',status:'scheduled'},
  {id:b,local_date:'2026-11-10',release_market:'WORLD',status:'scheduled'},
],sources:[
  {event_id:a,external_id:'11',variant_key:'world-6',source_release_region:null},
  {event_id:b,external_id:'22',variant_key:'world-6',source_release_region:8},
],favorites:[{event_id:a,count:2},{event_id:b,count:3}]};

test('two published IDs and favorites remain separate review targets',()=>{
  const r=comparePublicReferences(queue,snapshot);
  assert.equal(r.checked,1);assert.equal(r.originalFavoriteReferences,2);
  assert.equal(r.competingFavoriteReferences,3);assert.equal(r.discrepancies,0);
  assert.equal(r.rows[0].originalBindingMatches,true);
  assert.equal(r.rows[0].possibleOtherEvents[0].eventId,b);
  assert.equal(r.rows[0].aliasApproved,false);
  assert.equal(r.databaseMutations,0);
});
test('missing original or changed binding is explicitly flagged',()=>{
  const r=comparePublicReferences(queue,{...snapshot,events:[snapshot.events[1]],sources:[snapshot.sources[1]]});
  assert.deepEqual(r.rows[0].discrepancies,['original_public_event_missing','original_binding_changed']);
});
test('shared public event references are not counted twice',()=>{
  const second={...row,originalReleaseId:'33',variantKey:'world-7'};
  const r=comparePublicReferences({...queue,total:2,rows:[row,second]},snapshot);
  assert.equal(r.originalFavoriteReferences,2);
  assert.equal(r.competingFavoriteReferences,3);
  assert.equal(r.checked,2);
});
test('incomplete queue and duplicate source IDs fail closed',()=>{
  assert.throws(()=>validateQueue({...queue,rows:[row,row],total:2}),/INVALID_REVIEW_QUEUE/);
  assert.throws(()=>validateQueue({...queue,rows:[{...row,automaticMergeAllowed:true}]}),/INVALID_REVIEW_QUEUE/);
  assert.throws(()=>comparePublicReferences(queue,{...snapshot,sources:[...snapshot.sources,{...snapshot.sources[0],event_id:b}]}),/INVALID_DB_SNAPSHOT/);
});
test('read-only transaction and rollback on DB failure',async()=>{
  const statements=[];
  const pool={connect:async()=>({query:async(sql)=>{
    statements.push(sql);if(sql.startsWith('SELECT'))throw Error('db_offline');
    return {rows:[]};},release:()=>statements.push('release')})};
  await assert.rejects(runReferenceAudit(queue,{pool}),/db_offline/);
  assert.equal(statements[0],'BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
  assert.ok(statements.includes('ROLLBACK'));assert.equal(statements.at(-1),'release');
  assert.equal(statements.some(s=>/^\s*(UPDATE|DELETE|INSERT)/i.test(s)),false);
});
