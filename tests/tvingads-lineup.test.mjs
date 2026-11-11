import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTvingAdsText } from '../scripts/parse-tvingads-lineup.mjs';
const options = { sourceUrl: 'https://www.tvingads.com/content', observedAt: '2026-11-11T03:00:00Z' };
test('TVING·Wavve 예정작 날짜와 장르 추출, 화면별 중복과 미정 보존', () => {
  const input = `LINE UP
### 향후 3개월 오픈 예정 콘텐츠
【16†Image†framerusercontent.com】
드라마
성장 #청춘
### 뜨거운 안녕
수목
공개일
2026. 11. 11.
【16†Image†framerusercontent.com】
드라마
성장 #청춘
뜨거운 안녕
공개일
2026. 11. 11.
【17†Image†framerusercontent.com】
예능
리얼리티
### 내 새끼의 연애3
공개일
2026. 11. 11.
【18†Image†framerusercontent.com】
드라마
판타지
### 여고생왕후
출연
【19†Image†framerusercontent.com】
## 광고 상품`;
  const parsed = parseTvingAdsText(input, options);
  assert.deepEqual(parsed.items.map((x) => [x.title, x.date, x.contentKind]),
    [['뜨거운 안녕', '2026-11-11', 'drama'], ['내 새끼의 연애3', '2026-11-11', 'variety'], ['여고생왕후', null, 'drama']]);
  for (const item of parsed.items) { assert.equal(item.market, null); assert.equal(item.premiereConfirmed, false); }
});
test('잘못된 원본, 날짜 미인정, 섹션 누락 차단', () => {
  assert.throws(() => parseTvingAdsText('### 미정', options), /NO_COMING_SOON_SECTION/);
  assert.throws(() => parseTvingAdsText('### 향후 3개월 오픈 예정 콘텐츠', options), /NO_LINEUP_CARDS/);
  assert.throws(() => parseTvingAdsText('abc', { ...options, sourceUrl: 'https://evil.tld/content' }), /INVALID_TVING_SOURCE/);
  const parsed = parseTvingAdsText('### 향후 3개월 오픈 예정 콘텐츠\n드라마\n### 임시 작품\n공개일\n2026. 2. 30.\n## 끝', options);
  assert.equal(parsed.items[0].date, null);
  assert.throws(() => parseTvingAdsText('abc', { ...options, sourceUrl: 'https://www.tvingads.com/content?tracking=1' }), /INVALID_TVING_SOURCE/);
});
test('장르가 없는 카드는 앞 카드 장르를 물려받지 않는다', () => {
  const source = '### 향후 3개월 오픈 예정 콘텐츠\n드라마\n### 첫 작품\n공개일\n2026. 11. 11.\n### 장르 없는 작품\n공개일\n2026. 11. 12.\n## 끝';
  const parsed = parseTvingAdsText(source, options);
  assert.deepEqual(parsed.items.map((x) => x.title), ['첫 작품']);
});
