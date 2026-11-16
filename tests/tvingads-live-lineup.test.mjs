import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTvingAdsHtml, collectTvingAdsKrLineup } from '../scripts/collect-tvingads-kr-lineup.mjs';
import { prepareLineup } from '../scripts/prepare-ott-lineup.mjs';

const card = (genre, title, date) => `<div><span>${genre}</span><h3>${title}</h3><span>월</span><span>공개일</span><span>${date}</span></div>`;
const page = (cards) => `<html><body><h2>향후 3개월 오픈 예정 콘텐츠</h2>${cards}<h2>광고 솔루션</h2></body></html>`;

test('공식 HTML에서 날짜가 있는 예정 카드 수집·중복 제거, 검토 전용 staging 호환', () => {
  const html = page(card('드라마', '대리수능', '2026. 11. 23.') + card('드라마', '대리수능', '2026. 11. 23.') + card('예능', '대탈출 : 도시괴담', '2026. 12. 2.'));
  const result = parseTvingAdsHtml(html, '2026-11-16T00:00:00Z');
  assert.deepEqual(result.items.map(({ title, date }) => [title, date]), [['대리수능', '2026-11-23'], ['대탈출 : 도시괴담', '2026-12-02']]);
  assert.equal(result.sourceScope, 'tving_and_wavve');
  const staged = prepareLineup(result);
  assert.equal(staged.total, 2);
  assert.ok(staged.candidates.every((x) => !x.published && !x.premiereConfirmed && x.market === null));
});

test('섹션 누락·빈 카드·중복 날짜 충돌은 실패로 남긴다', () => {
  assert.throws(() => parseTvingAdsHtml('<html><body>다른 페이지</body></html>'), /TVING_UPCOMING_SECTION_MISSING/);
  assert.throws(() => parseTvingAdsHtml(page('<div>공개일 2026. 11. 23.</div>')), /TVING_UPCOMING_DATES_NOT_FOUND/);
  assert.throws(() => parseTvingAdsHtml(page(card('드라마', '대리수능', '2026. 11. 23.') + card('드라마', '대리수능', '2026. 11. 24.'))), /TVING_DUPLICATE_TITLE_DATE_CONFLICT/);
});

test('HTTP 실패와 다른 호스트로의 이동 차단', async () => {
  await assert.rejects(collectTvingAdsKrLineup(async () => ({ ok: false, status: 503 })), /TVING_ADS_HTTP_503/);
  await assert.rejects(collectTvingAdsKrLineup(async () => ({ ok: true, url: 'https://evil.example/content' })), /TVING_ADS_REDIRECT_HOST_CHANGED/);
});
