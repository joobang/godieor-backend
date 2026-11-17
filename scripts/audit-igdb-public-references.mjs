#!/usr/bin/env node
// DATA-77: read-only reference audit. Never infer a replacement release ID.
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const INTEGER = /^\d+$/;
const validIds = ids => Array.isArray(ids) && ids.every(id => typeof id === 'string' && UUID.test(id));

export function validateQueue(queue) {
  if (queue?.kind !== 'igdb-source-review-queue' || queue.databaseMutations !== 0 ||
      queue.publishingAllowed !== false || queue.requiresHumanReview !== true ||
      !Array.isArray(queue.rows) || queue.total !== queue.rows.length || !queue.rows.length ||
      queue.rows.length > 500 || queue.rows.some(row =>
        !INTEGER.test(row.originalReleaseId) || !UUID.test(row.publicEventId) ||
        typeof row.variantKey !== 'string' || !/^(world|kr|jp|au|nz|cn|br)-\d+$/i.test(row.variantKey) ||
        !validIds(row.possibleOtherPublicEventIds) ||
        !Array.isArray(row.candidateReleaseIds) ||
        row.candidateReleaseIds.some(id => !INTEGER.test(id)) ||
        row.databaseMutations !== 0 || row.automaticAliasAllowed !== false ||
        row.automaticMergeAllowed !== false || row.automaticUnpublishAllowed !== false ||
        row.proposedDisposition !== 'hold_for_manual_review')) throw Error('INVALID_REVIEW_QUEUE');
  const keys = queue.rows.map(r => `${r.originalReleaseId}/${r.variantKey}`);
  if (new Set(keys).size !== keys.length) throw Error('INVALID_REVIEW_QUEUE');
  return queue;
}

const eventIds = queue => [...new Set(queue.rows.flatMap(r =>
  [r.publicEventId, ...r.possibleOtherPublicEventIds]))].sort();
const sourceIds = queue => [...new Set(queue.rows.flatMap(r =>
  [r.originalReleaseId, ...r.candidateReleaseIds]))].sort();

// Query operations are deliberately restricted to SELECT, within a read-only DB transaction.
export async function readReferenceSnapshot(client, queue) {
  validateQueue(queue);
  const ids = eventIds(queue), releases = sourceIds(queue);
  const events = await client.query(`SELECT id, kind, title, status, precision, local_date::text AS local_date,
    release_market, content_id FROM event WHERE id = ANY($1::uuid[])`, [ids]);
  const sources = await client.query(`SELECT event_id, external_id, variant_key, source_release_region FROM event_source
    WHERE provider_key = 'igdb' AND (event_id = ANY($1::uuid[]) OR external_id = ANY($2::text[]))`, [ids, releases]);
  const favorites = await client.query(`SELECT event_id, count(*)::integer AS count FROM event_favorite
    WHERE event_id = ANY($1::uuid[]) GROUP BY event_id`, [ids]);
  return { events: events.rows, sources: sources.rows, favorites: favorites.rows };
}

