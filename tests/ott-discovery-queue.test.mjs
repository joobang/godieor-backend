import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { buildDiscoveryQueue } from '../scripts/build-ott-discovery-queue.mjs';

test('reference only creates blocked investigation tasks', () => {
  const reference = { authority: 'third_party_discovery_only', rows: [['2026-11-11', 'netflix', '미확인', 1]] };
  const state = { stage: 'lineup-review-staging', candidates: [] };
  const queue = buildDiscoveryQueue(reference, state);
  assert.equal(queue.pendingInvestigation, 1);
  assert.equal(queue.tasks[0].reason, 'title_not_staged');
  assert.equal(queue.publishingAllowed, false);
  assert.equal(queue.reviewed, false);
});

test('matched titles are not treated as missing; date disagreement is investigated', () => {
  const reference = { authority: 'third_party_discovery_only', rows: [['2026-12-01', 'tving', '작품', 1]] };
  const state = { stage: 'lineup-review-staging', candidates: [{ candidate: { title: '작품', platform: 'tving', seasonNumber: 1, date: '2026-12-02' } }] };
  const queue = buildDiscoveryQueue(reference, state);
  assert.equal(queue.matchedTitles, 1);
  assert.equal(queue.tasks[0].reason, 'date_disagreement');
});
