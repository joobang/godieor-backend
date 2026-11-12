import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { auditGapProvenance } from '../scripts/audit-ott-gap-provenance.mjs';

const load = async (file) => JSON.parse(await readFile(new URL(`../data/reference/${file}`, import.meta.url)));

test('four remaining StreamPick gaps distinguish broadcast first-air from OTT KR arrivals', async () => {
  const result = auditGapProvenance(await load('streampick-2026-11-12-gap11.json'),
    await load('streampick-2026-11-12-gap4-source-provenance.json'));
  assert.equal(result.total, 4);
  assert.deepEqual(result.summary, { target_ott_date_conflict: 1, broadcast_date_not_target_ott_premiere: 3 });
  assert.equal(result.rows.find((r) => r.title === '전지적 집착 시점').contentKind, 'variety');
  assert.equal(result.rows.find((r) => r.title === '나인 투 식스').sourceName, 'SBS');
  assert.ok(result.rows.every((r) => r.publishEligible === false));
});

test('broadcast date equals discovery date but cannot authorize target OTT publication', async () => {
  const reference = await load('streampick-2026-11-12-gap11.json');
  const evidence = await load('streampick-2026-11-12-gap4-source-provenance.json');
  const result = auditGapProvenance(reference, { ...evidence, items: [evidence.items[2]] });
  assert.equal(result.rows[0].sourceDate, result.rows[0].streamPickDate);
  assert.equal(result.rows[0].classification, 'broadcast_date_not_target_ott_premiere');
});

test('source evidence for unknown discovery entry cannot create a new OTT event', async () => {
  const reference = await load('streampick-2026-11-12-gap11.json');
  const evidence = await load('streampick-2026-11-12-gap4-source-provenance.json');
  assert.throws(() => auditGapProvenance(reference, { ...evidence, items: [
    { ...evidence.items[0], title: '없는 신작' },
  ] }), /UNKNOWN_OR_DUPLICATE_GAP/);
  assert.throws(() => auditGapProvenance(reference, { ...evidence, items: [evidence.items[0], evidence.items[0]] }),
    /UNKNOWN_OR_DUPLICATE_GAP/);
});
