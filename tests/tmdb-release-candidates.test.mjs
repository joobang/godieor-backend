import test from 'node:test';
import assert from 'node:assert/strict';
import { collectReleaseCandidates, combineEvidence, mergeCandidateState, refreshOfficialBindings } from '../scripts/collect-tmdb-release-candidates.mjs';

const discovery = { rows: [{ type: 'tv', tmdbId: 100 }], coverage: [{ truncated: false, error: null }] };
const official = { title: 'Synthetic', type: 'tv', tmdbId: 100, seasonNumber: 2, platform: 'netflix', market: 'KR', date: '2026-11-05',
  sourceUrl: 'https://about.netflix.com/ko/news/synthetic', evidence: 'Synthetic first release statement', identityVerified: true, premiereConfirmed: true, sourceRefreshStatus: 'matched' };
function requestFixture({ seasonProviders = ['Disney Plus'], seasonDate = '2026-11-05', firstDate = '2026-11-05', missingProviders = false, oldSeasonOnly = false } = {}) {
  const calls = [];
  const request = async (path) => {
    calls.push(path);
    if (path === '/tv/100') return { id: 100, name: 'Synthetic', first_air_date: '2020-01-01', genres: [],
      seasons: [{ season_number: 0, air_date: '2026-11-01' }, { season_number: 1, air_date: '2020-01-01' },
        ...(oldSeasonOnly ? [] : [{ season_number: 2, air_date: seasonDate }])] };
    if (path === '/tv/100/watch/providers') return { results: { KR: { flatrate: [{ provider_name: 'Netflix' }, { provider_name: 'Disney Plus' }] } } };
    if (path === '/tv/100/season/2') return { season_number: 2, air_date: seasonDate,
      episodes: [{ episode_number: 1, air_date: firstDate }, { episode_number: 2, air_date: '2026-11-12' }] };
    if (path === '/tv/100/season/2/watch/providers') {
      if (missingProviders) throw new Error('synthetic provider timeout');
      return { results: { KR: { flatrate: seasonProviders.map((provider_name) => ({ provider_name })) } } };
    }
    throw new Error('Unexpected synthetic request ' + path);
  };
  return { request, calls };
}

test('monthly discovery inspects new season on an old series, not series first-air date or ordinary episodes', async () => {
  const { request, calls } = requestFixture();
  const r = await collectReleaseCandidates(request, { discovery, months: ['2026-11'] });
  assert.equal(r.errors.length, 0);
  assert.equal(r.rows.length, 2);
  assert.deepEqual(new Set(r.rows.map(x => x.seasonNumber)), new Set([2]));
  assert.equal(r.rows[0].dateHint, '2026-11-05');
  assert.ok(!calls.includes('/tv/100/season/0'));
  assert.ok(!calls.includes('/tv/100/season/1'));
  assert.ok(!r.rows.some(x => x.dateHint === '2026-11-12'));
  assert.equal(r.publishingAllowed, false);
});

test('series platform hint remains discoverable but cannot certify target season availability', async () => {
  const r = await collectReleaseCandidates(requestFixture().request, { discovery });
  const netflix = r.rows.find(x => x.platform === 'netflix');
  assert.equal(netflix.platformEvidence, 'tmdb_series_provider_hint_only');
  assert.equal(netflix.targetSeasonProviderMatched, false);
  assert.equal(netflix.verification, 'tmdb_only_needs_official_check');
  assert.equal(netflix.readyForBatchReview, false);
  assert.equal(r.rows.find(x => x.platform === 'disney_plus').targetSeasonProviderMatched, true);
});

test('official identity seed retains upcoming work with no TMDB provider; dual date check enables batch review only', async () => {
  const empty = { rows: [], coverage: [{ truncated: false, error: null }] };
  const r = await collectReleaseCandidates(requestFixture({ seasonProviders: [] }).request, { discovery: empty, officialBindings: [official] });
  const row = r.rows.find(x => x.platform === 'netflix');
  assert.equal(row.verification, 'official_tmdb_date_match');
  assert.equal(row.readyForBatchReview, true);
  assert.equal(row.publishingAllowed, false);
  assert.deepEqual(row.discoveryPaths, ['official_identity_seed']);
  assert.equal(r.rows.find(x => x.platform === 'disney_plus').readyForBatchReview, false);
});

