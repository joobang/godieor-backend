import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { safeRetentionBounds } from '../dist/src/common/config/schedule-window.js';

const oldDated = `e.origin='provider' AND (
  (e.precision='date_only' AND e.local_date < $1::date) OR
  (e.precision='instant' AND e.instant_at < $2::timestamptz)
)`;
const review = JSON.parse(readFileSync(
  new URL('../docs/tasks/evidence/data77/live-public-reference-audit-20261117.json', import.meta.url), 'utf8',
)).rows;
const reviewEvents = [...new Set(review.flatMap((row) => [
  row.originalPublicEventId, ...row.possibleOtherEvents.map((event) => event.eventId),
]))];
const reviewReleases = [...new Set(review.flatMap((row) => [
  row.originalReleaseId, ...row.possibleOtherEvents.flatMap((event) => event.sourceReleaseIds),
]))];

const protectedEvent = `(
  EXISTS (SELECT 1 FROM event_favorite f WHERE f.event_id=e.id) OR
  EXISTS (SELECT 1 FROM content_favorite f WHERE f.content_id=e.content_id) OR
  e.id=ANY($3::uuid[]) OR EXISTS (
    SELECT 1 FROM event_source s
    WHERE s.event_id=e.id AND s.provider_key='igdb' AND s.external_id=ANY($4::text[])
  )
)`;

export async function pruneOldSchedules(pool, { apply = false, confirmation = '', limit = 1000 } = {}, bounds = safeRetentionBounds()) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 5000) throw Error('INVALID_DELETE_LIMIT');
  if (apply && !confirmation.startsWith(`DELETE BEFORE ${bounds.date} `)) throw Error('DELETE_CONFIRMATION_REQUIRED');

  const client = await pool.connect();
  try {
    await client.query(apply ? 'BEGIN' : 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SET LOCAL statement_timeout = '30s'");
    if (apply) {
      // Serialize with each publish transaction before checking the candidate bindings.
      await client.query('SELECT revision FROM catalog_state WHERE singleton FOR UPDATE');
      // Block favorite writes for this bounded transaction. Candidate and dependency
      // checks then use the same committed view even if the app was favoriting it.
      await client.query('LOCK TABLE content_favorite, event_favorite IN SHARE MODE');
    }
    const args = [bounds.date, bounds.instant, reviewEvents, reviewReleases];
    const counts = await client.query(`SELECT e.kind, count(*)::int AS old,
      count(*) FILTER (WHERE ${protectedEvent})::int AS protected
      FROM event e WHERE ${oldDated} GROUP BY e.kind ORDER BY e.kind`, args);
    const candidates = await client.query(`SELECT e.id FROM event e WHERE ${oldDated}
      AND NOT ${protectedEvent}
      ORDER BY COALESCE(e.local_date, (e.instant_at AT TIME ZONE 'UTC')::date), e.id
      LIMIT $5 ${apply ? 'FOR UPDATE OF e' : ''}`, [...args, limit]);
    const ids = candidates.rows.map((row) => row.id);
    const batchDigest = createHash('sha256').update(JSON.stringify([bounds.date, limit, ids])).digest('hex');
    const expected = `DELETE BEFORE ${bounds.date} ${batchDigest}`;
    let deleted = 0;
    if (apply) {
      if (confirmation !== expected) throw Error('DELETE_BATCH_CHANGED');
      if (ids.length) {
        await client.query('DELETE FROM event_device WHERE event_id = ANY($1::uuid[])', [ids]);
        await client.query('DELETE FROM event_service WHERE event_id = ANY($1::uuid[])', [ids]);
        await client.query('DELETE FROM event_change WHERE event_id = ANY($1::uuid[])', [ids]);
        await client.query('DELETE FROM event_source WHERE event_id = ANY($1::uuid[])', [ids]);
        deleted = (await client.query('DELETE FROM event WHERE id = ANY($1::uuid[])', [ids])).rowCount;
        if (deleted !== ids.length) throw Error('DELETE_COUNT_MISMATCH');
        const revised = await client.query('UPDATE catalog_state SET revision=revision+1,published_at=now() WHERE singleton');
        if (revised.rowCount !== 1) throw Error('CATALOG_STATE_NOT_FOUND');
      }
    }
    await client.query('COMMIT');
    return {
      mode: apply ? 'apply' : 'preview', beforeDate: bounds.date, beforeInstant: bounds.instant.toISOString(),
      byKind: counts.rows, eligible: counts.rows.reduce((sum, row) => sum + row.old - row.protected, 0),
      maxDelete: limit, batchSize: ids.length, deleted,
      ...(!apply && ids.length ? { confirmation: expected } : {}),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  let pool;
  try {
    const { values } = parseArgs({ options: {
      apply: { type: 'boolean' }, confirmation: { type: 'string' }, limit: { type: 'string' },
    } });
    if (!process.env.DATABASE_URL) throw Error('DATABASE_URL_REQUIRED');
    const { Pool } = await import('pg');
    pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 10000 });
    const result = await pruneOldSchedules(pool, {
      apply: values.apply, confirmation: values.confirmation, limit: Number(values.limit ?? 1000),
    });
    console.log(JSON.stringify(result));
  } catch (error) {
    const safeCodes = ['INVALID_DELETE_LIMIT', 'DELETE_CONFIRMATION_REQUIRED', 'DELETE_BATCH_CHANGED'];
    console.error(safeCodes.includes(error?.message) ? error.message : 'SCHEDULE_RETENTION_FAILED');
    process.exitCode = 1;
  } finally { await pool?.end(); }
}
