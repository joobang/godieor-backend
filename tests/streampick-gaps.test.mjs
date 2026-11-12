import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcileGaps } from '../scripts/reconcile-streampick-gaps.mjs';

test('KR official listing without premiere confirmation stays excluded from publication', () => {
  const report = { rows: [{ title: '스타일 워즈', platform: 'disney_plus', date: '2026-11-11',
    dateMatched: true, krProviderMatched: false, dates: { seasonFirstDate: '2026-11-11' } }] };
  const lineups = [{ platform: 'disney_plus', sourceUrl: 'https://www.disneyplus.com/ko-kr',
    items: [{ title: '스타일 워즈', date: '2026-11-11', market: 'KR', premiereConfirmed: false }] }];
  const result = reconcileGaps(report, lineups);
  assert.equal(result.rows[0].classification, 'official_kr_listing_needs_premiere_review');
  assert.equal(result.rows[0].publishEligible, false);
  assert.equal(result.publishedCountDelta, 0);
});

test('provider availability does not imply Korean premiere and official dates must match', () => {
  const report = { rows: [{ title: '가나다', platform: 'netflix', date: '2026-11-03', dateMatched: true, krProviderMatched: true }] };
  const result = reconcileGaps(report, [{ platform: 'netflix', sourceUrl: 'https://www.netflix.com/kr',
    items: [{ title: '가나다', date: '2026-11-04', market: 'KR', premiereConfirmed: true }] }]);
  assert.equal(result.rows[0].classification, 'tmdb_date_and_provider_only');
});

test('confirmed official date is still a review candidate, not automatic publication', () => {
  const report = { rows: [{ title: '유일무이 로맨스', platform: 'tving', date: '2026-11-09', dateMatched: true }] };
  const result = reconcileGaps(report, [{ platform: 'tving', sourceUrl: 'https://cjnews.cj.net',
    items: [{ title: '유일무이 로맨스', date: '2026-11-09', market: 'KR', premiereConfirmed: true }] }]);
  assert.equal(result.rows[0].classification, 'official_kr_premiere_candidate');
  assert.equal(result.rows[0].publishEligible, false);
});
