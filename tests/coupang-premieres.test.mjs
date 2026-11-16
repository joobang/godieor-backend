import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { parsePremiereArticle, identifyPremiere, stageAndReview, collectPremieres } from '../scripts/collect-coupang-premieres.mjs';
const require = createRequire(import.meta.url);
const { completeReviewedMappings } = await import('../scripts/complete-reviewed-mappings.mjs');
const { prepareReviewed } = require('../dist/src/reviewed-ott/domain/reviewed-mapping.js');
const url = 'https://news.coupang.com/archives/999999/';
// Entirely synthetic official HTML and TMDB responses; no product data is used.
const html = (release = '2026년 11월 18일(수) 첫 공개', title = '가상 신작') => `<html><title>쿠팡플레이 금주의 추천작: 가상</title><link rel="canonical" href="${url}"><meta property="article:published_time" content="2026-11-12T00:00:00Z"><p class="cpnr-intro wp-block-paragraph"><strong>제목</strong>${title}<br><strong>출연</strong>배우 A, 배우 B<br><strong>장르</strong>드라마<br><strong>공개</strong>${release}</p></html>`;
const request = (mode = '') => async path => {
  if (path === '/search/movie') return { total_pages: mode === 'truncated' ? 6 : 1, results: [{ id: 9, title: '가상 신작' }, ...(mode === 'ambiguous' ? [{ id: 10, title: '가상 신작' }] : [])] };
  if (path === '/search/tv') return { total_pages: 1, results: [] };
  if (/\/movie\/\d+$/.test(path)) return { id: Number(path.split('/').at(-1)), title: '가상 신작', genres: [] };
  if (path.endsWith('/credits')) return { cast: [{ id: 1, name: '배우 A' }, { id: mode === 'same-person' ? 1 : 2, name: '배우 B' }] };
  if (path.startsWith('/person/')) return { id: Number(path.split('/').at(-1)), also_known_as: [] };
  throw Error('unexpected synthetic request');
};

test('work release fields preserve dates but only literal first premiere qualifies', () => {
  const [r] = parsePremiereArticle(html(), url);
  assert.equal(r.date, '2026-11-18'); assert.equal(r.firstReleaseExplicit, true);
  for (const field of ['2026', '매주 수요일 오후 5시', '12월 18일 첫 공개', '2026년 2월 30일 첫 공개', '11월 18일(화) 첫 공개']) {
    const [held] = parsePremiereArticle(html(field), url); assert.equal(held.date, null, field);
    assert.equal(held.firstReleaseExplicit, false);
  }
  for (const field of ['11월 18일 공개', '11월 18일부터 매주 수요일', '11월 18일 예고편 첫 공개', '11월 18일 미국 첫 공개', '11월 18일 재공개']) {
    const [held] = parsePremiereArticle(html(field), url); assert.equal(held.firstReleaseExplicit, false, field);
  }
  const [series] = parsePremiereArticle(html('11월 18일부터 매주 수요일', '가상 신작 시즌 4'), url);
  assert.equal(series.seasonNumber, 4); assert.equal(series.dateSemantics, 'platform_schedule_start');
});

test('article title, canonical URL and work field isolation are mandatory', () => {
  assert.throws(() => parsePremiereArticle(html().replace(url, 'https://news.coupang.com/archives/888/'), url), /IDENTITY_CHANGED/);
  assert.throws(() => parsePremiereArticle(html(), 'https://news.coupang.com.evil/archives/999999/'), /UNTRUSTED/);
  const [row] = parsePremiereArticle(html('2026').replace('</html>', '<p>다른 작품 11월 18일 첫 공개</p></html>'), url);
  assert.equal(row.date, null);
});

