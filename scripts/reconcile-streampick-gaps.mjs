#!/usr/bin/env node
// Read-only comparison: a TMDB date or current KR watch provider is a hint, not a premiere confirmation.
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const normalize = (s) => String(s ?? '').normalize('NFKC').toLocaleLowerCase('ko').replace(/[\s\p{P}\p{S}]/gu, '');
const keyOf = (r) => `${r.platform}|${normalize(r.title)}|${r.date}`;

export function reconcileGaps(tmdbReport, lineups) {
  if (!Array.isArray(tmdbReport?.rows) || !Array.isArray(lineups)) throw new Error('INVALID_INPUT');
  const evidence = new Map();
  const byTitleAndPlatform = new Map();
  for (const lineup of lineups) {
    if (!Array.isArray(lineup.items)) continue;
    for (const item of lineup.items) {
      if (item.market !== 'KR') continue;
      const key = keyOf({ ...item, platform: lineup.platform });
      const matches = evidence.get(key) ?? [];
      matches.push({ sourceUrl: lineup.sourceUrl, premiereConfirmed: item.premiereConfirmed === true,
        evidence: item.evidence ?? null, seasonNumber: item.seasonNumber ?? null });
      evidence.set(key, matches);
      const titleKey = `${lineup.platform}|${normalize(item.title)}`;
      const titleItems = byTitleAndPlatform.get(titleKey) ?? [];
      titleItems.push({ date: item.date, ...matches.at(-1) });
      byTitleAndPlatform.set(titleKey, titleItems);
    }
  }
  const rows = tmdbReport.rows.map((row) => {
    const officialCandidates = evidence.get(keyOf(row)) ?? [];
    const alternateOfficialDates = (byTitleAndPlatform.get(`${row.platform}|${normalize(row.title)}`) ?? [])
      .filter((e) => e.date && e.date !== row.date);
    const confirmed = officialCandidates.some((e) => e.premiereConfirmed &&
      (row.seasonNumber == null || e.seasonNumber === row.seasonNumber));
    const classification = alternateOfficialDates.length ? 'official_date_conflict'
      : confirmed ? 'official_kr_premiere_candidate'
      : officialCandidates.length ? 'official_kr_listing_needs_premiere_review'
      : row.dateMatched && row.krProviderMatched ? 'tmdb_date_and_provider_only'
      : row.dateMatched ? 'tmdb_date_only' : 'tmdb_date_unmatched';
    return { title: row.title, platform: row.platform, date: row.date, contentId: row.contentId,
      tmdbId: row.tmdbId, tmdbStatus: row.status, tmdbDateFields: row.dates,
      krProviderNames: row.krProviderNames, officialCandidates, alternateOfficialDates, classification,
      publishEligible: false };
  });
  const classes = [...new Set(rows.map((r) => r.classification))];
  return { total: rows.length, summary: Object.fromEntries(classes.map((c) => [c, rows.filter((r) => r.classification === c).length])),
    note: 'Review provenance, season, market and Korean OTT first premiere before using the existing reviewed publication path.',
    publishedCountDelta: 0, rows };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const inputPath = process.argv[2] ?? '/private/tmp/streampick-tmdb-11-audit.json';
    const dir = process.argv[3] ?? 'data/lineups';
    const outPath = process.argv[4] ?? '/private/tmp/streampick-gaps-reconciled.json';
    const tmdb = JSON.parse(await readFile(inputPath, 'utf8'));
    const lineups = await Promise.all((await readdir(dir)).filter((f) => f.endsWith('.json'))
      .map((f) => readFile(resolve(dir, f), 'utf8').then(JSON.parse)));
    const result = reconcileGaps(tmdb, lineups);
    await writeFile(outPath, JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify({ total: result.total, summary: result.summary, rows: result.rows.map(({title,platform,date,classification}) => ({title,platform,date,classification})), publishedCountDelta: 0 }, null, 2));
  } catch (error) { console.error(`STREAMPICK_RECONCILIATION_FAILED:${error.message}`); process.exitCode = 1; }
}
