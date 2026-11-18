import test from 'node:test';
import assert from 'node:assert/strict';
import { verifiedReviewProposals } from '../scripts/auto-review-verified-premieres.mjs';

function input() {
  const title = '가상 영화';
  const date = '2026-11-20';
  const url = 'https://example.test/synthetic-premiere';
  const release = { title, date, market: 'KR', platform: 'netflix', seasonNumber: null };
  const binding = { ...release, type: 'movie', tmdbId: 42, reviewCandidateId: 'synthetic',
    sourceUrl: url, identityVerified: true, premiereConfirmed: true,
    sourceRefreshStatus: 'matched', evidence: '가상 공식 최초 공개 확인' };
  const candidate = { id: 'synthetic', url, review: { value: release },
    revisions: [{ token: 'synthetic-revision', lineupEvidence: release }] };
  const row = { ...release, type: 'movie', tmdbId: 42, officialPlatformDate: date,
    readyForBatchReview: true, officialEvidence: [binding] };
  return [{ candidates: [candidate] }, {
    kind: 'tmdb-first-ott-release-review', referenceInputUsed: false, rows: [row],
  }];
}

test('freshly validated reviewed official premiere can be promoted exactly once', async () => {
  const [state, report] = await input();
  const [row] = report.rows;
  const [binding] = row.officialEvidence;
  const [target] = state.candidates;
  target.review = null;
  const result = verifiedReviewProposals({ ...report, rows: [row] }, state);
  assert.equal(result.proposals.length, 1);
  assert.equal(result.proposals[0].date, binding.date);
  assert.equal(result.proposals[0].premiereConfirmed, true);
  assert.equal(result.proposals[0].id, target.id);
  assert.equal(verifiedReviewProposals({ ...report, rows: [{ ...row, officialEvidence: [
    { ...binding, premiereConfirmed: false }] }] }, state).proposals.length, 0);
  assert.equal(verifiedReviewProposals({ ...report, rows: [{ ...row, officialEvidence: [
    { ...binding, sourceRefreshStatus: 'lookup_failed' }] }] }, state).proposals.length, 0);
  assert.equal(verifiedReviewProposals({ ...report, rows: [{ ...row, officialEvidence: [
    { ...binding, date: '2026-12-31' }] }] }, state).proposals.length, 0);
});

test('previously reviewed records remain unchanged and unverified TMDB dates do not promote', async () => {
  const [state, report] = await input();
  assert.equal(verifiedReviewProposals(report, state).proposals.length, 0);
  state.candidates[0].review = null;
  assert.equal(verifiedReviewProposals({ ...report, rows: report.rows.map((r) => ({
    ...r, readyForBatchReview: false })) }, state).proposals.length, 0);
});
