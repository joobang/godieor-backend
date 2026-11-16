import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { acquireLock, runDaily } from '../scripts/run-official-ott-daily.mjs';

test('daily lock rejects concurrent execution and releases for next run', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'godieor-daily-test-'));
  const dir = join(temp, 'lock');
  try {
    const release = await acquireLock(dir);
    await assert.rejects(acquireLock(dir), /PIPELINE_ALREADY_RUNNING/);
    await release();
    await (await acquireLock(dir))();
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test('daily runner reports a real pipeline status while leaving reference comparison optional', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'godieor-daily-report-'));
  let released = false;
  const mock = () => {
    const child = new EventEmitter();
    child.stdout = new PassThrough(); child.stderr = new PassThrough();
    process.nextTick(() => {
      child.stdout.end(JSON.stringify({ status: 'published', gate: { reviewedMappings: 70 }, failedSources: [] }));
      child.emit('close', 0, null);
    });
    return child;
  };
  // Execute the reporting branch in an isolated cwd fixture via a temporary directory.
  try {
    const reportPath = join(temporary, 'report.json');
    const result = await runDaily({ execute: mock, lock: async () => async () => { released = true; }, reportPath });
    assert.equal(result.exitCode, 0);
    assert.equal(result.gate.reviewedMappings, 70);
    assert.equal(released, true);
    assert.equal(JSON.parse(await readFile(reportPath, 'utf8')).status, 'published');
  } finally { await rm(temporary, { recursive: true, force: true }); }
});
