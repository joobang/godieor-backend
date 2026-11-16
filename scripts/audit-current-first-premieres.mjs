#!/usr/bin/env node
// StreamPick is used solely as a retrospective audit baseline. No competitor
// dates or titles are passed into official collection, review, or publication.
import { readFile } from 'node:fs/promises';
import { auditPublished } from './audit-ott-published.mjs';

export function auditCurrentFirstPremieres(matrix, published, aliases = [], bindings = []) {
  if (matrix?.referenceRows !== 52 || !Array.isArray(matrix.rows) || matrix.rows.length !== 52)
    throw new Error('REFERENCE_MATRIX_SCHEMA_OR_VERSION_CHANGED');
  const tuples = matrix.rows.map((r) => [r.date, r.platform, r.title, r.season]);
  const reference = { authority: 'third_party_discovery_only', rows: tuples, entries: matrix.rows.map((r) => {
    const ids = (r.candidateMatches ?? []).map((c) => /^tmdb:(tv|movie):(\d+):/.exec(c.id)).filter(Boolean);
    return { date: r.date, platform: r.platform, title: r.title,
      seasonNumber: r.season, contentId: ids.length === 1 ? `tmdb-${ids[0][1]}-${ids[0][2]}` : null };
  }) };
  const result = auditPublished(reference, published, aliases, bindings);
  const unmatched = result.rows.filter((r) => r.status !== 'published_match');
  return {
    referenceRows: result.referenceRows,
    publishedInWindow: result.publishedInWindow,
    exactMatches: result.statusCounts.published_match,
    unresolved: unmatched.length,
    statusCounts: result.statusCounts,
    parity: result.parity,
    unmatched,
    note: 'Third-party comparison only; reference dates cannot authorize a Korean OTT first premiere.',
  };
}

if (process.argv[1]?.endsWith('/audit-current-first-premieres.mjs')) {
  let pool;
  try {
    const { default: pg } = await import('pg');
    const [matrix, aliases, bindings] = await Promise.all([
      'docs/tasks/evidence/data56/case-matrix.json',
      'data/reference/ott-parity-verified-aliases-2026-11-13.json',
      'data/curated/ott-official-tmdb-bindings-2026-11-13.json',
    ].map((p) => readFile(p, 'utf8').then(JSON.parse)));
    if (!process.env.DATABASE_URL) throw Error('DATABASE_URL_REQUIRED');
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
    const { rows } = await pool.query(`SELECT DISTINCT e.local_date::text AS date, e.title, es.service::text AS platform,
      ds.season_number AS "seasonNumber" FROM event e JOIN event_source src ON src.event_id=e.id
      JOIN event_service es ON es.event_id=e.id LEFT JOIN drama_season ds ON ds.id=e.season_id
      WHERE src.provider_key='ott_reviewed' AND e.release_market='KR'
      AND e.local_date >= DATE '2026-11-01' AND e.local_date < DATE '2027-01-01'`);
    const report = auditCurrentFirstPremieres(matrix, rows, aliases.items, bindings.items);
    console.log(JSON.stringify(report, null, 2));
    if (!report.parity) process.exitCode = 2;
  } catch (e) {
    console.error('FIRST_PREMIERE_AUDIT_FAILED:', e.message);
    process.exitCode = 1;
  } finally { await pool?.end(); }
}
