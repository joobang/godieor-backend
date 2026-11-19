import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { findVerifiedPoster } from '../scripts/enrich-ott-posters.mjs';

const event = { title: '검증된 작품', kind: 'drama', platform: 'netflix', date: '2026-11-04' };
const candidate = { id: 14, name: '검증된 작품', poster_path: '/poster.jpg' };
const lookup = async (path) => path.startsWith('/search/') ? { results: [candidate] }
  : { results: { KR: { flatrate: [{ provider_name: 'Netflix' }] } } };

test('unambiguous Korean OTT provider title matches a TMDB ID and poster', async () => {
  assert.deepEqual(await findVerifiedPoster(event, lookup), {
    tmdbId: 14, kind: 'tv', posterUrl: 'https://image.tmdb.org/t/p/w500/poster.jpg',
    verification: 'unique_title_kr_provider',
  });
});

test('original-title lookup can resolve a localized title', async () => {
  const resolved = await findVerifiedPoster({ ...event, title: '한국명', originalTitle: 'Original Name' },
    async (path) => path.startsWith('/search/') ? { results: [{ ...candidate, name: 'Original Name' }] }
      : { results: { KR: { flatrate: [{ provider_name: 'Netflix' }] } } });
  assert.equal(resolved?.tmdbId, 14);
});

test('rejects ambiguous IDs, wrong Korean provider and invalid poster path', async () => {
  assert.equal(await findVerifiedPoster(event, async (path) => path.startsWith('/search/')
    ? { results: [candidate, { ...candidate, id: 15 }] } : { results: {} }), null);
  assert.equal(await findVerifiedPoster(event, async (path) => path.startsWith('/search/')
    ? { results: [candidate] } : { results: { KR: { flatrate: [{ provider_name: 'TVING' }] } } }), null);
  assert.equal((await findVerifiedPoster(event, async (path) => path.startsWith('/search/')
    ? { results: [{ ...candidate, poster_path: 'https://evil.example/1.jpg' }] }
    : { results: { KR: { flatrate: [{ provider_name: 'Netflix' }] } } }))?.posterUrl, null);
});

test('curated identity is bound to date, platform and title', async () => {
  const curated = [{ identityVerified: true, premiereConfirmed: true, market: 'KR', type: 'tv',
    platform: 'netflix', date: '2026-11-04', title: '검증된 작품', tmdbId: 99 }];
  const detail = async (path) => {
    assert.equal(path, '/tv/99');
    return { id: 99, poster_path: '/curated.jpg' };
  };
  assert.equal((await findVerifiedPoster(event, detail, curated)).tmdbId, 99);
  assert.equal((await findVerifiedPoster({ ...event, date: '2026-11-05' }, lookup, curated)).tmdbId, 14);
});

test('fallback source identity resolves translated titles without availability inference', async () => {
  const eventWithSource = { ...event, title: '번역명', fallbackExternalId: 'tmdb-tv-130853-s2-netflix-KR' };
  const result = await findVerifiedPoster(eventWithSource, async (path) => {
    assert.equal(path, '/tv/130853');
    return { id: 130853, poster_path: '/fallback.png' };
  });
  assert.equal(result?.tmdbId, 130853);
  assert.equal(result?.verification, 'fallback_source_id');
});
