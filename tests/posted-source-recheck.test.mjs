import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { recheckSources, checkDisney, checkNetflix, checkTving, checkCoupang, validateBindings, validateNetflixSnapshot, trustedUrl, sha } from '../scripts/recheck-posted-official-sources.mjs';
// Synthetic page content and expected values are authored here, independently of runtime reports.
const script = value => `<script id="__NEXT_DATA__">${JSON.stringify(value)}</script>`;
const next = page => script({ props: { pageProps: page } });
const url = { netflix: 'https://www.netflix.com/kr/title/10', disney: 'https://www.disneyplus.com/ko-kr/browse/entity-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', tving: 'https://www.tving.com/contents/P42', coupang: 'https://news.coupang.com/archives/999/' };
const rows = [
  { candidateId: 'n', title: '가상 영화', platform: 'netflix', date: '2026-11-20', seasonNumber: null, sourceUrl: 'https://about.netflix.com/ko/new-to-watch', mapping: { eventKey: '1' }, officialIdentity: { videoId: '10', requestedUrl: url.netflix, canonicalUrl: url.netflix, format: 'Movie' } },
  { candidateId: 'd', title: '가상 애니', platform: 'disney_plus', date: '2026-12-04', seasonNumber: null, contentKind: 'animation', sourceUrl: url.disney, mapping: { eventKey: '2' }, officialIdentity: { format: 'Movie' } },
  { candidateId: 't', title: '가상 드라마', platform: 'tving', date: '2026-11-18', seasonNumber: null, sourceUrl: url.tving, mapping: { eventKey: '3' }, officialIdentity: { programCode: 'P42' } },
  { candidateId: 'c1', title: '가상 시리즈', platform: 'coupang_play', date: '2026-11-18', seasonNumber: 2, sourceUrl: url.coupang, mapping: { eventKey: '4' } },
  { candidateId: 'c2', title: '가상 두번째 영화', platform: 'coupang_play', date: '2026-11-18', seasonNumber: null, sourceUrl: url.coupang, mapping: { eventKey: '5' } },
];
const baselines = { works: [
  { candidateId: 'c1', sourceTitle: '가상 시리즈 시즌 2', actors: ['배우 A', '배우 B'], sourceSeasonNumber: 2, releaseText: '2026년 11월 18일(수)부터 매주 수요일' },
  { candidateId: 'c2', sourceTitle: '가상 두번째 영화', actors: ['배우 C', '배우 D'], sourceSeasonNumber: null, releaseText: '2026년 11월 18일(수) 공개' },
] };
const netflixPage = (id = '10', day = '2026-11-20') => `<script type="application/ld+json">${JSON.stringify({ '@type': 'Movie', name: '가상 영화', url: `https://www.netflix.com/kr/title/${id}`, dateCreated: day })}</script>`;
const disneyPage = (patch = {}, props = {}) => next({ region: 'kr', language: 'ko', pathname: new URL(url.disney).pathname.replace('/ko-kr', ''),
  stitchDocument: { mainContent: [
    { _type: 'DetailEntityHero', titleVisual: { alt: '가상 애니' }, isReplayTitle: false, genres: ['애니메이션'], promotion: '2026년 12월 4일, 디즈니+에서 공개', ...patch },
    { _type: 'Metadata', ldJSON: { '@graph': [{ '@type': 'Movie' }] } },
  ] }, ...props });
const tvingPage = (patch = {}) => next({ programCode: 'P42', programName: '가상 드라마', openText: '11월 18일 공개', contentInfo: { code: 'E999', program_code: 'P42', broad_dt: '20261116', category_name: '드라마' }, ...patch });
const coupangPage = (replace = {}) => `<title>쿠팡플레이 금주의 추천작: 가상</title><link rel="canonical" href="${url.coupang}"><meta property="article:published_time" content="2026-11-12T00:00:00Z">` + baselines.works.map(b => `<p class="cpnr-intro"><strong>제목</strong>${b.sourceTitle}<br><strong>출연</strong>${(replace[b.candidateId]?.actors ?? b.actors).join(', ')}<br><strong>공개</strong>${replace[b.candidateId]?.releaseText ?? b.releaseText}</p>`).join('');
const home = script({ props: { currentRegion: { countryCode: 'kr' }, currentLanguage: { code: 'ko' }, pageProps: { data: { totalPages: 1, totalItems: 1, current: 1, data: [
  { country: 'KR', title1: '가상 영화', videoID: 10, startTime: Date.parse('2026-11-20T00:00:00+09:00') },
] } } } });
const response = (url, body, status = 200, headers = {}) => ({ url, status, ok: status === 200, headers: new Headers(headers), text: async () => body, json: async () => JSON.parse(body) });
const fakeFetch = (changes = {}, calls = []) => async input => {
  const u = String(input); calls.push(u);
  const body = { 'https://about.netflix.com/ko/new-to-watch': home, [url.netflix]: netflixPage(), [url.disney]: disneyPage(), [url.tving]: tvingPage(), [url.coupang]: coupangPage() }[u];
  if (changes[u]) return changes[u](u);
  if (!body) throw Error('UNEXPECTED_SYNTHETIC_FETCH');
  return response(u, body);
};
const options = fetchImpl => ({ fetchImpl, baselines, months: ['2026-11', '2026-12'], checkedAt: '2026-11-17T00:00:00Z', retryDelayMs: 0 });

