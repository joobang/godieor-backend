import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { publicationGate, runPipeline } from '../scripts/run-official-ott-pipeline.mjs';

test('entire reviewed snapshot is validated and incomplete coverage is reported', async () => {
  const [state, mappings, report] = await Promise.all([
    'work/ott-candidates/state.json', 'data/curated/ott-reviewed-mappings.json',
    'work/tmdb-release-candidates/latest.json',
  ].map((name) => readFile(name, 'utf8').then(JSON.parse)));
  const incomplete = publicationGate(state, mappings, { ...report, discoveryComplete: false });
  assert.equal(incomplete.reviewedMappings, mappings.mappings.length);
  assert.equal(incomplete.discoveryComplete, false);
  const [binding] = report.rows.filter((r) => r.readyForBatchReview && r.officialEvidence?.length);
  assert.ok(binding);
  const extra = { ...binding, id: 'test-new-identity', officialEvidence: [{ ...binding.officialEvidence[0], reviewCandidateId: 'unmapped-candidate' }] };
  const gated = publicationGate(state, mappings, { ...report, rows: [...report.rows, extra] });
  assert.deepEqual(gated.readyUnmapped, ['test-new-identity']);
});

test('pipeline preserves reviewed publications and reports incomplete TMDB coverage', async () => {
  const input = new Map(await Promise.all([
    'work/ott-candidates/state.json', 'data/curated/ott-reviewed-mappings.json',
    'work/tmdb-release-candidates/latest.json',
  ].map(async (path) => [path, JSON.parse(await readFile(path, 'utf8'))])));
  const commands = [];
  const result = await runPipeline({
    run: async (args) => { commands.push(args); return JSON.stringify({ exitCode: 0, stdout: 'fixture' }); },
    auditRun: async () => ({ parity: false, referenceRows: 52, exactMatches: 26,
      unresolved: 26, statusCounts: { published_match: 26, date_disagreement: 2, not_published: 24 } }),
    read: async (path) => JSON.stringify(path.endsWith('latest.json') ?
      { ...input.get(path), discoveryComplete: false } : input.get(path)),
  });
  assert.equal(result.status, 'published_with_discovery_gaps');
  assert.equal(result.published, true);
  assert.equal(commands.length, 10);
  assert.equal(commands.some((args) => args.includes('scripts/sync-tmdb-changes.mjs')), true);
  assert.equal(commands.some((args) => args.includes('scripts/collect-tvingads-kr-lineup.mjs')), true);
  assert.equal(commands.some((args) => args.includes('scripts/stage-ott-lineup.mjs')), true);
  assert.equal(commands.some((args) => args.includes('scripts/complete-reviewed-mappings.mjs')), true);
  assert.equal(commands.some((args) => args.some((arg) => arg.endsWith('/publish-reviewed.js'))), true);
  assert.equal(result.audit.exactMatches, 26);
});

test('Ads fetch failure leaves existing publications intact and does not stage partial Ads rows', async () => {
  const input = new Map(await Promise.all([
    'work/ott-candidates/state.json', 'data/curated/ott-reviewed-mappings.json',
    'work/tmdb-release-candidates/latest.json',
  ].map(async (path) => [path, JSON.parse(await readFile(path, 'utf8'))])));
  const commands = [];
  const result = await runPipeline({
    run: async (args) => {
      commands.push(args);
      return JSON.stringify({ exitCode: args.includes('scripts/collect-tvingads-kr-lineup.mjs') ? 1 : 0, stdout: '{}' });
    },
    auditRun: async () => ({ parity: true, referenceRows: 52, exactMatches: 52, unresolved: 0, statusCounts: {} }),
    read: async (path) => JSON.stringify(input.get(path)),
  });
  assert.equal(result.status, 'published_with_discovery_gaps');
  assert.equal(commands.some((args) => args.includes('scripts/stage-ott-lineup.mjs')), false);
  assert.equal(commands.some((args) => args.some((arg) => arg.endsWith('/publish-reviewed.js'))), true);
});

test('an incomplete TVING collection does not stage partial programmes or suppress reviewed DB publish', async () => {
  const input = new Map(await Promise.all([
    'work/ott-candidates/state.json', 'data/curated/ott-reviewed-mappings.json',
    'work/tmdb-release-candidates/latest.json',
  ].map(async (path) => [path, JSON.parse(await readFile(path, 'utf8'))])));
  const commands = [];
  const result = await runPipeline({
    run: async (args, options) => {
      commands.push({ args, options });
      return JSON.stringify({ exitCode: args.includes('scripts/collect-tving-upcoming.mjs') ? 2 : 0, stdout: '{}' });
    },
    auditRun: async () => ({ parity: true, referenceRows: 52, exactMatches: 52, unresolved: 0, statusCounts: {} }),
    read: async (path) => JSON.stringify(input.get(path)),
  });
  assert.equal(result.status, 'published_with_discovery_gaps');
  assert.equal(commands.some(({ args }) => args.includes('scripts/bridge-tving-upcoming.mjs')), false);
  assert.equal(commands.some(({ args }) => args.some((arg) => arg.endsWith('/publish-reviewed.js'))), true);
  assert.deepEqual(commands.find(({ args }) => args.includes('scripts/collect-tmdb-release-candidates.mjs')).options.acceptedExitCodes, [0, 2]);
});