test('unique exact title with two distinct cast members identifies a new premiere', async () => {
  const row = await identifyPremiere(parsePremiereArticle(html(), url)[0], request());
  assert.equal(row.eligible, true); assert.equal(row.matches[0].tmdbId, 9);
  for (const mode of ['truncated', 'ambiguous', 'same-person']) {
    assert.equal((await identifyPremiere(parsePremiereArticle(html(), url)[0], request(mode))).eligible, false, mode);
  }
  const noFirst = await identifyPremiere(parsePremiereArticle(html('11월 18일 공개'), url)[0], request());
  assert.equal(noFirst.eligible, false); assert.ok(noFirst.holdReasons.includes('first_release_not_explicit'));
});

test('TV first episode must be verified, and absent season is never invented', async () => {
  const tvRequest = async (path) => {
    if (path === '/search/movie') return { total_pages: 1, results: [] };
    if (path === '/search/tv') return { total_pages: 1, results: [{ id: 8, name: '가상 신작' }] };
    if (path === '/tv/8') return { id: 8, name: '가상 신작', genres: [] };
    if (path.endsWith('/aggregate_credits')) return { cast: [{ id: 1, name: '배우 A' }, { id: 2, name: '배우 B' }] };
    if (path === '/tv/8/season/4') return { season_number: 4, air_date: '2026-11-18', episodes: [{ episode_number: 1, air_date: '2026-11-19' }] };
    throw Error('unexpected synthetic request');
  };
  assert.equal((await identifyPremiere(parsePremiereArticle(html(), url)[0], tvRequest)).eligible, false);
  assert.equal((await identifyPremiere(parsePremiereArticle(html(undefined, '가상 신작 시즌 4'), url)[0], tvRequest)).eligible, false);
});

test('new proof enters review and opaque mapping without a historical curator binding, replay preserves it', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'godieor-new-premiere-'));
  const now = '2026-11-16T00:00:00Z';
  const row = await identifyPremiere(parsePremiereArticle(html(), url)[0], request());
  const report = { kind: 'coupang-official-premiere-review', referenceInputUsed: false, complete: true, errors: [], observedAt: now, rows: [row] };
  try {
    const oldRow = await identifyPremiere(parsePremiereArticle(html(undefined, '가상 기존작'), url)[0], async (...args) => JSON.parse(JSON.stringify(await request()(...args)).replaceAll('가상 신작', '가상 기존작').replaceAll('"id":9', '"id":109')));
    await stageAndReview({ ...report, rows: [oldRow] }, dir, now);
    const previous = JSON.parse(await readFile(join(dir, 'state.json'), 'utf8')).candidates[0];
    const initial = { version: 1, mappings: [{ candidateId: previous.id, revision: previous.revisions.at(-1).token, contentKey: 'synthetic-old-content', eventKey: 'synthetic-old-event' }] };
    assert.equal((await stageAndReview(report, dir, now)).approved, 1);
    const state = JSON.parse(await readFile(join(dir, 'state.json'), 'utf8'));
    const mapped = completeReviewedMappings(state, initial);
    assert.equal(mapped.added, 1);
    const records = prepareReviewed(mapped.completed, state);
    assert.equal(records.length, 2);
    assert.ok(JSON.stringify(records).includes('2026-11-18')); 
    const before = JSON.stringify(state);
    assert.equal((await stageAndReview(report, dir, now)).approved, 0);
    assert.equal(JSON.stringify(JSON.parse(await readFile(join(dir, 'state.json'), 'utf8'))), before);
    await assert.rejects(stageAndReview({ ...report, complete: false }, dir, now), /INCOMPLETE/);
    await assert.rejects(stageAndReview(report, dir, '2026-11-17T00:00:00Z'), /STALE/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('later search pages are examined before deciding identity uniqueness', async () => {
  const pages = [];
  const paged = async (path, params) => {
    if (path === '/search/movie') {
      pages.push(params.page);
      return { page: params.page, total_pages: 2, results: params.page === 1 ? [] : [{ id: 9, title: '가상 신작' }] };
    }
    return request()(path, params);
  };
  const row = await identifyPremiere(parsePremiereArticle(html(), url)[0], paged);
  assert.equal(row.eligible, true); assert.deepEqual(pages, [1, 2]);
});
