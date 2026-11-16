#!/usr/bin/env node
// Evaluation only. Competitor reference rows never enter discovery or publishing.
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

export function auditLiveRecall(reference, previous, latest) {
  if (!Array.isArray(reference?.rows) || !Array.isArray(previous?.rows) || !Array.isArray(latest?.rows))
    throw new Error('INVALID_RECALL_INPUT');
  const refKey = (row) => [row.date, row.platform, row.title, row.season ?? row.seasonNumber ?? ''].join('\u0000');
  const oldByKey = new Map(previous.rows.map((row) => [refKey(row), row]));
  const identityKey = (row) => row.type && row.tmdbId != null ? `${row.type}:${row.tmdbId}` :
    /^tmdb:(tv|movie):(\d+)/.exec(row.id ?? '')?.slice(1).join(':') ?? row.id;
  const liveById = new Map(latest.rows.map((row) => [identityKey(row), row]));
  const results = reference.rows.map((row) => {
    const old = oldByKey.get(refKey(row));
    if (!old) throw new Error(`MISSING_PREVIOUS_REFERENCE:${row.title}`);
    // Candidate identities were independently discovered earlier. They serve as
    // evaluation labels here, never as new TMDB lookup or collection seeds.
    const previousIds = (row.candidateMatches ?? []).map((candidate) => candidate.id);
    const matched = previousIds.map((id) => liveById.get(identityKey({ id }))).filter(Boolean);
    const exactDate = matched.filter((candidate) => candidate.dateHint === row.date);
    const matchedOfficial = exactDate.filter((candidate) => candidate.readyForBatchReview === true);
    return { date: row.date, platform: row.platform, title: row.title, season: row.season ?? null,
      oldCandidateStatus: old.candidateStatus, previousIds, liveCandidatesFound: matched.length,
      exactDateHintMatches: exactDate.length, readyForBatchReview: matchedOfficial.length,
      status: !previousIds.length ? 'no_prior_identity' : matchedOfficial.length ? 'ready_for_review' : exactDate.length ? 'tmdb_candidate_only' :
        matched.length ? 'date_mismatch_or_unavailable' : 'previous_identity_not_in_latest' };
  });
  return { referenceTotal: results.length, previouslyMatched: results.filter((r) => r.oldCandidateStatus === 'candidate_platform_date_match').length,
    retainedCandidateDateMatches: results.filter((r) => r.exactDateHintMatches > 0).length,
    readyForBatchReview: results.filter((r) => r.readyForBatchReview > 0).length,
    noPriorIdentity: results.filter((r) => !r.previousIds.length).length,
    previousIdentityMissing: results.filter((r) => r.previousIds.length > 0 && r.liveCandidatesFound === 0).length,
    collection: { discoveredWorks: latest.discoveredWorks ?? latest.rows.length, total: latest.total ?? latest.rows.length,
      discoveryComplete: latest.discoveryComplete, errors: latest.errors?.length ?? (latest.coverage ?? []).filter(c => c.error).length,
      truncatedFilters: (latest.discoveryCoverage ?? latest.coverage ?? []).filter((c) => c.truncated).map((c) => ({ kind:c.kind, service:c.service, filter:c.filter, window:c.window })) },
    results, caveat: 'Retrospective identity/date evaluation, not StreamPick-driven collection or verified first OTT release.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [referenceFile, previousFile, latestFile, outputFile] = process.argv.slice(2);
  if (!referenceFile || !previousFile || !latestFile) throw new Error('USAGE: audit-tmdb-live-recall.mjs <reference> <previous> <latest> [output]');
  const report = auditLiveRecall(...await Promise.all([referenceFile, previousFile, latestFile].map(async file => JSON.parse(await readFile(file, 'utf8')))));
  if (outputFile) await writeFile(outputFile, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ referenceTotal: report.referenceTotal, previouslyMatched: report.previouslyMatched,
    retainedCandidateDateMatches: report.retainedCandidateDateMatches,
    readyForBatchReview: report.readyForBatchReview, noPriorIdentity: report.noPriorIdentity,
    previousIdentityMissing: report.previousIdentityMissing,
    collection: report.collection }, null, 2));
}
