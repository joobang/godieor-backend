import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDisneyUpcoming, collectDisneyUpcoming } from '../scripts/collect-disneyplus-kr-lineup.mjs';
import { parseCoupangNewsIndex, parseCoupangArticle, makeCoupangLineup, collectCoupangNews } from '../scripts/collect-coupangplay-kr-lineup.mjs';
import { prepareLineup } from '../scripts/prepare-ott-lineup.mjs';

const disneyPage = (groups) => `<html><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: {
  region: 'kr', pageId: 'page-36541dc7-6961-4bbb-a07b-ef97d7da7995', stitchDocument: { mainContent: groups },
} } })}</script></html>`;
const card = (title, id) => ({ _type: 'SliderItem', children: [{ _type: 'ImageCard', title,
  url: `/ko-kr/browse/entity-${id}` }] });

test('Disney+ official upcoming list extracts distinct titles but never invents dates', () => {
  const html = disneyPage([{ _type: 'SetGroup', title: { children: '공개 예정' }, items: [{ children: [card('현혹', 'abc-123'), card('현혹', 'abc-123'), card('미키의 나 홀로 집에', 'def-456')] }] },
    { _type: 'SetGroup', title: { children: '특별 영상' }, items: [{ children: [card('재혼황후 특별 영상', 'ghi-789')] }] }]);
  const lineup = parseDisneyUpcoming(html, '2026-11-16T00:00:00Z');
  assert.deepEqual(lineup.items.map((i) => i.title), ['현혹', '미키의 나 홀로 집에']);
  assert.equal(prepareLineup(lineup).total, 2);
  assert.ok(lineup.items.every((i) => i.date === null && i.premiereConfirmed === false));
  assert.throws(() => parseDisneyUpcoming(disneyPage([])), /DISNEY_UPCOMING_GROUP_MISSING/);
});

test('Coupang official weekly articles extract labeled titles without equating recommendation to premiere', () => {
  const index = '<html><article><a href="https://news.coupang.com/archives/68499/">쿠팡플레이 금주의 추천작</a></article><article><a href="https://news.coupang.com/archives/68382/">스포츠 중계 일정</a></article></html>';
  assert.deepEqual(parseCoupangNewsIndex(index), ['https://news.coupang.com/archives/68499/']);
  const article = '<html><p><strong>제목</strong> 극장판 체인소 맨: 레제편<br><strong>공개</strong> 2025</p><p><strong>제목</strong> 체인소 맨<br></p></html>';
  const items = parseCoupangArticle(article, 'https://news.coupang.com/archives/68499/');
  assert.deepEqual(items.map((i) => i.title), ['극장판 체인소 맨: 레제편', '체인소 맨']);
  assert.equal(prepareLineup(makeCoupangLineup(items, '2026-11-16T00:00:00Z')).total, 2);
  assert.ok(items.every((i) => i.date === null && i.premiereConfirmed === false));
});

test('both collectors reject redirected hosts and failed requests', async () => {
  await assert.rejects(collectDisneyUpcoming(async () => ({ ok: false, status: 503 })), /DISNEY_HTTP_503/);
  await assert.rejects(collectCoupangNews(async () => ({ ok: true, url: 'https://evil.example', text: async () => '' })), /COUPANG_REDIRECT_HOST_CHANGED/);
});

// Special-look extras should not be counted as new premieres.
