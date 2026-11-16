#!/usr/bin/env node
// Import official Netflix KR lineup into the existing review queue, without publishing.
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { prepareLineup } from './prepare-ott-lineup.mjs';

const require = createRequire(import.meta.url);
const { OttCandidatesRepository } = require('../dist/src/ott-candidates/ott-candidates.repository.js');
const { canonicalUrl, hash, merge, candidateId } = require('../dist/src/ott-candidates/domain/candidate.js');

export function netflixDiscoveries(input) {
  const prepared = prepareLineup(input);
  if (input.platform !== 'netflix') throw new Error('ONLY_NETFLIX_SUPPORTED');
  const url = canonicalUrl('netflix', prepared.sourceUrl);
  const seen = new Set();
  return prepared.candidates.map((row) => {
    const videoId = /(?:^|;)\s*Netflix videoID (\d+)(?:\.|;|$)/.exec(row.evidence)?.[1];
    const itemKey = videoId ? `netflix-video:${videoId}` : `lineup:${row.id}`;
    if (seen.has(itemKey)) throw new Error('DUPLICATE_SOURCE_ITEM');
    seen.add(itemKey);
    const headline = `${row.title}${row.seasonNumber === null ? '' : ` 시즌 ${row.seasonNumber}`}`;
    const sourceEvidence = [row.title, row.date, row.market, row.contentKind,
      row.seasonNumber, row.premiereConfirmed, row.evidence, row.imageUrl, row.sourceItem];
    return {
      source: 'netflix', url, itemKey, headline,
      // Official lineup date is not the publication timestamp of the source article.
      publishedRaw: null, publishedAt: null,
      lineupEvidence: {
        platform: row.platform, title: row.title, date: row.date,
        market: row.market, contentKind: row.contentKind,
        seasonNumber: row.seasonNumber, premiereConfirmed: row.premiereConfirmed,
        evidence: row.evidence, imageUrl: row.imageUrl, sourceItem: row.sourceItem,
      },
      contentHash: hash(JSON.stringify(sourceEvidence)),
    };
  });
}

export async function bridgeNetflixLineup(filename, directory, now = new Date().toISOString()) {
  const input = JSON.parse(await readFile(filename, 'utf8'));
  const discoveries = netflixDiscoveries(input); // Validate full batch before file transaction.
  const repository = new OttCandidatesRepository(directory);
  return repository.transaction(async (state) => {
    const before = new Map(state.candidates.map((candidate) => [candidate.id, candidate.revisions.length]));
    // Reviewed records are version-bound to their original first-party evidence.
    // A new crawl must not silently clear their review or invalidate published keys.
    const safe = discoveries.filter((row) =>
      !state.candidates.find((candidate) => candidate.id === candidateId(row.source, row.url, row.itemKey))?.review);
    merge(state, safe, now);
    const imported = state.candidates.filter((candidate) =>
      candidate.source === 'netflix' && candidate.itemKey &&
      discoveries.some((d) => candidate.itemKey === d.itemKey && candidate.url === d.url));
    return {
      sourceRows: discoveries.length,
      created: imported.filter((candidate) => !before.has(candidate.id)).length,
      revised: imported.filter((candidate) => before.has(candidate.id) && before.get(candidate.id) !== candidate.revisions.length).length,
      unchanged: imported.filter((candidate) => before.get(candidate.id) === candidate.revisions.length).length,
      candidates: state.candidates.length,
      needsReview: imported.filter((candidate) => candidate.review === null).length,
      preservedReviewed: discoveries.length - safe.length,
      published: 0,
    };
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [filename, directory = 'work/ott-candidates'] = process.argv.slice(2);
  if (!filename) {
    console.error('Usage: node scripts/bridge-netflix-lineup.mjs lineup.json [candidate-directory]');
    process.exitCode = 1;
  } else {
    try { console.log(JSON.stringify(await bridgeNetflixLineup(filename, directory))); }
    catch (error) { console.error('LINEUP_BRIDGE_FAILED:', error.message); process.exitCode = 1; }
  }
}
