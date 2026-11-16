import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectMissingCandidates } from '../scripts/verify-streampick-tmdb.mjs';

test('TV season premiere date and KR provider are recorded as hints only', async () => {
  const request = async (path) => {
    if (path.endsWith('/watch/providers')) return { results: { KR: { flatrate: [{ provider_name: 'TVING' }] } } };
    if (path.includes('/season/')) return { air_date: '2026-11-09', episodes: [{ episode_number: 1, air_date: '2026-11-09' }] };
    return { name: '유일무이 로맨스', first_air_date: '2026-11-09' };
  };
  const report = await inspectMissingCandidates([{ contentId: 'tmdb-tv-313738', title: '유일무이 로맨스',
    platform: 'tving', seasonNumber: 1, date: '2026-11-09' }], request);
  assert.equal(report.summary.date_and_kr_provider_hint, 1);
  assert.equal(report.rows[0].officialKoreanPremiereConfirmed, false);
  assert.equal(report.rows[0].publishingAllowed, false);
});

test('date matched with no KR provider remains discoverable and unpublishable', async () => {
  const request = async (path) => path.endsWith('/watch/providers') ? { results: {} } : { release_date: '2026-11-04', title: '오버액션 갱' };
  const report = await inspectMissingCandidates([{ contentId: 'tmdb-movie-1630420', title: '오버액션 갱',
    platform: 'netflix', date: '2026-11-04' }], request);
  assert.equal(report.rows[0].status, 'date_hint_only');
  assert.equal(report.publishingAllowed, false);
});

test('Korean KBS premiere with wavve does not disappear when Netflix is absent from TMDB', async () => {
  const request=async (path) => {
    if(path.endsWith('/watch/providers'))return {results:{KR:{flatrate:[{provider_name:'wavve'}]}}};
    if(path.includes('/season/'))return {air_date:'2026-11-14',episodes:[{episode_number:1,air_date:'2026-11-14'}]};
    return {name:'문무',first_air_date:'2026-11-14',origin_country:['KR'],networks:[{name:'KBS2'}]};
  };
  const report=await inspectMissingCandidates([{contentId:'tmdb-tv-301354',title:'문무',platform:'netflix',seasonNumber:1,date:'2026-11-14'}],request);
  assert.equal(report.rows[0].status,'korean_origin_provider_unlisted');
  assert.deepEqual(report.rows[0].broadcastNetworks,['KBS2']);
  assert.deepEqual(report.rows[0].otherKoreanProviders,['wavve']);
  assert.equal(report.rows[0].krProviderMatched,false);
  assert.equal(report.rows[0].publishingAllowed,false);
});


test('provider on older seasons is not inherited by a new season', async () => {
  const request = async (path) => {
    if (path.includes('/season/3/watch/providers')) return { results: { KR: { flatrate: [{ provider_name: 'Disney Plus' }] } } };
    if (path.endsWith('/watch/providers')) return { results: { KR: { flatrate: [{ provider_name: 'Netflix' }, { provider_name: 'Disney Plus' }] } } };
    if (path.includes('/season/')) return { air_date: '2026-11-20', episodes: [{ episode_number: 1, air_date: '2026-11-20' }] };
    return { name: 'Synthetic season split' };
  };
  const r = await inspectMissingCandidates([{ contentId: 'tmdb-tv-12', title: 'Synthetic season split', platform: 'netflix', seasonNumber: 3, date: '2026-11-20' }], request);
  assert.equal(r.rows[0].krProviderMatched, false);
  assert.equal(r.rows[0].providerScope, 'season');
  assert.deepEqual(r.rows[0].seriesKrProviderNames, ['Netflix', 'Disney Plus']);
  assert.deepEqual(r.rows[0].krProviderNames, ['Disney Plus']);
});

test('failed season provider request stays unknown even when series has provider', async () => {
  const request = async (path) => {
    if (path.includes('/season/2/watch/providers')) throw new Error('synthetic timeout');
    if (path.endsWith('/watch/providers')) return { results: { KR: { flatrate: [{ provider_name: 'Netflix' }] } } };
    if (path.includes('/season/')) return { air_date: '2026-11-20', episodes: [] };
    return { name: 'Synthetic' };
  };
  const r = await inspectMissingCandidates([{ contentId: 'tmdb-tv-12', title: 'Synthetic', platform: 'netflix', seasonNumber: 2, date: '2026-11-20' }], request);
  assert.equal(r.rows[0].providerLookupStatus, 'lookup_failed');
  assert.equal(r.rows[0].krProviderMatched, false);
  assert.ok(r.rows[0].errors.some(x => x.startsWith('season_providers:')));
});
