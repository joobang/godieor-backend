import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepareLineup } from '../scripts/prepare-ott-lineup.mjs';
import { mergeLineup, stageLineup } from '../scripts/stage-ott-lineup.mjs';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const lineup = () => ({
  platform: 'netflix', sourceUrl: 'https://www.netflix.com/tudum/articles/new-on-netflix',
  observedAt: '2026-11-11T02:00:00Z', items: [
    { title: '가상 작품', date: '2026-11-19', market: null, contentKind: 'drama', seasonNumber: null,
      premiereConfirmed: false, evidence: '가상 미국 목록의 11월 19일 신규 제공 표시' },
  ],
});
test('국가가 미확인된 글로벌 목록은 후보로만 보존한다', () => {
  const result = prepareLineup(lineup());
  assert.equal(result.total, 1);
  assert.equal(result.candidates[0].market, null);
  assert.equal(result.candidates[0].premiereConfirmed, false);
  assert.equal(result.candidates[0].published, false);
});
test('명시적인 지역/최초 공개 근거가 있으면 심사 대기 후보로만 만든다', () => {
  const data = lineup();
  data.items[0].market = 'KR';
  data.items[0].premiereConfirmed = true;
  const item = prepareLineup(data).candidates[0];
  assert.equal(item.status, 'needs_manual_review');
  assert.equal(item.precision, 'date_only');
});
test('추정 최초 공개, 잘못된 날짜, 중복 작품, 다른 도메인 거부', () => {
  const data = lineup();
  data.items[0].premiereConfirmed = true;
  assert.throws(() => prepareLineup(data), /UNSUPPORTED_PREMIERE/);
  data.items[0].premiereConfirmed = false;
  data.items[0].date = '2026-02-30';
  assert.throws(() => prepareLineup(data), /INVALID_DATE/);
  data.items[0].date = '2026-11-19';
  data.items.push({ ...data.items[0] });
  assert.throws(() => prepareLineup(data), /DUPLICATE_TITLE_ROW/);
  data.items.pop();
  data.sourceUrl = 'https://example.com/tudum';
  assert.throws(() => prepareLineup(data), /UNTRUSTED_URL/);
});

test('여러 작품은 별도 후보로 남고 재수집은 중복을 만들지 않는다', () => {
  const input = lineup();
  input.items.push({ ...input.items[0], title: '다른 작품' });
  const state = { version: 1, stage: 'lineup-review-staging', candidates: [] };
  const prepared = prepareLineup(input);
  assert.deepEqual([mergeLineup(state, prepared, '2026-11-11T02:00:00Z').created, state.candidates.length], [2, 2]);
  const result = mergeLineup(state, prepared, '2026-11-12T02:00:00Z');
  assert.deepEqual([result.created, result.changed, result.unchanged, result.stored], [0, 0, 2, 2]);
});
test('공개일 변경은 같은 작품의 신규 revision이며 검토를 무효화한다', () => {
  const input = lineup();
  const state = { version: 1, stage: 'lineup-review-staging', candidates: [] };
  mergeLineup(state, prepareLineup(input), '2026-11-11T02:00:00Z');
  const id = state.candidates[0].id;
  state.candidates[0].review = { fake: 'previous-review' };
  input.items[0].date = '2026-11-20';
  const result = mergeLineup(state, prepareLineup(input), '2026-11-12T02:00:00Z');
  assert.equal(result.changed, 1);
  assert.equal(state.candidates[0].id, id);
  assert.equal(state.candidates[0].revision, 2);
  assert.equal(state.candidates[0].review, null);
});
test('스테이징 파일은 재실행해도 중복 없이 유지하고 잘못된 입력은 상태를 유지한다', async () => {
  const root = await mkdtemp(join(tmpdir(), 'godieor-lineup-test-'));
  try {
    const source = join(root, 'lineup.json');
    const directory = join(root, 'stage');
    await writeFile(source, JSON.stringify(lineup()));
    assert.equal((await stageLineup(source, directory)).created, 1);
    assert.equal((await stageLineup(source, directory)).unchanged, 1);
    const statePath = join(directory, 'state.json');
    const before = await readFile(statePath, 'utf8');
    const invalid = lineup(); invalid.items[0].date = '2026-02-30';
    await writeFile(source, JSON.stringify(invalid));
    await assert.rejects(stageLineup(source, directory), /INVALID_DATE/);
    assert.equal(await readFile(statePath, 'utf8'), before);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test('손상된 기존 후보와 중복 입력은 변경 없이 거절한다', () => {
  const state = { version: 1, stage: 'lineup-review-staging', candidates: [] };
  const prepared = prepareLineup(lineup());
  mergeLineup(state, prepared, '2026-11-11T02:00:00Z');
  const original = JSON.stringify(state);
  assert.throws(() => mergeLineup(state, { ...prepared, candidates: [prepared.candidates[0], prepared.candidates[0]] }, '2026-11-12T02:00:00Z'), /DUPLICATE_ID/);
  assert.equal(JSON.stringify(state), original);
  const damaged = structuredClone(state);
  damaged.candidates[0].revision = 0;
  assert.throws(() => mergeLineup(damaged, prepared, '2026-11-12T02:00:00Z'), /INVALID_STATE/);
  const duplicateState = structuredClone(state);
  duplicateState.candidates.push(structuredClone(state.candidates[0]));
  assert.throws(() => mergeLineup(duplicateState, prepared, '2026-11-12T02:00:00Z'), /INVALID_STATE/);
});
