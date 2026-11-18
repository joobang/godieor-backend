import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { completeReviewedMappings } from '../scripts/complete-reviewed-mappings.mjs';

const read = async (file) => JSON.parse(await readFile(new URL(file, import.meta.url), 'utf8'));

test('only a reviewed source record missing an opaque mapping is assigned one, then remains stable', async () => {
  const state = await read('../data/curated/ott-reviewed-candidates-snapshot.json');
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
  const state = await read('../data/curated/ott-reviewed-candidates-snapshot.json');
  const current = await read('../data/curated/ott-reviewed-mappings.json');
  const unreviewed = structuredClone(state.candidates.find(c => c.review.value.platform === 'netflix'));
  unreviewed.id = 'b'.repeat(64);
  const title = '가상 TMDB 발견 영화';
  const date = '2026-11-30';
  const review = unreviewed.review;
  Object.assign(review.value, { id: unreviewed.id, title, date });
  unreviewed.revisions.at(-1).lineupEvidence = {
    title, date, platform: 'netflix', market: 'KR', contentKind: 'movie',
    seasonNumber: null, premiereConfirmed: false, evidence: '가상 TMDB 제공처와 날짜 단서',
    imageUrl: null, sourceItem: 1,
  };
  unreviewed.review = null;
  state.candidates.push(unreviewed);
  assert.equal(completeReviewedMappings(state, current).added, 0);
  unreviewed.review = review;
  assert.equal(completeReviewedMappings(state, current).added, 1);
});

test('an already mapped premiere is never duplicated through a second source candidate', async () => {
  const state = await read('../data/curated/ott-reviewed-candidates-snapshot.json');
  const current = await read('../data/curated/ott-reviewed-mappings.json');
  const original = state.candidates.find((c) => c.id === current.mappings[0].candidateId);
  const copy = structuredClone(original);
  copy.id = 'a'.repeat(64);
  copy.review.value.id = copy.id;
  const result = completeReviewedMappings({ ...state, candidates: [...state.candidates, copy] }, current);
  assert.equal(result.added, 0);
  assert.deepEqual(result.rejected, [{ candidateId: copy.id, reason: 'duplicate_premiere_identity' }]);
});
