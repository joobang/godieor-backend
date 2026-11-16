import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { auditPublished } from '../scripts/audit-ott-published.mjs';
import { readFileSync } from 'node:fs';

test('DATA-40 original gap-11 includes English alias for the same verified Korean Netflix season', () => {
  const reference = JSON.parse(readFileSync(new URL('../data/reference/streampick-2026-11-12-gap11.json', import.meta.url)));
  const source = JSON.parse(readFileSync(new URL('../data/lineups/netflix-kr-2026-11-alicia-premiere-confirmed.json', import.meta.url)));
  const aliases = source.items.map((item) => ({ ...item, platform: source.platform }));
  const published = [{ title: '알리시아의 법', date: '2026-11-11', platform: 'netflix', seasonNumber: 1 }];
  const report = auditPublished(reference, published, aliases);
  assert.equal(report.referenceRows, 11);
  assert.equal(report.rows.find((row) => row.title === "Alicia's Law").status, 'published_match');
  assert.equal(report.statusCounts.published_match, 1);
  assert.equal(auditPublished(reference, published).statusCounts.published_match, 0);
  assert.equal(auditPublished(reference, published.map((row) => ({ ...row, seasonNumber: 2 })), aliases)
    .statusCounts.published_match, 0);
});

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
  assert.deepEqual(result.statusCounts, { published_match: 2, season_unverified: 2, date_disagreement: 0, not_published: 1 });
  assert.equal(result.publishedInWindow, 3);
});

test('rejects references without discovery-only authority', () => {
  assert.throws(() => auditPublished({ authority: 'official', rows: [] }, []), /INVALID_AUDIT_INPUT/);
});


test('equal total with other works cannot satisfy reference parity', () => {
  const ref = { authority: 'third_party_discovery_only', rows: [['2026-11-01', 'tving', 'Expected', 2]] };
  const rows = [{ date: '2026-11-01', platform: 'tving', title: 'Different', seasonNumber: 2 }];
  const report = auditPublished(ref, rows);
  assert.equal(report.countAtLeastReference, true);
  assert.equal(report.parity, false);
  assert.equal(report.unmatchedReferenceRows, 1);
  assert.equal(report.publishedWithoutExactReference.length, 1);
});

test('empty or duplicate references cannot produce a parity result', () => {
  assert.throws(() => auditPublished({ authority: 'third_party_discovery_only', rows: [] }, []), /INVALID/);
  const row = ['2026-11-01', 'tving', 'Expected', 2];
  assert.throws(() => auditPublished({ authority: 'third_party_discovery_only', rows: [row, row] }, []), /DUPLICATE/);
});

test('alias binding cannot cross platform, date or season', () => {
  const ref = { authority: 'third_party_discovery_only', rows: [['2026-11-01', 'netflix', 'English', 2]] };
  const aliases = [{ platform: 'netflix', date: '2026-11-01', title: '한국어', aliases: ['English'], seasonNumber: 2 }];
  const row = { platform: 'netflix', date: '2026-11-01', title: '한국어', seasonNumber: 2 };
  assert.equal(auditPublished(ref, [row], aliases).parity, true);
  for (const change of [{ platform: 'tving' }, { date: '2026-11-02' }, { seasonNumber: 1 }, { seasonNumber: null }]) {
    assert.equal(auditPublished(ref, [{ ...row, ...change }], aliases).parity, false);
  }
});


test('extra Netflix titles cannot hide a TVING count deficit', () => {
  const reference = { authority: 'third_party_discovery_only', rows: [['2026-11-01', 'tving', 'A', 2]] };
  const report = auditPublished(reference, [{ date: '2026-11-01', platform: 'netflix', title: 'A', seasonNumber: 2 }]);
  assert.equal(report.countAtLeastReference, true);
  const group = report.coverageByMonthPlatform.find((r) => r.month === '2026-11' && r.platform === 'tving');
  assert.deepEqual(group, { month: '2026-11', platform: 'tving', reference: 1, published: 0, exactMatches: 0, countDeficit: 1, unresolved: 1 });
});


test('reviewed TMDB identity matches translated titles without new hand-written aliases', () => {
  const ref = { authority: 'third_party_discovery_only', rows: [['2026-11-13','netflix','English title',1]],
    entries: [{ date: '2026-11-13', platform: 'netflix', title: 'English title', seasonNumber: 1, contentId: 'tmdb-tv-700' }] };
  const published = [{ title: '한국어 제목', date: '2026-11-13', platform: 'netflix', seasonNumber: 1 }];
  const binding = { type: 'tv', tmdbId: 700, platform: 'netflix', market: 'KR', seasonNumber: 1,
    date: '2026-11-13', title: '한국어 제목', identityVerified: true };
  assert.equal(auditPublished(ref,published,[],[binding]).rows[0].identityMethod, 'reviewed_tmdb_id');
  assert.equal(auditPublished(ref,published,[],[binding]).parity,true);
  for (const change of [{ type:'movie' }, {tmdbId:701}, {seasonNumber:2}, {platform:'tving'}, {market:'US'}, {identityVerified:false}]) {
    assert.equal(auditPublished(ref,published,[],[{...binding,...change}]).parity,false);
  }
});

test('a different season is not falsely labeled as a date disagreement', () => {
  const ref = { authority: 'third_party_discovery_only', rows: [['2026-11-03','netflix','A',3]] };
  const report = auditPublished(ref, [{ date:'2026-11-04',platform:'netflix',title:'A',seasonNumber:2 }]);
  assert.equal(report.rows[0].status, 'season_unverified');
  assert.deepEqual(report.rows[0].publishedDatesSameSeason, []);
  assert.deepEqual(report.rows[0].observedSeasons, [2]);
});

test('same season on another date exposes both dates without asserting which is Korean premiere', () => {
  const ref = { authority: 'third_party_discovery_only', rows: [['2026-11-03','netflix','A',3]] };
  const report = auditPublished(ref, [{ date:'2026-11-04',platform:'netflix',title:'A',seasonNumber:3 }]);
  assert.equal(report.rows[0].status, 'date_disagreement');
  assert.deepEqual(report.rows[0].publishedDatesSameSeason, ['2026-11-04']);
});
