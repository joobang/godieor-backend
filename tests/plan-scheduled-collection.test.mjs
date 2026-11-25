import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldCollect } from '../scripts/plan-scheduled-collection.mjs';

const input = {
  apiUrl: 'https://api.github.com',
  repository: 'joobang/godieor-backend',
  runId: '42',
  refName: 'dev',
  token: 'test-token',
  now: new Date('2026-11-30T15:00:00Z'),
};

const schedule = { id: 41, event: 'schedule', head_branch: 'dev', conclusion: 'success' };
const manual = { id: 39, event: 'workflow_dispatch', head_branch: 'main', conclusion: 'success' };
const daily = ['Collect daily providers', 'Collect and publish reviewed OTT premieres', 'Report overall collection failures']
  .map(name => ({ name, conclusion: 'success' }));
const collectJob = (steps = daily, conclusion = 'success') => ({ name: 'collect', conclusion, steps });

function pages(runs, jobsById = {}) {
  return async endpoint => {
    if (endpoint.pathname.endsWith('/daily-collection.yml/runs')) {
      assert.equal(endpoint.pathname, '/repos/joobang/godieor-backend/actions/workflows/daily-collection.yml/runs');
      assert.equal(endpoint.searchParams.get('created'), '>=2026-11-30T15:00:00.000Z');
      assert.equal(endpoint.searchParams.get('event'), null);
      assert.equal(endpoint.searchParams.get('status'), 'success');
      return Response.json({ workflow_runs: runs, total_count: runs.length });
    }
    const match = endpoint.pathname.match(/\/actions\/runs\/(\d+)\/jobs$/);
    assert.ok(match);
    assert.equal(endpoint.searchParams.get('filter'), 'latest');
    const jobs = jobsById[match[1]];
    assert.ok(jobs, 'Only eligible run jobs should be requested');
    return Response.json({ jobs, total_count: jobs.length });
  };
}

test('a missed, failed, or skipped run allows collection', async () => {
  for (const runs of [[], [{ ...manual, conclusion: 'failure' }], [{ ...schedule, conclusion: 'skipped' }]]) {
    assert.equal(await shouldCollect({ ...input, fetchRuns: pages(runs) }), true);
  }
});

test('a successful main daily or default-branch scheduled run suppresses duplicate collection', async () => {
  for (const run of [manual, schedule]) {
    assert.equal(await shouldCollect({ ...input, fetchRuns: pages([run], { [run.id]: [collectJob()] }) }), false);
  }
});

test('partial, guard-only, or failed jobs do not qualify even if the run is marked successful', async () => {
  const posterOnly = [{ name: 'Enrich Korean theatrical movie posters', conclusion: 'success' },
    { ...daily[0], conclusion: 'skipped' }, { ...daily[1], conclusion: 'skipped' }, daily[2]];
  const ottOnly = [{ ...daily[0], conclusion: 'skipped' }, daily[1], daily[2]];
  for (const jobs of [[collectJob(posterOnly)], [collectJob(ottOnly)], [collectJob([], 'skipped')], [collectJob(daily, 'failure')]]) {
    assert.equal(await shouldCollect({ ...input, fetchRuns: pages([manual], { 39: jobs }) }), true);
  }
});

test('unrelated branch or current run cannot suppress collection', async () => {
  const others = [{ ...schedule, id: 42 }, { ...schedule, head_branch: 'old-default' }, { ...manual, head_branch: 'feature' }];
  assert.equal(await shouldCollect({ ...input, fetchRuns: pages(others) }), true);
});

test('an API error or incomplete result fails the check', async () => {
  await assert.rejects(shouldCollect({
    ...input, fetchRuns: async () => new Response(null, { status: 403 }),
  }), /COLLECTION_RUN_LOOKUP_HTTP_403/);
  await assert.rejects(shouldCollect({
    ...input, fetchRuns: async () => Response.json({ workflow_runs: [], total_count: 1 }),
  }), /COLLECTION_RUN_LOOKUP_INCOMPLETE/);
  await assert.rejects(shouldCollect({
    ...input, fetchRuns: async endpoint => endpoint.pathname.endsWith('/jobs')
      ? Response.json({ jobs: [], total_count: 1 })
      : pages([manual])(endpoint),
  }), /COLLECTION_RUN_LOOKUP_INCOMPLETE/);
});
