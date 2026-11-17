#!/usr/bin/env node
// Fresh CI runners need reviewed candidates to match the durable mapping keys.
import { readFile, mkdir, writeFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function restore({
  snapshotPath = 'data/curated/ott-reviewed-candidates-snapshot.json',
  mappingsPath = 'data/curated/ott-reviewed-mappings.json',
  statePath = 'work/ott-candidates/state.json',
} = {}) {
  const [snapshot, mappings] = await Promise.all([snapshotPath, mappingsPath].map(async p =>
    JSON.parse(await readFile(p, 'utf8'))));
  if (snapshot.version !== 2 || snapshot.stage !== 'candidate-not-published' ||
      !Array.isArray(snapshot.candidates) || !mappings?.mappings?.length)
    throw Error('INVALID_REVIEWED_SNAPSHOT');
  const candidates = new Map(snapshot.candidates.map(c => [c.id, c]));
  if (candidates.size !== snapshot.candidates.length ||
      mappings.mappings.length !== snapshot.candidates.length)
    throw Error('SNAPSHOT_MAPPING_COUNT_MISMATCH');
  for (const mapping of mappings.mappings) {
    const candidate = candidates.get(mapping.candidateId);
    if (!candidate?.review || candidate.review.value.id !== mapping.candidateId ||
        candidate.review.value.revision !== mapping.revision ||
        candidate.revisions.at(-1)?.token !== mapping.revision)
      throw Error('SNAPSHOT_MAPPING_REVISION_MISMATCH');
  }
  try {
    await stat(statePath);
    console.log('Existing OTT state preserved; no snapshot overwrite');
    return { restored: false, candidates: candidates.size };
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await mkdir(resolve(statePath, '..'), { recursive: true });
  await writeFile(statePath, JSON.stringify(snapshot, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(`Restored ${candidates.size} reviewed OTT candidates`);
  return { restored: true, candidates: candidates.size };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  restore().catch(e => { console.error('OTT_RESTORE_FAILED:', e.message); process.exitCode = 1; });
}
