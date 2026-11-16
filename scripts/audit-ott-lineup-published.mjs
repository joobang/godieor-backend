#!/usr/bin/env node
// Reconcile first-party Korean lineup evidence with actually published OTT events.
// Third-party listings and TMDB catalog dates are intentionally excluded.
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const supported = new Set(['netflix', 'tving', 'disney_plus', 'coupang_play']);
const normalize = (text) => text.normalize('NFKC').toLocaleLowerCase('ko').replace(/[\s\p{P}\p{S}]/gu, '');
const identity = (row) => [row.platform, normalize(row.title), row.date].join('|');

export function reconcileOfficialLineups(lineups, published) {
  if (!Array.isArray(lineups) || !Array.isArray(published)) throw new Error('INVALID_INPUT');
  const evidence = new Map();
  for (const lineup of lineups) {
    if (!supported.has(lineup.platform) || !Array.isArray(lineup.items) || typeof lineup.sourceUrl !== 'string') throw new Error('INVALID_LINEUP');
    for (const item of lineup.items) {
      if (item.market !== 'KR' || item.premiereConfirmed !== true || !/^2026-(11|12)-\d\d$/.test(item.date ?? '')) continue;
      if (typeof item.title !== 'string' || !item.title.trim()) throw new Error('INVALID_TITLE');
      const row = { platform: lineup.platform, title: item.title, date: item.date,
        seasonNumber: item.seasonNumber ?? null, sourceUrl: lineup.sourceUrl };
      const key = identity(row);
      if (!evidence.has(key)) evidence.set(key, []);
      evidence.get(key).push(row);
    }
  }
  const publishedByKey = new Map();
  for (const row of published) {
    if (!supported.has(row.platform) || typeof row.title !== 'string' || typeof row.date !== 'string') throw new Error('INVALID_PUBLISHED');
    const key = identity(row);
    if (!publishedByKey.has(key)) publishedByKey.set(key, []);
    publishedByKey.get(key).push(row);
  }
  const rows = [...evidence.values()].map((items) => {
    const row = items[0];
    const matches = publishedByKey.get(identity(row)) ?? [];
    const seasons = [...new Set(items.map((x) => x.seasonNumber))];
    const confirmed = matches.some((entry) => seasons.includes(null) || seasons.includes(entry.seasonNumber));
    return { ...row, status: confirmed ? 'published' : matches.length ? 'season_requires_review' : 'missing_publication',
      evidenceSources: [...new Set(items.map((x) => x.sourceUrl))] };
  }).sort((a, b) => a.date.localeCompare(b.date) || a.platform.localeCompare(b.platform) || a.title.localeCompare(b.title, 'ko'));
  return { scope: 'official_KR_premiere_2026_11_12', officialVerified: rows.length,
    published: rows.filter((x) => x.status === 'published').length,
    missingPublication: rows.filter((x) => x.status === 'missing_publication').length,
    seasonRequiresReview: rows.filter((x) => x.status === 'season_requires_review').length, rows };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  let pool;
  try {
    const dir = process.argv[2] ?? 'data/lineups';
    const lineups = await Promise.all((await readdir(dir)).filter((name) => name.endsWith('.json'))
      .map((name) => readFile(resolve(dir, name), 'utf8').then(JSON.parse)));
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL_REQUIRED');
    const { default: pg } = await import('pg');
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
    const result = await pool.query(`SELECT DISTINCT e.local_date::text AS date, e.title, es.service::text AS platform,
      ds.season_number AS "seasonNumber" FROM event e JOIN event_source src ON src.event_id=e.id
      JOIN event_service es ON es.event_id=e.id LEFT JOIN drama_season ds ON ds.id=e.season_id
      WHERE src.provider_key='ott_reviewed' AND e.release_market='KR'
      AND e.local_date >= DATE '2026-11-01' AND e.local_date < DATE '2027-01-01'`);
    console.log(JSON.stringify(reconcileOfficialLineups(lineups, result.rows), null, 2));
  } catch (error) {
    console.error('OTT_LINEUP_RECONCILIATION_FAILED:', error.message);
    process.exitCode = 1;
  } finally { await pool?.end(); }
}
