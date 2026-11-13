import test from 'node:test';
import assert from 'node:assert/strict';
import { disambiguateNetflix } from '../scripts/disambiguate-netflix-tmdb.mjs';
const row = { videoId: 10, sourceUrl: 'https://www.netflix.com/title/10', platform: 'netflix', market: 'KR',
  englishTitle: 'Synthetic Film', title: '가상 영화', date: '2026-11-12', searchYear: 2026,
  officialCast: ['A. Example', 'B Example'], expectedCountry: 'AU', observedFormat: 'movie' };
const input = (r = row) => ({ kind: 'netflix-official-disambiguation-input', rows: [r], asOf: '2026-11-13' });
function request({ cast = ['A Example', 'B Example'], country = 'AU', date = row.date, pages = 1, failCredits = false } = {}) {
  return async (path) => {
    if (path === '/search/movie') return { results: [{ id: 1, title: row.englishTitle }], total_pages: pages };
    if (path.endsWith('/credits')) { if (failCredits) throw new Error('HTTP_503'); return { cast: cast.map((name) => ({ name })) }; }
    return { title: row.englishTitle, production_countries: [{ iso_3166_1: country }], release_date: date };
  };
}
test('same title/date with wrong cast or country cannot confirm an identity', async () => {
  for (const args of [{ cast: ['Someone Else'] }, { country: 'US' }]) {
    const report = await disambiguateNetflix(input(), request(args));
    assert.equal(report.rows[0].status, 'identity_not_confirmed');
    assert.equal(report.rows[0].eligibleForAutomaticPublication, false);
  }
  const report = await disambiguateNetflix(input(), request());
  assert.equal(report.rows[0].status, 'identity_and_date_match');
  assert.equal(report.rows[0].matchedSeason, null);
  assert.equal(report.publishedCountDelta, 0);
});
test('truncation or failed credits keeps an otherwise matching work incomplete', async () => {
  for (const args of [{ pages: 10 }, { failCredits: true }])
    assert.equal((await disambiguateNetflix(input(), request(args), { maxPages: 1 })).rows[0].status, 'lookup_incomplete');
});
test('year-unconstrained fallback retains earlier release without inventing a KR premiere', async () => {
  const calls = [];
  const delegate = request({ date: '2020-01-01' });
  const report = await disambiguateNetflix(input(), async (path, params) => {
    calls.push([path, params]);
    if (params.primary_release_year) return { results: [], total_pages: 0 };
    return delegate(path, params);
  });
  assert.equal(report.rows[0].searches.length, 2);
  assert.equal(report.rows[0].status, 'identity_confirmed_date_differs');
  assert.ok(calls.some(([path, p]) => path === '/search/movie' && !p.primary_release_year));
});
test('two seasons sharing a date remain ambiguous and season zero is ignored', async () => {
  const tv = { ...row, observedFormat: 'series', englishTitle: 'Synthetic Series' };
  const report = await disambiguateNetflix(input(tv), async (path) => {
    if (path === '/search/tv') return { results: [{ id: 2, name: tv.englishTitle }], total_pages: 1 };
    if (path.endsWith('/credits')) return { cast: tv.officialCast.map((name) => ({ name })) };
    if (path.includes('/season/')) { assert.ok(!path.endsWith('/0')); return { air_date: row.date }; }
    return { name: tv.englishTitle, origin_country: ['AU'], seasons: [0, 1, 2].map((season_number) => ({ season_number })) };
  });
  assert.equal(report.rows[0].status, 'ambiguous_season');
});
test('duplicate normalized cast or untrusted official URL fails before IO', async () => {
  for (const r of [{ ...row, officialCast: ['A. Example', 'A Example'] }, { ...row, sourceUrl: 'https://example.test/title/10' }])
    await assert.rejects(disambiguateNetflix(input(r), () => { throw new Error('unexpected IO'); }), /INVALID_OFFICIAL_IDENTITY/);
});
