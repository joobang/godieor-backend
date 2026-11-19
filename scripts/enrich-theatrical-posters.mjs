import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const normalize = (value) => typeof value === 'string'
  ? value.normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '') : '';
const titles = (movie) => [movie.title, movie.original_title].map(normalize);
const posterPath = /^\/[a-zA-Z0-9_-]+\.(?:jpe?g|png|webp)$/i;

export async function findTheatricalPoster(movie, lookup) {
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
  if (candidates.size > 8) return null;

  const matches = [];
  for (const id of candidates) {
    const result = await lookup(`/movie/${id}`, { language: 'ko-KR', append_to_response: 'release_dates' });
    if (result.id !== id || !Array.isArray(result.release_dates?.results))
      throw Error('INVALID_TMDB_MOVIE_RESPONSE');
    const dates = result.release_dates.results
      .filter((region) => region.iso_3166_1 === 'KR')
      .flatMap((region) => region.release_dates ?? []);
    if (titles(result).includes(expected) && dates.some((release) =>
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

export async function enrichTheatricalPosters({ pool, lookup, apply = false }) {
  const { rows } = await pool.query(`SELECT DISTINCT e.content_id AS "contentId", es.external_id AS "movieCode",
    e.title, e.local_date::text AS date ${listedTheatrical} ORDER BY date, "movieCode", "contentId"`);
  const { rows: covered } = await pool.query(`SELECT DISTINCT c.id AS "contentId" FROM content c
    WHERE c.poster_url IS NOT NULL AND c.poster_url <> '' AND c.id IN (SELECT e.content_id ${listedTheatrical})`);
  const withPoster = new Set(covered.map((row) => row.contentId));
  const groups = Map.groupBy(rows.filter((row) => !withPoster.has(row.contentId)), (row) => row.contentId);
  // Multiple KOBIS identities/dates for a single content row need explicit review.
  const pending = [...groups.values()].filter((group) => group.length === 1).map(([movie]) => movie);
  const selected = [];
  let lookupFailures = 0;
  for (let start = 0; start < pending.length; start += 4) {
    const outcomes = await Promise.allSettled(pending.slice(start, start + 4).map(async (movie) => {
      const poster = await findTheatricalPoster(movie, lookup);
      return poster ? { ...movie, ...poster } : null;
    }));
    for (const outcome of outcomes) {
      if (outcome.status === 'rejected') lookupFailures++;
      else if (outcome.value) selected.push(outcome.value);
    }
  }

  let updated = 0;
  if (apply && selected.length) {
    const result = await pool.query(`
      UPDATE content c SET poster_url=p."posterUrl", updated_at=now()
      FROM jsonb_to_recordset($1::jsonb) AS p("contentId" uuid, "movieCode" text, title text, date date, "posterUrl" text)
      WHERE c.id=p."contentId" AND c.kind='movie' AND (c.poster_url IS NULL OR c.poster_url='')
        AND EXISTS (SELECT 1 ${listedTheatrical}
          AND e.content_id=c.id AND es.external_id=p."movieCode" AND e.title=p.title AND e.local_date=p.date)
        AND NOT EXISTS (SELECT 1 ${listedTheatrical}
          AND e.content_id=c.id AND (es.external_id<>p."movieCode" OR e.title<>p.title OR e.local_date<>p.date))`,
      [JSON.stringify(selected)]);
    updated = result.rowCount;
  }
  return {
    mode: apply ? 'apply' : 'dry_run',
    total: new Set(rows.map((row) => row.contentId)).size,
    beforeWithPoster: withPoster.size,
    matched: selected.length,
    ambiguousKobis: groups.size - pending.length,
    lookupFailures,
    unmatched: pending.length - selected.length - lookupFailures,
    updated,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const token = process.env.TMDB_API_READ_ACCESS_TOKEN?.trim();
  if (!token || !process.env.DATABASE_URL) {
    console.error('THEATRICAL_POSTER_CONFIG_MISSING');
    process.exitCode = 1;
  } else {
    const { default: pg } = await import('pg');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 10000 });
    const lookup = async (path, params) => {
      const url = new URL(`https://api.themoviedb.org/3${path}`);
      url.search = new URLSearchParams(params);
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw Error('TMDB_POSTER_LOOKUP_FAILED');
      return response.json();
    };
    try {
      const report = await enrichTheatricalPosters({ pool, lookup, apply: process.argv.includes('--apply') });
      console.log(JSON.stringify(report));
      if (report.lookupFailures) process.exitCode = 1;
    } catch {
      console.error('THEATRICAL_POSTER_ENRICHMENT_FAILED');
      process.exitCode = 1;
    } finally { await pool.end(); }
  }
}
