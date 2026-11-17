import test from 'node:test';
import assert from 'node:assert/strict';
import { triageIgdbAudit } from '../scripts/triage-igdb-source-gaps.mjs';

const baseRow = {
  release_id: '11', variant_key: 'world-6', event_id: 'original-id',
  title: 'Synthetic', release_market: 'WORLD', date: '2026-11-03',
  originalReleaseRegion: null, status: 'possible_successor_dated',
  claims: [{ releaseId: 22, date: '2026-11-10', storedEventIds: ['other-id'] }],
  databaseMutations: 0, automaticRebindingAllowed: false,
};
const audit = rows => ({ kind: 'igdb-source-gap-audit', checked: rows.length,
  rows, checkedAt: '2026-11-17', manifestSha256: 'digest',
  currentReleaseQueryComplete: true, publishingAllowed: false, databaseMutations: 0 });

test('potential duplicate public event is held with original and competing IDs preserved', () => {
  const report = triageIgdbAudit(audit([baseRow]));
  assert.equal(report.categoryCounts.potential_duplicate_review, 1);
  assert.equal(report.rows[0].publicEventId, 'original-id');
  assert.deepEqual(report.rows[0].possibleOtherPublicEventIds, ['other-id']);
  assert.equal(report.rows[0].automaticAliasAllowed, false);
  assert.equal(report.rows[0].automaticMergeAllowed, false);
  assert.equal(report.rows[0].automaticUnpublishAllowed, false);
  assert.equal(report.databaseMutations, 0);
});

test('partial and unknown date candidate cannot be promoted to calendar publication', () => {
  const row = { ...baseRow, status: 'possible_successor_partial_or_undated',
    claims: [{ releaseId: 22, date: null, storedEventIds: [] }] };
  const result = triageIgdbAudit(audit([row])).rows[0];
  assert.equal(result.category, 'insufficient_source_evidence');
  assert.deepEqual(result.sourceDates, [null]);
  assert.equal(result.proposedDisposition, 'hold_for_manual_review');
});

test('incomplete or altered audit is rejected without giving an alias decision', () => {
  for (const altered of [
    { ...audit([baseRow]), publishingAllowed: true },
    { ...audit([baseRow]), currentReleaseQueryComplete: false },
    audit([{ ...baseRow, automaticRebindingAllowed: true }]),
    audit([{ ...baseRow, status: 'invented_verified' }]),
  ]) assert.throws(() => triageIgdbAudit(altered), /UNTRUSTED_IGDB_AUDIT/);
});
