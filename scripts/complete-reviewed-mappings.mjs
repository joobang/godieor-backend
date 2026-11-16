#!/usr/bin/env node
// Assign durable opaque identities only to already-reviewed eligible source candidates.
// A TMDB provider hint or global air date never constitutes a source review.
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, rename, open, unlink } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { prepareReviewed } = require('../dist/src/reviewed-ott/domain/reviewed-mapping.js');

export function completeReviewedMappings(state, input, createKey = randomUUID) {
  prepareReviewed(input, state);
  const existing = new Set(input.mappings.map((m) => m.candidateId));
  const additions = [];
  const rejected = [];
  const usedKeys = new Set(input.mappings.flatMap((m) => [m.contentKey, m.eventKey]));
  const releaseIdentity = (review) => JSON.stringify([
    review.market, review.platform, review.title.normalize('NFC').trim().toLocaleLowerCase('ko'),
    review.seasonNumber, review.date,
  ]);
  const mappedReleases = new Set(input.mappings.map((mapping) =>
    releaseIdentity(state.candidates.find((c) => c.id === mapping.candidateId).review.value)));
  for (const candidate of state.candidates) {
    if (existing.has(candidate.id) || !candidate.review) continue;
    const review = candidate.review.value;
    const latest = candidate.revisions.at(-1);
    if (!latest || review.id !== candidate.id || review.revision !== latest.token) {
      rejected.push({ candidateId: candidate.id, reason: 'stale_review' });
      continue;
    }
    const identity = releaseIdentity(review);
    if (mappedReleases.has(identity)) {
      rejected.push({ candidateId: candidate.id, reason: 'duplicate_premiere_identity' });
      continue;
    }
    const next = () => {
      let key;
      do { key = `auto-${createKey()}`; } while (usedKeys.has(key));
      usedKeys.add(key);
      return key;
    };
    const mapping = { candidateId: candidate.id, revision: latest.token,
      contentKey: next(), eventKey: next() };
    try {
      prepareReviewed({ version: 1, mappings: [...input.mappings, ...additions, mapping] }, state);
      additions.push(mapping);
      mappedReleases.add(identity);
    }
    catch (error) { rejected.push({ candidateId: candidate.id, reason: error.message }); }
  }
  const completed = { version: 1, mappings: [...input.mappings, ...additions] };
  prepareReviewed(completed, state);
  return { completed, added: additions.length, rejected };
}

export async function completeFile(stateFile, mappingFile) {
  const lockFile = `${mappingFile}.writer.lock`;
  const lock = await open(lockFile, 'wx');
  try {
    const [state, input] = await Promise.all([stateFile, mappingFile].map(async (path) =>
      JSON.parse(await readFile(path, 'utf8'))));
    const result = completeReviewedMappings(state, input);
    if (result.added) {
      const temporary = `${mappingFile}.${process.pid}.tmp`;
      try {
        await writeFile(temporary, JSON.stringify(result.completed, null, 2) + '\n', { flag: 'wx' });
        await rename(temporary, mappingFile);
      } catch (error) { await unlink(temporary).catch(() => {}); throw error; }
    }
    return { added: result.added, total: result.completed.mappings.length, rejected: result.rejected };
  } finally { await lock.close(); await unlink(lockFile); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const result = await completeFile(process.argv[2] ?? 'work/ott-candidates/state.json',
      process.argv[3] ?? 'data/curated/ott-reviewed-mappings.json');
    console.log(JSON.stringify(result));
  } catch (error) { console.error('REVIEWED_MAPPING_COMPLETION_FAILED:', error.message); process.exitCode = 1; }
}
