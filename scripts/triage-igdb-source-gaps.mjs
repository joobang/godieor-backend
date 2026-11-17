#!/usr/bin/env node
// Read-only review queue. An audit candidate never grants permission to rewrite public IDs.
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const REVIEW_STATUSES = new Set([
  'original_release_found', 'original_release_identity_changed',
  'possible_successor_dated', 'possible_successor_partial_or_undated',
  'current_release_missing_or_multiple', 'current_game_relation_mismatch',
  'current_release_query_incomplete', 'current_game_outside_main_game',
  'game_title_changed_review', 'game_missing_or_ambiguous',
]);

export function triageIgdbAudit(audit) {
  if (audit?.kind !== 'igdb-source-gap-audit' || audit.databaseMutations !== 0 ||
      audit.publishingAllowed !== false || audit.currentReleaseQueryComplete !== true ||
      !Array.isArray(audit.rows) || audit.rows.length !== audit.checked ||
      audit.rows.some(r => !REVIEW_STATUSES.has(r.status) ||
        !r.release_id || !r.variant_key || !r.event_id || r.databaseMutations !== 0 ||
        r.automaticRebindingAllowed !== false)) throw Error('UNTRUSTED_IGDB_AUDIT');

  const rows = audit.rows.map(row => {
    const claims = Array.isArray(row.claims) ? row.claims : [];
    const otherEventIds = [...new Set(claims.flatMap(c => c.storedEventIds ?? [])
      .filter(id => typeof id === 'string' && id !== row.event_id))].sort();
    const hasOtherPublishedEvent = otherEventIds.length > 0;
    const category = hasOtherPublishedEvent ? 'potential_duplicate_review' :
      row.status === 'original_release_found' ? 'original_source_verified_review' :
      row.status === 'possible_successor_dated' ? 'candidate_date_review' :
      'insufficient_source_evidence';
    return {
      originalReleaseId: row.release_id, variantKey: row.variant_key,
      publicEventId: row.event_id, title: row.title, market: row.release_market,
      storedDate: row.date, originalSourceRegion: row.originalReleaseRegion ?? null,
      sourceStatus: row.status, category, possibleOtherPublicEventIds: otherEventIds,
      candidateReleaseIds: claims.map(c => String(c.releaseId)),
      sourceDates: claims.map(c => c.date ?? null),
      evidenceRequired: hasOtherPublishedEvent
        ? 'Verify original/candidate release ID, numeric region, platform, date and existing favorites before any alias or presentation decision.'
        : 'Verify exact source identity, numeric region, date precision and historical event before any change.',
      proposedDisposition: 'hold_for_manual_review',
      automaticAliasAllowed: false, automaticUnpublishAllowed: false,
      automaticMergeAllowed: false, databaseMutations: 0,
    };
  });
  rows.sort((a,b) => a.category.localeCompare(b.category) ||
    a.originalReleaseId.localeCompare(b.originalReleaseId));
  return {
    kind: 'igdb-source-review-queue', inputAuditSha256: audit.manifestSha256,
    auditedAt: audit.checkedAt, total: rows.length,
    categoryCounts: Object.fromEntries([...new Set(rows.map(r => r.category))].sort()
      .map(c => [c, rows.filter(r => r.category === c).length])),
    requiresHumanReview: true, publishingAllowed: false, databaseMutations: 0, rows,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output || resolve(input) === resolve(output)) {
    console.error('USAGE: node scripts/triage-igdb-source-gaps.mjs <audit.json> <review-queue.json>');
    process.exitCode = 1;
  } else {
    try {
      const report = triageIgdbAudit(JSON.parse(await readFile(input, 'utf8')));
      await writeFile(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
      console.log(JSON.stringify({ output, total: report.total, categoryCounts: report.categoryCounts, databaseMutations: 0 }));
    } catch (error) {
      console.error(error.code === 'EEXIST' ? 'OUTPUT_ALREADY_EXISTS' :
        error.message === 'UNTRUSTED_IGDB_AUDIT' ? error.message : 'REVIEW_QUEUE_FAILED');
      process.exitCode = 1;
    }
  }
}
