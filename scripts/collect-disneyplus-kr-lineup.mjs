#!/usr/bin/env node
// Collect titles from Disney+'s KR upcoming-page embedded server content.
// A page tile is not proof of a first KR release date.
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { prepareLineup } from './prepare-ott-lineup.mjs';

export const SOURCE = 'https://www.disneyplus.com/ko-kr/browse/page-36541dc7-6961-4bbb-a07b-ef97d7da7995';

export function parseDisneyUpcoming(html, observedAt = new Date().toISOString()) {
  if (typeof html !== 'string' || html.length > 5_000_000) throw new Error('DISNEY_INVALID_HTML');
  const match = html.match(/<script\b(?=[^>]*\bid="__NEXT_DATA__")[^>]*>([\s\S]*?)<\/script>/i);
  if (!match) throw new Error('DISNEY_NEXT_DATA_MISSING');
  const page = JSON.parse(match[1]).props?.pageProps;
  if (page?.region !== 'kr' || page?.pageId !== 'page-36541dc7-6961-4bbb-a07b-ef97d7da7995') throw new Error('DISNEY_WRONG_PAGE');
  const groups = page.stitchDocument?.mainContent?.filter((node) => node?._type === 'SetGroup') ?? [];
  if (!groups.length) throw new Error('DISNEY_UPCOMING_GROUP_MISSING');
  const items = [], seen = new Set();
  for (const group of groups) {
    // Exclude bonus clips/trailers from the separate special-video group.
    const label = typeof group.title?.children === 'string' ? group.title.children : '';
    if (/특별 영상|예고편|극장 개봉/.test(label)) continue;
    for (const slider of group.items ?? []) {
      for (const entry of slider.children ?? []) {
        const card = entry.children?.find((node) => node?._type === 'ImageCard');
        if (!card || !/^\/ko-kr\/browse\/entity-[a-f\d-]+$/.test(card.url ?? '')) continue;
        const title = card.title?.trim();
        if (!title || title.length > 150 || /특별 영상|예고편|트레일러|스페셜 룩/.test(title)) continue;
        if (seen.has(card.url)) continue;
        seen.add(card.url);
        items.push({ title, date: null, market: 'KR', contentKind: 'unknown', seasonNumber: null,
          premiereConfirmed: false, evidence: `Disney+ 한국 공개 예정 목록의 작품 카드(${card.url}). 구체적인 한국 첫 공개일·시즌은 미확인.` });
      }
    }
  }
  if (!items.length) throw new Error('DISNEY_UPCOMING_TITLES_NOT_FOUND');
  const lineup = { platform: 'disney_plus', sourceUrl: SOURCE, observedAt, sourceScope: 'kr_upcoming_titles_without_dates',
    premiereVerified: false, items, count: items.length };
  prepareLineup(lineup);
  return lineup;
}

export async function collectDisneyUpcoming(fetchImpl = fetch) {
  const response = await fetchImpl(SOURCE, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`DISNEY_HTTP_${response.status}`);
  if (response.url && new URL(response.url).origin !== new URL(SOURCE).origin) throw new Error('DISNEY_REDIRECT_HOST_CHANGED');
  return parseDisneyUpcoming(await response.text());
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const output = resolve(process.argv[2] ?? '/private/tmp/godieor-disney-upcoming.json');
    const lineup = await collectDisneyUpcoming();
    await writeFile(output, JSON.stringify(lineup, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ output, count: lineup.count, published: 0, verifiedFirstRelease: 0 }));
  } catch (error) { console.error('DISNEY_COLLECT_FAILED:', error.message); process.exitCode = 1; }
}
