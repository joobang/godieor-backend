#!/usr/bin/env node
// TMDB metadata may decorate independently verified Korean OTT events, never create dates.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const normalize = (value) => value.normalize('NFKC').toLocaleLowerCase('ko').replace(/[\s\p{P}\p{S}]/gu, '');

export function selectPoster(event, catalog) {
  if (event.posterUrl || !event.title || !event.platform || !['movie', 'drama'].includes(event.kind)) return null;
  const matches = catalog.filter((row) => {
    if (!row || row.type !== (event.kind === 'movie' ? 'movie' : 'tv') || !row.services?.includes(event.platform)) return false;
    const names = [row.title, row.originalTitle].filter((x) => typeof x === 'string');
    return names.some((name) => normalize(name) === normalize(event.title));
  });
  const ids = new Set(matches.map((row) => `${row.type}:${row.tmdbId}`));
  if (ids.size !== 1 || matches.length !== 1) return null;
  const path = matches[0].posterUrl;
  if (typeof path !== 'string' || !/^https:\/\/image\.tmdb\.org\/t\/p\/w500\/[\w-]+\.(?:jpg|png|webp)$/.test(path)) return null;
  return { posterUrl: path, tmdbId: matches[0].tmdbId };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  let pool;
  try {
    const [{ default: pg }, catalog] = await Promise.all([
      import('pg'), readFile('work/tmdb/latest.json', 'utf8').then(JSON.parse),
    ]);
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL_REQUIRED');
    if (catalog.type !== 'metadata-discovery-only' || catalog.market !== 'KR' || !Array.isArray(catalog.rows)) throw new Error('INVALID_TMDB_CATALOG');
    const dryRun = !process.argv.includes('--apply');
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
    const client = await pool.connect();
    try {
      const { rows } = await client.query(`SELECT DISTINCT e.content_id AS "contentId", e.title, c.kind::text AS kind,
        c.poster_url AS "posterUrl", es.service::text AS platform
        FROM event e JOIN event_source src ON src.event_id=e.id
        JOIN content c ON c.id=e.content_id
        JOIN event_service es ON es.event_id=e.id
        WHERE src.provider_key='ott_reviewed' AND e.release_market='KR'`);
      const proposals = new Map();
      for (const row of rows) {
        const selected = selectPoster(row, catalog.rows);
        if (!selected) continue;
        const prior = proposals.get(row.contentId);
        if (prior && prior.posterUrl !== selected.posterUrl) {
          proposals.set(row.contentId, { conflict: true });
        } else if (!prior) proposals.set(row.contentId, selected);
      }
      let updated = 0;
      if (!dryRun) {
        await client.query('BEGIN');
        try {
          for (const [id, proposal] of proposals) {
            if (proposal.conflict) continue;
            const result = await client.query('UPDATE content SET poster_url=$1, updated_at=now() WHERE id=$2 AND poster_url IS NULL', [proposal.posterUrl, id]);
            updated += result.rowCount;
          }
          await client.query('COMMIT');
        } catch (error) { await client.query('ROLLBACK'); throw error; }
      }
      console.log(JSON.stringify({ mode: dryRun ? 'dry_run' : 'apply', reviewedEvents: rows.length, eligibleContent: [...proposals.values()].filter((p) => !p.conflict).length, conflicts: [...proposals.values()].filter((p) => p.conflict).length, updated, calendarEventsCreated: 0 }, null, 2));
    } finally { client.release(); }
  } catch (error) { console.error('TMDB_REVIEWED_ENRICH_FAILED:', error.message); process.exitCode = 1; }
  finally { await pool?.end(); }
}