test('different season first-air and episode-one dates stay conflicting', async () => {
  const r = await collectReleaseCandidates(requestFixture({ firstDate: '2026-11-06' }).request, { discovery, officialBindings: [official] });
  const row = r.rows.find(x => x.platform === 'netflix');
  assert.equal(row.dateHint, null);
  assert.equal(row.tmdbDateConflict, true);
  assert.equal(row.verification, 'official_date_with_tmdb_episode_conflict');
  assert.equal(row.readyForBatchReview, false);
});

test('Korean OTT first date can differ from global TMDB air date without overwriting either', async () => {
  const r = await collectReleaseCandidates(requestFixture().request, { discovery, officialBindings: [{ ...official, date: '2026-11-06' }] });
  const row = r.rows.find(x => x.platform === 'netflix');
  assert.equal(row.dateHint, '2026-11-05');
  assert.equal(row.officialPlatformDate, '2026-11-06');
  assert.equal(row.verification, 'kr_ott_date_differs_from_tmdb_broadcast');
  assert.equal(row.readyForBatchReview, true);
  assert.equal(row.dates.seasonFirstDate, '2026-11-05');
});

test('two contradictory Korean OTT first-release claims block batch review', () => {
  const candidate = { type: 'tv', tmdbId: 100, seasonNumber: 2, platform: 'netflix', dateHint: '2026-11-05' };
  const result = combineEvidence(candidate, [official, { ...official, date: '2026-11-06' }]);
  assert.equal(result.verification, 'official_date_conflict');
  assert.equal(result.readyForBatchReview, false);
});

test('wrong identity, season, country and source cannot validate a candidate', async () => {
  const candidate = { type: 'tv', tmdbId: 100, seasonNumber: 2, platform: 'netflix', dateHint: '2026-11-05' };
  for (const change of [{ tmdbId: 101 }, { seasonNumber: 1 }, { market: 'US' }, { platform: 'tving' },
    { identityVerified: false }, { sourceUrl: 'https://about.netflix.com.evil.invalid/source' }]) {
    assert.equal(combineEvidence(candidate, [{ ...official, ...change }]).readyForBatchReview, false);
  }
});

test('missing provider response is unknown and does not veto explicit official evidence', async () => {
  const r = await collectReleaseCandidates(requestFixture({ missingProviders: true }).request, { discovery, officialBindings: [official] });
  const row = r.rows.find(x => x.platform === 'netflix');
  assert.equal(row.providerLookupStatus, 'lookup_failed');
  assert.equal(row.targetSeasonProviderMatched, false);
  assert.ok(r.errors.some(x => x.scope === 'season_providers'));
  assert.equal(row.readyForBatchReview, true);
});

test('a regular episode in target month is not a season premiere', async () => {
  const r = await collectReleaseCandidates(requestFixture({ oldSeasonOnly: true }).request, { discovery });
  assert.equal(r.rows.length, 0);
});

test('a historical season with KR series provider is investigated without inventing a KR premiere date', async () => {
  const base = requestFixture({ seasonDate: '2025-08-01', firstDate: '2025-08-01' });
  const r = await collectReleaseCandidates(base.request, { discovery, months: ['2026-11'] });
  assert.equal(r.errors.length, 0);
  assert.equal(r.rows.length, 2);
  assert.ok(r.rows.every((row) => row.seasonNumber === 2));
  assert.ok(r.rows.every((row) => row.premiereWindowStatus === 'historical_season_kr_date_unconfirmed'));
  assert.ok(r.rows.every((row) => row.dateHint === null && row.readyForBatchReview === false));
  assert.ok(r.rows.every((row) => row.dates.seasonFirstDate === '2025-08-01'));
  assert.ok(!base.calls.includes('/tv/100/season/1'));
});

test('historical season investigation requires KR provider evidence', async () => {
  const base = requestFixture({ seasonDate: '2025-08-01', firstDate: '2025-08-01' });
  const request = async (path, params) => path === '/tv/100/watch/providers' ? { results: {} } : base.request(path, params);
  const r = await collectReleaseCandidates(request, { discovery, months: ['2026-11'] });
  assert.equal(r.rows.length, 0);
});

test('partial discovery and source errors are preserved instead of reported as empty success', async () => {
  const r = await collectReleaseCandidates(async () => { throw new Error('synthetic timeout'); }, {
    discovery: { rows: discovery.rows, coverage: [{ truncated: true, error: 'page failed' }] } });
  assert.equal(r.discoveryComplete, false);
  assert.equal(r.errors.length, 1);
});

