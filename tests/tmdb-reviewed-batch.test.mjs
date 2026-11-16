import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { prepareTmdbReviewedBatch } from '../scripts/prepare-tmdb-reviewed-batch.mjs';
const require = createRequire(import.meta.url);
const c = require('../dist/src/ott-candidates/domain/candidate');
function fixture() {
  const state = { version: 2, stage: 'candidate-not-published', candidates: [], attempts: {} };
  const now = '2026-11-16T00:00:00Z', url = 'https://about.netflix.com/ko/news/synthetic-batch';
  const id = c.addCandidate(state, { source: 'netflix', url, headline: 'Synthetic show', publishedRaw: null, evidenceRevision: 'synthetic-one' }, now);
  const revision = state.candidates[0].revisions.at(-1).token;
  c.applyReview(state, { id, revision, reviewer: 'synthetic-implementer', title: 'Synthetic show', platform: 'netflix',
    market: 'KR', contentKind: 'drama', premiereConfirmed: true, date: '2026-11-05', localTime: null,
    timeZone: null, seasonNumber: 2, announcedYear: 2026, announcedPeriod: null, evidence: 'Synthetic explicit season release' }, now);
  const binding = { type: 'tv', tmdbId: 100, seasonNumber: 2, platform: 'netflix', date: '2026-11-05', market: 'KR',
    sourceUrl: url, title: 'Synthetic show', evidence: 'Synthetic explicit release', identityVerified: true,
    premiereConfirmed: true, sourceRefreshStatus: 'matched', reviewCandidateId: id };
  const row = { id: 'tmdb:tv:100:2:KR:netflix', type: 'tv', tmdbId: 100, seasonNumber: 2, platform: 'netflix',
    dateHint: '2026-11-05', officialPlatformDate: '2026-11-05', officialEvidence: [binding], readyForBatchReview: true };
  return { state, binding, report: { kind: 'tmdb-first-ott-release-review', referenceInputUsed: false, rows: [row] },
    mappings: { version: 1, mappings: [{ candidateId: id, revision, contentKey: 'synthetic-work', eventKey: 'synthetic-event' }] } };
}
const run = (f) => prepareTmdbReviewedBatch(f.report, [f.binding], f.state, f.mappings);

test('fresh dual check preserves existing opaque key and full publication snapshot', () => {
  const f = fixture(), result = run(f);
  assert.equal(result.freshDualCheckedExistingRecords, 1);
  assert.equal(result.records[0].eventKey, 'synthetic-event');
  assert.equal(result.newMappingsAssigned, 0);
  assert.deepEqual(result.mappingInput, f.mappings);
});

test('ready flag alone cannot bypass failed primary source validation', () => {
  const f = fixture(); f.report.rows[0].officialEvidence[0].sourceRefreshStatus = 'lookup_failed';
  assert.equal(run(f).freshDualCheckedExistingRecords, 0);
});

test('same date and season cannot bind a different reviewed title or source', () => {
  const f = fixture(); f.state.candidates[0].review.value.title = 'Another work';
  assert.equal(run(f).blocked[0].reason, 'review_or_source_revision_changed');
  const g = fixture(); g.binding.sourceUrl = 'https://about.netflix.com/ko/news/another-source';
  assert.equal(run(g).freshDualCheckedExistingRecords, 0);
});

test('a stale source revision rejects the entire mapping snapshot before publication', () => {
  const f = fixture(); f.state.candidates[0].revisions.at(-1).token = 'a'.repeat(64);
  assert.throws(() => run(f), /STALE_MAPPING/);
});

test('competitor-seeded results cannot enter the independent discovery batch', () => {
  const f = fixture(); f.report.referenceInputUsed = true;
  assert.throws(() => run(f), /INVALID_VERIFIED_BATCH_INPUT/);
});
