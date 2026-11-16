import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { verifiedReviewProposals } from '../scripts/auto-review-verified-premieres.mjs';

const input = async () => Promise.all([
  readFile('work/ott-candidates/state.json', 'utf8').then(JSON.parse),
  readFile('work/tmdb-release-candidates/latest.json', 'utf8').then(JSON.parse),
]);

test('freshly validated reviewed official premiere can be promoted exactly once', async () => {
  const [state, report] = await input();
  const row = report.rows.find((r) => r.readyForBatchReview && r.officialEvidence?.some((e) =>
    state.candidates.some((c) => c.id === e.reviewCandidateId && c.revisions.at(-1).lineupEvidence)));
  assert.ok(row);
  const binding = row.officialEvidence.find((e) =>
    state.candidates.some((c) => c.id === e.reviewCandidateId && c.revisions.at(-1).lineupEvidence));
  const target = state.candidates.find((c) => c.id === binding.reviewCandidateId);
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
  assert.equal(verifiedReviewProposals({ ...report, rows: report.rows.map((r) => ({
    ...r, readyForBatchReview: false })) }, state).proposals.length, 0);
});
