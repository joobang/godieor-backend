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

test('daily failure records malformed child output and still releases its lock', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'godieor-daily-malformed-'));
  let released = false;
  const execute = () => {
    const c = new EventEmitter(); c.stdout = new PassThrough(); c.stderr = new PassThrough();
    process.nextTick(() => { c.stdout.end('invalid JSON'); c.emit('close', 0, null); }); return c;
  };
  try {
    const result = await runDaily({ execute, lock: async () => async () => { released = true; }, reportPath: join(temporary, 'report.json') });
    assert.equal(result.exitCode, 1); assert.equal(result.status, 'failed'); assert.equal(released, true);
  } finally { await rm(temporary, { recursive: true, force: true }); }
});

test('timeout terminates the pipeline and its collecting descendants before unlocking', { skip: process.platform === 'win32' }, async () => {
  const { spawn } = await import('node:child_process');
  const temporary = await mkdtemp(join(tmpdir(), 'godieor-daily-tree-'));
  const marker = join(temporary, 'descendant');
  const code = `const {spawn}=require('node:child_process'); const {writeFileSync}=require('node:fs'); const c=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'inherit'}); writeFileSync(process.argv[1],String(c.pid)); setInterval(()=>{},1000);`;
  let pid;
  try {
    const result = await runDaily({ execute: (node, args, options) => spawn(node, ['-e', code, marker], options),
      timeoutMs: 1500, lock: async () => async () => {}, reportPath: join(temporary, 'report.json') });
    pid = Number(await readFile(marker, 'utf8'));
    assert.equal(result.error, 'PIPELINE_TIMEOUT');
    // Give the OS a turn to reap the terminated descendant.
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' });
  } finally {
    if (pid) { try { process.kill(pid, 'SIGKILL'); } catch {} }
    await rm(temporary, { recursive: true, force: true });
  }
});
