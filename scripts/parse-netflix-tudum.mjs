#!/usr/bin/env node
// Import the text/Markdown of a saved Netflix Tudum monthly lineup for review.
// Dates describe availability on the source page; they do not assert a KR premiere.
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { prepareLineup } from './prepare-ott-lineup.mjs';

const MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december'];
const section = /^(?:#{1,4}\s*)?([A-Za-z]+)\s+(\d{1,2})(?:\s*,?\s*(\d{4}))?\s*$/;
const title = /^#{3,4}\s+(.+?)\s*$/;
const seasons = /^Seasons?\s+(\d+)(?:\s*[-–]\s*\d+)?\s*$/i;

export function parseNetflixTudumText(text, { sourceUrl, year, month, observedAt }) {
  if (typeof text !== 'string' || text.length > 2_000_000) throw new Error('INVALID_SOURCE_TEXT');
  if (!Number.isInteger(year) || year < 2020 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) throw new Error('INVALID_MONTH');
  const url = new URL(sourceUrl);
  if (url.hostname !== 'www.netflix.com' || !url.pathname.startsWith('/tudum/articles/new-on-netflix')) throw new Error('INVALID_TUDUM_SOURCE');
  const lines = text.replace(/\r\n?/g, '\n').split('\n').map((line) => line.trim());
  let currentDate = null;
  let inLineup = false;
  let foundSection = false;
  const items = [];
  const seen = new Set();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^(?:#{1,4}\s*)?Coming soon\s*$/i.test(line)) { inLineup = true; currentDate = null; continue; }
    const match = line.match(section);
    if (match) {
      const monthIndex = MONTHS.indexOf(match[1].toLowerCase()) + 1;
      if (monthIndex === month && (!match[3] || Number(match[3]) === year)) {
        const day = Number(match[2]);
        const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const parsed = new Date(date + 'T00:00:00Z');
        if (Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date) {
          currentDate = date; inLineup = true; foundSection = true; continue;
        }
      }
      if (monthIndex) { currentDate = null; continue; }
    }
    const heading = line.match(title);
    if (!heading || !inLineup || !currentDate) continue;
    const name = heading[1].replace(/\s+/g, ' ').trim();
    if (!name || name.length > 500) throw new Error('INVALID_TITLE');
    const next = lines.slice(i + 1, i + 5).filter(Boolean)[0] ?? '';
    const season = next.match(seasons);
    const seasonNumber = season ? Number(season[1]) : null;
    const key = `${name.normalize('NFC').toLowerCase()}|${seasonNumber ?? ''}`;
    if (seen.has(key)) throw new Error('DUPLICATE_LINEUP_TITLE');
    seen.add(key);
    items.push({ title: name, date: currentDate, market: null,
      contentKind: seasonNumber ? 'original_series' : 'unknown', seasonNumber,
      premiereConfirmed: false,
      evidence: `Netflix Tudum ${year}-${String(month).padStart(2, '0')} 목록: ${currentDate} 섹션, ${name}${seasonNumber ? ` 시즌 ${seasonNumber}` : ''}. 원문에서 한국 최초 공개 미확인.` });
  }
  if (!foundSection || items.length === 0) throw new Error('NO_DATE_SECTIONS_WITH_TITLES');
  const input = { platform: 'netflix', sourceUrl, observedAt, items };
  // Validate via the existing non-publishing review candidate boundary.
  prepareLineup(input);
  return input;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [inputFile, outputFile, yearText, monthText, sourceUrl] = process.argv.slice(2);
  if (!inputFile || !outputFile || !yearText || !monthText || !sourceUrl || resolve(inputFile) === resolve(outputFile)) {
    console.error('사용법: node scripts/parse-netflix-tudum.mjs saved-page.md lineup.json 2026 11 https://www.netflix.com/tudum/articles/new-on-netflix');
    process.exitCode = 1;
  } else {
    try {
      const lineup = parseNetflixTudumText(await readFile(inputFile, 'utf8'), {
        year: Number(yearText), month: Number(monthText), sourceUrl, observedAt: new Date().toISOString(),
      });
      await writeFile(outputFile, JSON.stringify(lineup, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
      console.log(JSON.stringify({ parsed: lineup.items.length, marketConfirmed: 0, published: 0, outputFile }));
    } catch (error) {
      console.error('TUDUM_PARSE_FAILED:', error.message);
      process.exitCode = 1;
    }
  }
}
