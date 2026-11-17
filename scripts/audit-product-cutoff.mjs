#!/usr/bin/env node
// DATA-82: a read-only, repeatable audit; never deletes published identifiers.
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

export const PRODUCT_CUTOFF = '2026-10-01';

export async function auditProductCutoff(pool) {
  const client = await pool.connect();
  let active = false;
  try {
    await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
    active = true;
    const counts = await client.query(`
      WITH classified AS (
        SELECT e.id, e.kind, e.content_id, e.precision,
          CASE WHEN e.local_date IS NOT NULL THEN e.local_date < DATE '2026-10-01'
               WHEN e.instant_at IS NOT NULL THEN (e.instant_at AT TIME ZONE 'UTC')::date < DATE '2026-10-01'
               ELSE false END AS before_cutoff
        FROM event e
      )
      SELECT kind::text AS kind, count(*)::integer AS total,
        count(*) FILTER (WHERE before_cutoff)::integer AS before_cutoff,
        count(*) FILTER (WHERE NOT before_cutoff AND precision = 'unknown')::integer AS undated,
        count(*) FILTER (WHERE before_cutoff AND EXISTS
          (SELECT 1 FROM event_favorite f WHERE f.event_id = c.id))::integer AS old_with_event_favorites,
        count(*) FILTER (WHERE before_cutoff AND c.content_id IS NOT NULL AND EXISTS
          (SELECT 1 FROM content_favorite f WHERE f.content_id = c.content_id))::integer AS old_with_content_favorites,
        count(*) FILTER (WHERE before_cutoff AND EXISTS
          (SELECT 1 FROM event_change h WHERE h.event_id = c.id))::integer AS old_with_history,
        count(*) FILTER (WHERE before_cutoff AND EXISTS
          (SELECT 1 FROM event_source s WHERE s.event_id = c.id))::integer AS old_with_sources,
        count(*) FILTER (WHERE before_cutoff AND EXISTS
          (SELECT 1 FROM event_device d WHERE d.event_id = c.id))::integer AS old_with_devices,
        count(*) FILTER (WHERE before_cutoff AND EXISTS
          (SELECT 1 FROM event_service v WHERE v.event_id = c.id))::integer AS old_with_services
      FROM classified c GROUP BY kind ORDER BY kind`);
    const size = await client.query(`SELECT pg_database_size(current_database())::text AS database_bytes`);
    await client.query('COMMIT');
    active = false;
    return { kind: 'product-cutoff-reference-audit', cutoff: PRODUCT_CUTOFF,
      databaseMutations: 0, safeToDeleteAutomatically: false,
      measuredAt: new Date().toISOString(), databaseBytes: size.rows[0].database_bytes,
      categories: counts.rows };
  } catch (error) {
    if (active) await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally { client.release(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  let pool;
  try {
    if (!process.env.DATABASE_URL) throw Error('DATABASE_URL_REQUIRED');
    const { Pool } = await import('pg');
    pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 5000 });
    console.log(JSON.stringify(await auditProductCutoff(pool), null, 2));
  } catch (error) {
    console.error('CUTOFF_AUDIT_FAILED', error.code ?? error.message);
    process.exitCode = 1;
  } finally { await pool?.end(); }
}
