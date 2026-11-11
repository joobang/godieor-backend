#!/usr/bin/env node
// Compare actual locally published reviewed events with third-party discovery leads.
// The reference is not evidence of a Korean premiere, and this command never writes.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const normalized = (s) => s.normalize('NFKC').toLocaleLowerCase('ko').replace(/[\s\p{P}\p{S}]/gu, '');
const identity = (platform, title) => `${platform}|${normalized(title)}`;
const supported = new Set(['netflix', 'tving', 'disney_plus', 'coupang_play']);

export function auditPublished(reference, published) {
  if (reference?.authority !== 'third_party_discovery_only' || !Array.isArray(reference.rows) || !Array.isArray(published)) {
    throw new Error('INVALID_AUDIT_INPUT');
  }
  const byTitle = new Map();
  const byMonth = {};
  for (const item of published) {
    if (!supported.has(item.platform) || typeof item.title !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
      throw new Error('INVALID_PUBLISHED_ROW');
    }
    const key = identity(item.platform, item.title);
    const list = byTitle.get(key) ?? [];
    list.push(item);
    byTitle.set(key, list);
    if (/^2026-(11|12)-/.test(item.date)) {
      const monthKey = `${item.date.slice(0, 7)}/${item.platform}`;
      byMonth[monthKey] = (byMonth[monthKey] ?? 0) + 1;
    }
  }
  const rows = [];
  for (const [date, platform, title, season] of reference.rows) {
    if (!/^2026-(11|12)-\d{2}$/.test(date) || !supported.has(platform) || typeof title !== 'string' ||
      !(season === null || Number.isInteger(season) && season > 0)) throw new Error('INVALID_REFERENCE_ROW');
    const candidates = byTitle.get(identity(platform, title)) ?? [];
    const dated = candidates.filter((entry) => entry.date === date);
    // Unknown published season is not proof that a listed season matches.
    const confirmed = dated.some((entry) => season === null || entry.seasonNumber === season);
    rows.push({ date, platform, title, season, status: confirmed ? 'published_match' : dated.length ? 'season_unverified' :
      candidates.length ? 'date_disagreement' : 'not_published' });
  }
  const statusCounts = Object.fromEntries(['published_match', 'season_unverified', 'date_disagreement', 'not_published'].map(
    (status) => [status, rows.filter((row) => row.status === status).length],
  ));
  return {
    scope: 'local_reviewed_ott_only',
    referenceAuthority: 'third_party_discovery_only',
    referenceRows: rows.length,
    publishedInWindow: Object.values(byMonth).reduce((sum, n) => sum + n, 0),
    publishedByMonthPlatform: byMonth,
    statusCounts,
    rows,
    note: '제3자 목록과 로컬 게시물 비교. 미게시 행을 실제 한국 공개로 간주하지 않음. 날짜만 같아도 시즌 미확인은 별도 표시.',
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  let pool;
  try {
    const [{ default: pg }, reference] = await Promise.all([
      import('pg'), readFile(process.argv[2] ?? 'data/reference/streampick-2026-11-12-titles.json', 'utf8').then(JSON.parse),
    ]);
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL_REQUIRED');
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
    const result = await pool.query(`
      SELECT DISTINCT e.local_date::text AS date, e.title, es.service AS platform, ds.season_number AS "seasonNumber"
      FROM event e
      JOIN event_source src ON src.event_id = e.id
      JOIN event_service es ON es.event_id = e.id
      LEFT JOIN drama_season ds ON ds.id = e.season_id
      WHERE src.provider_key = 'ott_reviewed' AND e.release_market = 'KR'
        AND e.local_date >= DATE '2026-11-01' AND e.local_date < DATE '2027-01-01'
      ORDER BY date, e.title, platform
    `);
    console.log(JSON.stringify(auditPublished(reference, result.rows), null, 2));
  } catch (error) {
    console.error('OTT_PUBLISHED_AUDIT_FAILED:', error.message);
    process.exitCode = 1;
  } finally { await pool?.end(); }
}
