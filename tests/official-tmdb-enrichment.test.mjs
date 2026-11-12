import test from 'node:test';
import assert from 'node:assert/strict';
import { enrichOfficialLineups } from '../scripts/enrich-official-ott-with-tmdb.mjs';

test('official KR entries drive TMDB lookup regardless of KR watch-provider match', async () => {
  const calls = [];
  const request = async (path) => {
    calls.push(path);
    if (path === '/search/tv') return { results: [{ id: 42, name: '문무' }], total_pages: 1 };
    if (path === '/tv/42') return { name: '문무', first_air_date: '2026-11-14', seasons: [{ season_number: 1 }] };
    if (path === '/tv/42/watch/providers') return { results: { KR: { flatrate: [{ provider_name: 'wavve' }] } } };
    if (path === '/tv/42/season/1') return { air_date: '2026-11-14', episodes: [{ episode_number: 1, air_date: '2026-11-14' }] };
    throw Error('UNEXPECTED:' + path);
  };
  const result = await enrichOfficialLineups([{ platform: 'netflix', sourceUrl: 'https://www.netflix.com/kr', items: [
    { title: '문무', date: '2026-11-14', market: 'KR', seasonNumber: 1, premiereConfirmed: false, evidence: 'test only' },
  ] }], request);
  assert.equal(result.rows[0].tmdb.status, 'tmdb_season_date_match');
  assert.equal(result.rows[0].tmdb.matches[0].krProviderMatched, false);
  assert.equal(result.rows[0].publishEligible, false);
  assert.ok(calls.includes('/tv/42/watch/providers'));
});

test('platform/date distinct and non-Korean or undated entries excluded from dated lookup', async () => {
  const result = await enrichOfficialLineups([
    { platform: 'netflix', sourceUrl: 'https://www.netflix.com/kr', items: [
      { title: '작품', date: '2026-11-11', market: 'KR' },
      { title: '작품', date: null, market: 'KR' },
    ] },
    { platform: 'tving', sourceUrl: 'https://www.tving.com', items: [
      { title: '작품', date: '2026-11-25', market: 'KR' },
      { title: '작품', date: '2026-11-25', market: null },
    ] },
  ]);
  assert.equal(result.total, 2);
  assert.deepEqual(result.rows.map((r) => [r.platform, r.date]), [['netflix', '2026-11-11'], ['tving', '2026-11-25']]);
});
