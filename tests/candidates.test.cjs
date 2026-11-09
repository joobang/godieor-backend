// Synthetic inputs and requirement-derived expectations; no copied product output.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, rm, readFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const c = require('../dist/src/candidates');
const now = '2026-11-09T00:00:00.000Z';
const blank = () => ({ version: 2, stage: 'candidate-not-published', candidates: [], attempts: {} });
const xml = (description = 'synthetic announcement', link = 'https://about.netflix.com/ko/news/synthetic') => `<rss version="2.0"><channel><title>Synthetic fixture</title><item><title>가상 작품 2027 공개 예정</title><link>${link}</link><pubDate>2026년 11월 1일</pubDate><description><![CDATA[${description}]]></description></item></channel></rss>`;
function state() { const s = blank(); c.merge(s, c.parseFeed('netflix', xml()), now); return s; }
function review(s, changes = {}) {
 return { id: s.candidates[0].id, revision: s.candidates[0].revisions.at(-1).token, reviewer: 'synthetic-test', title: '가상 작품', platform: 'netflix', market: 'KR', contentKind: 'drama', premiereConfirmed: true, date: '2027-02-28', localTime: null, timeZone: null, seasonNumber: null, announcedYear: null, announcedPeriod: null, evidence: '가상 입력: 한국 넷플릭스 최초 공개일 2027-02-28 명시', ...changes };
}
test('게시일은 수집 메타데이터이고 공개 날짜/시즌으로 자동 대입하지 않는다', () => {
 const s = state(); assert.equal(s.candidates[0].revisions[0].publishedAt, '2026-10-31T15:00:00.000Z');
 assert.equal(s.candidates[0].review, null); assert.deepEqual(c.eligibility(s.candidates[0]), ['needs_review']); assert.deepEqual(c.reviewedExport(s), []);
});
test('연/월만 있는 검토 입력은 후보에 보존하고 내보내기에서 제외한다', () => {
 for (const period of [null, '2027-02', '2027년 상반기']) {
  const s = state(); c.applyReview(s, review(s, { date: null, announcedYear: 2027, announcedPeriod: period }), now);
  assert.ok(c.eligibility(s.candidates[0]).includes('missing_exact_date')); assert.equal(c.reviewedExport(s).length, 0);
  assert.equal(s.candidates[0].review.value.announcedPeriod, period);
 }
});
test('정확한 날짜만 있어도 시간/시즌을 만들지 않고 후보를 내보낸다', () => {
 const s = state(); c.applyReview(s, review(s), now); const out = c.reviewedExport(s);
 assert.equal(out.length, 1); assert.equal(out[0].precision, 'date_only'); assert.equal(out[0].date, '2027-02-28');
 assert.equal(out[0].localTime, null); assert.equal(out[0].timeZone, null); assert.equal(out[0].seasonNumber, null);
});
test('잘못된 날짜/시간/시간대/연도 불일치를 거부한다', () => {
 const s = state();
 for (const changes of [{ date: '2026-02-29' }, { date: '2027-02' }, { localTime: '24:00' }, { timeZone: 'Mars/Olympus', localTime: '10:00' }, { announcedYear: 2026 }, { date: null, localTime: '10:00' }]) assert.throws(() => c.applyReview(s, review(s, changes), now));
 c.applyReview(s, review(s, { date: '2028-02-29' }), now); assert.equal(c.reviewedExport(s).length, 1);
});
test('시각은 시간대가 없으면 UTC instant로 승격하지 않는다', () => {
 const s = state(); c.applyReview(s, review(s, { localTime: '18:00' }), now); assert.equal(c.reviewedExport(s)[0].precision, 'date_only');
 c.applyReview(s, review(s, { localTime: '18:00', timeZone: 'Asia/Seoul' }), now); assert.equal(c.reviewedExport(s)[0].precision, 'local_datetime');
});
test('국가/플랫폼/드라마/최초 공개 근거가 없거나 2026 이전이면 보류한다', () => {
 for (const changes of [{ market: null }, { platform: null }, { contentKind: 'other' }, { premiereConfirmed: false }, { date: '2025-12-31' }]) {
  const s = state(); c.applyReview(s, review(s, changes), now); assert.equal(c.reviewedExport(s).length, 0);
 }
 const s = state(); assert.throws(() => c.applyReview(s, review(s, { market: 'WORLD' }), now));
});
test('같은 공지 재수집은 중복을 만들지 않고 변경 시 이전 검토를 무효화한다', () => {
 const s = state(), old = review(s); c.applyReview(s, old, now);
 c.merge(s, c.parseFeed('netflix', xml()), '2026-11-10T00:00:00.000Z');
 assert.equal(s.candidates.length, 1); assert.equal(s.candidates[0].revisions.length, 1); assert.equal(c.reviewedExport(s).length, 1);
 c.merge(s, c.parseFeed('netflix', xml('정정된 가상 본문')), '2026-11-11T00:00:00.000Z');
 assert.equal(s.candidates[0].revisions.length, 2); assert.equal(s.candidates[0].review, null); assert.throws(() => c.applyReview(s, old, now), /STALE_REVIEW/);
 c.merge(s, c.parseFeed('netflix', xml()), now); assert.equal(s.candidates[0].review, null); assert.throws(() => c.applyReview(s, old, now), /STALE_REVIEW/);
});
test('뉴스룸 발행사와 작품 플랫폼은 독립이다', () => {
 const s = blank(); c.merge(s, c.parseFeed('coupang', xml('TVING 제공인 가상 작품', 'https://news.coupang.com/archives/123/')), now);
 c.applyReview(s, review(s, { platform: 'tving' }), now); assert.equal(c.reviewedExport(s)[0].platform, 'tving');
});
test('RSS와 수동 링크의 출처를 제한하고 추적 쿼리만 제거한다', () => {
 assert.equal(c.canonicalUrl('cj', 'https://cjnews.cj.net/example/?utm_source=rss#fragment'), 'https://cjnews.cj.net/example/');
 assert.throws(() => c.parseFeed('netflix', xml('bad', 'https://attacker.invalid/article')));
 assert.throws(() => c.canonicalUrl('disney', 'https://www.disneyplus.com@attacker.invalid/'));
 assert.throws(() => c.canonicalUrl('cj', 'https://cjnews.cj.net/?token=secret'));
});
test('불완전 XML/DTD/상충하는 중복은 실패시키고 빈 RSS는 허용한다', () => {
 assert.throws(() => c.parseFeed('netflix', '<rss><channel>'));
 assert.throws(() => c.parseFeed('netflix', '<!DOCTYPE rss [<!ENTITY x "bad">]>' + xml()));
 const combined = xml().replace('</channel>', xml('different').match(/<item>.*<\/item>/s)[0] + '</channel>');
 assert.throws(() => c.parseFeed('netflix', combined), /CONFLICTING_DUPLICATE_ITEM/);
 assert.deepEqual(c.parseFeed('netflix', '<rss><channel><title>empty</title></channel></rss>'), []);
});
test('robots는 일반 봇 제한을 따르고 더 구체적인 allow 규칙을 적용한다', () => {
 assert.equal(c.robotsAllows('User-agent: *\nDisallow: /\nUser-agent: Googlebot\nAllow: /', '/ko-kr'), false);
 assert.equal(c.robotsAllows('User-agent: *\nDisallow: /api/\n', '/ko/feed.xml'), true);
 assert.equal(c.robotsAllows('User-agent: *\nDisallow: /feed*\nAllow: /feed/$', '/feed/'), true);
 assert.equal(c.robotsAllows('User-agent: *\nDisallow: /\nUser-agent: GODIEOR-candidates\nAllow: /feed/', '/feed/'), true);
});
test('일부 소스 실패/빈 응답이 기존 후보를 삭제하지 않는다', async () => {
 const s = state();
 const fetcher = async url => {
  if (url.endsWith('robots.txt')) return new Response('User-agent: *\nAllow: /');
  if (url.includes('news.coupang.com')) return new Response('unavailable', { status: 503 });
  return new Response('<rss><channel><title>empty</title></channel></rss>');
 };
 await c.collectFeeds(s, now, fetcher);
 assert.equal(s.attempts.coupang.status, 'failed'); assert.equal(s.attempts.coupang.error, 'HTTP_503');
 assert.equal(s.attempts.netflix.status, 'succeeded'); assert.equal(s.candidates.length, 1);
});
test('출처 응답 크기를 제한하고 redirect를 따라가지 않는다', async () => {
 await assert.rejects(c.fetchText('https://example.invalid', async (_url, init) => { assert.equal(init.redirect, 'error'); assert.ok(init.signal); return new Response('x'.repeat(2_000_001)); }), /RESPONSE_TOO_LARGE/);
});
test('임시 저장소에 원자적으로 보존하고 동시 writer를 거부한다', async () => {
 const directory = await mkdtemp(join(tmpdir(), 'godieor-candidates-'));
 try {
  await c.transaction(directory, async s => { c.merge(s, c.parseFeed('netflix', xml()), now); await assert.rejects(c.transaction(directory, async () => {}), { code: 'EEXIST' }); });
  const saved = await c.readState(directory); assert.equal(saved.candidates.length, 1);
  await assert.rejects(c.transaction(directory, async s => { s.candidates = []; throw new Error('interrupt'); }));
  assert.equal((await c.readState(directory)).candidates.length, 1);
  assert.equal(JSON.parse(await readFile(join(directory, 'state.json'), 'utf8')).stage, 'candidate-not-published');
 } finally { await rm(directory, { recursive: true, force: true }); }
});

