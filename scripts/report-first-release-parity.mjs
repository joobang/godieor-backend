#!/usr/bin/env node
// Turn the read-only, local reviewed DB audit into an actionable release-only
// comparison. Reference data is never used as a publishing instruction.
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

export function reportFirstReleaseParity(audit) {
  if (audit?.referenceAuthority !== 'third_party_discovery_only' ||
      !Array.isArray(audit.rows) || !Array.isArray(audit.coverageByMonthPlatform) ||
      audit.rows.length !== audit.referenceRows) throw new Error('INVALID_PARITY_AUDIT');

  const lines = [
    '# 한국 OTT 첫 공개 비교 (StreamPick 참고)', '',
    '> StreamPick은 제3자 참고 자료다. 모든 항목은 실제 한국 OTT 최초 공개 날짜/시즌을 공식 출처로 재확인해야 한다. 일반 회차는 제외한다.', '',
    `- 참조 첫 공개 행: **${audit.referenceRows}**`,
    `- 로컬 검토 게시 행: **${audit.publishedInWindow}**`,
    `- 동일 작품·플랫폼·날짜·시즌 대조 일치: **${audit.statusCounts.published_match}**`,
    `- 미일치: **${audit.unmatchedReferenceRows}** (날짜 차이 ${audit.statusCounts.date_disagreement}, 시즌 검증 필요 ${audit.statusCounts.season_unverified}, 미게시 ${audit.statusCounts.not_published})`, '',
    '## 플랫폼·월별 첫 공개 대조', '',
    '| 월 | OTT | StreamPick 참고 | 로컬 게시 | 정확 일치 | 미일치 |',
    '|---|---|---:|---:|---:|---:|',
  ];
  for (const g of audit.coverageByMonthPlatform.filter((g) => g.reference || g.published)) {
    lines.push(`| ${g.month} | ${g.platform} | ${g.reference} | ${g.published} | ${g.exactMatches} | ${g.unresolved} |`);
  }
  lines.push('', '## 날짜·시즌이 다르거나 아직 게시되지 않은 참고 행', '',
    '| StreamPick 날짜 | OTT | 작품 | 시즌 | 대조 결과 | 로컬 같은 시즌 날짜 | 추가 확인 |',
    '|---|---|---|---|---|---|---|');
  for (const r of audit.rows.filter((r) => r.status !== 'published_match')) {
    const followup = r.status === 'date_disagreement' ? '공식 KR 공개일 대조 (참고 날짜로 변경 금지)'
      : r.status === 'season_unverified' ? '시즌 정체성·첫 회 및 목표 OTT 확인'
      : '실제 한국 OTT 작품·시즌 첫 공개 근거 확인';
    const clean = (s) => String(s ?? '').replaceAll('|', '\\|').replace(/\r?\n/g, ' ');
    lines.push(`| ${r.date} | ${r.platform} | ${clean(r.title)} | ${r.season ?? '미상'} | ${r.status} | ${r.publishedDatesSameSeason?.join(', ') || '-'} | ${followup} |`);
  }
  lines.push('', '같은 작품이 여러 OTT에 나오면 플랫폼별 한국 최초 제공일을 각각 확인한다. TMDB 영화 개봉일·TV 방영일·시리즈 제공처는 시즌의 KR OTT 첫 공개일을 자동 입증하지 않는다.', '');
  return lines.join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const source = process.argv[2];
    if (!source) throw new Error('AUDIT_JSON_REQUIRED');
    const report = reportFirstReleaseParity(JSON.parse(await readFile(source, 'utf8')));
    if (process.argv[3]) await writeFile(process.argv[3], report);
    else process.stdout.write(report);
  } catch (error) {
    console.error('FIRST_RELEASE_PARITY_REPORT_FAILED:', error.message);
    process.exitCode = 1;
  }
}
