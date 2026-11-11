#!/usr/bin/env node
// A reference listing creates investigation tasks, never verified release events.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { compareReference } from './compare-ott-reference.mjs';

export function buildDiscoveryQueue(reference, state) {
  const comparison = compareReference(reference, state);
  const byGroup = {};
  const tasks = [...comparison.missing.map((row) => ({ ...row, reason: 'title_not_staged' })),
    ...comparison.mismatches.map((row) => ({ ...row, reason: 'date_disagreement' }))];
  tasks.sort((a, b) => a.referenceDate.localeCompare(b.referenceDate) || a.platform.localeCompare(b.platform) || a.title.localeCompare(b.title, 'ko'));
  for (const item of tasks) {
    const group = `${item.month}/${item.platform}`;
    byGroup[group] = (byGroup[group] || 0) + 1;
  }
  return {
    kind: 'ott-discovery-investigation-only',
    referenceAuthority: 'third_party_discovery_only',
    publishingAllowed: false,
    reviewed: false,
    referenceRows: reference.rows.length,
    matchedTitles: comparison.matchedCount,
    pendingInvestigation: tasks.length,
    byGroup,
    instructions: '각 항목의 한국 서비스 제공처 공식 출처·공개 날짜·작품/시즌·최초공개 여부를 개별 확인하고 staging에 기록. 근거 없으면 게시 금지.',
    tasks,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const reference = JSON.parse(await readFile(process.argv[2] ?? 'data/reference/streampick-2026-11-12-titles.json', 'utf8'));
    const state = JSON.parse(await readFile(process.argv[3] ?? 'work/ott-lineups/state.json', 'utf8'));
    const queue = buildDiscoveryQueue(reference, state);
    if (process.argv[4]) await writeFile(process.argv[4], JSON.stringify(queue, null, 2) + '\n');
    console.log(JSON.stringify({ referenceRows: queue.referenceRows, matchedTitles: queue.matchedTitles, pendingInvestigation: queue.pendingInvestigation, byGroup: queue.byGroup }, null, 2));
  } catch (error) {
    console.error('OTT_DISCOVERY_QUEUE_FAILED:', error.message);
    process.exitCode = 1;
  }
}
