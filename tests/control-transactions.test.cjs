require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { CollectionRepository } = require('../dist/src/collection/collection.repository');
const { collectionDiagnostic } = require('../dist/src/common/collection-diagnostic');

test('registration, begin and failure bookkeeping all receive explicit control transaction limits', async () => {
  const prior = process.env.COLLECTION_CONTROL_TIMEOUT_MS;
  const options = [];
  const repo = new CollectionRepository({ $transaction: async (_, opts) => { options.push(opts); } });
  try {
    delete process.env.COLLECTION_CONTROL_TIMEOUT_MS;
    await repo.register([]); await repo.beginRun('s', 'backfill'); await repo.failRun('s', 'r', 'COLLECTION_FAILED');
    assert.deepEqual(options, Array.from({length:3}, () => ({ timeout:60000, maxWait:10000 })));
    process.env.COLLECTION_CONTROL_TIMEOUT_MS = '120000';
    await repo.register([]); assert.equal(options.at(-1).timeout, 120000);
    for (const value of ['0', '', '9999', '300001', 'NaN', '1.5']) {
      process.env.COLLECTION_CONTROL_TIMEOUT_MS = value;
      await assert.rejects(repo.register([]), /INVALID_COLLECTION_CONTROL_TIMEOUT/);
    }
  } finally {
    if (prior === undefined) delete process.env.COLLECTION_CONTROL_TIMEOUT_MS;
    else process.env.COLLECTION_CONTROL_TIMEOUT_MS = prior;
  }
});

test('all four transaction paths identify failures while discarding raw DB messages', async () => {
  const repo = new CollectionRepository({ $transaction: async () => {
    throw Object.assign(Error('SELECT secret postgresql://user:password@host/db'), { code:'P2028' });
  } });
  for (const [phase, run] of [
    ['register', () => repo.register([])], ['begin_run', () => repo.beginRun('s','backfill')],
    ['publish', () => repo.publishScope({key:'kobis'}, 's', [], 'r')],
    ['fail_run', () => repo.failRun('s','r','COLLECTION_FAILED')],
  ]) {
    await assert.rejects(run(), error => {
      assert.deepEqual(collectionDiagnostic(error), {code:'DB_TRANSACTION_FAILED', causeCode:'P2028', phase});
      assert.doesNotMatch(error.message, /secret|password|postgresql|SELECT/);
      return true;
    });
  }
  assert.deepEqual(collectionDiagnostic({code:'P2028',collectionPhase:'secret'}), {code:'DB_TRANSACTION_FAILED',causeCode:'P2028'});
});