export function comparePublicReferences(queue, snapshot) {
  validateQueue(queue);
  if (!snapshot || !Array.isArray(snapshot.events) || !Array.isArray(snapshot.sources) ||
      !Array.isArray(snapshot.favorites)) throw Error('INVALID_DB_SNAPSHOT');
  const events = new Map(snapshot.events.map(e => [e.id, e]));
  if (events.size !== snapshot.events.length || snapshot.events.some(e => !UUID.test(e.id)))
    throw Error('INVALID_DB_SNAPSHOT');
  const byEvent = new Map();
  const bySource = new Map();
  for (const s of snapshot.sources) {
    if (!UUID.test(s.event_id) || !INTEGER.test(s.external_id) || typeof s.variant_key !== 'string')
      throw Error('INVALID_DB_SNAPSHOT');
    if (!byEvent.has(s.event_id)) byEvent.set(s.event_id, []);
    byEvent.get(s.event_id).push(s);
    const k = `${s.external_id}/${s.variant_key}`;
    if (bySource.has(k)) throw Error('INVALID_DB_SNAPSHOT');
    bySource.set(k, s);
  }
  const counts = new Map();
  for (const f of snapshot.favorites) {
    const n = Number(f.count);
    if (!UUID.test(f.event_id) || !Number.isSafeInteger(n) || n < 0 || counts.has(f.event_id)) throw Error('INVALID_DB_SNAPSHOT');
    counts.set(f.event_id, n);
  }
  const rows = queue.rows.map(r => {
    const original = events.get(r.publicEventId);
    const binding = bySource.get(`${r.originalReleaseId}/${r.variantKey}`);
    const competitors = r.possibleOtherPublicEventIds.map(id => ({
      eventId: id, exists: events.has(id), favorites: counts.get(id) ?? 0,
      date: events.get(id)?.local_date ?? null,
      status: events.get(id)?.status ?? null,
      sourceReleaseIds: (byEvent.get(id) ?? []).map(s => s.external_id).sort(),
    }));
    const changes = [];
    if (!original) changes.push('original_public_event_missing');
    if (!binding || binding.event_id !== r.publicEventId) changes.push('original_binding_changed');
    if (original && (original.local_date !== r.storedDate || original.release_market !== r.market))
      changes.push('original_public_metadata_changed');
    if (competitors.some(c => !c.exists)) changes.push('candidate_public_event_missing');
    if (binding?.source_release_region != null && r.originalSourceRegion != null &&
        binding.source_release_region !== r.originalSourceRegion) changes.push('original_region_changed');
    return {
      originalReleaseId: r.originalReleaseId, variantKey: r.variantKey,
      originalPublicEventId: r.publicEventId, originalExists: Boolean(original),
      originalBindingMatches: Boolean(binding && binding.event_id === r.publicEventId),
      originalFavorites: counts.get(r.publicEventId) ?? 0,
      storedDate: r.storedDate, currentDate: original?.local_date ?? null,
      sourceRegionAtAudit: r.originalSourceRegion, currentSourceRegion: binding?.source_release_region ?? null,
      possibleOtherEvents: competitors, discrepancies: changes,
      disposition: 'manual_review_required', aliasApproved: false,
      mergeApproved: false, unpublishApproved: false,
    };
  });
  return {
    kind: 'igdb-public-reference-audit', createdAt: new Date().toISOString(),
    scope: 'selected historical IGDB source IDs; not a full catalog audit',
    checked: rows.length, possibleDuplicateRows: rows.filter(r => r.possibleOtherEvents.length).length,
    originalFavoriteReferences: [...new Set(rows.map(r => r.originalPublicEventId))].reduce((n,id)=>n+(counts.get(id) ?? 0),0),
    competingFavoriteReferences: [...new Set(rows.flatMap(r => r.possibleOtherEvents.map(e=>e.eventId)))].reduce((n,id)=>n+(counts.get(id) ?? 0),0),
    discrepancies: rows.filter(r => r.discrepancies.length).length,
    publishingAllowed: false, databaseMutations: 0, approvalState: 'not_reviewed', rows,
  };
}

export async function runReferenceAudit(queue, { pool }) {
  validateQueue(queue);
  const client = await pool.connect();
  let begun = false;
  try {
    await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
    begun = true;
    const snapshot = await readReferenceSnapshot(client, queue);
    const result = comparePublicReferences(queue, snapshot);
    await client.query('COMMIT');
    begun = false;
    return result;
  } catch (error) {
    if (begun) await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally { client.release(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output || resolve(input) === resolve(output)) {
    console.error('USAGE: node --env-file=.env scripts/audit-igdb-public-references.mjs <review-queue.json> <output.json>');
    process.exitCode = 1;
  } else {
    let pool;
    try {
      const queue = validateQueue(JSON.parse(await readFile(input, 'utf8')));
      if (!process.env.DATABASE_URL) throw Error('DATABASE_URL_REQUIRED');
      const { Pool } = await import('pg');
      pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 5000 });
      const report = await runReferenceAudit(queue, { pool });
      const inputSha256 = createHash('sha256').update(await readFile(input)).digest('hex');
      await writeFile(output, JSON.stringify({ ...report, inputSha256 }, null, 2)+'\n', { flag: 'wx' });
      console.log(JSON.stringify({ output, checked: report.checked, discrepancies: report.discrepancies, databaseMutations: 0 }));
    } catch (error) {
      console.error(['INVALID_REVIEW_QUEUE','DATABASE_URL_REQUIRED'].includes(error.message)
        ? error.message : error.code === 'EEXIST' ? 'OUTPUT_ALREADY_EXISTS' : 'REFERENCE_AUDIT_FAILED');
      process.exitCode = 1;
    } finally { await pool?.end(); }
  }
}
