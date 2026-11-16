#!/usr/bin/env node
// Intended for cron/systemd once daily. Keeps reference parity outside the job gate.
import { spawn } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const LOCK = 'work/ott-official-daily.lock';
export async function acquireLock(directory = LOCK) {
  try { await mkdir(directory); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    let pid;
    try { pid = JSON.parse(await readFile(`${directory}/owner.json`, 'utf8')).pid; }
    catch { throw Error('PIPELINE_LOCK_INDETERMINATE'); }
    if (!Number.isInteger(pid) || pid < 1) throw Error('PIPELINE_LOCK_INDETERMINATE');
    try { process.kill(pid, 0); throw Error('PIPELINE_ALREADY_RUNNING'); }
    catch (check) {
      if (check.code !== 'ESRCH') throw check;
    }
    await rm(directory, { recursive: true });
    await mkdir(directory);
  }
  try { await writeFile(`${directory}/owner.json`, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }), { flag: 'wx', mode: 0o600 }); }
  catch (error) { await rm(directory, { recursive: true, force: true }); throw error; }
  return async () => rm(directory, { recursive: true, force: true });
}

export async function runDaily({ execute = spawn, lock = acquireLock, timeoutMs = 3 * 3600_000,
  reportPath = 'work/ott-official-daily-last-run.json' } = {}) {
  const release = await lock();
  try {
    const startedAt = new Date().toISOString();
    let result;
    try { result = await new Promise((done, reject) => {
      const child = execute(process.execPath,
        ['scripts/run-official-ott-pipeline.mjs'], { stdio: ['ignore', 'pipe', 'pipe'] });
      let stdout = '', stderr = '';
      let timedOut = false;
      const timer = setTimeout(() => { timedOut = true; child.kill('SIGTERM'); }, timeoutMs);
      child.stdout.on('data', (chunk) => { stdout += chunk; });
      child.stderr.on('data', (chunk) => { stderr += chunk; });
      child.on('error', (error) => { clearTimeout(timer); reject(error); });
      child.on('close', (code, signal) => {
        clearTimeout(timer);
        try {
          if (timedOut) throw Error('PIPELINE_TIMEOUT');
          if (signal) throw Error(`PIPELINE_TERMINATED_${signal}`);
          const parsed = code === 0 || code === 2 ? JSON.parse(stdout) : null;
          done({ startedAt, finishedAt: new Date().toISOString(), exitCode: code,
            status: parsed?.status ?? 'failed', gate: parsed?.gate ?? null,
            failedSources: parsed?.failedSources ?? [], error: code !== 0 && code !== 2 ? stderr.slice(-1200) : null });
        } catch (error) { reject(error); }
      });
    }); }
    catch (error) {
      result = { startedAt, finishedAt: new Date().toISOString(), exitCode: 1,
        status: 'failed', gate: null, failedSources: [], error: error.message };
    }
    await writeFile(reportPath, JSON.stringify(result, null, 2) + '\n', { mode: 0o600 });
    return result;
  } finally { await release(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runDaily().then((r) => { console.log(JSON.stringify(r)); if (r.exitCode !== 0) process.exitCode = r.exitCode || 1; })
    .catch((error) => { console.error('OFFICIAL_DAILY_FAILED:', error.message); process.exitCode = 1; });
}
