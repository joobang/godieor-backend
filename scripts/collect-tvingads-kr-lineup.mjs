#!/usr/bin/env node
// Read the public TVING/Wavve lineup as review candidates. No DB publishing.
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { prepareLineup } from './prepare-ott-lineup.mjs';
import { stageLineup } from './stage-ott-lineup.mjs';

export const SOURCE = 'https://www.tvingads.com/content';
const GENRES = new Set(['드라마', '예능', '영화', '다큐멘터리', '애니메이션', '시리즈']);
const DAYS = /^(?:월|화|수|목|금|토|일|월화|화수|수목|목금|금토|토일|매일)$/;
const DATE = /^(20\d{2})\.\s*(\d{1,2})\.\s*(\d{1,2})\.?$/;
const decode = (s) => s.replace(/&#(x[\da-f]+|\d+);/gi, (_, n) => String.fromCodePoint(n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n)))
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");
export function visibleTexts(html) {
  if (typeof html !== 'string' || !html.includes('<html') || html.length > 5_000_000) throw new Error('INVALID_TVING_HTML');
  const stripped = html.replace(/<(script|style|svg|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
  return [...stripped.matchAll(/>([^<>]+)</g)].map((m) => decode(m[1]).replace(/\s+/g, ' ').trim()).filter(Boolean);
}
function validDate(text) {
  const m = DATE.exec(text);
  if (!m) return null;
  const date = `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  return Number.isFinite(Date.parse(`${date}T00:00:00Z`)) && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date ? date : null;
}
export function parseTvingAdsHtml(html, observedAt = new Date().toISOString()) {
  const text = visibleTexts(html);
  const start = text.indexOf('향후 3개월 오픈 예정 콘텐츠');
  if (start < 0) throw new Error('TVING_UPCOMING_SECTION_MISSING');
  const items = [], seen = new Map();
  for (let i = start + 1; i < text.length - 1; i++) {
    if (/^(?:광고 솔루션|인사이트|이용약관|개인정보처리방침)$/.test(text[i])) break;
    if (text[i] !== '공개일') continue;
    const date = validDate(text[i + 1]);
    if (!date) continue;
    const lookback = text.slice(Math.max(start + 1, i - 11), i);
    const genreIndex = lookback.findLastIndex((value) => GENRES.has(value));
    if (genreIndex < 0) continue;
    const afterGenre = lookback.slice(genreIndex + 1);
    const dayIndex = afterGenre.findIndex((value) => DAYS.test(value));
    if (dayIndex < 1) continue;
    const possible = afterGenre.slice(0, dayIndex).filter((value) => !value.includes('#') && !/^\d+부작$/.test(value) && !GENRES.has(value));
    const title = possible.at(-1);
    if (!title || title.length > 120 || /^(?:공개일|전체|\d+)$/.test(title)) continue;
    const id = title.normalize('NFC').toLocaleLowerCase('ko');
    if (seen.has(id)) {
      if (seen.get(id) !== date) throw new Error('TVING_DUPLICATE_TITLE_DATE_CONFLICT');
      continue;
    }
    seen.set(id, date);
    items.push({ title, date, market: null, contentKind: ({ 드라마: 'drama', 예능: 'variety', 영화: 'movie', 다큐멘터리: 'documentary', 애니메이션: 'animation', 시리즈: 'original_series' })[lookback[genreIndex]],
      seasonNumber: null, premiereConfirmed: false,
      evidence: 'TVING Ads 공식 TVING·Wavve 통합 예정 목록. 플랫폼별 제공·한국 시즌 첫 공개는 별도 확인 필요.' });
  }
  if (!items.length) throw new Error('TVING_UPCOMING_DATES_NOT_FOUND');
  const lineup = { platform: 'tving', sourceUrl: SOURCE, observedAt, sourceScope: 'tving_and_wavve',
    premiereVerified: false, items, count: items.length };
  prepareLineup(lineup);
  return lineup;
}
export async function collectTvingAdsKrLineup(fetchImpl = fetch) {
  const response = await fetchImpl(SOURCE, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`TVING_ADS_HTTP_${response.status}`);
  if (response.url && new URL(response.url).origin !== new URL(SOURCE).origin) throw new Error('TVING_ADS_REDIRECT_HOST_CHANGED');
  return parseTvingAdsHtml(await response.text());
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const output = resolve(process.argv[2] ?? '/private/tmp/godieor-tvingads-kr-lineup.json');
    const stageDir = process.argv[3];
    const lineup = await collectTvingAdsKrLineup();
    await writeFile(output, JSON.stringify(lineup, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    const staged = stageDir ? await stageLineup(output, stageDir) : null;
    console.log(JSON.stringify({ output, count: lineup.count, staged, published: 0, verifiedFirstRelease: 0 }));
  } catch (e) { console.error('TVING_ADS_COLLECT_FAILED:', e.message); process.exitCode = 1; }
}