test('repeat staging is idempotent; changed date evidence creates one revision on same stable id', async () => {
  const r = await collectReleaseCandidates(requestFixture().request, { discovery });
  const a = mergeCandidateState(null, r, '2026-11-13T00:00:00Z');
  const b = mergeCandidateState(a.state, r, '2026-11-13T01:00:00Z');
  assert.equal(b.summary.created, 0); assert.equal(b.summary.revised, 0);
  assert.ok(b.state.candidates.every(x => x.revisions.length === 1));
  const changed = structuredClone(r); changed.rows[0].officialPlatformDate = '2026-11-07';
  const c = mergeCandidateState(b.state, changed, '2026-11-13T02:00:00Z');
  assert.equal(c.summary.revised, 1); assert.equal(c.summary.created, 0);
  assert.equal(c.state.candidates[0].id, a.state.candidates[0].id);
  assert.equal(c.state.candidates[0].revisions.length, 2);
});


test('recorded official evidence is retained but not fresh batch-ready without source refresh', () => {
  const row = combineEvidence({ type: 'tv', tmdbId: 100, seasonNumber: 2, platform: 'netflix', dateHint: '2026-11-05' }, [{ ...official, sourceRefreshStatus: 'lookup_failed' }]);
  assert.equal(row.officialPlatformDate, '2026-11-05');
  assert.equal(row.readyForBatchReview, false);
});

test('TVING broadcast date alone is not an explicit OTT release claim', async () => {
  const binding = { ...official, platform: 'tving', sourceUrl: 'https://www.tving.com/contents/P100' };
  const html = (openText) => '<script id="__NEXT_DATA__" type="application/json">' + JSON.stringify({ props: { pageProps: { openText, contentInfo: { code: 'P100', broad_dt: '20261105' } } } }) + '</script>';
  const request = (claim) => async () => ({ ok: true, text: async () => html(claim) });
  assert.equal((await refreshOfficialBindings([binding], request('')))[0].sourceRefreshStatus, 'explicit_ott_date_not_found');
  assert.equal((await refreshOfficialBindings([binding], request('시즌 2, 11월 5일 공개')))[0].sourceRefreshStatus, 'matched');
  assert.equal((await refreshOfficialBindings([binding], request('시즌 1, 11월 5일 공개')))[0].sourceRefreshStatus, 'date_or_season_conflict');
});


test('refresh observation timestamp alone does not create a candidate revision', () => {
  const row = { id: 'synthetic-stable-id', officialEvidence: [{ sourceCheckedAt: '2026-11-13T00:00:00Z', sourceRefreshStatus: 'matched' }] };
  const a = mergeCandidateState(null, { rows: [row] }, '2026-11-13T00:00:00Z');
  const changed = structuredClone(row); changed.officialEvidence[0].sourceCheckedAt = '2026-11-13T01:00:00Z';
  assert.equal(mergeCandidateState(a.state, { rows: [changed] }, '2026-11-13T01:00:00Z').summary.revised, 0);
});


test('same release text on another TVING program cannot refresh an identity binding', async () => {
  const binding = { ...official, platform: 'tving', sourceUrl: 'https://www.tving.com/contents/P100' };
  const html = '<script id="__NEXT_DATA__" type="application/json">' + JSON.stringify({ props: { pageProps: {
    openText: '시즌 2, 11월 5일 공개', contentInfo: { code: 'P999', broad_dt: '20261105' } } } }) + '</script>';
  const result = await refreshOfficialBindings([binding], async () => ({ ok: true, text: async () => html }));
  assert.equal(result[0].sourceRefreshStatus, 'lookup_failed');
  assert.equal(result[0].sourceRefreshError, 'TVING_IDENTITY_CHANGED');
});

test('confirmed animation scope keeps explicit medium hints while still requiring fresh OTT evidence',async()=>{
 const base=requestFixture(),request=async(path,params)=>{const r=await base.request(path,params);return path==='/tv/100'?{...r,genres:[{id:16,name:'Synthetic animation'}]}:r;};
 const unknown=await collectReleaseCandidates(request,{discovery,months:['2026-11']});
 assert.equal(unknown.rows[0].scopeHold,null);assert.equal(unknown.rows[0].suggestedContentKind,'animation');assert.equal(unknown.rows[0].suggestedAnimationFormat,'series');
 assert.equal(unknown.rows[0].readyForBatchReview,false);assert.equal(unknown.rows[0].publishingAllowed,false);
 const known=await collectReleaseCandidates(request,{discovery,months:['2026-11'],officialBindings:[official]});
 assert.equal(known.rows.find(x=>x.platform==='netflix').readyForBatchReview,true);
});
