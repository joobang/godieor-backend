import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcileOfficialLineups } from '../scripts/audit-ott-lineup-published.mjs';

test('official Korean premiere with the same published date is accounted for', () => {
  const lineups = [{ platform: 'netflix', sourceUrl: 'https://about.netflix.com/ko/news/test', items: [
    { title: '작품 A', date: '2026-11-20', market: 'KR', premiereConfirmed: true, seasonNumber: 1 },
    { title: '작품 B', date: '2026-12-01', market: 'KR', premiereConfirmed: false },
  ] }];
  const result = reconcileOfficialLineups(lineups, [{ title: '작품 A', date: '2026-11-20', platform: 'netflix', seasonNumber: 1 }]);
  assert.equal(result.officialVerified, 1);
  assert.equal(result.published, 1);
  assert.equal(result.missingPublication, 0);
});

test('unpublished official and mismatched seasons are never counted as published', () => {
  const lineups = [{ platform: 'tving', sourceUrl: 'https://www.tvingads.com/content', items: [
    { title: '작품 A', date: '2026-11-20', market: 'KR', premiereConfirmed: true, seasonNumber: 3 },
    { title: '작품 B', date: '2026-12-08', market: 'KR', premiereConfirmed: true },
  ] }];
  const result = reconcileOfficialLineups(lineups, [{ title: '작품 A', date: '2026-11-20', platform: 'tving', seasonNumber: 2 }]);
  assert.equal(result.seasonRequiresReview, 1);
  assert.equal(result.missingPublication, 1);
  assert.deepEqual(result.rows.map((r) => r.status), ['season_requires_review', 'missing_publication']);
});
