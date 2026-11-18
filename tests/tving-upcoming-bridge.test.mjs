import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bridgeTvingUpcoming, tvingDiscoveries } from '../scripts/bridge-tving-upcoming.mjs';

const sourceUrl = 'https://www.tving.com/contents/P001794298';
const report = () => ({ kind: 'tving-official-upcoming-review', totalPrograms: 1, errors: [], rows: [{
  sourceUrl, title: '무쇠소녀단3', status: 'existing_review_identity',
  sourceWork: { category: '예능' }, sourceClaims: [{ date: '2026-11-26', seasonNumber: 3 }],
  matches: [{ tmdbId: 1234, seasonNumber: 3, identityMethod: 'existing_explicit_binding' }],
}] });

test('TVING 공식 프로그램과 TMDB 시즌 단서를 게시 후보로 연결하고 재실행은 멱등', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'tving-bridge-'));
  try {
    const file = join(dir, 'report.json');
    await writeFile(file, JSON.stringify(report()));
    const first = await bridgeTvingUpcoming(file, dir, '2026-11-16T05:00:00Z');
    const second = await bridgeTvingUpcoming(file, dir, '2026-11-16T05:00:00Z');
    assert.equal(first.created, 1);
    assert.deepEqual([second.created, second.revised, second.published], [0, 0, 0]);
    const state = JSON.parse(await readFile(join(dir, 'state.json'), 'utf8'));
    assert.equal(state.candidates.length, 1);
    assert.equal(state.candidates[0].revisions.length, 1);
    assert.equal(state.candidates[0].revisions[0].lineupEvidence.seasonNumber, 3);
    assert.equal(state.candidates[0].revisions[0].lineupEvidence.premiereConfirmed, false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('불완전한 공식 배치와 잘못된 프로그램 출처는 저장 전에 차단', () => {
  const incomplete = report(); incomplete.errors = [{ error: 'network_failed' }];
  assert.throws(() => tvingDiscoveries(incomplete), /INCOMPLETE_TVING_REPORT/);
  const invalid = report(); invalid.rows[0].sourceUrl = 'https://www.tvingads.com/content';
  assert.throws(() => tvingDiscoveries(invalid), /UNTRUSTED_SOURCE_URL/);
});

test('공식 공개예정 목록 순서 변경은 새 검토 revision을 생성하지 않는다', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'tving-order-'));
  try {
    const file = join(dir, 'report.json');
    const first = report();
    const secondRow = { ...first.rows[0], sourceUrl: 'https://www.tving.com/contents/P001794299', title: '가상 두 번째 작품' };
    first.rows.push(secondRow);
    first.totalPrograms = 2;
    await writeFile(file, JSON.stringify(first));
    await bridgeTvingUpcoming(file, dir);
    const reordered = { ...first, rows: [...first.rows].reverse() };
    await writeFile(file, JSON.stringify(reordered));
    const result = await bridgeTvingUpcoming(file, dir);
    assert.equal(result.revised, 0);
    const state = JSON.parse(await readFile(join(dir, 'state.json'), 'utf8'));
    assert.deepEqual(state.candidates.map(candidate => candidate.revisions.length), [1, 1]);
    const changed = { ...reordered, rows: reordered.rows.map(row => row.sourceUrl === sourceUrl
      ? { ...row, sourceClaims: [{ date: '2026-11-27', seasonNumber: 3 }] } : row) };
    await writeFile(file, JSON.stringify(changed));
    const changedResult = await bridgeTvingUpcoming(file, dir);
    assert.equal(changedResult.revised, 1);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
