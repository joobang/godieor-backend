#!/usr/bin/env node
// Official Korean lineup is the discovery source; TMDB supplies optional identity/date/provider hints.
// Read-only: neither official schedules nor TMDB metadata are published by this script.
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createTmdbClient, reverseLookup } from './tmdb-date-discovery.mjs';

export function officialReferenceRows(lineups) {
  const refs = new Map();
  for (const lineup of lineups) {
    for (const item of lineup.items ?? []) {
      if (item.market !== 'KR' || !item.date) continue;
      const key = JSON.stringify([item.date, lineup.platform, item.title, item.seasonNumber ?? null]);
      if (!refs.has(key)) refs.set(key, {
        date: item.date, platform: lineup.platform, title: item.title,
        seasonNumber: item.seasonNumber ?? null, premiereConfirmed: item.premiereConfirmed === true,
        officialSources: [],
      });
      refs.get(key).officialSources.push({ sourceUrl: lineup.sourceUrl, evidence: item.evidence ?? null });
    }
  }
  return [...refs.values()].sort((a, b) => a.date.localeCompare(b.date) || a.platform.localeCompare(b.platform) || a.title.localeCompare(b.title));
}

export async function enrichOfficialLineups(lineups, request) {
  const official = officialReferenceRows(lineups);
  const tmdb = request ? await reverseLookup(official.map((r) => [r.date, r.platform, r.title, r.seasonNumber]), request) : [];
  const rows = official.map((row, index) => ({
    ...row,
    tmdb: request ? tmdb[index] : null,
    // A TMDB match never substitutes for evidence of a Korean OTT first release.
    reviewStatus: row.premiereConfirmed ? 'official_premiere_claim_needs_review' : 'official_listing_needs_premiere_review',
    publishEligible: false,
  }));
  return { kind: 'official-first-tmdb-review', tmdbQueried: Boolean(request),
    rows, total: rows.length, publishedCountDelta: 0 };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    const live = args.includes('--live');
    const positional = args.filter((a) => a !== '--live');
    const dir = positional[0] ?? 'data/lineups';
    const output = positional[1] ?? '/private/tmp/godieor-official-tmdb-review.json';
    const lineups = await Promise.all((await readdir(dir)).filter((f) => f.endsWith('.json'))
      .map(async (f) => JSON.parse(await readFile(join(dir, f), 'utf8'))));
    const request = live ? createTmdbClient(fetch, process.env.TMDB_API_READ_ACCESS_TOKEN) : null;
    const result = await enrichOfficialLineups(lineups, request);
    await writeFile(output, JSON.stringify(result, null, 2) + '\n', { mode: 0o600 });
    console.log(JSON.stringify({ total: result.total, tmdbQueried: result.tmdbQueried,
      tmdbStatus: Object.fromEntries([...new Set(result.rows.map((r) => r.tmdb?.status ?? 'not_queried'))].map((s) => [s, result.rows.filter((r) => (r.tmdb?.status ?? 'not_queried') === s).length])),
      publishedCountDelta: 0, output }));
  } catch (error) {
    console.error(`OFFICIAL_TMDB_ENRICH_FAILED:${error.message}`);
    process.exitCode = 1;
  }
}
