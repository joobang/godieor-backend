import test from 'node:test';
import assert from 'node:assert/strict';
import { monthRange, candidateDates, evaluateReference, reverseLookup, discoverByDate, reportSummary, auditCachedCatalog, summarizeCached } from '../scripts/tmdb-date-discovery.mjs';

test('cached reference audit separates missed title, provider and first-date policy', () => {
  const reference = [
    ['2026-11-05', 'netflix', '블랙 도브', 2],
    ['2026-11-05', 'tving', '블랙 도브', 2],
    ['2026-12-03', 'netflix', '새 작품', 1],
    ['2026-11-01', 'netflix', '첫날 작품', 1],
  ];
  const rows = auditCachedCatalog(reference, [
    { title: '블랙 도브', tmdbId: 7, tmdbFirstDate: '2024-12-05', services: ['netflix'] },
    { title: '첫날 작품', tmdbId: 8, tmdbFirstDate: '2026-11-01', services: ['netflix'] },
  ]);
  assert.deepEqual(rows.map((r) => r.status), [
    'series_first_date_differs', 'service_not_in_cache', 'title_not_in_cache', 'series_first_date_matches',
  ]);
  assert.deepEqual(summarizeCached(rows).status, {
    series_first_date_differs: 1, service_not_in_cache: 1,
    title_not_in_cache: 1, series_first_date_matches: 1,
  });
});

test('month windows include December 31 and reject invalid months', () => {
  assert.deepEqual(monthRange('2026-12'), { start: '2026-12-01', end: '2026-12-31' });
  assert.throws(() => monthRange('2026-13'), /INVALID_MONTH/);
});

test('older series first air date cannot exclude a season premiere', () => {
  const dates = candidateDates({ first_air_date: '2024-12-05' }, {
    air_date: '2026-11-05', episodes: [{ episode_number: 1, air_date: '2026-11-05' }],
  });
  assert.equal(dates.seriesFirstDate, '2024-12-05');
  assert.equal(evaluateReference({ date: '2026-11-05', season: 2 }, [{ seasonNumber: 2, dates }]).status, 'tmdb_season_date_match');
});

test('later episode alone must not count as season premiere', () => {
  const dates = candidateDates({ first_air_date: '2020-01-01' }, {
    air_date: '2026-11-01', episodes: [{ episode_number: 1, air_date: '2026-11-01' }, { episode_number: 2, air_date: '2026-11-08' }],
  });
  assert.equal(evaluateReference({ date: '2026-11-08', season: 4 }, [{ seasonNumber: 4, dates }]).status, 'episode_only_match');
  assert.equal(evaluateReference({ date: '2026-11-01', season: 3 }, [{ seasonNumber: 4, dates }]).status, 'different_season');
});

test('reverse search inspects season even when title missing from popularity catalog; providers remain hints', async () => {
  const calls = [];
  const request = async (path) => {
    calls.push(path);
    if (path === '/search/tv') return { total_pages: 1, results: [{ id: 42, name: '블랙 도브' }] };
    if (path === '/tv/42') return { name: '블랙 도브', first_air_date: '2024-12-05', seasons: [{ season_number: 2 }] };
    if (path === '/tv/42/watch/providers') return { results: { KR: { flatrate: [{ provider_name: 'Netflix' }] } } };
    if (path === '/tv/42/season/2') return { air_date: '2026-11-05', episodes: [{ episode_number: 1, air_date: '2026-11-05' }] };
    throw new Error(`Unexpected ${path}`);
  };
  const rows = await reverseLookup([['2026-11-05', 'netflix', '블랙 도브', 2]], request);
  assert.equal(rows[0].status, 'tmdb_season_date_match');
  assert.equal(rows[0].matches[0].krProviderMatched, true);
  assert.equal(reportSummary(rows).krProviderAndSeasonDateMatched, 1);
  assert.ok(calls.includes('/tv/42/season/2'));
});

test('seasonless film is found through movie lookup, with global release flagged only as a hint', async () => {
  const calls = [];
  const request = async (path) => {
    calls.push(path);
    if (path === '/search/tv') return { total_pages: 1, results: [] };
    if (path === '/search/movie') return { total_pages: 3, results: [{ id: 88, title: '영화 신작' }] };
    if (path === '/movie/88') return { title: '영화 신작', release_date: '2026-12-12' };
    if (path === '/movie/88/watch/providers') return { results: { KR: { flatrate: [{ provider_name: 'Netflix' }] } } };
    throw new Error(`Unexpected ${path}`);
  };
  const rows = await reverseLookup([['2026-12-12', 'netflix', '영화 신작', null]], request, { searchPages: 1 });
  assert.equal(rows[0].status, 'tmdb_movie_release_date_match');
  assert.equal(rows[0].movieSearchTruncated, true);
  assert.equal(rows[0].matches[0].krProviderMatched, true);
  assert.equal(reportSummary(rows).movieReleaseDateMatched, 1);
  assert.ok(calls.includes('/movie/88'));
});

test('film release date cannot satisfy a season-specific reference', () => {
  const result = evaluateReference({ date: '2026-12-12', season: 2 }, [
    { type: 'movie', seasonNumber: null, dates: { movieReleaseDate: '2026-12-12' } },
  ]);
  assert.equal(result.status, 'different_season');
});

test('date discovery includes TV episode air_date and detects capped pages', async () => {
  const request = async (path, params) => {
    if (path.startsWith('/watch/providers/')) return { results: [{ provider_id: 8, provider_name: 'Netflix' }] };
    if (path.startsWith('/discover/')) return { total_pages: 3, results: [{ id: 10, name: 'Sample', first_air_date: '2022-01-01' }] };
    throw new Error('unexpected');
  };
  const result = await discoverByDate(request, ['2026-11'], { maxPages: 1 });
  assert.equal(result.coverage.find((c) => c.kind === 'tv' && c.filter === 'air_date').truncated, true);
  assert.equal(result.rows.find((r) => r.type === 'tv').seriesFirstDate, '2022-01-01');
  assert.ok(result.coverage.some((c) => c.kind === 'tv' && c.filter === 'first_air_date'));
});

test('failed title lookups are not silently classified as missing titles', async () => {
  const rows = await reverseLookup([['2026-12-07', 'netflix', '시그널', 2]], async () => { throw new Error('ENOTFOUND'); });
  assert.equal(rows[0].status, 'lookup_failed');
});
