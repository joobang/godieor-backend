import test from 'node:test';
import assert from 'node:assert/strict';
import { auditLiveRecall } from '../scripts/audit-tmdb-live-recall.mjs';

test('independent live recall audit never treats TMDB provider match as publishable release', () => {
  const reference = { rows: [{ date: '2026-11-02', platform: 'netflix', title: 'Series', season: 2,
    candidateMatches: [{ id: 'tmdb:tv:1:2:KR:netflix' }] }] };
  const previous = { rows: [{ date: '2026-11-02', platform: 'netflix', title: 'Series', seasonNumber: 2,
    candidateStatus: 'candidate_platform_date_match' }] };
  const latest = { discoveredWorks: 33, total: 2, discoveryComplete: false, errors: [], discoveryCoverage: [{ truncated: true, kind: 'tv', filter: 'unmapped_air_date' }],
    rows: [{ id: 'tmdb:tv:1:2:KR:netflix', dateHint: '2026-11-02', readyForBatchReview: false }] };
  const result = auditLiveRecall(reference, previous, latest);
  assert.equal(result.retainedCandidateDateMatches, 1);
  assert.equal(result.readyForBatchReview, 0);
  assert.equal(result.collection.truncatedFilters.length, 1);
  assert.equal(result.results[0].status, 'tmdb_candidate_only');
});

test('raw stage-one discovery counts TMDB identity only, not a season premiere', () => {
  const reference = { rows: [{ date: '2026-11-02', platform: 'netflix', title: 'Series', season: 2,
    candidateMatches: [{ id: 'tmdb:tv:1:2:KR:netflix' }] }] };
  const previous = { rows: [{ date: '2026-11-02', platform: 'netflix', title: 'Series', seasonNumber: 2,
    candidateStatus: 'candidate_platform_date_match' }] };
  const latest = { rows: [{ tmdbId: 1, type: 'tv', title: 'Series', discoveredBy: ['unmapped_air_date'] }],
    coverage: [{ truncated: false }], discoveryComplete: false };
  const result = auditLiveRecall(reference, previous, latest);
  assert.equal(result.previousIdentityMissing, 0);
  assert.equal(result.retainedCandidateDateMatches, 0);
  assert.equal(result.readyForBatchReview, 0);
  assert.equal(result.collection.discoveredWorks, 1);
});
