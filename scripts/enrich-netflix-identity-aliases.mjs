#!/usr/bin/env node
// Official videoID-bound English display titles are search aliases, not publication approval.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createTmdbClient, reverseLookup } from './tmdb-date-discovery.mjs';

export async function enrichNetflixIdentities(observations, request) {
  if (observations?.kind !== 'netflix-official-identity-observations' || !Array.isArray(observations.rows))
    throw new Error('INVALID_IDENTITY_OBSERVATIONS');
  const seen = new Set();
  // Validate the whole batch before any network request.
  for (const row of observations.rows) {
    if (!Number.isSafeInteger(row.videoId) || row.videoId <= 0 || seen.has(row.videoId) ||
      row.platform !== 'netflix' || row.market !== 'KR' || typeof row.title !== 'string' || !row.title.trim() ||
      !/^\d{4}-\d{2}-\d{2}$/.test(row.date ?? '') || row.sourceUrl !== `https://www.netflix.com/title/${row.videoId}` ||
      !['observed', 'web_tool_unavailable'].includes(row.detailStatus) ||
      !['movie', 'documentary_movie', 'stand_up', 'series', 'reality_series', 'live_sports', 'unknown'].includes(row.observedFormat) ||
      row.detailStatus === 'observed' && (typeof row.englishTitle !== 'string' || !row.englishTitle.trim()))
      throw new Error('INVALID_IDENTITY_ROW');
    seen.add(row.videoId);
  }
  const rows = [];
  for (const row of observations.rows) {
    const excluded = ['unknown', 'live_sports'].includes(row.observedFormat) || row.detailStatus !== 'observed';
    let tmdb = null;
    if (request && !excluded) {
      const film = ['movie', 'documentary_movie', 'stand_up'].includes(row.observedFormat);
      const englishRequest = async (path, params = {}) => {
        // Official format hints avoid cross-type matches. Never send title2 as an alias.
        if (path === (film ? '/search/tv' : '/search/movie')) return { results: [], total_pages: 1 };
        return request(path, { ...params, ...(params.language ? { language: 'en-US' } : {}) });
      };
      [tmdb] = await reverseLookup([[row.date, 'netflix', row.englishTitle, null]], englishRequest);
    }
    rows.push({ ...row, queryStatus: excluded ? 'detail_unavailable_or_outside_ott_scope' : request ? 'queried' : 'not_queried',
      tmdb, eligibleForAutomaticPublication: false });
  }
  return { kind: 'netflix-identity-tmdb-crosscheck', observedAsOf: observations.asOf,
    total: rows.length, queried: rows.filter((r) => r.queryStatus === 'queried').length,
    publishedCountDelta: 0, rows };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    const live = args.includes('--live');
    const files = args.filter((a) => a !== '--live');
    if (files.length !== 2 || resolve(files[0]) === resolve(files[1]))
      throw new Error('USAGE: node scripts/enrich-netflix-identity-aliases.mjs observations.json output.json [--live]');
    const observations = JSON.parse(await readFile(files[0], 'utf8'));
    const result = await enrichNetflixIdentities(observations,
      live ? createTmdbClient(fetch, process.env.TMDB_API_READ_ACCESS_TOKEN) : null);
    await writeFile(files[1], JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ total: result.total, queried: result.queried, publishedCountDelta: 0 }));
  } catch (error) { console.error('NETFLIX_IDENTITY_ENRICH_FAILED:', error.message); process.exitCode = 1; }
}
