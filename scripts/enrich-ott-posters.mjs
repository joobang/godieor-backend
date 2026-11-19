#!/usr/bin/env node
// Enrich existing Korean OTT entries with TMDB artwork and verified identities.
// TMDB release dates do not establish OTT publication dates.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const providers = {
  netflix: /\bnetflix\b/i,
  tving: /\btving\b/i,
  disney_plus: /\bdisney\s*(?:\+|plus)\b/i,
  coupang_play: /coupang/i,
};
const normalize = (value) => typeof value === 'string'
  ? value.normalize('NFKC').toLocaleLowerCase('ko').replace(/[\s\p{P}\p{S}]/gu, '') : '';
const validPoster = (path) => typeof path === 'string' && /^\/[a-zA-Z0-9_-]+\.(?:jpe?g|png|webp)$/i.test(path);
const dateOnly = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? '').slice(0, 10);
const tmdbKind = (event) => event.kind === 'movie' ? 'movie' : event.kind === 'drama' ? 'tv' : null;
const titles = (row) => [row.title, row.originalTitle, row.original_title, row.name, row.original_name]
  .map(normalize).filter(Boolean);
const matchesName = (candidate, event) => titles(event).some((name) => titles(candidate).includes(name));

function matchingCurated(event, reviewed) {
  const matches = reviewed.filter((row) => row.identityVerified === true && row.premiereConfirmed === true &&
    row.market === 'KR' && row.platform === event.platform && row.type === tmdbKind(event) &&
    dateOnly(row.date) === dateOnly(event.date) && matchesName(row, event) && Number.isSafeInteger(row.tmdbId) && row.tmdbId > 0);
  return new Set(matches.map((row) => row.tmdbId)).size === 1 ? matches[0] : null;
}

function matchingVerifiedAlias(event, aliases) {
  const matches = aliases.filter((row) => row.identityVerified === true &&
    row.title && normalize(row.title) === normalize(event.title) &&
    row.date === dateOnly(event.date) && row.platform === event.platform &&
    row.eventKind === event.kind && ['movie', 'tv'].includes(row.tmdbKind) &&
    Number.isSafeInteger(row.tmdbId) && row.tmdbId > 0 && row.tmdbTitle);
  const identifiers = new Set(matches.map((row) => `${row.tmdbKind}:${row.tmdbId}`));
  return identifiers.size === 1 ? matches[0] : null;
}

export async function findVerifiedPoster(event, lookup, curated = [], aliases = []) {
  const kind = tmdbKind(event);
  const platform = providers[event.platform];
  if (!kind || !platform || !event.title) return null;
  const alias = matchingVerifiedAlias(event, aliases);
  const verified = alias ? null : matchingCurated(event, curated);
  const fallbackMatch = event.fallbackExternalId?.match(/^tmdb-tv-(\d+)-s\d+-(netflix|tving|disney_plus|coupang_play)-KR$/);
  const fallbackId = fallbackMatch?.[2] === event.platform && kind === 'tv' ? Number(fallbackMatch[1]) : null;
  let candidates;
  if (alias || verified || fallbackId) {
    const tmdbId = alias?.tmdbId ?? verified?.tmdbId ?? fallbackId;
    const matchedKind = alias?.tmdbKind ?? kind;
    const detail = await lookup(`/${matchedKind}/${tmdbId}`, { language: 'ko-KR' });
    if (alias && !titles(detail).includes(normalize(alias.tmdbTitle))) {
      if (alias.platform !== 'netflix') return null;
      const translations = await lookup(`/${matchedKind}/${tmdbId}/translations`);
      const officialTitle = translations.translations?.some((row) =>
        row.iso_639_1 === 'en' && normalize(row.data?.title) === normalize(alias.tmdbTitle) &&
        /^https:\/\/(?:www\.)?netflix\.com\/title\/\d+\/?$/.test(row.data?.homepage ?? ''));
      if (!officialTitle) return null;
    }
    candidates = [{ ...detail, id: tmdbId }];
  } else {
    const results = await Promise.all([...new Set([event.title, event.originalTitle].filter(Boolean))]
      .map((query) => lookup(`/search/${kind}`, { query, language: 'ko-KR' })));
    const byId = new Map();
    for (const result of results) {
      for (const row of result.results ?? []) {
        if (Number.isSafeInteger(row.id) && row.id > 0 && matchesName(row, event)) byId.set(row.id, row);
      }
    }
    candidates = [...byId.values()];
  }
  if (candidates.length !== 1) return null;
  const entry = candidates[0];
  // Historical curated identities remain valid if watch-provider availability changes.
  if (!alias && !verified && !fallbackId) {
    const availability = await lookup(`/${kind}/${entry.id}/watch/providers`);
    const region = availability.results?.KR ?? {};
    const services = [...(region.flatrate ?? []), ...(region.free ?? []), ...(region.ads ?? [])];
    if (!services.some((service) => platform.test(service.provider_name ?? ''))) return null;
  }
  const posterUrl = validPoster(entry.poster_path) ? `https://image.tmdb.org/t/p/w500${entry.poster_path}` : null;
  return { tmdbId: entry.id, kind: alias?.tmdbKind ?? kind, posterUrl, verification: alias ? 'verified_alias' : verified ? 'curated_identity' : fallbackId ? 'fallback_source_id' : 'unique_title_kr_provider' };
}

