#!/usr/bin/env node
// Convert a checked platform lineup into per-title review candidates, never published events.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const platforms = new Set(['netflix', 'tving', 'disney_plus', 'coupang_play']);
const kinds = new Set(['movie', 'original_series', 'drama', 'variety', 'documentary', 'animation', 'other', 'unknown']);
const allowedHosts = {
  netflix: ['netflix.com', 'www.netflix.com', 'about.netflix.com'],
  tving: ['www.tving.com', 'tving.com', 'www.tvingads.com', 'tvingads.com', 'cjnews.cj.net'],
  disney_plus: ['www.disneyplus.com', 'disneyplus.com', 'thewaltdisneycompany.com'],
  coupang_play: ['www.coupangplay.com', 'coupangplay.com', 'news.coupang.com'],
};
const fail = (reason) => { throw new Error(reason); };
const requiredString = (value, name, max = 500) =>
  typeof value === 'string' && value.trim() && value.length <= max ? value.trim() : fail('INVALID_' + name);
const validDate = (value) => {
  if (value === null) return true;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
const safeUrl = (value, hosts) => {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.port || url.username || url.password || !hosts.includes(url.hostname)) fail('UNTRUSTED_URL');
  return url.toString();
};
export function prepareLineup(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('INVALID_LINEUP');
  const platform = requiredString(input.platform, 'PLATFORM');
  if (!platforms.has(platform)) fail('INVALID_PLATFORM');
  const sourceUrl = safeUrl(requiredString(input.sourceUrl, 'SOURCE_URL', 2000), allowedHosts[platform]);
  const observedAt = requiredString(input.observedAt, 'OBSERVED_AT');
  if (Number.isNaN(Date.parse(observedAt)) || !/Z$|[+-]\d\d:\d\d$/.test(observedAt)) fail('INVALID_OBSERVED_AT');
  if (!Array.isArray(input.items) || !input.items.length || input.items.length > 2000) fail('INVALID_ITEMS');
  const seen = new Set();
  const candidates = input.items.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) fail('INVALID_ITEM');
    const title = requiredString(item.title, 'TITLE');
    const date = item.date ?? null;
    if (!validDate(date)) fail('INVALID_DATE');
    const market = item.market ?? null;
    if (market !== null && (typeof market !== 'string' || !/^[A-Z]{2}$/.test(market))) fail('INVALID_MARKET');
    const contentKind = requiredString(item.contentKind, 'CONTENT_KIND');
    if (!kinds.has(contentKind)) fail('INVALID_CONTENT_KIND');
    const seasonNumber = item.seasonNumber ?? null;
    if (seasonNumber !== null && (!Number.isInteger(seasonNumber) || seasonNumber < 1)) fail('INVALID_SEASON');
    const imageUrl = item.imageUrl == null ? null : safeUrl(item.imageUrl, allowedHosts[platform]);
    const evidence = requiredString(item.evidence, 'EVIDENCE', 1000);
    if (typeof item.premiereConfirmed !== 'boolean') fail('INVALID_PREMIERE');
    // Availability/arrival and first platform premiere are different concepts.
    if (item.premiereConfirmed && (!date || !market || ['unknown', 'other'].includes(contentKind))) fail('UNSUPPORTED_PREMIERE');
    const key = [platform, market, title.toLocaleLowerCase('en'), seasonNumber ?? '', date ?? ''].join('|');
    if (seen.has(key)) fail('DUPLICATE_TITLE_ROW');
    seen.add(key);
    return {
      id: createHash('sha256').update(sourceUrl + '\n' + key).digest('hex'),
      platform, sourceUrl, observedAt, sourceItem: index + 1,
      title, market, contentKind, seasonNumber, date,
      precision: date ? 'date_only' : 'unknown',
      premiereConfirmed: item.premiereConfirmed, imageUrl,
      evidence, status: 'needs_manual_review', published: false,
    };
  });
  return { stage: 'lineup-candidates-not-published', sourceUrl, observedAt, total: candidates.length, candidates };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [inputFile, outputFile] = process.argv.slice(2);
  if (!inputFile || !outputFile || inputFile === outputFile) {
    console.error('사용법: node scripts/prepare-ott-lineup.mjs input.json output.json');
    process.exitCode = 1;
  } else {
    try {
      const result = prepareLineup(JSON.parse(await readFile(inputFile, 'utf8')));
      await writeFile(outputFile, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
      console.log(JSON.stringify({ total: result.total, stage: result.stage, outputFile }));
    } catch (error) {
      console.error('LINEUP_PREPARATION_FAILED:', error.message);
      process.exitCode = 1;
    }
  }
}
