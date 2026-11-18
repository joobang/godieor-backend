import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { missingCollectionSecrets } from '../scripts/check-collection-env.mjs';
import { childFailure, runStep, runPipeline } from '../scripts/run-official-ott-pipeline.mjs';

test('preflight lists absent and whitespace secrets without returning values', () => {
  const required = missingCollectionSecrets({});
  assert.ok(required.includes('TMDB_API_READ_ACCESS_TOKEN'));
  const env = Object.fromEntries(required.map(key => [key, 'synthetic-secret']));
  assert.deepEqual(missingCollectionSecrets(env), []);
  env.TMDB_API_READ_ACCESS_TOKEN = '  ';
  assert.deepEqual(missingCollectionSecrets(env), ['TMDB_API_READ_ACCESS_TOKEN']);
  assert.deepEqual(missingCollectionSecrets(env, 'common'), []);
  assert.deepEqual(missingCollectionSecrets(env, 'kobis'), []);
  assert.deepEqual(missingCollectionSecrets(env, 'ott'), ['TMDB_API_READ_ACCESS_TOKEN']);
});

test('child failure selects actual script and safe stdout diagnostics', () => {
  const failure = childFailure(['--env-file-if-exists=.env', 'dist/src/cli/publish-reviewed.js'], 1,
    JSON.stringify({ results: [{ status: 'failed', errorCode: 'DB_TRANSACTION_FAILED', causeCode: 'P2028', message: 'secret' }] }, null, 2),
    '.env not found. secret postgresql://secret@host');
  assert.match(failure.message, /publish-reviewed.js exit=1/);
  assert.match(failure.message, /P2028/);
  assert.doesNotMatch(failure.message, /secret|postgresql|env not found/);
});

test('real failed child process retains stdout failure without arbitrary stderr', async () => {
  await assert.rejects(runStep(['-e', `console.log(JSON.stringify({results:[{status:'failed',errorCode:'PROVIDER_HTTP_429'}]}));console.error('secret');process.exit(1);`]),
    error => /PROVIDER_HTTP_429/.test(error.message) && !/secret/.test(error.message));
});

test('fatal publication preserves completed stages and explicit failed stage report', async () => {
  const snapshot = JSON.parse(await readFile('data/curated/ott-reviewed-candidates-snapshot.json', 'utf8'));
  const mappings = JSON.parse(await readFile('data/curated/ott-reviewed-mappings.json', 'utf8'));
  await assert.rejects(runPipeline({
    read: async path => JSON.stringify(path.endsWith('state.json') ? snapshot : path.endsWith('latest.json') ? {} : mappings),
    run: async args => {
    if (args.includes('dist/src/cli/publish-reviewed.js')) throw Error('synthetic publish failure');
    return JSON.stringify({ exitCode: 0, stdout: '{}' });
  } }), error => {
    assert.equal(error.report.status, 'failed');
    assert.equal(error.report.published, false);
    assert.equal(error.report.steps.at(-1).label, 'publish_reviewed');
    assert.equal(error.report.steps.at(-1).failed, true);
    assert.ok(error.report.steps.some(step => step.label === 'netflix_official'));
    return true;
  });
});

test('failure after successful DB publication never claims a rollback', async () => {
  const snapshot = JSON.parse(await readFile('data/curated/ott-reviewed-candidates-snapshot.json', 'utf8'));
  const mappings = JSON.parse(await readFile('data/curated/ott-reviewed-mappings.json', 'utf8'));
  await assert.rejects(runPipeline({ compareReference: true,
    read: async path => JSON.stringify(path.endsWith('state.json') ? snapshot : path.endsWith('latest.json') ? {} : mappings),
    run: async () => JSON.stringify({ exitCode: 0, stdout: '{}' }),
    auditRun: async () => { throw Error('synthetic audit failure'); },
  }), error => error.report.published === true && error.report.status === 'failed');
});


test('missing TMDB evidence still runs official sources and reviewed publication', async () => {
  const snapshot = JSON.parse(await readFile('data/curated/ott-reviewed-candidates-snapshot.json', 'utf8'));
  const mappings = JSON.parse(await readFile('data/curated/ott-reviewed-mappings.json', 'utf8'));
  const commands = [];
  const result = await runPipeline({
    read: async path => JSON.stringify(path.endsWith('state.json') ? snapshot : path.endsWith('latest.json') ? {} : mappings),
    run: async args => {
      commands.push(args);
      if (args.includes('scripts/sync-tmdb-changes.mjs') || args.includes('scripts/collect-tmdb-release-candidates.mjs'))
        throw Error('MISSING_TMDB_CONFIGURATION');
      return JSON.stringify({ exitCode: 0, stdout: '{}' });
    },
  });
  assert.equal(result.status, 'published_with_discovery_gaps');
  assert.equal(result.published, true);
  assert.ok(result.failedSources.some(source => source.label === 'tmdb_official_crosscheck'));
  assert.ok(commands.some(args => args.includes('scripts/collect-netflix-kr-schedule.mjs')));
  assert.ok(commands.some(args => args.includes('dist/src/cli/publish-reviewed.js')));
});

test('bootstrap register and bookkeeping phases survive child process diagnostic parsing', () => {
  const error = childFailure(['dist/src/cli/collect-daily.js'], 1,
    '', JSON.stringify({job:'collect-daily',code:'DB_TRANSACTION_FAILED',causeCode:'P2028',phase:'register'}));
  assert.match(error.message, /"phase":"register"/);
  assert.match(error.message, /P2028/);
});