test('all provider rechecks preserve reviews and fetch a shared article once', async () => {
  const calls = [], before = JSON.stringify(rows);
  const result = await recheckSources({ additions: rows }, options(fakeFetch({}, calls)));
  assert.equal(result.total, 5); assert.equal(result.matched, 5); assert.equal(result.gaps, 0);
  assert.equal(calls.filter(u => u === url.coupang).length, 1);
  assert.equal(result.reviewsModified, 0); assert.equal(result.publishingAllowed, false); assert.equal(JSON.stringify(rows), before);
});

test('dates, season and region changes never reuse a successful result', () => {
  assert.equal(checkDisney(rows[1], disneyPage({ promotion: '2026년 12월 5일, 디즈니+에서 공개' })).status, 'date_changed');
  assert.equal(checkDisney(rows[1], disneyPage({ promotion: '2026년 12월 4일, 디즈니+에서 시즌 2 공개' })).status, 'season_changed');
  assert.equal(checkDisney(rows[1], disneyPage({}, { region: 'us' })).status, 'identity_or_region_changed');
  assert.equal(checkDisney(rows[1], disneyPage({ promotion: '예고편 공개' })).status, 'explicit_platform_date_missing');
  assert.equal(checkDisney(rows[1], disneyPage({ isReplayTitle: true })).status, 'identity_or_format_changed');
  const scheduled = { lineup: { items: [{ title: '가상 영화', market: 'KR', date: '2026-11-21', evidence: 'Netflix videoID 10.' }] } };
  assert.equal(checkNetflix(rows[0], { html: netflixPage(), finalUrl: url.netflix }, scheduled, ['2026-11']).status, 'date_changed');
});

test('TVING metadata day never replaces explicit platform day', () => {
  const matched = checkTving(rows[2], tvingPage());
  assert.equal(matched.status, 'matched'); assert.equal(matched.observedDate, '2026-11-18');
  assert.equal(checkTving(rows[2], tvingPage({ openText: '11월 공개' })).status, 'explicit_platform_date_missing_or_ambiguous');
  assert.equal(checkTving(rows[2], tvingPage({ programCode: 'P999' })).status, 'identity_or_format_changed');
});

test('article actor changes and schedule changes are held despite identical title', () => {
  assert.equal(checkCoupang(rows[3], coupangPage({ c1: { actors: ['다른 배우', '배우 B'] } }), baselines.works[0]).status, 'identity_evidence_changed');
  assert.equal(checkCoupang(rows[3], coupangPage({ c1: { releaseText: '2026년 11월 19일(목)부터 매주 목요일' } }), baselines.works[0]).status, 'date_changed');
  assert.equal(checkCoupang(rows[3], coupangPage({ c1: { releaseText: '2026년 11월 18일(수) 공개' } }), baselines.works[0]).status, 'release_statement_changed');
});

test('one failed provider remains a gap while the other providers are checked', async () => {
  const result = await recheckSources({ additions: rows }, options(fakeFetch({ [url.tving]: u => response(u, '', 503) })));
  assert.equal(result.matched, 4); assert.equal(result.gaps, 1);
  assert.equal(result.rows.find(r => r.platform === 'tving').error, 'OFFICIAL_HTTP_503');
});

test('official same-host canonical redirect is bound and cross-host redirects are never followed', async () => {
  const n = structuredClone(rows[0]); n.officialIdentity.canonicalUrl = 'https://www.netflix.com/kr/title/20';
  const calls = [];
  const result = await recheckSources({ additions: [n] }, options(fakeFetch({
    [url.netflix]: u => response(u, '', 302, { location: 'https://www.netflix.com/title/20?locale=ko-KR' }),
    'https://www.netflix.com/title/20?locale=ko-KR': u => response(u, '', 301, { location: '/kr/title/20' }),
    'https://www.netflix.com/kr/title/20': u => response(u, netflixPage('20')),
  }, calls)));
  assert.equal(result.matched, 1); assert.ok(calls.includes(n.officialIdentity.canonicalUrl));
  const rejected = [];
  const bad = await recheckSources({ additions: [rows[0]] }, options(fakeFetch({ [url.netflix]: u => response(u, '', 302, { location: 'https://evil.example/title/10' }) }, rejected)));
  assert.equal(bad.gaps, 1); assert.equal(rejected.some(u => u.includes('evil.example')), false);
});

