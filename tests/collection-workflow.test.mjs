import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ottSourceFailure } from '../scripts/ott-source-diagnostics.mjs';
import { missingCollectionSecrets } from '../scripts/check-collection-env.mjs';
import { childFailure, runStep, runPipeline } from '../scripts/run-official-ott-pipeline.mjs';
import { SOURCE as coupangIndex, collectCoupangNews } from '../scripts/collect-coupangplay-kr-lineup.mjs';
import { collectPremieres } from '../scripts/collect-coupang-premieres.mjs';

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

test('daily workflow surfaces failed poster enrichment in its final status', async () => {
  const workflow = await readFile('.github/workflows/daily-collection.yml', 'utf8');
  const finalStatus = workflow.split('      - name: Report overall collection failures')[1];
  assert.ok(finalStatus, 'daily collection must contain its final failure gate');
  assert.ok(finalStatus.includes('steps.ott_posters.outcome'));
  assert.ok(finalStatus.includes('&& "${{ steps.ott_posters.outcome }}" != failure'));
  assert.ok(workflow.includes('ott-poster-report.json'));
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

test('official OTT provider codes survive child failure without leaking exception details', () => {
  assert.equal(ottSourceFailure(new Error('TMDB_REQUEST_FAILED:TMDB_HTTP_429')).errorCode, 'TMDB_HTTP_429');
  const timeout = new DOMException('private-response-placeholder', 'TimeoutError');
  assert.equal(ottSourceFailure(new Error('TMDB_REQUEST_FAILED:private-response-placeholder', { cause: timeout }))
    .errorCode, 'PROVIDER_TIMEOUT');
  assert.equal(ottSourceFailure(Object.assign(new Error('internal path'), { code: 'ENOENT' })).errorCode,
    'OTT_INPUT_FILE_MISSING');
  assert.equal(ottSourceFailure(new Error('NETFLIX_HTTP_403 private-response-placeholder')).errorCode,
    'COLLECTION_FAILED');

  const failure = childFailure(['scripts/collect-coupangplay-kr-lineup.mjs'], 1, '',
    JSON.stringify(ottSourceFailure(new Error('COUPANG_HTTP_403'))) + '\n');
  assert.match(failure.message, /\[{"code":"COUPANG_HTTP_403"}\]$/);
  const redacted = childFailure(['scripts/collect-tving-upcoming.mjs'], 1, '',
    JSON.stringify({ status: 'failed', errorCode: 'PRIMARY_HTTP_403 private-response-placeholder' }));
  assert.match(redacted.message, /\[{"code":"COLLECTION_FAILED"}\]$/);
  assert.doesNotMatch(redacted.message, /private-response-placeholder/);
});

test('Coupang HTTP diagnostics distinguish index denial from a blocked article', async () => {
  const denied = async () => new Response('Access Denied', { status: 403 });
  const articleDenied = async url => url === coupangIndex ? new Response(
    '<html><article><a href="https://news.coupang.com/archives/999999/">금주의 추천작</a></article></html>') : denied();
  await assert.rejects(collectCoupangNews(denied), /COUPANG_INDEX_HTTP_403/);
  await assert.rejects(collectPremieres(denied), /COUPANG_INDEX_HTTP_403/);
  const redirected = async () => ({ ok: false, status: 403, url: 'https://example.invalid/' });
  await assert.rejects(collectCoupangNews(redirected), /COUPANG_REDIRECT_HOST_CHANGED/);
  await assert.rejects(collectPremieres(redirected), /COUPANG_REDIRECT_HOST_CHANGED/);
  const sameOriginRedirect = async () => ({ ok: false, status: 403, url: 'https://news.coupang.com/' });
  await assert.rejects(collectCoupangNews(sameOriginRedirect), /COUPANG_INDEX_REDIRECT_CHANGED/);
  await assert.rejects(collectCoupangNews(articleDenied), /COUPANG_ARTICLE_HTTP_403/);
  const report = await collectPremieres(articleDenied);
  assert.equal(report.complete, false);
  assert.equal(report.errors[0].error, 'COUPANG_ARTICLE_HTTP_403');
});

test('only a Coupang index denial skips the second index request and reviewed OTT still publishes', async () => {
  const snapshot = await readFile('data/curated/ott-reviewed-candidates-snapshot.json', 'utf8');
  const mappings = await readFile('data/curated/ott-reviewed-mappings.json', 'utf8');
  for (const code of ['COUPANG_INDEX_HTTP_403', 'COUPANG_ARTICLE_HTTP_403', 'COUPANG_INDEX_HTTP_429']) {
    const result = await runPipeline({
      read: async path => path.endsWith('state.json') ? snapshot : path.endsWith('latest.json') ? '{}' : mappings,
      run: async args => {
        if (args.includes('scripts/collect-coupangplay-kr-lineup.mjs')) {
          const stderr = JSON.stringify(ottSourceFailure(new Error(code)));
          throw childFailure(args, 1, '', stderr);
        }
        return JSON.stringify({ exitCode: 0, stdout: '{}' });
      },
    });
    assert.equal(result.status, 'published_with_discovery_gaps');
    assert.equal(result.published, true);
    assert.deepEqual(result.failedSources.find(s => s.label === 'coupang_news_official').diagnostics, [{ code }]);
    const premiere = result.steps.find(s => s.label === 'coupang_explicit_premiere_review');
    if (code === 'COUPANG_INDEX_HTTP_403') assert.equal(premiere.skipped, 'coupang_index_access_denied');
    else assert.equal(premiere.exitCode, 0);
  }
});
