import test from 'node:test';
import assert from 'node:assert/strict';
import { auditProductCutoff, PRODUCT_CUTOFF } from '../scripts/audit-product-cutoff.mjs';

test('cutoff audit uses a read-only snapshot and reports reference counts without mutations', async () => {
  const queries = [];
  let released = false;
  const pool = { connect: async () => ({
    query: async sql => {
      queries.push(sql);
      if (sql.includes('FROM classified c')) return { rows: [{ kind: 'game_release', before_cutoff: 2, old_with_history: 2 }] };
      if (sql.includes('pg_database_size')) return { rows: [{ database_bytes: '1234' }] };
      return { rows: [] };
    },
    release: () => { released = true; },
  }) };
  const report = await auditProductCutoff(pool);
  assert.equal(PRODUCT_CUTOFF, '2026-10-01');
  assert.equal(report.databaseMutations, 0);
  assert.equal(report.safeToDeleteAutomatically, false);
  assert.equal(report.databaseBytes, '1234');
  assert.equal(report.categories[0].old_with_history, 2);
  assert.match(queries[0], /REPEATABLE READ READ ONLY/);
  assert.equal(queries.at(-1), 'COMMIT');
  assert.equal(released, true);
  assert.equal(queries.some(q => /\b(?:DELETE|UPDATE|INSERT|TRUNCATE)\b/i.test(q)), false);
});

test('cutoff audit rolls back and releases connection on failure', async () => {
  const queries = [];
  let released = false;
  const pool = { connect: async () => ({
    query: async sql => { queries.push(sql); if (sql.includes('FROM classified c')) throw Error('query failure'); return {rows:[]}; },
    release: () => { released = true; },
  }) };
  await assert.rejects(auditProductCutoff(pool), /query failure/);
  assert.equal(queries.at(-1), 'ROLLBACK');
  assert.equal(released, true);
});
