import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldCollect } from '../scripts/plan-scheduled-collection.mjs';

const input = {
  apiUrl: 'https://api.github.com',
  repository: 'joobang/godieor-backend',
  runId: '42',
  token: 'test-token',
  now: new Date('2026-11-30T15:00:00Z'),
};

function runs(...workflow_runs) {
  return async endpoint => {
    assert.equal(endpoint.pathname, '/repos/joobang/godieor-backend/actions/workflows/daily-collection.yml/runs');
    assert.equal(endpoint.searchParams.get('created'), '>=2026-11-30T15:00:00.000Z');
    assert.equal(endpoint.searchParams.get('event'), 'schedule');
    assert.equal(endpoint.searchParams.get('status'), 'success');
    return Response.json({ workflow_runs, total_count: workflow_runs.length });
  };
}

test('a missed or failed slot allows another scheduled run', async () => {
  assert.equal(await shouldCollect({ ...input, fetchRuns: runs() }), true);
  assert.equal(await shouldCollect({ ...input, fetchRuns: runs({ id: 41, conclusion: 'failure' }) }), true);
  assert.equal(await shouldCollect({ ...input, fetchRuns: runs({ id: 41, conclusion: 'skipped' }) }), true);
});

test('only another successful run suppresses the current run', async () => {
  assert.equal(await shouldCollect({ ...input, fetchRuns: runs({ id: 41, conclusion: 'success' }) }), false);
  assert.equal(await shouldCollect({ ...input, fetchRuns: runs({ id: 42, conclusion: 'success' }) }), true);
});

test('an API error or incomplete result fails the check', async () => {
  await assert.rejects(shouldCollect({
    ...input, fetchRuns: async () => new Response(null, { status: 403 }),
  }), /COLLECTION_RUN_LOOKUP_HTTP_403/);
  await assert.rejects(shouldCollect({
    ...input, fetchRuns: async () => Response.json({ workflow_runs: [], total_count: 1 }),
  }), /COLLECTION_RUN_LOOKUP_INCOMPLETE/);
});
