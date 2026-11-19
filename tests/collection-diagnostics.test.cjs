require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { collectionDiagnostic } = require('../dist/src/common/collection-diagnostic');
const { CollectionService } = require('../dist/src/collection/collection.service');
const { CollectionRepository } = require('../dist/src/collection/collection.repository');

test('safe diagnostics classify failures without exposing messages, queries or URLs', () => {
  const error = Object.assign(new Error('postgresql://secret:password@host/db SELECT private'), { code: 'P2028' });
  assert.deepEqual(collectionDiagnostic(error), { code: 'DB_TRANSACTION_FAILED', causeCode: 'P2028' });
  assert.deepEqual(collectionDiagnostic(new Error('https://provider/?key=secret')), { code: 'COLLECTION_FAILED' });
  assert.deepEqual(collectionDiagnostic(new Error('PROVIDER_HTTP_429')), { code: 'PROVIDER_HTTP_429' });
  assert.deepEqual(collectionDiagnostic(new TypeError('fetch failed', { cause: { code: 'ETIMEDOUT', message: 'secret' } })),
    { code: 'CONNECTION_FAILED', causeCode: 'ETIMEDOUT' });
});

test('failed scope identifies phase and market while subsequent scopes still run', async () => {
  let failures = 0, published = 0;
  const repository = { withCollectorLock: async (_, fn) => fn(), findScope: async () => ({ id: 'synthetic' }),
    beginRun: async () => 'synthetic', failRun: async (_, __, code) => { failures++; assert.equal(code, 'PROVIDER_HTTP_429'); },
    publishScope: async () => { published++; } };
  const adapter = { key: 'synthetic', scopes: [{ category: 'game', market: 'KR' }, { category: 'game', market: 'JP' }],
    fetch: async scope => { if (scope.market === 'KR') throw Error('PROVIDER_HTTP_429'); return []; } };
  const results = await new CollectionService(repository, [adapter]).collect('backfill');
  assert.equal(results[0].provider, 'synthetic');
  assert.equal(results[0].status, 'failed');
  assert.equal(results[0].errorCode, 'PROVIDER_HTTP_429');
  assert.equal(results[0].market, 'KR');
  assert.equal(results[0].phase, 'fetch');
  assert.ok(Number.isSafeInteger(results[0].fetchMs) && results[0].fetchMs >= 0);
  assert.equal(results[1].status, 'succeeded');
  assert.equal(results[1].recordCount, 0);
  assert.ok(Number.isSafeInteger(results[1].fetchMs) && results[1].fetchMs >= 0);
  assert.ok(Number.isSafeInteger(results[1].publishMs) && results[1].publishMs >= 0);
  assert.equal(failures, 1); assert.equal(published, 1);
});

test('failed publication exposes bounded timings and input count without driver text', async () => {
  const repository = {
    withCollectorLock: async (_, fn) => fn(), findScope: async () => ({ id: 'scope' }),
    beginRun: async () => 'run', failRun: async () => {},
    publishScope: async () => { throw Object.assign(new Error('secret-db-url'), { code: 'P2028' }); },
  };
  const adapter = { key: 'igdb', scopes: [{ category: 'game', market: 'WORLD' }], fetch: async () => [] };
  const [result] = await new CollectionService(repository, [adapter]).collect('backfill');
  assert.equal(result.phase, 'publish');
  assert.equal(result.causeCode, 'P2028');
  assert.equal(result.recordCount, 0);
  assert.ok(Number.isSafeInteger(result.fetchMs) && result.fetchMs >= 0);
  assert.ok(Number.isSafeInteger(result.publishMs) && result.publishMs >= 0);
  assert.doesNotMatch(JSON.stringify(result), /secret-db-url/);
});

test('publication uses bounded cloud override and preserves local defaults', async () => {
  const prior = process.env.COLLECTION_PUBLISH_TIMEOUT_MS;
  const options = [];
  const repository = new CollectionRepository({ $transaction: async (_, opts) => { options.push(opts); } });
  try {
    delete process.env.COLLECTION_PUBLISH_TIMEOUT_MS;
    await repository.publishScope({ key: 'kobis' }, 's', [], 'r');
    await repository.publishScope({ key: 'igdb' }, 's', [], 'r');
    process.env.COLLECTION_PUBLISH_TIMEOUT_MS = '900000';
    await repository.publishScope({ key: 'ott_reviewed' }, 's', [], 'r');
    assert.deepEqual(options, [{ timeout: 30000, maxWait: 10000 }, { timeout: 180000, maxWait: 10000 }, { timeout: 900000, maxWait: 10000 }]);
    for (const value of ['NaN', '', '0', '1800001', '3.5']) {
      process.env.COLLECTION_PUBLISH_TIMEOUT_MS = value;
      await assert.rejects(repository.publishScope({ key: 'kobis' }, 's', [], 'r'), /INVALID_COLLECTION_PUBLISH_TIMEOUT/);
    }
  } finally {
    if (prior === undefined) delete process.env.COLLECTION_PUBLISH_TIMEOUT_MS;
    else process.env.COLLECTION_PUBLISH_TIMEOUT_MS = prior;
  }
});


test('large publication commits bounded batches and marks success only after the final batch', async () => {
  const batches = [];
  const marked = [];
  let revision = 0;
  const db = {
    $transaction: async (fn, options) => {
      const batch = [];
      batches.push({ batch, options });
      return fn({
        catalog_state: { update: async () => ({ revision: BigInt(++revision) }) },
        collection_scope: { update: async () => { marked.push('scope'); } },
        collection_run: { update: async () => { marked.push('run'); } },
      });
    },
  };
  const repository = new CollectionRepository(db);
  repository.publish = async (_tx, _adapter, record, catalogRevision) => {
    batches.at(-1).batch.push({ id: record.externalId, catalogRevision });
  };
  const records = Array.from({ length: 205 }, (_, index) => ({ externalId: String(index) }));
  await repository.publishScope({ key: 'igdb' }, 'scope', records, 'run');
  assert.deepEqual(batches.map(({ batch }) => batch.length), [100, 100, 5]);
  assert.deepEqual(marked, ['scope', 'run']);
  assert.equal(new Set(batches.flatMap(({ batch }) => batch.map(({ id }) => id))).size, 205);
  assert.deepEqual(batches.map(({ batch }) => [...new Set(batch.map(({ catalogRevision }) => catalogRevision.toString()))]),
    [['1'], ['2'], ['3']]);

  marked.length = 0;
  const failed = new CollectionRepository(db);
  failed.publish = async (_tx, _adapter, record) => {
    if (record.externalId === '125') throw new Error('SIMULATED_PUBLISH_FAILURE');
  };
  await assert.rejects(failed.publishScope({ key: 'igdb' }, 'scope', records, 'run'), /COLLECTION_FAILED/);
  assert.deepEqual(marked, []);
});
