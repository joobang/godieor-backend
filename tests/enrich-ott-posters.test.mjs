import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { findVerifiedPoster } from '../scripts/enrich-ott-posters.mjs';

const event = { title: '검증된 작품', kind: 'drama', platform: 'netflix', posterUrl: null };
const candidate = { id: 14, name: '검증된 작품', poster_path: '/poster.jpg' };
const lookup = async (path) => path.startsWith('/search/')
  ? { results: [candidate] }
  : { results: { KR: { flatrate: [{ provider_name: 'Netflix' }] } } };
test('unique Korean provider title yields safe TMDB artwork', async () => {
  assert.equal(await findVerifiedPoster(event, lookup), 'https://image.tmdb.org/t/p/w500/poster.jpg');
});
test('rejects ambiguous titles and other KR providers', async () => {
  assert.equal(await findVerifiedPoster(event, async (path) => path.startsWith('/search/')
    ? { results: [candidate, { ...candidate, id: 15 }] }
    : { results: { KR: { flatrate: [{ provider_name: 'Netflix' }] } } }), null);
  assert.equal(await findVerifiedPoster(event, async (path) => path.startsWith('/search/')
    ? { results: [candidate] }
    : { results: { KR: { flatrate: [{ provider_name: 'TVING' }] } } }), null);
});
test('rejects unsafe poster paths, mismatched types and existing artwork', async () => {
  assert.equal(await findVerifiedPoster(event, async (path) => path.startsWith('/search/')
    ? { results: [{ ...candidate, poster_path: 'https://evil.example/1.jpg' }] }
    : { results: {} }), null);
  assert.equal(await findVerifiedPoster({ ...event, kind: 'game' }, lookup), null);
  assert.equal(await findVerifiedPoster({ ...event, posterUrl: 'existing' }, lookup), null);
});
