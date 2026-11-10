// All data here is synthetic; it is never published to a real catalog.
require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { prepareCatalogReview, ReviewedCatalogAdapter } = require('../dist/src/reviewed-catalog/reviewed-catalog');
const { CollectionRepository } = require('../dist/src/collection/collection.repository');
const stamp = '2026-11-10T03:00:00Z';
function batch(category='movie') {
  const kind = {movie:'theatrical_release',game:'game_release',epl:'epl_match'}[category];
  const record = {
    externalId:'test-event-1',variantKey:'kr-release',kind,title:'가상 테스트 일정',
    content:category==='epl'?null:{externalId:'test-content-1',kind:category,title:'가상 작품'},
    seasonNumber:null,status:'scheduled',time:{type:'date_only',value:'2027-06-15'},
    market:category==='epl'?null:'KR',venueCountry:null,services:[],
    devices:category==='game'?['pc']:[],
    home:category==='epl'?{externalId:'home',name:'가상 홈팀'}:null,
    away:category==='epl'?{externalId:'away',name:'가상 원정팀'}:null,
    sourceUrl:'https://example.org/official-test',sourceUpdatedAt:null,
  };
  return {version:1,category,market:'KR',records:[{
    record,reviewedBy:'test-reviewer',reviewedAt:stamp,
    evidence:'SYNTHETIC TEST ONLY: not a real official announcement.',
  }]};
}
test('three reviewed categories retain date precision and stable IDs', () => {
  for (const category of ['movie','game','epl']) {
    const parsed = prepareCatalogReview(batch(category));
    assert.equal(parsed.records[0].time.type,'date_only');
    assert.equal(parsed.records[0].time.value,'2027-06-15');
    assert.equal(parsed.records[0].externalId,'test-event-1');
  }
});
test('rejects unreviewed, duplicate, invalid-date and cross-category records', () => {
  const absent=batch(); delete absent.records[0].reviewedBy;
  assert.throws(()=>prepareCatalogReview(absent));
  const duplicate=batch(); duplicate.records.push(structuredClone(duplicate.records[0]));
  assert.throws(()=>prepareCatalogReview(duplicate),/DUPLICATE_SOURCE_KEY/);
  const invalid=batch(); invalid.records[0].record.time.value='2027-02-30';
  assert.throws(()=>prepareCatalogReview(invalid),/INVALID_DATE/);
  const mismatch=batch(); mismatch.records[0].record.kind='game_release';
  assert.throws(()=>prepareCatalogReview(mismatch));
  const url=batch(); url.records[0].record.sourceUrl='http://example.org/';
  assert.throws(()=>prepareCatalogReview(url),/INVALID_SOURCE_URL/);
});
test('preflight runs before returning reviewed rows', async () => {
  const parsed=prepareCatalogReview(batch());
  const calls=[];
  const adapter=new ReviewedCatalogAdapter(parsed,async (provider,records)=>{
    calls.push(provider); assert.equal(records.length,1);
    throw Error('IDENTITY_CHANGED');
  });
  await assert.rejects(adapter.fetch({category:'movie',market:'KR'}),/IDENTITY_CHANGED/);
  assert.deepEqual(calls,['reviewed_movie']);
});
test('protects existing content identity from key reuse', async () => {
  const record=prepareCatalogReview(batch()).records[0];
  const db={event_source:{findUnique:async()=>({event:{kind:record.kind,origin:'provider',release_market:'KR',content_id:'old-id',home_team_id:null,away_team_id:null}})},
    content_source:{findUnique:async()=>({content_id:'different-id'})}};
  const repo=new CollectionRepository(db);
  await assert.rejects(repo.assertReviewedCatalogIdentities('reviewed_movie',[record]),/IDENTITY_CHANGED/);
});
test('protects existing EPL team pairing from key reuse', async () => {
  const record=prepareCatalogReview(batch('epl')).records[0];
  const db={event_source:{findUnique:async()=>({event:{kind:record.kind,origin:'provider',release_market:null,content_id:null,home_team_id:'old-home',away_team_id:'old-away'}})},
    team_source:{findUnique:async({where})=>({team_id:where.provider_key_external_id.external_id==='home'?'new-home':'old-away'})}};
  const repo=new CollectionRepository(db);
  await assert.rejects(repo.assertReviewedCatalogIdentities('reviewed_epl',[record]),/IDENTITY_CHANGED/);
});
