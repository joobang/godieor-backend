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
  assert.equal(result.rows[0].classification, 'official_date_conflict');
  assert.equal(result.rows[0].alternateOfficialDates[0].date, '2026-11-04');
  assert.equal(result.total, 1);
});

test('confirmed official date is still a review candidate, not automatic publication', () => {
  const report = { rows: [{ title: '유일무이 로맨스', platform: 'tving', date: '2026-11-09', dateMatched: true }] };
  const result = reconcileGaps(report, [{ platform: 'tving', sourceUrl: 'https://cjnews.cj.net',
    items: [{ title: '유일무이 로맨스', date: '2026-11-09', market: 'KR', premiereConfirmed: true }] }]);
  assert.equal(result.rows[0].classification, 'official_kr_premiere_candidate');
  assert.equal(result.rows[0].publishEligible, false);
});

test('actual Netflix one-day disagreement is preserved for review', () => {
  const report = { rows: [{ title: '오버액션 갱', platform: 'netflix', date: '2026-11-04',
    dateMatched: true, krProviderMatched: true, dates: { movieReleaseDate: '2026-11-04' } }] };
  const lineups = [{ platform: 'netflix', sourceUrl: 'https://about.netflix.com/ko/new-to-watch',
    items: [{ title: '오버액션 갱', date: '2026-11-05', market: 'KR', premiereConfirmed: false }] }];
  const { rows } = reconcileGaps(report, lineups);
  assert.equal(rows[0].classification, 'official_date_conflict');
  assert.equal(rows[0].alternateOfficialDates[0].date, '2026-11-05');
  assert.equal(rows[0].publishEligible, false);
});

test('Korean TV origin is preserved even when target OTT provider is unlisted', () => {
  const report={rows:[{title:'문무',platform:'netflix',date:'2026-11-14',dateMatched:true,
    krProviderMatched:false,koreanOrigin:true,originCountries:['KR'],broadcastNetworks:['KBS2'],
    krProviderNames:['wavve'],otherKoreanProviders:['wavve']}]};
  const row=reconcileGaps(report,[]).rows[0];
  assert.equal(row.classification,'korean_origin_target_provider_unlisted');
  assert.deepEqual(row.broadcastNetworks,['KBS2']);
  assert.equal(row.publishEligible,false);
});

test('official source finds titles omitted by TMDB provider filtering, independently per OTT and date', () => {
  const result = reconcileGaps({rows:[{title:'더 바디',platform:'netflix',date:'2026-11-11',dateMatched:true,
    krProviderMatched:false}]}, [
    {platform:'netflix',sourceUrl:'https://about.netflix.com/ko/news/body',items:[
      {title:'더 바디',date:'2026-11-11',market:'KR',premiereConfirmed:true}]},
    {platform:'tving',sourceUrl:'https://www.tving.com/contents/body',items:[
      {title:'더 바디',date:'2026-11-25',market:'KR',premiereConfirmed:true}]},
  ]);
  assert.equal(result.total,2);
  assert.equal(result.rows[0].classification,'official_kr_premiere_candidate');
  assert.equal(result.rows[1].classification,'official_kr_premiere_without_tmdb_match');
  assert.equal(result.rows[1].platform,'tving');
  assert.equal(result.rows[1].date,'2026-11-25');
  assert.equal(result.rows.every(row => row.publishEligible===false),true);
});
