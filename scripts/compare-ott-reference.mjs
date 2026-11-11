#!/usr/bin/env node
// External listings are discovery leads, never official KR availability evidence.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const canonical = (s) => s.normalize('NFKC').toLocaleLowerCase('ko').replace(/[\s\p{P}\p{S}]/gu, '');
const key = (platform, title) => `${platform}|${canonical(title)}`;

export function compareReference(reference, state) {
  if (reference?.authority !== 'third_party_discovery_only' || !Array.isArray(reference.rows) ||
    state?.stage !== 'lineup-review-staging' || !Array.isArray(state.candidates)) throw new Error('INVALID_INPUT');
  const staged = new Map();
  for (const { candidate: c } of state.candidates) {
    if (!c || !c.title || !c.platform) continue;
    const k = key(c.platform, c.title);
    if (!staged.has(k)) staged.set(k, []);
    staged.get(k).push(c);
  }
  const counts = {};
  const missing = [], mismatches = [], matched = [];
  for (const row of reference.rows) {
    if (!Array.isArray(row) || row.length !== 4 || !/^2026-(11|12)-\d{2}$/.test(row[0]) ||
      !['netflix', 'tving', 'disney_plus', 'coupang_play'].includes(row[1]) || !row[2]) throw new Error('INVALID_REFERENCE_ROW');
    const [date, platform, title, season] = row;
    const month = date.slice(0, 7), group = `${month}/${platform}`;
    const counter = counts[group] ??= { referenced: 0, stagedTitle: 0, datedMatch: 0, krConfirmed: 0, missing: 0, dateMismatch: 0 };
    counter.referenced++;
    // Season null means unknown, not season 1. Treat a title match as provisional only.
    const matches = (staged.get(key(platform, title)) ?? []).filter((c) => season === null || c.seasonNumber === season || c.seasonNumber === null);
    if (!matches.length) {
      counter.missing++; missing.push({ month, platform, title, season, referenceDate: date });
      continue;
    }
    counter.stagedTitle++;
    if (matches.some((c) => c.date === date)) counter.datedMatch++;
    else { counter.dateMismatch++; mismatches.push({ month, platform, title, referenceDate: date, stagedDates: [...new Set(matches.map((c) => c.date))] }); }
    if (matches.some((c) => c.market === 'KR' && c.premiereConfirmed === true && c.date === date)) counter.krConfirmed++;
    matched.push({ month, platform, title, referenceDate: date });
  }
  return { caveat: '제3자 참고자료와 staging 제목 대조. 공식 확인/제품 게시 건수 아님.', counts, missing, mismatches, matchedCount: matched.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const reference = JSON.parse(await readFile(process.argv[2] ?? 'data/reference/streampick-2026-11-12-titles.json', 'utf8'));
    const state = JSON.parse(await readFile(process.argv[3] ?? 'work/ott-lineups/state.json', 'utf8'));
    console.log(JSON.stringify(compareReference(reference, state), null, 2));
  } catch (error) { console.error('OTT_REFERENCE_COMPARE_FAILED:', error.message); process.exitCode = 1; }
}
