import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { auditPublished } from '../scripts/audit-ott-published.mjs';

test('compares published dates and seasons without claiming third-party dates are official', () => {
  const reference = { authority: 'third_party_discovery_only', rows: [
    ['2026-11-20', 'netflix', '푸른길', 1],
    ['2026-11-23', 'tving', '대리수능', 1],
    ['2026-12-03', 'coupang_play', '스마일 클리닉', null],
    ['2026-11-21', 'netflix', '푸른길', 1],
    ['2026-12-01', 'tving', '없는 작품', null],
  ] };
  const published = [
    { date: '2026-11-20', platform: 'netflix', title: '푸른길', seasonNumber: null },
    { date: '2026-11-23', platform: 'tving', title: '대리수능', seasonNumber: 1 },
    { date: '2026-12-03', platform: 'coupang_play', title: '스마일 클리닉', seasonNumber: null },
  ];
  const result = auditPublished(reference, published);
  assert.deepEqual(result.statusCounts, { published_match: 2, season_unverified: 1, date_disagreement: 1, not_published: 1 });
  assert.equal(result.publishedInWindow, 3);
});

test('rejects references without discovery-only authority', () => {
  assert.throws(() => auditPublished({ authority: 'official', rows: [] }, []), /INVALID_AUDIT_INPUT/);
});