test('수집/검토 변경은 이전 내보내기 파일을 무효화한다', async () => {
 const directory = await mkdtemp(join(tmpdir(), 'godieor-export-'));
 try {
  await c.transaction(directory, async s => { c.merge(s, c.parseFeed('netflix', xml()), now); c.applyReview(s, review(s), now); });
  await c.transaction(directory, async s => { await c.atomicWrite(directory, 'reviewed.json', c.reviewedExport(s)); }, false);
  assert.equal(JSON.parse(await readFile(join(directory, 'reviewed.json'), 'utf8')).length, 1);
  await c.transaction(directory, async s => { c.merge(s, c.parseFeed('netflix', xml('changed')), now); });
  await assert.rejects(readFile(join(directory, 'reviewed.json')), { code: 'ENOENT' });
  assert.equal(c.reviewedExport(await c.readState(directory)).length, 0);
 } finally { await rm(directory, { recursive: true, force: true }); }
});

test('v1 후보 이력을 보존해 v2로 올리고 구버전 검토/내보내기를 무효화한다', async () => {
 const directory = await mkdtemp(join(tmpdir(), 'godieor-v1-'));
 try {
  const s = state(); c.applyReview(s, review(s), now); s.version = 1;
  for (const candidate of s.candidates) {
   for (const revision of candidate.revisions) delete revision.token;
   candidate.review.value.revision = candidate.revisions.at(-1).hash;
  }
  await c.atomicWrite(directory, 'state.json', s); await c.atomicWrite(directory, 'reviewed.json', [{ stale: true }]);
  await c.transaction(directory, async upgraded => { assert.equal(upgraded.version, 2); assert.equal(upgraded.candidates.length, 1); assert.equal(upgraded.candidates[0].review, null); }, false);
  assert.equal(JSON.parse(await readFile(join(directory, 'state.json'), 'utf8')).version, 2);
  await assert.rejects(readFile(join(directory, 'reviewed.json')), { code: 'ENOENT' });
 } finally { await rm(directory, { recursive: true, force: true }); }
});
test('미지원/손상 상태는 내보내기를 삭제하기 전에 거부한다', async () => {
 const directory = await mkdtemp(join(tmpdir(), 'godieor-invalid-state-'));
 try {
  await c.atomicWrite(directory, 'state.json', { version: 99 }); await c.atomicWrite(directory, 'reviewed.json', [{ preserve: true }]);
  await assert.rejects(c.transaction(directory, async () => {}));
  assert.deepEqual(JSON.parse(await readFile(join(directory, 'reviewed.json'), 'utf8')), [{ preserve: true }]);
 } finally { await rm(directory, { recursive: true, force: true }); }
});
