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
  assert.deepEqual(result.statusCounts, { published_match: 2, season_unverified: 1, date_disagreement: 1, not_published: 1 });
  assert.equal(result.publishedInWindow, 3);
});

test('rejects references without discovery-only authority', () => {
  assert.throws(() => auditPublished({ authority: 'official', rows: [] }, []), /INVALID_AUDIT_INPUT/);
});
