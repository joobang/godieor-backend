#!/usr/bin/env node
// Read-only coverage inspection. A staged candidate is not a published release.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const PLATFORMS = ['netflix', 'tving', 'disney_plus', 'coupang_play'];
export const MONTHS = ['2026-11', '2026-12'];

export function auditCoverage(state, references = {}) {
  if (state?.version !== 1 || state.stage !== 'lineup-review-staging' || !Array.isArray(state.candidates))
    throw new Error('INVALID_STAGING_STATE');
  const result = [];
  for (const month of MONTHS) {
    for (const platform of PLATFORMS) {
      const records = state.candidates.filter((row) => row?.candidate?.platform === platform &&
        typeof row.candidate.date === 'string' && row.candidate.date.startsWith(month));
      const krDated = records.filter((row) => row.candidate.market === 'KR');
      const eligibleEvidence = krDated.filter((row) => row.candidate.premiereConfirmed === true);
      const ref = references?.[month]?.[platform];
      const referenceCount = Number.isInteger(ref) && ref >= 0 ? ref : null;
      result.push({
        month, platform, stagedDated: records.length, stagedKrDated: krDated.length,
        krPremiereEvidence: eligibleEvidence.length,
        needsKrVerification: records.length - eligibleEvidence.length,
        referenceCount,
        // Comparison is a discovery lead, not a recall score or confirmed missing releases.
        referenceLeadGap: referenceCount === null ? null : Math.max(referenceCount - eligibleEvidence.length, 0),
      });
    }
  }
  return { stagingTotal: state.candidates.length, publishedCount: null, rows: result };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [stateFile = 'work/ott-lineups/state.json', referenceFile] = process.argv.slice(2);
  try {
    const state = JSON.parse(await readFile(stateFile, 'utf8'));
    const reference = referenceFile ? JSON.parse(await readFile(referenceFile, 'utf8')) : {};
    console.log(JSON.stringify(auditCoverage(state, reference), null, 2));
  } catch (error) {
    console.error('OTT_COVERAGE_AUDIT_FAILED:', error?.message === 'INVALID_STAGING_STATE' ? error.message : '입력 파일과 JSON 형식을 확인하세요.');
    process.exitCode = 1;
  }
}
