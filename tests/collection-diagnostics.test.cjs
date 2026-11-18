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
  assert.deepEqual(results[0], { provider: 'synthetic', category: 'game', status: 'failed',
    errorCode: 'PROVIDER_HTTP_429', market: 'KR', phase: 'fetch' });
  assert.equal(results[1].status, 'succeeded'); assert.equal(failures, 1); assert.equal(published, 1);
});

test('atomic publication uses bounded cloud override and preserves local defaults', async () => {
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
