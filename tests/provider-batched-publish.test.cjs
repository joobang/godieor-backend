require('reflect-metadata');
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {CollectionRepository} = require('../dist/src/collection/collection.repository');

function repository() {
  const state = {commits: 0, published: [], unlisted: 0, finished: 0};
  const tx = {
    event: {updateMany: async () => {state.unlisted++; return {count: 19};}},
    collection_scope: {update: async () => {state.finished++;}},
    collection_run: {update: async () => {}},
  };
  const repo = new CollectionRepository({$transaction: async callback => {
    const result = await callback(tx);
    state.commits++;
    return result;
  }});
  repo.bump = async () => ({revision: state.commits + 1});
  repo.publish = async (_tx, _adapter, record) => { state.published.push(record.externalId); };
  return {repo,state};
}

test('WORLD publishes in bounded chunks, then finalizes once', async () => {
  const {repo,state} = repository();
  const records = Array.from({length: 205}, (_, i) => ({externalId: String(i)}));
  const result = await repo.publishScope({key:'igdb'}, 'scope', records, 'run');
  assert.deepEqual(result, {unlisted: 0, published: 205});
  assert.equal(state.commits, 3);
  assert.equal(state.finished, 1);
  assert.equal(state.published.length, 205);
});

test('a failed later chunk never marks scope successful; stable IDs permit retry', async () => {
  const {repo,state} = repository();
  const records = Array.from({length: 205}, (_, i) => ({externalId: String(i)}));
  let fail = true;
  repo.publish = async (_tx, _adapter, record) => {
    if (record.externalId === '115' && fail) throw Error('SYNTHETIC_BATCH_FAILURE');
    state.published.push(record.externalId);
  };
  await assert.rejects(repo.publishScope({key:'igdb'}, 'scope', records, 'run'), /COLLECTION_FAILED/);
  assert.equal(state.commits, 1);
  assert.equal(state.finished, 0);
  fail = false;
  await repo.publishScope({key:'igdb'}, 'scope', records, 'retry');
  assert.equal(state.finished, 1);
  assert.equal(state.commits, 4);
});

test('KOBIS reconciles historical calendar visibility only for populated complete fetch', async () => {
  const {repo,state} = repository();
  assert.deepEqual(await repo.publishScope({key:'kobis'}, 'scope', [], 'run'), {unlisted: 0, published: 0});
  assert.equal(state.unlisted, 0);
  assert.deepEqual(await repo.publishScope({key:'kobis'}, 'scope', Array.from({length: 5}, (_, i) => ({externalId: String(i)})), 'run'), {unlisted: 19, published: 5});
  assert.equal(state.unlisted, 1);
});
