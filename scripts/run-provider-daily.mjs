#!/usr/bin/env node
// Runs real providers separately; one failure cannot suppress the remaining providers.
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { acquireLock } from './run-official-ott-daily.mjs';
export const PROVIDERS = ['kobis', 'football_data_pl', 'igdb'];
const scopes = { kobis: 1, football_data_pl: 1, igdb: 7 };
const categories = { kobis: 'movie', football_data_pl: 'epl', igdb: 'game' };
const iso = s => typeof s === 'string' && Number.isFinite(Date.parse(s)) && /Z$/.test(s);
export async function atomicReport(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    await rename(temporary, path);
  } catch (e) { await unlink(temporary).catch(() => {}); throw e; }
}
export function decodeProviderReport(value, provider) {
  if (value?.job === 'provider_collection' && value.mode === 'daily' &&
      JSON.stringify(value.providers) === JSON.stringify([provider]) && value.results?.length === 1 &&
      value.results[0].provider === provider && value.results[0].category === 'all' && value.results[0].status === 'already_running')
    return [{ provider, category: 'all', status: 'already_running' }];
  if (value?.job !== 'provider_collection' || value.mode !== 'daily' ||
      JSON.stringify(value.providers) !== JSON.stringify([provider]) || !Array.isArray(value.results) ||
      value.results.length !== scopes[provider]) throw Error('INVALID_PROVIDER_REPORT');
  return value.results.map(r => {
    if (r.provider !== provider || r.category !== categories[provider] ||
        !['succeeded', 'already_collected_today', 'failed'].includes(r.status) ||
        r.status === 'succeeded' && (!Number.isSafeInteger(r.published) || r.published < 0) ||
        r.errorCode !== undefined && (typeof r.errorCode !== 'string' || !/^[A-Z_]{1,100}$/.test(r.errorCode)))
      throw Error('INVALID_PROVIDER_REPORT');
    // Retain only the allowlisted CLI fields. Never copy stderr or arbitrary child output.
    return { provider, category: r.category, status: r.status,
      ...(r.status === 'succeeded' ? { publishedSnapshotRows: r.published } : {}),
      ...(r.errorCode ? { errorCode: r.errorCode } : {}) };
  });
}
export async function runProvider(provider, { execute = spawn, timeoutMs = 30 * 60_000, force = false, signal } = {}) {
  const startedAt = new Date().toISOString();
  const failed = error => ({ provider, startedAt, finishedAt: new Date().toISOString(), status: 'failed', error, scopes: [] });
  if (signal?.aborted) return failed('RUN_INTERRUPTED');
  return new Promise(done => {
    let child;
    try {
      child = execute(process.execPath, ['--env-file=.env', 'dist/src/cli/collect-daily.js', '--mode', 'daily', '--providers', provider,
        ...(force ? ['--force'] : [])], { stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32',
        env: { ...process.env, COLLECTION_INCLUDE_FIXTURE: 'false', COLLECTION_SCHEDULE_ENABLED: 'false' } });
    } catch { done(failed('PROVIDER_START_FAILED')); return; }
    let stdout = '', timedOut = false, interrupted = false, oversized = false, settled = false;
    const stop = () => {
      if (process.platform !== 'win32' && Number.isInteger(child.pid)) {
        try { process.kill(-child.pid, 'SIGKILL'); } catch (e) { if (e.code !== 'ESRCH') child.kill('SIGKILL'); }
      } else child.kill('SIGKILL');
    };
    const timer = setTimeout(() => { timedOut = true; stop(); }, timeoutMs);
    const onAbort = () => { interrupted = true; stop(); };
    const cleanup = () => { clearTimeout(timer); signal?.removeEventListener('abort', onAbort); };
    signal?.addEventListener('abort', onAbort, { once: true });
    if (signal?.aborted) onAbort();
    child.stdout.on('data', chunk => {
      if (stdout.length + chunk.length > 65536) { oversized = true; stop(); } else stdout += chunk;
    });
    // Drain error output without persisting credentials or uncontrolled diagnostics.
    child.stderr.on('data', () => {});
    child.on('error', () => { if (!settled) { settled = true; cleanup(); done(failed('PROVIDER_START_FAILED')); } });
    child.on('close', (code, childSignal) => {
      if (settled) return;
      settled = true; cleanup();
      if (timedOut || interrupted || oversized || childSignal) {
        done(failed(timedOut ? 'PROVIDER_TIMEOUT' : interrupted ? 'RUN_INTERRUPTED' : oversized ? 'PROVIDER_OUTPUT_LIMIT' : 'PROVIDER_TERMINATED')); return;
      }
      try {
        const rows = decodeProviderReport(JSON.parse(stdout), provider);
        const healthy = code === 0 && rows.every(r => !['failed','already_running'].includes(r.status));
        done({ provider, startedAt, finishedAt: new Date().toISOString(), exitCode: code,
          status: healthy ? 'completed' : 'failed', error: healthy ? null : rows.some(r => r.status === 'already_running') ? 'PROVIDER_ALREADY_RUNNING' : 'PROVIDER_COLLECTION_FAILED', scopes: rows,
          collectedScopes: rows.filter(r => r.status === 'succeeded').length,
          skippedScopes: rows.filter(r => r.status === 'already_collected_today').length });
      } catch { done(failed(code === 0 ? 'INVALID_PROVIDER_REPORT' : 'PROVIDER_PROCESS_FAILED')); }
    });
  });
}
export async function runProviderDaily({ execute = spawn, lock, lockDirectory = 'work/provider-daily.lock',
  timeoutMs = 30 * 60_000, force = false, reportPath = 'work/provider-daily-last-run.json',
  successPath = 'work/provider-daily-last-success.json', signal } = {}) {
  let release;
  if (lock) release = await lock();
  else { await mkdir(dirname(lockDirectory), { recursive: true }); release = await acquireLock(lockDirectory); }
  try {
    const startedAt = new Date().toISOString();
    let previousSuccessfulRunAt = null, previousSuccessUnreadable = false;
    try {
      const previous = JSON.parse(await readFile(successPath, 'utf8'));
      if (previous.kind !== 'provider-daily-run' || previous.status !== 'completed' || !iso(previous.finishedAt)) throw Error();
      previousSuccessfulRunAt = previous.finishedAt;
    } catch (e) { if (e.code !== 'ENOENT') previousSuccessUnreadable = true; }
    const providers = [];
    for (const provider of PROVIDERS) {
      if (signal?.aborted) providers.push({ provider, status: 'not_run', error: 'RUN_INTERRUPTED', scopes: [] });
      else providers.push(await runProvider(provider, { execute, timeoutMs, force, signal }));
    }
    const completed = providers.filter(p => p.status === 'completed').length;
    const status = signal?.aborted ? 'interrupted' : completed === PROVIDERS.length ? 'completed' : completed ? 'partial' : 'failed';
    const report = { kind: 'provider-daily-run', startedAt, finishedAt: new Date().toISOString(), status,
      exitCode: status === 'completed' ? 0 : status === 'partial' ? 2 : 1, force,
      previousSuccessfulRunAt, previousSuccessUnreadable,
      collectedScopes: providers.reduce((n,p) => n + (p.collectedScopes ?? 0), 0),
      skippedScopes: providers.reduce((n,p) => n + (p.skippedScopes ?? 0), 0), providers };
    await atomicReport(reportPath, report);
    if (status === 'completed') await atomicReport(successPath, report);
    return report;
  } finally { await release(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once('SIGTERM', stop); process.once('SIGINT', stop);
  try {
    if (Number(process.versions.node.split('.')[0]) !== 24) throw Error('NODE_24_REQUIRED');
    if (process.argv.slice(2).some(a => a !== '--force')) throw Error('INVALID_DAILY_OPTIONS');
    const report = await runProviderDaily({ force: process.argv.includes('--force'), signal: controller.signal });
    console.log(JSON.stringify(report)); process.exitCode = report.exitCode;
  } catch (e) { console.error('PROVIDER_DAILY_FAILED:', ['NODE_24_REQUIRED','INVALID_DAILY_OPTIONS','PIPELINE_ALREADY_RUNNING','PIPELINE_LOCK_INDETERMINATE'].includes(e.message) ? e.message : 'RUN_OR_REPORT_FAILED'); process.exitCode = 1; }
  finally { process.removeListener('SIGTERM',stop); process.removeListener('SIGINT',stop); }
}
