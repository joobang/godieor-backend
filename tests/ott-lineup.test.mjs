import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepareLineup } from '../scripts/prepare-ott-lineup.mjs';
const lineup = () => ({
  platform: 'netflix', sourceUrl: 'https://www.netflix.com/tudum/articles/new-on-netflix',
  observedAt: '2026-11-11T02:00:00Z', items: [
    { title: '가상 작품', date: '2026-11-19', market: null, contentKind: 'drama', seasonNumber: null,
      premiereConfirmed: false, evidence: '가상 미국 목록의 11월 19일 신규 제공 표시' },
  ],
});
test('국가가 미확인된 글로벌 목록은 후보로만 보존한다', () => {
  const result = prepareLineup(lineup());
  assert.equal(result.total, 1);
  assert.equal(result.candidates[0].market, null);
  assert.equal(result.candidates[0].premiereConfirmed, false);
  assert.equal(result.candidates[0].published, false);
});
test('명시적인 지역/최초 공개 근거가 있으면 심사 대기 후보로만 만든다', () => {
  const data = lineup();
  data.items[0].market = 'KR';
  data.items[0].premiereConfirmed = true;
  const item = prepareLineup(data).candidates[0];
  assert.equal(item.status, 'needs_manual_review');
  assert.equal(item.precision, 'date_only');
});
test('추정 최초 공개, 잘못된 날짜, 중복 작품, 다른 도메인 거부', () => {
  const data = lineup();
  data.items[0].premiereConfirmed = true;
  assert.throws(() => prepareLineup(data), /UNSUPPORTED_PREMIERE/);
  data.items[0].premiereConfirmed = false;
  data.items[0].date = '2026-02-30';
  assert.throws(() => prepareLineup(data), /INVALID_DATE/);
  data.items[0].date = '2026-11-19';
  data.items.push({ ...data.items[0] });
  assert.throws(() => prepareLineup(data), /DUPLICATE_TITLE_ROW/);
  data.items.pop();
  data.sourceUrl = 'https://example.com/tudum';
  assert.throws(() => prepareLineup(data), /UNTRUSTED_URL/);
});
