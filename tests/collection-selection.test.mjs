import test from 'node:test';
import assert from 'node:assert/strict';
import { planCollection } from '../scripts/plan-collection.mjs';

test('scheduled and full manual runs preserve their previous provider and OTT coverage', () => {
  const daily = { daily: true, providers: [], market: '', ott: true, moviePosters: true };
  assert.deepEqual(planCollection('schedule'), daily);
  assert.deepEqual(planCollection('workflow_dispatch', 'daily', 'all'), daily);
  assert.deepEqual(planCollection('workflow_dispatch', 'backfill', 'all'),
    { daily: false, providers: ['kobis', 'football_data_pl', 'igdb'], market: '', ott: true, moviePosters: true });
});

test('selected backfill runs only the requested provider, market or OTT', () => {
  const select = target => planCollection('workflow_dispatch', 'backfill', target);
  for (const [target, provider] of [['kobis','kobis'], ['epl','football_data_pl'], ['igdb','igdb']])
    assert.deepEqual(select(target), { daily: false, providers: [provider], market: '', ott: false, moviePosters: provider === 'kobis' });
  for (const market of ['WORLD', 'KR', 'JP', 'AU', 'NZ', 'CN', 'BR'])
    assert.deepEqual(select('igdb-' + market.toLowerCase()),
      { daily: false, providers: ['igdb'], market, ott: false, moviePosters: false });
  assert.deepEqual(select('ott'), { daily: false, providers: [], market: '', ott: true, moviePosters: false });
  assert.deepEqual(select('movie-posters'), { daily: false, providers: [], market: '', ott: false, moviePosters: true });
  assert.throws(() => select('unknown'), /INVALID_COLLECTION_SELECTION/);
  assert.throws(() => planCollection('workflow_dispatch', 'daily', 'igdb-world'), /SELECT_BACKFILL_MODE_FOR_TARGET/);
});
