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

test('verified OTT alias can bind a movie behind a legacy drama classification', async () => {
  const aliases = [{ identityVerified: true, title: '해외 특집', date: '2026-11-04',
    platform: 'netflix', eventKind: 'drama', tmdbKind: 'movie', tmdbId: 1820172,
    tmdbTitle: 'Janelle James: How Romantic' }];
  const result = await findVerifiedPoster({ ...event, title: '해외 특집' }, async (path) => {
    assert.equal(path, '/movie/1820172');
    return { title: 'Janelle James: How Romantic', poster_path: '/movie.jpg' };
  }, [], aliases);
  assert.deepEqual(result, { tmdbId: 1820172, kind: 'movie',
    posterUrl: 'https://image.tmdb.org/t/p/w500/movie.jpg', verification: 'verified_alias' });
});

test('verified aliases require exact date, title, platform, kind and canonical TMDB title', async () => {
  const alias = { identityVerified: true, title: '검증된 작품', date: event.date,
    platform: event.platform, eventKind: event.kind, tmdbKind: 'tv', tmdbId: 99,
    tmdbTitle: 'Correct Original' };
  const rejected = async (path) => path.startsWith('/search/')
    ? { results: [] } : { name: 'Wrong Original', poster_path: '/wrong.jpg' };
  assert.equal(await findVerifiedPoster(event, rejected, [], [alias]), null);
  for (const change of [{ date: '2026-11-05' }, { platform: 'tving' }, { kind: 'movie' }, { title: '다른 작품' }]) {
    assert.equal(await findVerifiedPoster({ ...event, ...change }, async (path) =>
      path.startsWith('/search/') ? { results: [] } : { results: {} }, [], [alias]), null);
  }
});

test('Netflix verified English translation and official Netflix title URL resolve localized TMDB movie', async () => {
  const alias = { identityVerified: true, title: '제 아들을 대신하여', date: '2026-11-20',
    platform: 'netflix', eventKind: 'movie', tmdbKind: 'movie', tmdbId: 1307474,
    tmdbTitle: 'On Behalf of My Son' };
  const titleEvent = { title: alias.title, date: alias.date, platform: alias.platform, kind: alias.eventKind };
  const detail = { title: 'Vicentina Pede Desculpas', original_title: 'Vicentina Pede Desculpas',
    poster_path: '/verified.jpg' };
  const translations = { translations: [{ iso_639_1: 'en', data: {
    title: 'On Behalf of My Son', homepage: 'https://www.netflix.com/title/81724626' } }] };
  const lookupTranslation = async (path) => path.endsWith('/translations') ? translations : detail;
  assert.equal((await findVerifiedPoster(titleEvent, lookupTranslation, [], [alias]))?.tmdbId, 1307474);
  for (const data of [{ title: 'Different title', homepage: 'https://www.netflix.com/title/81724626' },
    { title: 'On Behalf of My Son', homepage: 'https://unrelated.example/title/81724626' }]) {
    assert.equal(await findVerifiedPoster(titleEvent, async (path) =>
      path.endsWith('/translations') ? { translations: [{ iso_639_1: 'en', data }] } : detail, [], [alias]), null);
  }
});

test('two conflicting manually reviewed identities are not selected', async () => {
  const row = { identityVerified: true, title: event.title, date: event.date,
    platform: event.platform, eventKind: event.kind, tmdbKind: 'tv', tmdbTitle: 'Original' };
  const result = await findVerifiedPoster(event, async (path) =>
    path.startsWith('/search/') ? { results: [] } : { results: {} }, [],
    [{ ...row, tmdbId: 1 }, { ...row, tmdbId: 2 }]);
  assert.equal(result, null);
});
