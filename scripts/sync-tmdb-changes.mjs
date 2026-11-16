#!/usr/bin/env node
// Incremental identity discovery. Changes do not establish KR platform premieres.
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createTmdbClient } from './tmdb-date-discovery.mjs';

const day = (value) => new Date(value).toISOString().slice(0, 10);
const validDay = (value) => /^\d{4}-\d\d-\d\d$/.test(value) && day(`${value}T00:00:00Z`) === value;
const addDays = (value, count) => day(Date.parse(`${value}T00:00:00Z`) + count * 86400000);

export async function collectChanges(request, { start, end, maxPages = 500 } = {}) {
  if (!validDay(start) || !validDay(end) || start > end ||
      (Date.parse(end) - Date.parse(start)) / 86400000 > 13) throw Error('INVALID_CHANGES_WINDOW');
  const rows = [], coverage = [];
  for (const type of ['movie', 'tv']) {
    const ids = new Set();
    async function visit(from, to) {
      const first = await request(`/${type}/changes`, { start_date: from, end_date: to, page: 1 });
      const pages = first.total_pages;
      if (!Number.isInteger(pages) || pages < 1) throw Error('INVALID_TMDB_CHANGES_PAGES');
      if (pages > Math.min(maxPages, 500)) {
        if (from === to) throw Error('TMDB_CHANGES_SINGLE_DAY_PAGE_LIMIT');
        const midpoint = addDays(from, Math.floor((Date.parse(to) - Date.parse(from)) / 86400000 / 2));
        await visit(from, midpoint);
        await visit(addDays(midpoint, 1), to);
        return;
      }
      for (let page = 1; page <= pages; page++) {
        const batch = page === 1 ? first : await request(`/${type}/changes`, { start_date: from, end_date: to, page });
        for (const item of batch.results ?? []) {
          if (!Number.isSafeInteger(item.id) || item.id < 1) throw Error('INVALID_TMDB_CHANGE_ID');
          ids.add(item.id);
        }
      }
      coverage.push({ type, start: from, end: to, pages });
    }
    await visit(start, end);
    rows.push(...[...ids].sort((a,b) => a-b).map((tmdbId) => ({ type, tmdbId })));
    coverage.push({ type, changed: ids.size });
  }
  return { kind: 'tmdb-incremental-changes', referenceInputUsed: false, start, end,
    rows, coverage, total: rows.length, observedAt: new Date().toISOString() };
}

export async function syncChanges(request, output, now = new Date()) {
  const target = resolve(output), end = day(now);
  let old = null;
  try { old = JSON.parse(await readFile(target, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (old && (old.kind !== 'tmdb-incremental-changes' || !validDay(old.end) || old.end > end))
    throw Error('INVALID_PREVIOUS_CHANGES');
  // Replay one date at the boundary, allowing safe retries after an interrupted run.
  // First bootstrap starts with today's delta; avoid downloading the entire
  // historical change firehose. Subsequent runs catch up from the checkpoint.
  const start = old ? addDays(old.end, -1) : end;
  const windows = [];
  for (let from = start; from <= end;) {
    const to = addDays(from, 13) < end ? addDays(from, 13) : end;
    windows.push(await collectChanges(request, { start: from, end: to }));
    from = addDays(to, 1);
  }
  const all = new Map((old?.rows ?? []).map((r) => [`${r.type}:${r.tmdbId}`, r]));
  for (const window of windows) for (const row of window.rows) all.set(`${row.type}:${row.tmdbId}`, row);
  const result = { kind: 'tmdb-incremental-changes', referenceInputUsed: false,
    start: old?.start ?? start, end, observedAt: now.toISOString(),
    rows: [...all.values()], total: all.size, coverage: windows.flatMap((w) => w.coverage) };
  await mkdir(dirname(target), { recursive: true });
  const temporary = `${target}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  await rename(temporary, target);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const result = await syncChanges(createTmdbClient(fetch, process.env.TMDB_API_READ_ACCESS_TOKEN),
      process.argv[2] ?? 'work/tmdb-changes/latest.json');
    console.log(JSON.stringify({ start: result.start, end: result.end, changedIds: result.total, coverage: result.coverage }));
  } catch (error) { console.error('TMDB_CHANGES_FAILED:', error.message); process.exitCode = 1; }
}
