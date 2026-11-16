import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { auditPublished } from '../scripts/audit-ott-published.mjs';
import { reportFirstReleaseParity } from '../scripts/report-first-release-parity.mjs';

test('first release report isolates date differences and missing seasons without ordinary episodes', () => {
  const ref = { authority: 'third_party_discovery_only', rows: [
    ['2026-11-03', 'netflix', 'A', 2], ['2026-11-05', 'tving', 'B', 1],
  ] };
  const local = [{ date: '2026-11-04', platform: 'netflix', title: 'A', seasonNumber: 2 }];
  const report = reportFirstReleaseParity(auditPublished(ref, local));
  assert.match(report, /참조 첫 공개 행: \*\*2\*\*/);
  assert.match(report, /A \| 2 \| date_disagreement \| 2026-11-04/);
  assert.match(report, /B \| 1 \| not_published/);
  assert.match(report, /공식 KR 공개일 대조/);
});

test('report refuses a non-audit payload', () => {
  assert.throws(() => reportFirstReleaseParity({ rows: [] }), /INVALID_PARITY_AUDIT/);
});
