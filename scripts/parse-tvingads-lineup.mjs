#!/usr/bin/env node
// Read a manually saved TVING Ads page as text/Markdown; produce review-only candidates.
// TVING Ads describes TVING + Wavve. It is not proof of a TVING KR premiere.
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { prepareLineup } from './prepare-ott-lineup.mjs';

const GENRES = new Map([['드라마', 'drama'], ['예능', 'variety'], ['영화', 'movie'],
  ['다큐멘터리', 'documentary'], ['애니메이션', 'animation'], ['시리즈', 'original_series']]);
const IMAGE = /(?:Image(?:†|:|\b)|<img\b)/i;
const DATE = /^(?:(20\d{2})|(\d{2}))\.\s*(\d{1,2})\.\s*(\d{1,2})\.?$/;
function dateFrom(text) {
  const found = text.match(DATE);
  if (!found) return null;
  const yyyy = found[1] ? Number(found[1]) : 2000 + Number(found[2]);
  const mm = Number(found[3]), dd = Number(found[4]);
  const value = `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  const parsed = new Date(value + 'T00:00:00Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : null;
}

export function parseTvingAdsText(text, { sourceUrl, observedAt }) {
  if (typeof text !== 'string' || !text.trim() || text.length > 2_000_000) throw new Error('INVALID_SOURCE_TEXT');
  const url = new URL(sourceUrl);
  if (url.protocol !== 'https:' || !['www.tvingads.com', 'tvingads.com'].includes(url.hostname)
      || url.pathname !== '/content' || url.username || url.password || url.port
      || url.search || url.hash) throw new Error('INVALID_TVING_SOURCE');
  const lines = text.replace(/\r\n?/g, '\n').split('\n').map((x) => x.trim()).filter(Boolean);
  const start = lines.findIndex((x) => /향후\s*3개월\s*오픈\s*예정\s*콘텐츠/.test(x));
  if (start < 0) throw new Error('NO_COMING_SOON_SECTION');
  const items = [];
  const seen = new Map();
  for (let i = start + 1; i < lines.length; i++) {
    if (/^#{1,2}\s+/.test(lines[i]) || /^FOOTER$/i.test(lines[i])) break;
    const heading = lines[i].match(/^###\s+(.+)$/);
    if (!heading || /향후\s*3개월\s*오픈\s*예정/.test(heading[1])) continue;
    const name = heading[1].replace(/\s+/g, ' ').trim();
    // Do not inherit a genre from a preceding card when the current card has none.
    let boundary = Math.max(start, i - 8);
    for (let j = i - 1; j >= boundary; j--) {
      if (/^###\s+/.test(lines[j])) { boundary = j + 1; break; }
    }
    const prefix = lines.slice(boundary, i).reverse();
    const genre = prefix.find((x) => GENRES.has(x));
    if (!genre) continue;
    let releaseDate = null;
    for (let j = i + 1; j < lines.length; j++) {
      if (IMAGE.test(lines[j]) || /^#{1,3}\s+/.test(lines[j])) break;
      if (lines[j] === '공개일') {
        const maybeDate = lines.slice(j + 1, j + 3).map(dateFrom).find(Boolean);
        if (maybeDate) releaseDate = maybeDate;
        break;
      }
    }
    const key = name.normalize('NFC').toLocaleLowerCase('ko');
    if (seen.has(key)) {
      const old = seen.get(key);
      if (old.date !== releaseDate || old.contentKind !== GENRES.get(genre)) throw new Error('CONFLICTING_DUPLICATE_CARD');
      continue;
    }
    const entry = { title: name, date: releaseDate, market: null, contentKind: GENRES.get(genre),
      seasonNumber: null, premiereConfirmed: false,
      evidence: `TVING Ads TVING·Wavve 통합 콘텐츠 목록 / 향후 3개월 예정: ${name}, ${genre}, 공개일 ${releaseDate ?? '미정'}. 한국 TVING 최초 공개/단독 제공은 미확인.` };
    seen.set(key, entry);
    items.push(entry);
  }
  if (!items.length) throw new Error('NO_LINEUP_CARDS');
  const input = { platform: 'tving', sourceUrl, observedAt, items };
  prepareLineup(input);
  return input;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [inputFile, outputFile, sourceUrl = 'https://www.tvingads.com/content'] = process.argv.slice(2);
  if (!inputFile || !outputFile || resolve(inputFile) === resolve(outputFile)) {
    console.error('사용법: node scripts/parse-tvingads-lineup.mjs saved-page.md lineup.json [https://www.tvingads.com/content]');
    process.exitCode = 1;
  } else {
    try {
      const lineup = parseTvingAdsText(await readFile(inputFile, 'utf8'), { sourceUrl, observedAt: new Date().toISOString() });
      await writeFile(outputFile, JSON.stringify(lineup, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
      console.log(JSON.stringify({ parsed: lineup.items.length, unknownDates: lineup.items.filter((x) => !x.date).length, published: 0, outputFile }));
    } catch (error) {
      console.error('TVING_LINEUP_PARSE_FAILED:', error.message);
      process.exitCode = 1;
    }
  }
}
