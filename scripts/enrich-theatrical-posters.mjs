import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const normalize = (value) => typeof value === 'string'
  ? value.normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '') : '';
const titles = (movie) => [movie.title, movie.original_title].map(normalize);
const posterPath = /^\/[a-zA-Z0-9_-]+\.(?:jpe?g|png|webp)$/i;
const transientHttp = new Set([408, 429, 500, 502, 503, 504]);
const transientNetwork = new Set(['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EAI_AGAIN', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_SOCKET']);
const validationCodes = new Set(['INVALID_TMDB_SEARCH_RESPONSE', 'INVALID_TMDB_MOVIE_RESPONSE', 'KOBIS_MOVIE_ID_MISMATCH']);
const maxRetryDelayMs = 30_000;

class PosterLookupError extends Error {}

function retryAfterMs(value, now) {
  if (!value) return 0;
  if (/^\d+$/.test(value)) return Number(value) * 1000;
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - now()) : 0;
}

export async function fetchPosterJson(provider, url, { headers, fetchImpl = fetch, delay = sleep, now = Date.now } = {}) {
  for (let attempt = 1; ; attempt++) {
    let code;
    let retryable;
    let waitMs = 500 * attempt;
    try {
      const response = await fetchImpl(url, { headers, signal: AbortSignal.timeout(12000) });
      if (response.ok) return await response.json();
      code = `${provider}_HTTP_${response.status}`;
      retryable = transientHttp.has(response.status);
      waitMs = Math.max(waitMs, retryAfterMs(response.headers.get('retry-after'), now));
      await response.body?.cancel().catch(() => {});
    } catch (error) {
      const timedOut = error.name === 'TimeoutError';
      retryable = timedOut || transientNetwork.has(error.cause?.code);
      code = `${provider}_${timedOut ? 'TIMEOUT' : error instanceof SyntaxError ? 'INVALID_JSON' : 'NETWORK_ERROR'}`;
    }
    if (!retryable || attempt === 3 || waitMs > maxRetryDelayMs) throw new PosterLookupError(code);
    await delay(waitMs);
  }
}

export async function findTheatricalPoster(movie, lookup, lookupKobis) {
  const expected = normalize(movie.title);
  if (!expected) return null;
  const candidates = new Set();
  let page = 1;
  let pages;
  do {
    const result = await lookup('/search/movie', { query: movie.title, language: 'ko-KR', page });
    if (!Array.isArray(result.results) || !Number.isInteger(result.total_pages) || result.total_pages < 0)
      throw Error('INVALID_TMDB_SEARCH_RESPONSE');
    if (result.total_pages > 3 || (pages !== undefined && result.total_pages !== pages)) return null;
    pages = result.total_pages;
    for (const row of result.results) {
      if (Number.isSafeInteger(row.id) && row.id > 0 && titles(row).includes(expected)) candidates.add(row.id);
    }
    page++;
  } while (page <= pages);
  if (candidates.size === 0 || candidates.size > 8) return null;

  const kobis = await lookupKobis(movie.movieCode);
  if (kobis?.movieCd !== movie.movieCode) throw Error('KOBIS_MOVIE_ID_MISMATCH');
  if (normalize(kobis.movieNm) !== expected || kobis.openDt !== movie.date.replaceAll('-', '')) return null;
  const directors = new Set((kobis.directors ?? []).flatMap((row) =>
    [row.peopleNm, row.peopleNmEn]).map(normalize).filter(Boolean));
  if (!directors.size) return null;

  const matches = [];
  for (const id of candidates) {
    const result = await lookup(`/movie/${id}`, { language: 'ko-KR', append_to_response: 'release_dates,credits' });
    if (result.id !== id || !Array.isArray(result.release_dates?.results) || !Array.isArray(result.credits?.crew))
      throw Error('INVALID_TMDB_MOVIE_RESPONSE');
    const dates = result.release_dates.results
      .filter((region) => region.iso_3166_1 === 'KR')
      .flatMap((region) => region.release_dates ?? []);
    const sameDirector = result.credits.crew.some((row) => row.job === 'Director' &&
      [row.name, row.original_name].some((name) => directors.has(normalize(name))));
    if (sameDirector && titles(result).includes(expected) && dates.some((release) =>
      (release.type === 2 || release.type === 3) && release.release_date?.slice(0, 10) === movie.date)) {
      matches.push(result);
    }
  }
  if (matches.length !== 1 || !posterPath.test(matches[0].poster_path)) return null;
  return { tmdbId: matches[0].id, posterUrl: `https://image.tmdb.org/t/p/w500${matches[0].poster_path}` };
}

const listedTheatrical = `
    FROM event e
    JOIN event_source es ON es.event_id=e.id AND es.provider_key='kobis' AND es.variant_key='kr-theatrical'
    JOIN content_source cs ON cs.provider_key=es.provider_key AND cs.external_id=es.external_id
      AND cs.content_type='movie' AND cs.content_id=e.content_id
    WHERE e.kind='theatrical_release' AND e.release_market='KR' AND e.origin='provider'
      AND e.is_listed AND e.local_date >= DATE '2026-10-01'`;

export async function enrichTheatricalPosters({ pool, lookup, lookupKobis, apply = false }) {
  const { rows } = await pool.query(`SELECT DISTINCT e.content_id AS "contentId", es.external_id AS "movieCode",
    e.title, e.local_date::text AS date ${listedTheatrical} ORDER BY date, "movieCode", "contentId"`);
  const { rows: covered } = await pool.query(`SELECT DISTINCT c.id AS "contentId" FROM content c
    WHERE c.poster_url IS NOT NULL AND c.poster_url <> '' AND c.id IN (SELECT e.content_id ${listedTheatrical})`);
  const withPoster = new Set(covered.map((row) => row.contentId));
  const groups = Map.groupBy(rows.filter((row) => !withPoster.has(row.contentId)), (row) => row.contentId);
  // Multiple KOBIS identities/dates for a single content row need explicit review.
  const pending = [...groups.values()].filter((group) => group.length === 1).map(([movie]) => movie);
  const selected = [];
  const lookupFailureCodes = {};
  let lookupFailures = 0;
  for (let start = 0; start < pending.length; start += 4) {
    const outcomes = await Promise.allSettled(pending.slice(start, start + 4).map(async (movie) => {
      const poster = await findTheatricalPoster(movie, lookup, lookupKobis);
      return poster ? { ...movie, ...poster } : null;
    }));
    for (const outcome of outcomes) {
      if (outcome.status === 'rejected') {
        lookupFailures++;
        const error = outcome.reason;
        const code = error instanceof PosterLookupError || validationCodes.has(error?.message)
          ? error.message : 'POSTER_LOOKUP_FAILED';
        lookupFailureCodes[code] = (lookupFailureCodes[code] ?? 0) + 1;
      } else if (outcome.value) selected.push(outcome.value);
    }
  }

  const updated = apply && selected.length ? await savePosters(pool, selected) : 0;
  return {
    mode: apply ? 'apply' : 'dry_run',
    total: new Set(rows.map((row) => row.contentId)).size,
    beforeWithPoster: withPoster.size,
    matched: selected.length,
    ambiguousKobis: groups.size - pending.length,
    lookupFailures,
    lookupFailureCodes,
    unmatched: pending.length - selected.length - lookupFailures,
    updated,
  };
}

async function savePosters(pool, selected) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Same advisory key as CollectionService's KOBIS job. Keep network calls out of the transaction.
    const lock = await client.query(
      'SELECT pg_try_advisory_xact_lock(hashtextextended($1, 0)) AS locked', ['godieor:kobis']);
    if (lock.rows[0]?.locked !== true) throw Error('KOBIS_COLLECTION_BUSY');
    const result = await client.query(`
      UPDATE content c SET poster_url=p."posterUrl", updated_at=now()
      FROM jsonb_to_recordset($1::jsonb) AS p("contentId" uuid, "movieCode" text, title text, date date, "posterUrl" text)
      WHERE c.id=p."contentId" AND c.kind='movie' AND (c.poster_url IS NULL OR c.poster_url='')
        AND EXISTS (SELECT 1 ${listedTheatrical}
          AND e.content_id=c.id AND es.external_id=p."movieCode" AND e.title=p.title AND e.local_date=p.date)
        AND NOT EXISTS (SELECT 1 ${listedTheatrical}
          AND e.content_id=c.id AND (es.external_id<>p."movieCode" OR e.title<>p.title OR e.local_date<>p.date))`,
      [JSON.stringify(selected)]);
    await client.query('COMMIT');
    return result.rowCount;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const token = process.env.TMDB_API_READ_ACCESS_TOKEN?.trim();
  const kobisKey = process.env.KOBIS_API_KEY?.trim();
  if (!token || !kobisKey || !process.env.DATABASE_URL) {
    console.error('THEATRICAL_POSTER_CONFIG_MISSING');
    process.exitCode = 1;
  } else {
    const { default: pg } = await import('pg');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 10000 });
    const lookup = async (path, params) => {
      const url = new URL(`https://api.themoviedb.org/3${path}`);
      url.search = new URLSearchParams(params);
      return fetchPosterJson('TMDB', url, { headers: { Authorization: `Bearer ${token}` } });
    };
    const lookupKobis = async (code) => {
      const url = new URL('https://www.kobis.or.kr/kobisopenapi/webservice/rest/movie/searchMovieInfo.json');
      url.search = new URLSearchParams({ key: kobisKey, movieCd: code });
      return (await fetchPosterJson('KOBIS', url)).movieInfoResult?.movieInfo;
    };
    try {
      const report = await enrichTheatricalPosters({ pool, lookup, lookupKobis, apply: process.argv.includes('--apply') });
      console.log(JSON.stringify(report));
      if (report.lookupFailures) process.exitCode = 1;
    } catch {
      console.error('THEATRICAL_POSTER_ENRICHMENT_FAILED');
      process.exitCode = 1;
    } finally { await pool.end(); }
  }
}