test('posted binding and baseline hashes must match the current review revision and mapping', async () => {
  const paths = ['data/curated/ott-source-reviewed-batch-2026-11-16.json', process.env.GODIEOR_TEST_OTT_STATE_PATH ?? 'data/curated/ott-reviewed-candidates-snapshot.json', 'data/curated/ott-reviewed-mappings.json', 'data/curated/ott-source-refresh-bindings-2026-11-17.json'];
  const [raw, sr, mr, br] = await Promise.all(paths.map(p => readFile(p, 'utf8')));
  const batch = JSON.parse(raw), state = JSON.parse(sr), mappings = JSON.parse(mr), baseline = JSON.parse(br);
  validateBindings(batch, state, mappings, baseline, sha(raw));
  assert.throws(() => validateBindings(batch, state, mappings, { ...baseline, batchSha256: '0'.repeat(64) }, sha(raw)), /INVALID_OR_STALE/);
  const changed = structuredClone(batch); changed.additions[0].date = '2026-12-31';
  assert.throws(() => validateBindings(changed, state, mappings, baseline, sha(raw)), /POSTED_REVIEW_BINDING_CHANGED/);
  const changedReview = structuredClone(state);
  const target = changedReview.candidates.find(c => c.id === batch.additions[0].candidateId);
  target.review.value.localTime = '05:00'; target.review.value.timeZone = 'Asia/Seoul';
  assert.throws(() => validateBindings(batch, changedReview, mappings, baseline, sha(raw)), /POSTED_REVIEW_BINDING_CHANGED/);
});

test('only scoped HTTPS official endpoints can be requested', () => {
  for (const u of ['http://www.netflix.com/kr/title/10', 'https://www.netflix.com.evil.example/kr/title/10', 'https://u:p@www.netflix.com/kr/title/10', 'https://www.disneyplus.com/en-us/browse/entity-aaaa', 'https://www.tving.com/login', 'https://127.0.0.1/', 'https://www.netflix.com/title/10?locale=en-US', 'https://www.netflix.com/title/10?locale=ko-KR&other=1']) assert.throws(() => trustedUrl(u), /UNTRUSTED/);
});


test('a fresh same-run KR snapshot is reused, while stale or wrong-market data cannot count as checked', async () => {
  const snapshot = { platform: 'netflix', sourceUrl: 'https://about.netflix.com/ko/new-to-watch', observedAt: '2026-11-16T23:59:00Z', items: [{ title: '가상 영화', date: '2026-11-20', market: 'KR', evidence: 'Netflix videoID 10.' }] };
  const calls = [];
  const result = await recheckSources({ additions: [rows[0]] }, { ...options(fakeFetch({}, calls)), netflixSnapshot: snapshot });
  assert.equal(result.matched, 1); assert.equal(result.netflixScheduleEvidenceOrigin, 'same_pipeline_snapshot');
  assert.equal(calls.includes(snapshot.sourceUrl), false);
  assert.throws(() => validateNetflixSnapshot(snapshot, Date.parse('2026-11-17T02:00:00Z'), ['2026-11']), /STALE/);
  assert.throws(() => validateNetflixSnapshot({ ...snapshot, items: [{ ...snapshot.items[0], market: 'US' }] }, Date.parse('2026-11-17T00:00:00Z'), ['2026-11']), /INVALID/);
});

test('transient fetch and server failures retry within a bound without retrying denied URLs', async () => {
  let attempts = 0;
  const result = await recheckSources({ additions: [rows[2]] }, options(async u => {
    attempts++;
    if (attempts === 1) throw new TypeError('synthetic network interruption');
    if (attempts === 2) return response(String(u), '', 503);
    return response(String(u), tvingPage());
  }));
  assert.equal(attempts, 3); assert.equal(result.matched, 1); assert.equal(result.transportRetries, 2);
});

test('a cohort missing from the release table must remain explicit in the same work heading', () => {
  const b = { ...baselines.works[0], sourceTitle: '가상 시리즈', sourceSeasonNumber: null, cohortHeadingCue: '가상 시리즈 2기', cohortNumber: 2 };
  const page = coupangPage().replace('<p class="cpnr-intro">', '<h3>가상 시리즈 2기 개강</h3><p class="cpnr-intro">').replace('가상 시리즈 시즌 2', '가상 시리즈');
  assert.equal(checkCoupang(rows[3], page, b).status, 'matched');
  assert.equal(checkCoupang(rows[3], page.replace('2기 개강', '3기 개강'), b).status, 'cohort_evidence_changed');
  assert.equal(checkCoupang(rows[3], page.replace('<h3>가상 시리즈 2기 개강</h3>', ''), b).status, 'cohort_evidence_changed');
});
