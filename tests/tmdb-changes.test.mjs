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
