import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { bridgeNetflixLineup, netflixDiscoveries } from '../scripts/bridge-netflix-lineup.mjs';

const require = createRequire(import.meta.url);
const { decodeState, addCandidate, applyReview, reviewedExport } = require('../dist/src/ott-candidates/domain/candidate.js');
const official = JSON.parse(await readFile(new URL('../data/lineups/netflix-kr-2026-11-12-auto.json', import.meta.url), 'utf8'));
const now = '2026-11-12T03:00:00.000Z';

test('75 Netflix entries retain distinct official item IDs, without publishing or reviews', async () => {
  const discoveries = netflixDiscoveries(official);
  assert.equal(discoveries.length, 75);
  assert.equal(new Set(discoveries.map((x) => x.itemKey)).size, 75);
  const dir = await mkdtemp(join(tmpdir(), 'godieor-lineup-'));
  try {
    const path = new URL('../data/lineups/netflix-kr-2026-11-12-auto.json', import.meta.url).pathname;
    const first = await bridgeNetflixLineup(path, dir, now);
    assert.equal(first.created, 75);
    assert.equal(first.needsReview, 75);
    assert.equal(first.published, 0);
    const second = await bridgeNetflixLineup(path, dir, now);
    assert.equal(second.created, 0);
    assert.equal(second.revised, 0);
    assert.equal(second.unchanged, 75);
    const state = decodeState(JSON.parse(await readFile(join(dir, 'state.json'), 'utf8'))).state;
    assert.equal(state.candidates.length, 75);
    assert.equal(reviewedExport(state).length, 0);
    assert.ok(state.candidates.every((x) => x.revisions[0].publishedAt === null));
    assert.ok(state.candidates.every((x) => x.revisions[0].lineupEvidence?.premiereConfirmed === false));
    assert.equal(state.candidates[0].revisions[0].lineupEvidence.title, official.items[0].title);
    assert.equal(state.candidates[0].revisions[0].lineupEvidence.date, official.items[0].date);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('lineup items coexist with legacy article review; evidence edits invalidate only changed item', () => {
  const { merge, candidateId } = require('../dist/src/ott-candidates/domain/candidate.js');
  const base = { version: 2, stage: 'candidate-not-published', candidates: [], attempts: {} };
  const article = { source: 'netflix', url: 'https://about.netflix.com/ko/news/one',
    headline: '기사', publishedRaw: null, evidenceRevision: 'a' };
  const articleId = addCandidate(base, article, now);
  const articleRev = base.candidates[0].revisions[0].token;
  applyReview(base, { id: articleId, revision: articleRev, reviewer: 'test', title: '가상',
    platform: 'netflix', market: 'KR', contentKind: 'drama', premiereConfirmed: true,
    date: '2026-11-14', localTime: null, timeZone: null, seasonNumber: null,
    announcedYear: null, announcedPeriod: null, evidence: '테스트 전용 근거' }, now);
  const rows = netflixDiscoveries(official).slice(0, 2);
  merge(base, rows, now);
  const [first, second] = rows.map((x) => candidateId(x.source, x.url, x.itemKey));
  assert.equal(base.candidates.find((x) => x.id === first)?.revisions.at(-1)?.lineupEvidence?.title, rows[0].lineupEvidence.title);
  assert.notEqual(first, second);
  assert.equal(reviewedExport(base).length, 1);
  merge(base, [{ ...rows[0], contentHash: 'f'.repeat(64) }], now);
  assert.equal(base.candidates.find((x) => x.id === first).revisions.length, 2);
  assert.equal(base.candidates.find((x) => x.id === second).revisions.length, 1);
  assert.equal(reviewedExport(base).length, 1);
});

test('duplicate Netflix videoID is rejected; same title in another season remains separate', () => {
  const example = structuredClone(official);
  example.items = [example.items[0], { ...example.items[0], title: '다른 제목' }];
  assert.throws(() => netflixDiscoveries(example), /DUPLICATE_SOURCE_ITEM/);
  const versions = structuredClone(official);
  versions.items = [{ ...versions.items[0], seasonNumber: 1 },
    { ...versions.items[0], seasonNumber: 2, evidence: versions.items[0].evidence.replace('83135831', '99912345') }];
  assert.equal(new Set(netflixDiscoveries(versions).map((x) => x.itemKey)).size, 2);
  assert.throws(() => netflixDiscoveries({ ...official, sourceUrl: 'https://evil.example/lineup' }), /UNTRUSTED_URL/);
});
