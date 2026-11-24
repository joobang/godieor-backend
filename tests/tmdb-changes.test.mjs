import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { collectChanges, syncChanges } from '../scripts/sync-tmdb-changes.mjs';

test('TMDB changes fetches all pages and deduplicates each type', async () => {
  const seen = [];
  const request = async (path, params) => {
    seen.push([path, params.page]);
    return { total_pages: path === '/tv/changes' ? 2 : 1,
      results: [{ id: path === '/tv/changes' ? 7 : 3 }] };
  };
  const report = await collectChanges(request, { start: '2026-11-01', end: '2026-11-10' });
  assert.deepEqual(report.rows, [{ type: 'movie', tmdbId: 3 }, { type: 'tv', tmdbId: 7 }]);
  assert.deepEqual(seen, [['/movie/changes',1],['/tv/changes',1],['/tv/changes',2]]);
  await assert.rejects(() => collectChanges(request, { start: '2026-10-01', end: '2026-11-10' }), /INVALID_CHANGES_WINDOW/);
});

test('incremental sync persists a replay-safe checkpoint without losing earlier identities', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'godieor-tmdb-changes-test-'));
  const file = join(dir, 'latest.json');
  let run = 0;
  try {
    const request = async (path) => ({ total_pages: 1, results: [{ id: ++run < 3 ? 11 : 12 }] });
    const first = await syncChanges(request, file, new Date('2026-11-15T12:00:00Z'));
    const second = await syncChanges(request, file, new Date('2026-11-16T12:00:00Z'));
    assert.equal(first.end, '2026-11-15');
    assert.equal(second.end, '2026-11-16');
    assert.ok(second.total >= first.total);
    assert.equal(second.referenceInputUsed, false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('zero-page changes advance the checkpoint only for a consistent empty response', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'godieor-tmdb-empty-test-'));
  const file = join(dir, 'latest.json');
  const empty = { total_pages: 0, total_results: 0, results: [] };
  try {
    await syncChanges(async () => ({ total_pages: 1, results: [{ id: 17 }] }),
      file, new Date('2026-11-23T01:00:00Z'));

    const report = await syncChanges(async () => empty, file, new Date('2026-11-24T01:00:00Z'));
    assert.equal(report.end, '2026-11-24');
    assert.deepEqual(report.rows, [{ type: 'movie', tmdbId: 17 }, { type: 'tv', tmdbId: 17 }]);
    assert.deepEqual(report.coverage.filter(row => 'pages' in row).map(row => row.pages), [0, 0]);

    const window = { start: '2026-11-24', end: '2026-11-24' };
    for (const response of [{ ...empty, total_results: 1 }, { ...empty, results: [{ id: 1 }] }]) {
      await assert.rejects(() => collectChanges(async () => response, window), /INVALID_TMDB_CHANGES_PAGES/);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
