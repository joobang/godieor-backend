import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { completeReviewedMappings } from '../scripts/complete-reviewed-mappings.mjs';

const read = async (file) => JSON.parse(await readFile(new URL(file, import.meta.url), 'utf8'));

test('only a reviewed source record missing an opaque mapping is assigned one, then remains stable', async () => {
  const state = await read('../work/ott-candidates/state.json');
  const current = await read('../data/curated/ott-reviewed-mappings.json');
  const removed = current.mappings[0];
  const prior = { ...current, mappings: current.mappings.slice(1) };
  const generated = completeReviewedMappings(state, prior);
  assert.equal(generated.added, 1);
  assert.equal(generated.completed.mappings.length, current.mappings.length);
  assert.ok(generated.completed.mappings.some((m) => m.candidateId === removed.candidateId));
  const replay = completeReviewedMappings(state, generated.completed);
  assert.equal(replay.added, 0);
  assert.deepEqual(replay.completed, generated.completed);
});

test('unreviewed TMDB discovery never creates a publication mapping', async () => {
  const state = await read('../work/ott-candidates/state.json');
  const current = await read('../data/curated/ott-reviewed-mappings.json');
  const unreviewed = state.candidates.find((c) => !c.review);
  assert.ok(unreviewed);
  assert.equal(completeReviewedMappings(state, current).added, 0);
});

test('an already mapped premiere is never duplicated through a second source candidate', async () => {
  const state = await read('../work/ott-candidates/state.json');
  const current = await read('../data/curated/ott-reviewed-mappings.json');
  const original = state.candidates.find((c) => c.id === current.mappings[0].candidateId);
  const copy = structuredClone(original);
  copy.id = 'a'.repeat(64);
  copy.review.value.id = copy.id;
  const result = completeReviewedMappings({ ...state, candidates: [...state.candidates, copy] }, current);
  assert.equal(result.added, 0);
  assert.deepEqual(result.rejected, [{ candidateId: copy.id, reason: 'duplicate_premiere_identity' }]);
});
