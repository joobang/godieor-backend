import test from 'node:test';
import assert from 'node:assert/strict';
import { auditCatalog, auditLive, assessSeason, summarize } from '../scripts/audit-tmdb-season-dates.mjs';

test('catalog discovery differentiates series first date and actual reference date', () => {
  const reference = { rows: [['2026-11-05', 'netflix', '블랙 도브', 2], ['2026-12-01', 'netflix', '없는 작품', 1]] };
  const catalog = { rows: [{ title: '블랙 도브', services: ['netflix'], tmdbId: 225385, type: 'tv', tmdbFirstDate: '2024-12-05' }] };
  const rows = auditCatalog(reference, catalog);
  assert.equal(rows[0].status, 'catalog_match');
  assert.equal(rows[0].matches[0].sameFirstDate, false);
  assert.equal(rows[1].status, 'catalog_missing');
  assert.deepEqual(summarize(rows).catalogStatus, { catalog_match: 1, catalog_missing: 1 });
});

test('season and episode air dates are separately evaluated', async () => {
  const row = { status: 'catalog_match', season: 2, date: '2026-11-05', matches: [{ type: 'tv', tmdbId: 225385 }] };
  await auditLive([row], async () => ({ air_date: '2026-11-04', episodes: [{ air_date: '2026-11-05' }] }));
  assert.equal(row.seasonStatus, 'season_date_match');
  assert.deepEqual(row.episodeDates, ['2026-11-05']);
  assert.equal(assessSeason(row, { air_date: null, episodes: [] }), 'season_undated');
});

test('failed live requests remain visible rather than being counted as missing date', async () => {
  const row = { status: 'catalog_match', season: 7, date: '2026-11-01', matches: [{ type: 'tv', tmdbId: 65334 }] };
  await auditLive([row], async () => { throw new Error('ENOTFOUND'); });
  assert.equal(row.seasonStatus, 'lookup_failed');
});
