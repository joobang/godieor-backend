import assert from 'node:assert/strict';
import test from 'node:test';
import { enrichTheatricalPosters, fetchPosterJson, findTheatricalPoster } from '../scripts/enrich-theatrical-posters.mjs';

test('poster requests retry transient responses and respect Retry-After', async () => {
  const now = Date.parse('2026-11-25T06:00:00Z');
  const responses = [
    new Response(null, { status: 503, headers: { 'Retry-After': new Date(now + 1000).toUTCString() } }),
    new Response(null, { status: 429, headers: { 'Retry-After': '3' } }),
    Response.json({ results: [] }),
  ];
  const waits = [];
  const result = await fetchPosterJson('TMDB', 'https://example.test', {
    fetchImpl: async () => responses.shift(),
    delay: async (ms) => waits.push(ms),
    now: () => now,
  });
  assert.deepEqual(result, { results: [] });
  assert.deepEqual(waits, [1000, 3000]);
});

test('poster requests bound retries and fail without leaking a URL or response body', async () => {
  const url = 'https://example.test?key=sensitive-test-value';
  for (const [status, retryAfter, expectedCalls] of [[401, '0', 1], [403, '0', 1], [429, '31', 1], [504, '0', 3]]) {
    let calls = 0;
    await assert.rejects(() => fetchPosterJson('KOBIS', url, {
      fetchImpl: async () => {
        calls++;
        return new Response('sensitive-test-body', { status, headers: { 'Retry-After': retryAfter } });
      },
      delay: async () => {},
    }), { message: `KOBIS_HTTP_${status}` });
    assert.equal(calls, expectedCalls);
  }
});

test('poster requests recover from a timeout and reject malformed JSON without retry', async () => {
  let calls = 0;
  await assert.rejects(() => fetchPosterJson('TMDB', 'https://example.test', {
    fetchImpl: async () => {
      if (++calls === 1) throw new DOMException('raw timeout', 'TimeoutError');
      return new Response('not JSON');
    },
    delay: async () => {},
  }), { message: 'TMDB_INVALID_JSON' });
  assert.equal(calls, 2);
});

const movie = { title: '같은 제목', date: '2026-11-18', movieCode: '01' };
const kr = (type = 3, date = movie.date, country = 'KR') => ({
  iso_3166_1: country, release_dates: [{ type, release_date: date + 'T00:00:00.000Z' }],
});
const lookupKobis = async (movieCd) => ({ movieCd, movieNm: movie.title, openDt: '20261118', directors: [{ peopleNm: '검증 감독' }] });
const detail = (id, dates, director = '검증 감독') => ({
  id, title: movie.title, poster_path: '/verified.jpg', release_dates: { results: dates },
  credits: { crew: [{ job: 'Director', name: director }] },
});
function tmdb(details, pages = 1) {
  return async (path, params) => {
    if (path === '/search/movie')
      return { total_pages: pages, results: params.page === 1 ? details.map(({ id, title }) => ({ id, title })) : [] };
    return details.find(({ id }) => path === `/movie/${id}`);
  };
}

test('a same-title remake and an overseas opening never override the matching Korean theatrical cut', async () => {
  const lookup = tmdb([detail(1, [kr(3, '2024-10-23')]), detail(2, [kr(3, movie.date, 'US')]), detail(3, [kr(3)])]);
  assert.deepEqual(await findTheatricalPoster(movie, lookup, lookupKobis),
    { tmdbId: 3, posterUrl: 'https://image.tmdb.org/t/p/w500/verified.jpg' });
});

test('digital, film festival, date mismatch, ambiguous, truncated and unsafe paths are excluded', async () => {
  assert.equal(await findTheatricalPoster(movie, tmdb([detail(1, [kr(4), kr(1), kr(3, '2026-11-20')])]), lookupKobis), null);
  assert.equal(await findTheatricalPoster(movie, tmdb([detail(1, [kr()]), detail(2, [kr()])]), lookupKobis), null);
  assert.equal(await findTheatricalPoster(movie, tmdb([detail(1, [kr()])], 4), lookupKobis), null);
  assert.equal(await findTheatricalPoster(movie, tmdb([{ ...detail(1, [kr()]), poster_path: '//example.org/p.jpg' }]), lookupKobis), null);
});

test('same-day rerelease by a different director does not match a new work', async () => {
  const lookup = tmdb([detail(1, [kr()], '다른 감독'), detail(2, [])]);
  assert.equal(await findTheatricalPoster(movie, lookup, lookupKobis), null);
});

test('dry run and repeat preserve existing posters while treating failed lookups separately', async () => {
  const rows = [
    { ...movie, contentId: 'one', movieCode: '01' },
    { ...movie, contentId: 'two', movieCode: '02' },
    { ...movie, contentId: 'ambiguous', movieCode: '03' },
    { ...movie, contentId: 'ambiguous', movieCode: '04' },
    { ...movie, contentId: 'fail', movieCode: '05', title: 'failed' },
  ];
  const covered = [{ contentId: 'two' }];
  let writes = 0;
  const pool = { async connect() { return { query: this.query, release() {} }; }, async query(sql, params) {
    if (sql.includes('pg_try_advisory_xact_lock')) return { rows: [{ locked: true }] };
    if (sql.includes('UPDATE content')) {
      writes++;
      assert.deepEqual(JSON.parse(params[0]).map((row) => [row.contentId, row.movieCode]), [['one', '01']]);
      covered.push({ contentId: 'one' });
      return { rowCount: 1 };
    }
    return { rows: sql.includes('FROM content c') ? covered : rows };
  } };
  const find = tmdb([detail(1, [kr()])]);
  const lookup = async (path, params) => {
    if (params.query === 'failed') throw Error('fixture failure');
    return find(path, params);
  };
  const dry = await enrichTheatricalPosters({ pool, lookup, lookupKobis });
  assert.deepEqual(dry, { mode: 'dry_run', total: 4, beforeWithPoster: 1, matched: 1,
    ambiguousKobis: 1, lookupFailures: 1, lookupFailureCodes: { POSTER_LOOKUP_FAILED: 1 }, unmatched: 0, updated: 0 });
  assert.equal(writes, 0);
  assert.equal((await enrichTheatricalPosters({ pool, lookup, lookupKobis, apply: true })).updated, 1);
  assert.equal((await enrichTheatricalPosters({ pool, lookup, lookupKobis, apply: true })).updated, 0);
  assert.equal(writes, 1);
});
