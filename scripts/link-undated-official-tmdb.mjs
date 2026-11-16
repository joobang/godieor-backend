#!/usr/bin/env node
// Title-only official announcements provide identity leads, not verified OTT premieres.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createTmdbClient, titleMatchesReference } from './tmdb-date-discovery.mjs';
import { prepareLineup } from './prepare-ott-lineup.mjs';

export async function linkUndatedLineups(lineups, request, { maxPages = 2 } = {}) {
  const unique = new Map(), searches = new Map();
  for (const lineup of lineups) {
    prepareLineup(lineup);
    for (const item of lineup.items) {
      if (item.market !== 'KR' || item.date != null || item.premiereConfirmed) continue;
      const key = `${lineup.platform}:${item.title.normalize('NFC').trim().toLocaleLowerCase('ko')}`;
      if (!unique.has(key)) unique.set(key, { platform: lineup.platform, title: item.title, date: null, sources: [] });
      unique.get(key).sources.push({ url: lineup.sourceUrl, evidence: item.evidence });
    }
  }
  const rows = [];
  for (const item of unique.values()) {
    const candidates = [], errors = [];
    let truncated = false;
    for (const kind of ['tv', 'movie']) {
      const key = `${kind}:${item.title.normalize('NFC').toLocaleLowerCase('ko')}`;
      if (!searches.has(key)) {
        const hits = []; let error = null, incomplete = false;
        try {
          const first = await request(`/search/${kind}`, { query: item.title, language: 'ko-KR', page: 1 });
          hits.push(...(first.results ?? []));
          incomplete = (first.total_pages ?? 1) > maxPages;
          for (let page = 2; page <= Math.min(first.total_pages ?? 1, maxPages); page++) {
            const next = await request(`/search/${kind}`, { query: item.title, language: 'ko-KR', page });
            hits.push(...(next.results ?? []));
          }
        } catch (e) { error = e.message; }
        searches.set(key, { hits, error, incomplete });
      }
      const search = searches.get(key);
      if (search.error) errors.push(`${kind}:${search.error}`);
      truncated ||= search.incomplete;
      for (const hit of search.hits) {
        if (!Number.isSafeInteger(hit.id) || hit.id <= 0 ||
            ![hit.title, hit.original_title, hit.name, hit.original_name].some((name) => titleMatchesReference(name, item.title))) continue;
        candidates.push({ type: kind, tmdbId: hit.id, tmdbTitle: hit.title ?? hit.name ?? null,
          globalFirstDate: hit.release_date ?? hit.first_air_date ?? null });
      }
    }
    const distinct = [...new Map(candidates.map((c) => [`${c.type}:${c.tmdbId}`, c])).values()];
    const status = truncated || errors.length ? 'lookup_incomplete' : distinct.length === 0 ? 'not_found' :
      distinct.length === 1 ? 'identity_hint_only' : 'ambiguous_identity';
    rows.push({ ...item, status, candidates: distinct, errors, searchTruncated: truncated,
      firstKrOttReleaseVerified: false, publishEligible: false });
  }
  return { kind: 'undated-official-tmdb-identity-review', referenceInputUsed: false, total: rows.length,
    statuses: rows.reduce((a, r) => (a[r.status] = (a[r.status] ?? 0) + 1, a), {}), rows, publicationDelta: 0 };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const [output, ...inputs] = process.argv.slice(2);
    if (!output || !inputs.length || inputs.includes(output)) throw new Error('USAGE: output.json input.json...');
    const lineups = await Promise.all(inputs.map((file) => readFile(file, 'utf8').then(JSON.parse)));
    const result = await linkUndatedLineups(lineups, createTmdbClient(fetch, process.env.TMDB_API_READ_ACCESS_TOKEN));
    await writeFile(output, JSON.stringify(result, null, 2) + '\n', { mode: 0o600 });
    console.log(JSON.stringify({ output, total: result.total, statuses: result.statuses, publicationDelta: 0 }));
    if (result.rows.some((r) => r.status === 'lookup_incomplete')) process.exitCode = 2;
  } catch (e) { console.error('UNDATED_TMDB_LINK_FAILED:', e.message); process.exitCode = 1; }
}
