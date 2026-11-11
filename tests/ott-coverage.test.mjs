import test from 'node:test';
import assert from 'node:assert/strict';
import { auditCoverage } from '../scripts/audit-ott-coverage.mjs';

const candidate = (platform, date, market, premiereConfirmed) =>
  ({ candidate: { platform, date, market, premiereConfirmed } });

test('monthly coverage separates unverified global listings from KR premiere evidence', () => {
  const state = { version: 1, stage: 'lineup-review-staging', candidates: [
    candidate('netflix', '2026-11-20', null, false),
    candidate('netflix', '2026-11-21', 'KR', true),
    candidate('netflix', null, 'KR', true),
    candidate('tving', '2026-12-03', null, false),
  ] };
  const output = auditCoverage(state, { '2026-11': { netflix: 16 } });
  assert.equal(output.publishedCount, null);
  assert.deepEqual(output.rows[0], {
    month: '2026-11', platform: 'netflix', stagedDated: 2, stagedKrDated: 1,
    krPremiereEvidence: 1, needsKrVerification: 1, referenceCount: 16, referenceLeadGap: 15,
  });
  assert.equal(output.rows.find((x) => x.month === '2026-12' && x.platform === 'tving').stagedDated, 1);
  assert.equal(output.rows.find((x) => x.month === '2026-12' && x.platform === 'coupang_play').referenceLeadGap, null);
});

test('rejects incorrect staging shapes', () => {
  assert.throws(() => auditCoverage({ version: 2, stage: 'lineup-review-staging', candidates: [] }), /INVALID_STAGING_STATE/);
});
