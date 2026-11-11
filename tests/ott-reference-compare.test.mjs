import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { compareReference } from '../scripts/compare-ott-reference.mjs';

test('missing references and KR confirmation are kept separate', () => {
  const ref = { authority: 'third_party_discovery_only', rows: [
    ['2026-11-20', 'netflix', '푸른길', 1],
    ['2026-12-01', 'tving', '미등록', 2],
  ] };
  const state = { stage: 'lineup-review-staging', candidates: [{ candidate: {
    platform: 'netflix', title: '푸른길', seasonNumber: null, date: '2026-11-20', market: 'KR', premiereConfirmed: true,
  } }] };
  const result = compareReference(ref, state);
  assert.equal(result.counts['2026-11/netflix'].krConfirmed, 1);
  assert.equal(result.counts['2026-12/tving'].missing, 1);
  assert.equal(result.missing[0].title, '미등록');
});

test('same title with different date is not a verified match', () => {
  const ref = { authority: 'third_party_discovery_only', rows: [['2026-12-08', 'disney_plus', '드라마', 2]] };
  const state = { stage: 'lineup-review-staging', candidates: [{ candidate: {
    platform: 'disney_plus', title: '드라마', seasonNumber: 2, date: '2026-12-09', market: null, premiereConfirmed: false,
  } }] };
  const result = compareReference(ref, state);
  assert.equal(result.counts['2026-12/disney_plus'].dateMismatch, 1);
  assert.equal(result.counts['2026-12/disney_plus'].krConfirmed, 0);
});
