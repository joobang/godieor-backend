#!/usr/bin/env node
// Source-specific dates must not be silently promoted into another OTT's KR premiere.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const normalize = (value) => String(value ?? '').normalize('NFKC').toLocaleLowerCase('ko').replace(/[\s\p{P}\p{S}]/gu, '');
const keyOf = (date, platform, title) => `${date}|${platform}|${normalize(title)}`;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const sourceKinds = new Set(['broadcast_first_air', 'target_ott_korean_arrival']);

export function auditGapProvenance(reference, evidence) {
  if (reference?.authority !== 'third_party_discovery_only' || !Array.isArray(reference.rows) ||
      evidence?.authority !== 'source_specific_dates_not_target_ott_premieres' || !Array.isArray(evidence.items)) {
    throw new Error('INVALID_PROVENANCE_INPUT');
  }
  const referenceKeys = new Set(reference.rows.map(([date, platform, title]) => keyOf(date, platform, title)));
  const seen = new Set();
  const rows = evidence.items.map((item) => {
    if (!datePattern.test(item.streamPickDate) || !datePattern.test(item.sourceDate) ||
      !sourceKinds.has(item.sourceKind) || !/^https:\/\//.test(item.sourceUrl) ||
      !['netflix', 'tving', 'disney_plus', 'coupang_play'].includes(item.platform)) {
      throw new Error('INVALID_PROVENANCE_EVIDENCE');
    }
    const key = keyOf(item.streamPickDate, item.platform, item.title);
    if (!referenceKeys.has(key) || seen.has(key)) throw new Error('UNKNOWN_OR_DUPLICATE_GAP');
    seen.add(key);
    const classification = item.sourceKind === 'broadcast_first_air'
      ? 'broadcast_date_not_target_ott_premiere'
      : item.streamPickDate !== item.sourceDate
        ? 'target_ott_date_conflict'
        : 'target_ott_arrival_needs_premiere_review';
    return { title: item.title, platform: item.platform, streamPickDate: item.streamPickDate,
      sourceDate: item.sourceDate, sourceKind: item.sourceKind, sourceName: item.sourceName,
      contentKind: item.contentKind, sourceUrl: item.sourceUrl, classification, publishEligible: false };
  });
  const summary = Object.fromEntries([...new Set(rows.map((row) => row.classification))]
    .map((classification) => [classification, rows.filter((row) => row.classification === classification).length]));
  return { total: rows.length, summary, rows,
    note: '방송 첫날은 목표 OTT 공개 첫날의 증거가 아님. 한국 OTT 공식 일정·시즌·지역을 별도 확인해야 게시 가능.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const [reference, evidence] = await Promise.all([
      readFile(process.argv[2] ?? 'data/reference/streampick-2026-11-12-gap11.json', 'utf8').then(JSON.parse),
      readFile(process.argv[3] ?? 'data/reference/streampick-2026-11-12-gap4-source-provenance.json', 'utf8').then(JSON.parse),
    ]);
    console.log(JSON.stringify(auditGapProvenance(reference, evidence), null, 2));
  } catch (error) {
    console.error(`OTT_GAP_PROVENANCE_FAILED:${error.message}`);
    process.exitCode = 1;
  }
}
