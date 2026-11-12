import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { reconcileGaps, withCandidateEvidence } from '../scripts/reconcile-streampick-gaps.mjs';

test('DATA-39 four reviewed Netflix KR premieres resolve missing provider hints without merging the date conflict', () => {
  const confirmed = JSON.parse(readFileSync(new URL('../data/lineups/netflix-kr-2026-11-four-premieres-confirmed.json', import.meta.url)));
  const report = { rows: [
    { title: '배스 X 마키나', platform: 'netflix', date: '2026-11-03', seasonNumber: 1, dateMatched: true },
    { title: '반려견의 완벽한 크리스마스', platform: 'netflix', date: '2026-11-04', dateMatched: true },
    { title: '시한부 1년, 남자를 사다', platform: 'netflix', date: '2026-11-05', dateMatched: true },
    { title: '더 바디', platform: 'netflix', date: '2026-11-11', seasonNumber: 1, dateMatched: true },
    { title: '오버액션 갱', platform: 'netflix', date: '2026-11-04', dateMatched: true },
  ] };
  const prior = { platform: 'netflix', sourceUrl: confirmed.sourceUrl, items: [
    ...confirmed.items.map((item) => ({ ...item, premiereConfirmed: false })),
    { title: '오버액션 갱', date: '2026-11-05', market: 'KR', premiereConfirmed: false },
  ] };
  const reconciled = reconcileGaps(report, [prior, confirmed], { includeOfficialDiscoveries: false });
  assert.equal(reconciled.total, 5);
  assert.equal(reconciled.summary.official_kr_premiere_candidate, 4);
  assert.equal(reconciled.summary.official_date_conflict, 1);
  assert.equal(reconciled.rows.every((row) => row.publishEligible === false), true);
});

test('latest Netflix KR candidate evidence resolves a stale TMDB-only gap without publishing', () => {
  const report = { rows: [{ title: '더 바디', platform: 'netflix', date: '2026-11-11',
    seasonNumber: 1, dateMatched: true, krProviderMatched: false }] };
  const state = { candidates: [{ id: 'candidate-1', url: 'https://about.netflix.com/ko/new-to-watch',
    revisions: [{ token: 'revision-2', lineupEvidence: { title: '더 바디', platform: 'netflix',
      market: 'KR', date: '2026-11-11', seasonNumber: 1, premiereConfirmed: false } }],
    review: { value: { revision: 'revision-1' } } }] };
  const merged = withCandidateEvidence(report, [], state);
  const result = reconcileGaps(report, merged);
  assert.equal(result.total, 1);
  assert.equal(result.rows[0].classification, 'official_kr_listing_needs_premiere_review');
  assert.equal(result.rows[0].officialCandidates[0].candidateId, 'candidate-1');
  assert.equal(result.rows[0].officialCandidates[0].reviewStatus, 'needs_review');
  assert.equal(result.rows[0].publishEligible, false);
});

test('same official source/title/date is enriched without duplicate evidence', () => {
  const report = { rows: [{ title: '더 바디', platform: 'netflix', date: '2026-11-11' }] };
  const lineups = [{ platform: 'netflix', sourceUrl: 'https://about.netflix.com/ko/new-to-watch',
    items: [{ title: '더 바디', date: '2026-11-11', market: 'KR', premiereConfirmed: false }] }];
  const state = { candidates: [{ id: 'candidate-1', url: lineups[0].sourceUrl,
    revisions: [{ token: 'r2', lineupEvidence: { title: '더 바디', platform: 'netflix',
      date: '2026-11-11', market: 'KR', seasonNumber: 1, premiereConfirmed: false,
      evidence: 'Netflix KR dated listing' } }], review: null }] };
  const merged = withCandidateEvidence(report, lineups, state);
  assert.equal(merged[0].items.length, 1);
  assert.equal(merged[0].items[0].seasonNumber, 1);
  assert.equal(reconcileGaps(report, merged).rows[0].officialCandidates.length, 1);
  assert.equal(lineups[0].items[0].candidateId, undefined);
});

test('candidate evidence respects title, platform, market and season', () => {
  const report = { rows: [{ title: '연속극', platform: 'netflix', date: '2026-11-11', seasonNumber: 2 }] };
  const mk = (id, platform, market, seasonNumber) => ({ id, url: 'https://example.com/' + id,
    revisions: [{ token: id, lineupEvidence: { title: '연속극', platform, market,
      date: '2026-11-11', seasonNumber, premiereConfirmed: false } }] });
  const merged = withCandidateEvidence(report, [], { candidates: [
    mk('other-platform', 'tving', 'KR', 2), mk('other-market', 'netflix', 'US', 2),
    mk('other-season', 'netflix', 'KR', 1), mk('matched', 'netflix', 'KR', 2),
  ] });
  const result = reconcileGaps(report, merged);
  assert.equal(result.rows[0].officialCandidates.length, 1);
  assert.equal(result.rows[0].officialCandidates[0].candidateId, 'matched');
  assert.equal(result.total, 2);
  assert.equal(result.rows[1].seasonNumber, 1);
});

test('gap-only report does not inflate StreamPick denominator with unrelated official arrivals', () => {
  const report = { rows: [{ title: '더 바디', platform: 'netflix', date: '2026-11-11' }] };
  const lineups = [{ platform: 'netflix', sourceUrl: 'https://example.com', items: [
    { title: '더 바디', date: '2026-11-11', market: 'KR', premiereConfirmed: false },
    { title: '별개 작품', date: '2026-11-22', market: 'KR', premiereConfirmed: true },
  ] }];
  const result = reconcileGaps(report, lineups, { includeOfficialDiscoveries: false });
  assert.equal(result.total, 1);
  assert.equal(result.rows[0].classification, 'official_kr_listing_needs_premiere_review');
});

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

test('same OTT new season is separate from existing season even on another date', () => {
  const result = reconcileGaps({ rows: [{ title: '연속극', platform: 'netflix', date: '2026-11-11', seasonNumber: 1,
    dateMatched: true }] }, [{ platform: 'netflix', sourceUrl: 'https://www.netflix.com/kr', items: [
    { title: '연속극', date: '2026-12-11', seasonNumber: 2, market: 'KR', premiereConfirmed: true },
  ] }]);
  assert.equal(result.total, 2);
  assert.equal(result.rows[0].classification, 'tmdb_date_only');
  assert.equal(result.rows[1].seasonNumber, 2);
  assert.equal(result.rows[1].date, '2026-12-11');
});
