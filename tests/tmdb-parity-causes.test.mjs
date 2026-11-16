import test from 'node:test';
import assert from 'node:assert/strict';
import { auditParityCauses } from '../scripts/audit-tmdb-parity-causes.mjs';

test('retrospective audit separates discovery, provider and publish evidence without creating candidates', () => {
  const reference = { rows: [
    { date: '2026-11-02', platform: 'netflix', title: 'A', season: 20, status: 'not_published', candidateMatches: [] },
    { date: '2026-11-03', platform: 'tving', title: 'B', season: 2, status: 'not_published', candidateMatches: [{ id: 'tmdb:tv:2:2', platformEvidence: 'tmdb_series_provider_hint_only' }] },
    { date: '2026-11-04', platform: 'netflix', title: 'C', season: 1, status: 'published_match', candidateMatches: [] },
  ] };
  const discovery = { rows: [
    { date: '2026-11-02', platform: 'netflix', title: 'A', seasonNumber: 20, candidateStatus: 'not_discovered' },
    { date: '2026-11-03', platform: 'tving', title: 'B', seasonNumber: 2, candidateStatus: 'candidate_platform_date_match' },
    { date: '2026-11-04', platform: 'netflix', title: 'C', seasonNumber: 1, candidateStatus: 'candidate_platform_date_match' },
  ] };
  const result = auditParityCauses(reference, discovery);
  assert.equal(result.referenceTotal, 3);
  assert.equal(result.publishedMatches, 1);
  assert.equal(result.candidateDiscoveryMatches, 2);
  assert.deepEqual(result.counts, { published_match: 1, series_provider_only: 1, tmdb_season_not_discovered: 1 });
  assert.equal(discovery.rows.length, 3);
});
