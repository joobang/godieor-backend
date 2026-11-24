#!/usr/bin/env node
// Read all pages of Netflix's public Korean new-to-watch schedule.
// This is a dated KR platform listing, not proof of first-ever or first-platform premiere.
import { ottSourceFailure } from './ott-source-diagnostics.mjs';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { prepareLineup } from './prepare-ott-lineup.mjs';
import { configuredMonths } from './ott-schedule-window.mjs';

export const SOURCE = 'https://about.netflix.com/ko/new-to-watch';
const API = new URL('https://about.netflix.com/api/data/releases');
const isKoreanSchedule = ({ props }) => props?.currentRegion?.countryCode === 'kr' &&
  props?.currentLanguage?.code === 'ko';
export function parseNetflixKrSchedule(html, observedAt = new Date().toISOString(), months = configuredMonths()) {
  const match = /<script\b(?=[^>]*\bid=["']__NEXT_DATA__["'])[^>]*>([\s\S]*?)<\/script>/i.exec(html);
  if (!match) throw new Error('NETFLIX_NEXT_DATA_NOT_FOUND');
  const data = JSON.parse(match[1]);
  if (!isKoreanSchedule(data))
    throw new Error('NETFLIX_KR_REGION_NOT_VERIFIED');
  return parseNetflixKrPages([data.props?.pageProps?.data], observedAt, months);
}

export function parseNetflixKrPages(pages, observedAt = new Date().toISOString(), months = configuredMonths()) {
  const first = pages[0];
  if (!first || !Number.isInteger(first.totalPages) || first.totalPages < 1 || first.totalPages > 100 ||
      !Number.isInteger(first.totalItems) || !Array.isArray(first.data) || first.current !== 1)
    throw new Error('NETFLIX_SCHEDULE_STRUCTURE_CHANGED');
  if (pages.length > first.totalPages || pages.some((page, index) => !Array.isArray(page?.data) ||
      page.current !== index + 1 || page.totalPages !== first.totalPages || page.totalItems !== first.totalItems))
    throw new Error('NETFLIX_SCHEDULE_PAGINATION_CHANGED');
  const items = [];
  const seen = new Set();
  for (const raw of pages.flatMap((page) => page.data)) {
    if (raw.country !== 'KR' || typeof raw.title1 !== 'string' || !Number.isSafeInteger(raw.startTime) ||
        !Number.isSafeInteger(raw.videoID)) throw new Error('NETFLIX_SCHEDULE_ITEM_CHANGED');
    const title = raw.title1.trim();
    const date = new Date(raw.startTime + 9 * 3600000).toISOString().slice(0, 10);
    if (!months.includes(date.slice(0, 7))) continue;
    const key = `${title.normalize('NFC')}|${date}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ title, date, market: 'KR', contentKind: 'unknown', seasonNumber: null,
      premiereConfirmed: false,
      evidence: `Netflix 한국 공식 신규 공개 목록 날짜 ${date}; Netflix videoID ${raw.videoID}. 한국 플랫폼 등록일로 확인, 작품 종류·시즌·최초 공개 여부는 TMDB 및 작품 정보로 대조 필요.` });
  }
  const lineup = { platform: 'netflix', sourceUrl: SOURCE, observedAt, items };
  if (items.length) prepareLineup(lineup);
  return { lineup, coverage: { pagesFetched: pages.length, totalPages: first.totalPages, totalSourceItems: first.totalItems,
    fetchedPageItems: pages.reduce((n, page) => n + page.data.length, 0), uniqueInWindow: items.length,
    complete: pages.length === first.totalPages } };
}

export async function collectNetflixKrSchedule(fetchImpl = fetch, { months = configuredMonths() } = {}) {
  async function fetchPage(page) {
    const url = new URL(API);
    url.searchParams.set('language', 'ko');
    url.searchParams.set('country', 'kr');
    url.searchParams.set('page', String(page));
    const response = await fetchImpl(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`NETFLIX_RELEASES_HTTP_${response.status}`);
    if (response.url) {
      const final = new URL(response.url);
      if (final.origin !== API.origin || final.pathname !== API.pathname ||
          final.searchParams.size !== url.searchParams.size ||
          [...url.searchParams].some(([key, value]) => final.searchParams.get(key) !== value))
        throw new Error('NETFLIX_RELEASES_REDIRECT_CHANGED');
    }
    return response.json();
  }

  const response = await fetchImpl(SOURCE, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; GODIEOR/1.0)' }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`NETFLIX_HTTP_${response.status}`);
  const observedAt = new Date().toISOString();
  const html = await response.text();
  const match = /<script\b(?=[^>]*\bid=["']__NEXT_DATA__["'])[^>]*>([\s\S]*?)<\/script>/i.exec(html);
  if (!match) throw new Error('NETFLIX_NEXT_DATA_NOT_FOUND');
  const next = JSON.parse(match[1]);
  // The public page can select a region from the runner's location. Its own
  // pagination endpoint accepts an explicit region, checked against every row.
  const fromKoreanPage = isKoreanSchedule(next);
  const first = fromKoreanPage ? next.props.pageProps?.data : await fetchPage(1);
  if (!fromKoreanPage && (!Array.isArray(first?.data) || first.data.length === 0 ||
      first.data.some(item => item?.country !== 'KR')))
    throw new Error('NETFLIX_KR_REGION_NOT_VERIFIED');
  if (!Number.isInteger(first?.totalPages) || first.totalPages < 1 || first.totalPages > 100)
    throw new Error('NETFLIX_SCHEDULE_STRUCTURE_CHANGED');
  const pages = [first];
  for (let page = 2; page <= first.totalPages; page++) {
    pages.push(await fetchPage(page));
  }
  const parsed = parseNetflixKrPages(pages, observedAt, months);
  if (!parsed.coverage.complete || parsed.coverage.fetchedPageItems !== first.totalItems)
    throw new Error('NETFLIX_SCHEDULE_INCOMPLETE');
  return { lineup: parsed.lineup, coverage: { ...parsed.coverage,
    firstPageSource: fromKoreanPage ? 'korean_schedule' : 'explicit_kr_pagination' } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const output = process.argv[2] ?? '/private/tmp/godieor-netflix-kr-page1.json';
    const { lineup, coverage } = await collectNetflixKrSchedule();
    await writeFile(output, JSON.stringify(lineup, null, 2) + '\n', { mode: 0o600 });
    console.log(JSON.stringify({ output, coverage }));
  } catch (error) {
    console.error(JSON.stringify(ottSourceFailure(error)));
    process.exitCode = 1;
  }
}
