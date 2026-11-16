// Read-only audit of StreamPick discovery rows against locally collected TMDB
// catalog metadata. With --live, inspect TMDB TV season details as well.
// No calendar publishing or database writes occur here.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

export function auditCatalog(reference, catalog) {
  const byTitleService = new Map();
  for (const item of catalog.rows) {
    for (const service of item.services ?? []) {
      const key = JSON.stringify([item.title.normalize('NFC'), service]);
      const entries = byTitleService.get(key) ?? [];
      entries.push(item);
      byTitleService.set(key, entries);
    }
  }
  return reference.rows.map(([date, service, title, season]) => {
    const candidates = byTitleService.get(JSON.stringify([title.normalize('NFC'), service])) ?? [];
    return {
      date, service, title, season,
      status: candidates.length === 0 ? 'catalog_missing' : candidates.length > 1 ? 'ambiguous' : 'catalog_match',
      matches: candidates.map((item) => ({ tmdbId: item.tmdbId, type: item.type, seriesFirstDate: item.tmdbFirstDate,
        sameFirstDate: item.tmdbFirstDate === date })),
    };
  });
}

export function assessSeason(row, seasonResponse) {
  if (!seasonResponse || !Array.isArray(seasonResponse.episodes)) return 'season_missing';
  const dates = [...new Set([seasonResponse.air_date, ...seasonResponse.episodes.map((e) => e.air_date)].filter(Boolean))];
  if (!dates.length) return 'season_undated';
  return dates.includes(row.date) ? 'season_date_match' : 'season_date_mismatch';
}

export async function auditLive(rows, fetchSeason) {
  for (const row of rows) {
    if (row.status !== 'catalog_match' || row.season == null || row.matches[0].type !== 'tv') continue;
    try {
      const response = await fetchSeason(row.matches[0].tmdbId, row.season);
      row.seasonDate = response.air_date ?? null;
      row.episodeDates = [...new Set((response.episodes ?? []).map((ep) => ep.air_date).filter(Boolean))].sort();
      row.seasonStatus = assessSeason(row, response);
    } catch (error) {
      row.seasonStatus = 'lookup_failed';
      row.lookupError = error.message;
    }
  }
  return rows;
}

export function summarize(rows) {
  const counts = (field) => Object.fromEntries([...new Set(rows.map((row) => row[field]).filter(Boolean))]
    .sort().map((key) => [key, rows.filter((row) => row[field] === key).length]));
  return { total: rows.length, catalogStatus: counts('status'), seasonStatus: counts('seasonStatus'),
    exactFirstDateMatches: rows.filter((row) => row.status === 'catalog_match' && row.matches[0].sameFirstDate).length };
}

async function main() {
  const args = process.argv.slice(2);
  const live = args.includes('--live');
  const output = args.find((arg) => arg.startsWith('--output='))?.slice('--output='.length) ?? 'work/tmdb/season-date-audit.json';
  const reference = JSON.parse(await readFile('data/reference/streampick-2026-11-12-titles.json', 'utf8'));
  const catalog = JSON.parse(await readFile('work/tmdb/latest.json', 'utf8'));
  if (catalog.type !== 'metadata-discovery-only' || !Array.isArray(catalog.rows) || !Array.isArray(reference.rows)) {
    throw new Error('INVALID_AUDIT_INPUT');
  }
  const rows = auditCatalog(reference, catalog);
  if (live) {
    const token = process.env.TMDB_API_READ_ACCESS_TOKEN;
    if (!token) throw new Error('TMDB_API_READ_ACCESS_TOKEN required for --live');
    await auditLive(rows, async (id, season) => {
      const url = `https://api.themoviedb.org/3/tv/${id}/season/${season}?language=ko-KR`;
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error(`TMDB_HTTP_${response.status}`);
      return response.json();
    });
  }
  const result = { observedAt: new Date().toISOString(), referenceSource: reference.source, catalogObservedAt: catalog.observedAt,
    liveAttempted: live, summary: summarize(rows), rows,
    note: 'TMDB season air_date is global broadcast metadata, not proof of Korean OTT premiere.' };
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result.summary, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(`TMDB_SEASON_AUDIT_FAILED: ${error.message}`); process.exitCode = 1; });
}
