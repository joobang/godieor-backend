import test from 'node:test';
import assert from 'node:assert/strict';
import { enrichNetflixIdentities } from '../scripts/enrich-netflix-identity-aliases.mjs';

// Synthetic official-title observations, never observations copied as expected fixtures.
const row = { videoId: 123, platform: 'netflix', market: 'KR', title: '가상 제목', date: '2026-11-10',
  sourceUrl: 'https://www.netflix.com/title/123', detailStatus: 'observed', englishTitle: 'Synthetic Movie',
  listingSubtitle: '시즌 2', observedFormat: 'movie' };
const input = (rows) => ({ kind: 'netflix-official-identity-observations', asOf: '2026-11-12', rows });

test('English alias is bound to videoID; Korean title/date and publication guard remain', async () => {
  const calls = [];
  const result = await enrichNetflixIdentities(input([row]), async (path, params) => {
    calls.push([path, params]);
    if (path === '/search/movie') return { results: [{ id: 9, title: 'Synthetic Movie' }], total_pages: 1 };
    if (path === '/movie/9') return { title: 'Synthetic Movie', release_date: '2026-11-10' };
    return { results: {} };
  });
  assert.equal(result.rows[0].title, '가상 제목');
  assert.equal(result.rows[0].tmdb.status, 'tmdb_movie_release_date_match');
  assert.ok(calls.every(([path]) => path !== '/search/tv'));
  assert.ok(calls.filter(([, p]) => p.language).every(([, p]) => p.language === 'en-US'));
  assert.equal(calls.find(([p]) => p === '/search/movie')[1].query, 'Synthetic Movie');
  assert.equal(result.publishedCountDelta, 0);
  assert.equal(result.rows[0].eligibleForAutomaticPublication, false);
});
test('unavailable details and live sports do not cause title fallback queries', async () => {
  const result = await enrichNetflixIdentities(input([{ ...row, observedFormat: 'live_sports' },
    { ...row, videoId: 124, sourceUrl: 'https://www.netflix.com/title/124', detailStatus: 'web_tool_unavailable',
      englishTitle: null, observedFormat: 'unknown' }]), () => { throw new Error('unexpected request'); });
  assert.equal(result.queried, 0);
  assert.ok(result.rows.every((r) => r.tmdb === null));
});
test('duplicate ID, mismatched official URL and non-KR observations fail before IO', async () => {
  for (const rows of [[row, row], [{ ...row, sourceUrl: 'https://example.test/title/123' }],
    [{ ...row, market: 'US' }]])
    await assert.rejects(enrichNetflixIdentities(input(rows), () => { throw new Error('unexpected request'); }), /INVALID_IDENTITY_ROW/);
});
test('failed TMDB request stays visible and offline mode does not query', async () => {
  const failed = await enrichNetflixIdentities(input([row]), async () => { throw new Error('HTTP_503'); });
  assert.equal(failed.rows[0].tmdb.status, 'lookup_failed');
  assert.equal(failed.rows[0].tmdb.errors.length, 1);
  const offline = await enrichNetflixIdentities(input([row]), null);
  assert.equal(offline.queried, 0);
  assert.equal(offline.rows[0].queryStatus, 'not_queried');
});