export async function coverage(pool) {
  const { rows } = await pool.query(`SELECT es.service::text AS platform, src.provider_key AS source,
    count(DISTINCT e.id)::int AS total,
    count(DISTINCT e.id) FILTER (WHERE c.poster_url IS NOT NULL AND c.poster_url <> '')::int AS with_poster,
    count(DISTINCT e.id) FILTER (WHERE ident.content_id IS NOT NULL)::int AS with_identity
    FROM event e JOIN content c ON c.id=e.content_id
    JOIN event_service es ON es.event_id=e.id
    JOIN event_source src ON src.event_id=e.id
    LEFT JOIN ott_tmdb_identity ident ON ident.content_id=c.id
    WHERE e.kind='ott_season_premiere' AND src.provider_key IN ('ott_reviewed','ott_fallback')
    GROUP BY es.service, src.provider_key ORDER BY es.service, src.provider_key`);
  return { rows, total: rows.reduce((sum, row) => sum + row.total, 0),
    withPoster: rows.reduce((sum, row) => sum + row.with_poster, 0),
    withIdentity: rows.reduce((sum, row) => sum + row.with_identity, 0) };
}

export async function enrichPosters({ pool, lookup, curated = [], aliases = [], apply = false }) {
  const before = await coverage(pool);
  const { rows } = await pool.query(`SELECT DISTINCT e.content_id AS "contentId", e.title,
    c.original_title AS "originalTitle", c.kind::text AS kind,
    c.poster_url AS "posterUrl", es.service::text AS platform,
    e.local_date::text AS date, src.external_id AS "fallbackExternalId",
    ident.tmdb_id AS "boundTmdbId", ident.tmdb_kind AS "boundKind"
    FROM event e JOIN event_source src ON src.event_id=e.id
    JOIN content c ON c.id=e.content_id JOIN event_service es ON es.event_id=e.id
    LEFT JOIN ott_tmdb_identity ident ON ident.content_id=c.id
    WHERE e.kind='ott_season_premiere' AND src.provider_key IN ('ott_reviewed','ott_fallback') AND e.release_market='KR'`);
  const proposals = new Map();
  let lookupFailures = 0, ambiguous = 0, alreadyComplete = 0;
  for (const event of rows) {
    if (event.boundTmdbId && event.posterUrl) { alreadyComplete++; continue; }
    try {
      let result;
      if (event.boundTmdbId) {
        const detail = await lookup(`/${event.boundKind}/${event.boundTmdbId}`, { language: 'ko-KR' });
        result = { tmdbId: event.boundTmdbId, kind: event.boundKind,
          posterUrl: validPoster(detail.poster_path) ? `https://image.tmdb.org/t/p/w500${detail.poster_path}` : null,
          verification: 'existing_identity' };
      } else result = await findVerifiedPoster(event, lookup, curated, aliases);
      if (!result) { ambiguous++; continue; }
      const prior = proposals.get(event.contentId);
      if (prior && (prior.tmdbId !== result.tmdbId || prior.kind !== result.kind)) proposals.set(event.contentId, { conflict: true });
      else if (!prior) proposals.set(event.contentId, result);
    } catch (error) {
      lookupFailures++;
    }
  }
  let postersUpdated = 0, identitiesSaved = 0;
  if (apply) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const [contentId, result] of proposals) {
        if (result.conflict) continue;
        const identity = await client.query(`INSERT INTO ott_tmdb_identity (content_id,tmdb_kind,tmdb_id,verification)
          VALUES ($1,$2,$3,$4) ON CONFLICT (content_id) DO NOTHING`,
        [contentId, result.kind, result.tmdbId, result.verification]);
        identitiesSaved += identity.rowCount;
        if (result.posterUrl) {
          const updated = await client.query(`UPDATE content SET poster_url=$1,updated_at=now()
            WHERE id=$2 AND (poster_url IS NULL OR poster_url='')`, [result.posterUrl, contentId]);
          postersUpdated += updated.rowCount;
        }
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }
  const after = apply ? await coverage(pool) : before;
  const unresolved = await pool.query(`SELECT DISTINCT e.title, es.service::text AS platform,
    src.provider_key AS source, ident.tmdb_id AS "tmdbId"
    FROM event e JOIN content c ON c.id=e.content_id
    JOIN event_service es ON es.event_id=e.id JOIN event_source src ON src.event_id=e.id
    LEFT JOIN ott_tmdb_identity ident ON ident.content_id=c.id
    WHERE e.kind='ott_season_premiere' AND e.release_market='KR'
      AND src.provider_key IN ('ott_reviewed','ott_fallback')
      AND (c.poster_url IS NULL OR c.poster_url='') ORDER BY 1, 2`);
  return { mode: apply ? 'apply' : 'dry_run', before, after,
    selected: proposals.size, actionable: [...proposals.values()].filter((row) => !row.conflict).length,
    conflicts: [...proposals.values()].filter((row) => row.conflict).length,
    ambiguous, lookupFailures, alreadyComplete, postersUpdated, identitiesSaved,
    unresolved: unresolved.rows.map((row) => ({ ...row,
      reason: row.tmdbId ? 'tmdb_poster_unavailable' : 'identity_unverified_or_lookup_failed' })) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (!process.env.DATABASE_URL) {
    console.error('OTT_POSTER_DATABASE_UNAVAILABLE'); process.exitCode = 1;
  } else {
    const { default: pg } = await import('pg');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2, connectionTimeoutMillis: 10000 });
    const token = process.env.TMDB_API_READ_ACCESS_TOKEN;
    const lookup = async (path, params = {}) => {
      if (!token) throw new Error('TMDB_TOKEN_UNAVAILABLE');
      const url = new URL(`https://api.themoviedb.org/3${path}`);
      for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw new Error(`TMDB_HTTP_${response.status}`);
      return response.json();
    };
    try {
      const curated = JSON.parse(await readFile('data/curated/ott-official-tmdb-bindings-2026-11-13.json', 'utf8'));
      const aliases = JSON.parse(await readFile('data/curated/ott-poster-tmdb-identities-2026-11-19.json', 'utf8'));
      const result = await enrichPosters({ pool, lookup, curated: curated.items, aliases: aliases.items,
        apply: process.argv.includes('--apply') });
      await mkdir('work/ott-posters', { recursive: true });
      await writeFile('work/ott-posters/latest.json', `${JSON.stringify({ ...result, observedAt: new Date().toISOString() }, null, 2)}\n`);
      console.log(JSON.stringify({ mode: result.mode, total: result.after.total,
        beforeWithPoster: result.before.withPoster, afterWithPoster: result.after.withPoster,
        beforeWithIdentity: result.before.withIdentity, afterWithIdentity: result.after.withIdentity,
        missing: result.after.total - result.after.withPoster, postersUpdated: result.postersUpdated,
        identitiesSaved: result.identitiesSaved, lookupFailures: result.lookupFailures,
        report: 'work/ott-posters/latest.json' }));
      if (result.lookupFailures) process.exitCode = 2;
    } catch (error) {
      console.error(`OTT_POSTER_ENRICH_FAILED ${error?.code ?? error?.name ?? 'UNKNOWN'}`);
      process.exitCode = 1;
    } finally { await pool.end(); }
  }
}
