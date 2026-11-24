#!/usr/bin/env node
// Discover explicit content announcements from Coupang's official newsroom.
// News date and recommendation date cannot be used as OTT premieres.
import { ottSourceFailure } from './ott-source-diagnostics.mjs';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { prepareLineup } from './prepare-ott-lineup.mjs';

export const SOURCE = 'https://news.coupang.com/archives/category/coupangplay/';
const sourceOrigin = new URL(SOURCE).origin;
const entities = (value) => value.replace(/&#(x[\da-f]+|\d+);/gi, (_, n) => String.fromCodePoint(n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n)))
  .replace(/&(?:nbsp|amp|lt|gt|quot|#39|lsquo|rsquo|ldquo|rdquo);/g, (v) => ({ '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&lsquo;': '‘', '&rsquo;': '’', '&ldquo;': '“', '&rdquo;': '”' })[v]);
const plain = (value) => entities(value.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

export function parseCoupangNewsIndex(html) {
  if (typeof html !== 'string' || !html.includes('<html') || html.length > 5_000_000) throw new Error('COUPANG_INVALID_HTML');
  const articles = [...html.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/gi)];
  if (!articles.length) throw new Error('COUPANG_ARTICLES_MISSING');
  const urls = [];
  for (const [, article] of articles) {
    if (!/금주의 추천작/.test(plain(article))) continue;
    const href = article.match(/href="(https:\/\/news\.coupang\.com\/archives\/\d+\/?)"/i)?.[1];
    if (href) urls.push(href);
  }
  if (!urls.length) throw new Error('COUPANG_RECOMMENDATIONS_MISSING');
  return [...new Set(urls)].slice(0, 4);
}

export function parseCoupangArticle(html, articleUrl) {
  if (typeof html !== 'string' || html.length > 3_000_000) throw new Error('COUPANG_INVALID_ARTICLE');
  // Newsroom recommendation posts explicitly label individual works with 제목.
  // This is more reliable than extracting marketing copy in their headings.
  const items = [];
  for (const match of html.matchAll(/<strong\b[^>]*>\s*제목\s*<\/strong>\s*([^<]{2,150})(?:<br\s*\/?\s*>|<\/p>)/gi)) {
    const title = entities(match[1]).trim();
    if (!title || title.length > 120 || items.includes(title)) continue;
    items.push(title);
  }
  // Avoid incorrectly treating title's production year or article publication
  // timestamp as its KR platform premiere.
  return items.map((title) => ({ title, date: null, market: 'KR', contentKind: 'unknown', seasonNumber: null,
    premiereConfirmed: false, evidence: `쿠팡플레이 공식 금주의 추천작 ${articleUrl}의 작품 제목. 한국 OTT 최초 공개일·시즌 별도 확인 필요.` }));
}

export function makeCoupangLineup(items, observedAt = new Date().toISOString()) {
  if (!items.length) throw new Error('COUPANG_ARTICLE_TITLES_NOT_FOUND');
  const lineup = { platform: 'coupang_play', sourceUrl: SOURCE, observedAt,
    sourceScope: 'newsroom_weekly_recommendation_titles', premiereVerified: false, items, count: items.length };
  prepareLineup(lineup);
  return lineup;
}

export async function collectCoupangNews(fetchImpl = fetch) {
  const response = await fetchImpl(SOURCE, { signal: AbortSignal.timeout(15000) });
  if (response.url && new URL(response.url).origin !== sourceOrigin) throw new Error('COUPANG_REDIRECT_HOST_CHANGED');
  if (!response.ok) {
    if (response.url && response.url !== SOURCE) throw new Error('COUPANG_INDEX_REDIRECT_CHANGED');
    throw new Error(`COUPANG_INDEX_HTTP_${response.status}`);
  }
  const urls = parseCoupangNewsIndex(await response.text());
  const items = new Map();
  let fetched = 0;
  for (const url of urls) {
    const detail = await fetchImpl(url, { signal: AbortSignal.timeout(15000) });
    if (detail.url && new URL(detail.url).origin !== sourceOrigin) throw new Error('COUPANG_REDIRECT_HOST_CHANGED');
    if (!detail.ok) throw new Error(`COUPANG_ARTICLE_HTTP_${detail.status}`);
    fetched++;
    for (const item of parseCoupangArticle(await detail.text(), url)) {
      const key = item.title.normalize('NFC').toLocaleLowerCase('ko');
      if (!items.has(key)) items.set(key, item);
    }
  }
  if (fetched !== urls.length) throw new Error('COUPANG_PARTIAL_FETCH');
  return makeCoupangLineup([...items.values()]);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const output = resolve(process.argv[2] ?? '/private/tmp/godieor-coupang-news.json');
    const lineup = await collectCoupangNews();
    await writeFile(output, JSON.stringify(lineup, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ output, count: lineup.count, published: 0, verifiedFirstRelease: 0 }));
  } catch (error) { console.error(JSON.stringify(ottSourceFailure(error))); process.exitCode = 1; }
}
