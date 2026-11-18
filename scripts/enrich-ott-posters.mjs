#!/usr/bin/env node
// Attach TMDB artwork only to already-reviewed OTT releases with a unique matching title and KR provider.
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const providers = {
  netflix: /\bnetflix\b/i,
  tving: /\btving\b/i,
  disney_plus: /\bdisney\s*(?:\+|plus)\b/i,
  coupang_play: /coupang/i,
};
const normalize = (s) => s.normalize('NFKC').toLocaleLowerCase('ko').replace(/[\s\p{P}\p{S}]/gu, '');
const validPoster = (path) => typeof path === 'string' && /^\/[\w-]+\.(?:jpe?g|png|webp)$/i.test(path);

export async function findVerifiedPoster(event, lookup) {
  const kind = event.kind === 'movie' ? 'movie' : event.kind === 'drama' ? 'tv' : null;
  const platform = providers[event.platform];
  if (!kind || !platform || !event.title || event.posterUrl) return null;
  const search = await lookup(`/search/${kind}`, { query: event.title, language: 'ko-KR' });
  const candidates = (search.results ?? []).filter((entry) => {
    const titles = [entry.title, entry.name, entry.original_title, entry.original_name].filter((name) => typeof name === 'string');
    return validPoster(entry.poster_path) && titles.some((name) => normalize(name) === normalize(event.title));
  });
  const ids = [...new Set(candidates.map((row) => row.id))];
  if (ids.length !== 1) return null;
  const entry = candidates.find((row) => row.id === ids[0]);
  const availability = await lookup(`/${kind}/${entry.id}/watch/providers`);
  const services = [
    ...(availability.results?.KR?.flatrate ?? []),
    ...(availability.results?.KR?.free ?? []),
    ...(availability.results?.KR?.ads ?? []),
  ];
  if (!services.some((service) => platform.test(service.provider_name ?? ''))) return null;
  return `https://image.tmdb.org/t/p/w500${entry.poster_path}`;
}

export async function enrichPosters({ pool, lookup, apply = false }) {
  const { rows } = await pool.query(`SELECT DISTINCT e.content_id AS "contentId", e.title,
    c.kind::text AS kind, c.poster_url AS "posterUrl", es.service::text AS platform
    FROM event e JOIN event_source src ON src.event_id=e.id
    JOIN content c ON c.id=e.content_id JOIN event_service es ON es.event_id=e.id
    WHERE src.provider_key='ott_reviewed' AND e.release_market='KR' AND c.poster_url IS NULL`);
  const byContent = new Map();
  let failed = 0;
  for (const event of rows) {
    try {
      const poster = await findVerifiedPoster(event, lookup);
      if (!poster) continue;
      const existing = byContent.get(event.contentId);
      byContent.set(event.contentId, existing && existing !== poster ? 'conflict' : poster);
    } catch (error) {
      failed++;
      if (process.env.DEBUG_OTT_POSTERS === 'true') console.error(`Poster lookup failed for ${event.contentId}: ${error?.name ?? 'unknown'}`);
    }
  }
  const proposals = [...byContent].filter(([, path]) => path !== 'conflict');
  let updated = 0;
  if (apply) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const [id, poster] of proposals) {
        const result = await client.query('UPDATE content SET poster_url=$1, updated_at=now() WHERE id=$2 AND poster_url IS NULL', [poster, id]);
        updated += result.rowCount;
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }
  return { mode: apply ? 'apply' : 'dry_run', missingRows: rows.length, matched: proposals.length, conflicts: byContent.size - proposals.length, lookupFailures: failed, updated };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (!process.env.DATABASE_URL || !process.env.TMDB_API_READ_ACCESS_TOKEN) {
    console.error('OTT_POSTER_ENV_MISSING');
    process.exitCode = 1;
  } else {
    const { default: pg } = await import('pg');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
    const lookup = async (path, params = {}) => {
      const url = new URL(`https://api.themoviedb.org/3${path}`);
      for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
      const response = await fetch(url, { headers: { Authorization: `Bearer ${process.env.TMDB_API_READ_ACCESS_TOKEN}` }, signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw new Error(`TMDB_HTTP_${response.status}`);
      return response.json();
    };
    try {
      const result = await enrichPosters({ pool, lookup, apply: process.argv.includes('--apply') });
      console.log(JSON.stringify(result));
      if (result.lookupFailures) process.exitCode = 2;
    } catch (error) {
      console.error(`OTT_POSTER_ENRICH_FAILED ${error?.code ?? error?.name ?? 'UNKNOWN'}`);
      process.exitCode = 1;
    } finally { await pool.end(); }
  }
}
