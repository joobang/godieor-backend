#!/usr/bin/env node
// Compare actual locally published reviewed events with third-party discovery leads.
// The reference is not evidence of a Korean premiere, and this command never writes.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const normalized = (s) => s.normalize('NFKC').toLocaleLowerCase('ko').replace(/[\s\p{P}\p{S}]/gu, '');
const identity = (platform, title) => `${platform}|${normalized(title)}`;
const supported = new Set(['netflix', 'tving', 'disney_plus', 'coupang_play']);

export function auditPublished(reference, published, aliasEvidence = [], identityEvidence = []) {
  if (reference?.authority !== 'third_party_discovery_only' || !Array.isArray(reference.rows) || reference.rows.length === 0 || !Array.isArray(published)) {
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
  const referenceKeys = new Set();
  const matchedPublished = new Set();
  const publishedKey = (e) => JSON.stringify([e.platform, e.title, e.date, e.seasonNumber ?? null]);
  for (const [date, platform, title, season] of reference.rows) {
    if (!/^2026-(11|12)-\d{2}$/.test(date) || !supported.has(platform) || typeof title !== 'string' ||
      !(season === null || Number.isInteger(season) && season > 0)) throw new Error('INVALID_REFERENCE_ROW');
    const referenceKey = JSON.stringify([date, platform, normalized(title), season]);
    if (referenceKeys.has(referenceKey)) throw new Error('DUPLICATE_REFERENCE_ROW');
    referenceKeys.add(referenceKey);
    const direct = byTitle.get(identity(platform, title)) ?? [];
    // Provider-verified title aliases are tied to a platform, date and season.
    // This prevents a similar translated title or a later season from matching.
    const aliased = aliasEvidence.filter((e) => e.platform === platform && e.date === date &&
      Array.isArray(e.aliases) && e.aliases.some((alias) => normalized(alias) === normalized(title)) &&
      (season === null || e.seasonNumber === season))
      .flatMap((e) => byTitle.get(identity(platform, e.title)) ?? [])
      .filter((e) => e.date === date);
    const refEntry = reference.entries?.find((e) => e.date === date && e.platform === platform && e.title === title && e.seasonNumber === season);
    const identityMatches = refEntry ? identityEvidence.filter((e) => e.identityVerified === true && e.market === 'KR' &&
      e.platform === platform && e.date === date && e.seasonNumber === season &&
      refEntry.contentId === `tmdb-${e.type}-${e.tmdbId}`).flatMap((e) => byTitle.get(identity(platform, e.title)) ?? []) : [];
    const candidates = [...new Map([...direct, ...aliased, ...identityMatches].map((e) =>
      [`${e.platform}|${e.title}|${e.date}|${e.seasonNumber ?? ''}`, e])).values()];
    const dated = candidates.filter((entry) => entry.date === date);
    // Unknown published season is not proof that a listed season matches.
    const exact = dated.filter((entry) => season === null || entry.seasonNumber === season);
    const confirmed = exact.length > 0;
    for (const entry of exact) matchedPublished.add(publishedKey(entry));
    rows.push({ date, platform, title, season, identityMethod: identityMatches.some((e) => exact.includes(e)) ? 'reviewed_tmdb_id' : confirmed ? 'title_or_reviewed_alias' : null, status: confirmed ? 'published_match' : dated.length ? 'season_unverified' :
      candidates.length ? 'date_disagreement' : 'not_published' });
  }
  const statusCounts = Object.fromEntries(['published_match', 'season_unverified', 'date_disagreement', 'not_published'].map(
    (status) => [status, rows.filter((row) => row.status === status).length],
  ));
  return {
    scope: 'local_reviewed_ott_only',
    referenceAuthority: 'third_party_discovery_only',
    referenceRows: rows.length,
    countAtLeastReference: Object.values(byMonth).reduce((sum, n) => sum + n, 0) >= rows.length,
    coverageByMonthPlatform: ['2026-11', '2026-12'].flatMap((month) => [...supported].map((platform) => {
      const key = `${month}/${platform}`;
      const referenceRows = rows.filter((r) => r.date.startsWith(month) && r.platform === platform);
      const exactMatches = referenceRows.filter((r) => r.status === 'published_match').length;
      return { month, platform, reference: referenceRows.length, published: byMonth[key] ?? 0, exactMatches,
        countDeficit: Math.max(0, referenceRows.length - (byMonth[key] ?? 0)),
        unresolved: referenceRows.length - exactMatches };
    })),
    parity: statusCounts.published_match === rows.length,
    unmatchedReferenceRows: rows.length - statusCounts.published_match,
    publishedWithoutExactReference: published.filter((e) => !matchedPublished.has(publishedKey(e))),
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
    const identityFile = process.argv.find((arg) => arg.startsWith('--identity-bindings='))?.slice('--identity-bindings='.length);
    const [{ default: pg }, reference, aliases, identities] = await Promise.all([
      import('pg'), readFile(process.argv[2] ?? 'data/reference/streampick-2026-11-12-titles.json', 'utf8').then(JSON.parse),
      readFile(process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : 'data/lineups/netflix-kr-2026-11-alicia-premiere-confirmed.json', 'utf8').then(JSON.parse),
      identityFile ? readFile(identityFile, 'utf8').then(JSON.parse) : Promise.resolve({ items: [] }),
    ]);
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL_REQUIRED');
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
    const result = await pool.query(`
      SELECT DISTINCT e.id, e.local_date::text AS date, e.title, es.service AS platform, ds.season_number AS "seasonNumber"
      FROM event e
      JOIN event_source src ON src.event_id = e.id
      JOIN event_service es ON es.event_id = e.id
      LEFT JOIN drama_season ds ON ds.id = e.season_id
      WHERE src.provider_key = 'ott_reviewed' AND e.release_market = 'KR'
        AND e.local_date >= DATE '2026-11-01' AND e.local_date < DATE '2027-01-01'
      ORDER BY date, e.title, platform
    `);
    const report = auditPublished(reference, result.rows,
      aliases.items.map((item) => ({ ...item, platform: item.platform ?? aliases.platform })), identities.items);
    console.log(JSON.stringify(report, null, 2));
    if (process.argv.includes('--require-parity') && !report.parity) process.exitCode = 2;
  } catch (error) {
    console.error('OTT_PUBLISHED_AUDIT_FAILED:', error.message);
    process.exitCode = 1;
  } finally { await pool?.end(); }
}
