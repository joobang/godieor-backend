#!/usr/bin/env node
// Revalidate fresh TMDB+official evidence against existing reviewed identities.
// New opaque keys are never assigned by title matching.
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { combineEvidence } from './collect-tmdb-release-candidates.mjs';
const require = createRequire(import.meta.url);
const { prepareReviewed } = require('../dist/src/reviewed-ott/domain/reviewed-mapping.js');

export function prepareTmdbReviewedBatch(report, officialBindings, state, mappings) {
  if (report?.kind !== 'tmdb-first-ott-release-review' || report.referenceInputUsed !== false ||
      !Array.isArray(report.rows) || !Array.isArray(officialBindings)) throw new Error('INVALID_VERIFIED_BATCH_INPUT');
  const canonical = prepareReviewed(mappings, state); // Validate entire existing publication snapshot first.
  const matched = new Map(), blocked = [];
  for (const row of report.rows) {
    if (!combineEvidence(row, row.officialEvidence ?? []).readyForBatchReview) continue;
    const bindings = officialBindings.filter((b) => b.type === row.type && b.tmdbId === row.tmdbId &&
      b.platform === row.platform && b.seasonNumber === row.seasonNumber && b.date === row.officialPlatformDate &&
      row.officialEvidence.some((e) => e.sourceUrl === b.sourceUrl && e.sourceRefreshStatus === 'matched'));
    const candidateIDs = [...new Set(bindings.map((b) => b.reviewCandidateId).filter(Boolean))];
    if (candidateIDs.length !== 1) { blocked.push({ id: row.id, reason: 'missing_or_ambiguous_review_identity' }); continue; }
    const candidate = state.candidates.find((c) => c.id === candidateIDs[0]);
    const review = candidate?.review?.value;
    if (!review || candidate.revisions.at(-1).token !== review.revision || review.market !== 'KR' ||
        review.platform !== row.platform || review.date !== row.officialPlatformDate || review.seasonNumber !== row.seasonNumber ||
        !bindings.some((b) => b.reviewCandidateId === candidate.id && b.sourceUrl === candidate.url && b.title === review.title)) {
      blocked.push({ id: row.id, reason: 'review_or_source_revision_changed' }); continue;
    }
    const mapping = mappings.mappings.find((m) => m.candidateId === candidate.id);
    if (!mapping) { blocked.push({ id: row.id, reason: 'opaque_mapping_assignment_required' }); continue; }
    matched.set(mapping.eventKey, { candidateId: candidate.id, eventKey: mapping.eventKey, tmdbCandidateId: row.id });
  }
  return { kind: 'existing-reviewed-batch-revalidation', referenceInputUsed: false,
    freshDualCheckedExistingRecords: matched.size, existingRecords: canonical.length,
    newMappingsAssigned: 0, records: [...matched.values()], blocked,
    mappingInput: mappings,
    note: 'Full existing mapping snapshot retained; only records listed above were freshly dual-checked. No approval or product PASS.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const [reportFile, bindingsFile, output] = process.argv.slice(2);
    if (!reportFile || !bindingsFile || !output || [reportFile,bindingsFile].includes(output)) throw new Error('INVALID_ARGUMENTS');
    const read = async (file) => JSON.parse(await readFile(file,'utf8'));
    const [report, bindings, state, mappings] = await Promise.all([read(reportFile),read(bindingsFile),
      read('work/ott-candidates/state.json'),read('data/curated/ott-reviewed-mappings.json')]);
    const result = prepareTmdbReviewedBatch(report, bindings.items, state, mappings);
    await writeFile(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
    console.log(JSON.stringify({ output, freshDualCheckedExistingRecords: result.freshDualCheckedExistingRecords,
      existingRecords: result.existingRecords, blocked: result.blocked.length, newMappingsAssigned: 0 }));
    if (result.blocked.length) process.exitCode = 2;
  } catch(e) { console.error('TMDB_REVIEWED_BATCH_FAILED:',e.message);process.exitCode=1; }
}
