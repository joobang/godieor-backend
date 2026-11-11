import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { selectPoster } from '../scripts/enrich-reviewed-tmdb.mjs';

const item = { type: 'tv', tmdbId: 42, title: '검증된 작품', services: ['netflix'], posterUrl: 'https://image.tmdb.org/t/p/w500/abc.jpg' };
const event = { title: '검증된 작품', platform: 'netflix', kind: 'drama', posterUrl: null };
test('exact same-platform catalog title enriches verified event', () => assert.equal(selectPoster(event, [item])?.tmdbId, 42));
test('rejects unlisted platform and mismatched content kind', () => {
  assert.equal(selectPoster({ ...event, platform: 'tving' }, [item]), null);
  assert.equal(selectPoster({ ...event, kind: 'movie' }, [item]), null);
});
test('rejects ambiguous IDs, unsafe URL and existing poster', () => {
  assert.equal(selectPoster(event, [item, { ...item, tmdbId: 43 }]), null);
  assert.equal(selectPoster(event, [{ ...item, posterUrl: 'https://evil.example/x.jpg' }]), null);
  assert.equal(selectPoster({ ...event, posterUrl: 'https://example.com/old.jpg' }, [item]), null);
});
