#!/usr/bin/env node
// Persist checked lineup candidates for human review; never publish directly to product DB.
import { createHash, randomUUID } from 'node:crypto';
import { readFile, open, mkdir, rename, unlink, lstat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { prepareLineup } from './prepare-ott-lineup.mjs';

const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const emptyState = () => ({ version: 1, stage: 'lineup-review-staging', candidates: [] });
function validateState(state) {
  if (!state || state.version !== 1 || state.stage !== 'lineup-review-staging' || !Array.isArray(state.candidates)) throw new Error('INVALID_STATE');
  const ids = new Set();
  for (const record of state.candidates) {
    if (!record || typeof record.id !== 'string' || !/^[a-f0-9]{64}$/.test(record.id) || ids.has(record.id) ||
        !Number.isSafeInteger(record.revision) || record.revision < 1 ||
        typeof record.fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(record.fingerprint) ||
        typeof record.firstSeenAt !== 'string' || !Number.isFinite(Date.parse(record.firstSeenAt)) ||
        typeof record.lastSeenAt !== 'string' || !Number.isFinite(Date.parse(record.lastSeenAt)) ||
        !record.candidate || record.candidate.id !== record.id || record.candidate.published !== false ||
        record.candidate.status !== 'needs_manual_review' ||
        !Object.hasOwn(record, 'review')) throw new Error('INVALID_STATE');
    ids.add(record.id);
  }
}
export function mergeLineup(state, prepared, now) {
  validateState(state);
  if (prepared?.stage !== 'lineup-candidates-not-published' || !Array.isArray(prepared.candidates)) throw new Error('INVALID_PREPARED');
  if (typeof now !== 'string' || !Number.isFinite(Date.parse(now))) throw new Error('INVALID_TIME');
  const ids = new Set();
  const existing = new Map(state.candidates.map((record) => [record.id, record]));
  // Preflight the whole batch before modifying state.
  for (const item of prepared.candidates) {
    if (!item || typeof item.id !== 'string' || !/^[a-f0-9]{64}$/.test(item.id) ||
        item.published !== false || item.status !== 'needs_manual_review') throw new Error('INVALID_PREPARED');
    if (ids.has(item.id)) throw new Error('DUPLICATE_ID');
    ids.add(item.id);
  }
  let created = 0, changed = 0, unchanged = 0;
  for (const item of prepared.candidates) {
    const fingerprint = hash([item.platform, item.sourceUrl, item.title, item.market, item.contentKind, item.seasonNumber, item.date, item.premiereConfirmed, item.imageUrl, item.evidence]);
    let record = existing.get(item.id);
    if (!record) {
      record = { id: item.id, firstSeenAt: now, lastSeenAt: now, fingerprint, revision: 1, candidate: item, review: null };
      state.candidates.push(record);
      created++;
    } else {
      record.lastSeenAt = now;
      if (record.fingerprint === fingerprint) unchanged++;
      else {
        record.revision++;
        record.fingerprint = fingerprint;
        record.candidate = item;
        record.review = null;
        changed++;
      }
    }
  }
  return { stage: state.stage, created, changed, unchanged, stored: state.candidates.length, published: 0 };
}
async function writeAtomic(file, data) {
  const tmp = file + '.' + randomUUID() + '.tmp';
  const handle = await open(tmp, 'wx', 0o600);
  try { await handle.writeFile(JSON.stringify(data, null, 2) + '\n'); await handle.sync(); }
  finally { await handle.close(); }
  try { await rename(tmp, file); }
  catch (error) { await unlink(tmp).catch(() => {}); throw error; }
}
export async function stageLineup(inputFile, directory, now = new Date().toISOString()) {
  const input = JSON.parse(await readFile(inputFile, 'utf8'));
  // Always validate source, market, date and type, even when importing an earlier prepared output.
  if (!Array.isArray(input.items)) throw new Error('EXPECTED_LINEUP_INPUT');
  const prepared = prepareLineup(input);
  const dest = resolve(directory);
  await mkdir(dest, { recursive: true });
  if ((await lstat(dest)).isSymbolicLink()) throw new Error('SYMLINK_DIRECTORY');
  const path = join(dest, 'state.json');
  const lock = await open(join(dest, 'writer.lock'), 'wx', 0o600);
  try {
    let state = emptyState();
    try {
      if ((await lstat(path)).isSymbolicLink()) throw new Error('SYMLINK_STATE');
      state = JSON.parse(await readFile(path, 'utf8'));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    const result = mergeLineup(state, prepared, now);
    await writeAtomic(path, state);
    return result;
  } finally {
    await lock.close();
    await unlink(join(dest, 'writer.lock'));
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [input, directory = 'work/ott-lineups'] = process.argv.slice(2);
  if (!input) { console.error('사용법: node scripts/stage-ott-lineup.mjs input.json [staging-directory]'); process.exitCode = 1; }
  else {
    try { console.log(JSON.stringify(await stageLineup(input, directory))); }
    catch (error) { console.error('LINEUP_STAGING_FAILED:', ['INVALID_STATE','INVALID_PREPARED','DUPLICATE_ID','EXPECTED_LINEUP_INPUT','SYMLINK_DIRECTORY','SYMLINK_STATE'].includes(error.message) ? error.message : '입력·잠금·파일 상태를 확인하세요.'); process.exitCode = 1; }
  }
}
