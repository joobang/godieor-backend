#!/usr/bin/env node
// Review first-party KR platform dates against TMDB identity and season dates.
// The report is evidence for review, never an automatic publication instruction.
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const keyOf = (platform, title, date, season) => JSON.stringify([platform, title.normalize('NFC'), date, season ?? null]);

export function triageOfficialReleases(lineup, enrichment) {
  if (!lineup || !Array.isArray(lineup.items) || !['netflix', 'tving', 'disney_plus', 'coupang_play'].includes(lineup.platform) ||
      enrichment?.kind !== 'official-first-tmdb-review' || !Array.isArray(enrichment.rows)) throw new Error('INVALID_TRIAGE_INPUT');
  const byKey = new Map();
  for (const row of enrichment.rows) {
    const key = keyOf(row.platform, row.title, row.date, row.seasonNumber);
    if (byKey.has(key)) throw new Error('DUPLICATE_TMDB_REVIEW_ROW');
    byKey.set(key, row);
  }
  const rows = lineup.items.map((item) => {
    const source = byKey.get(keyOf(lineup.platform, item.title, item.date, item.seasonNumber));
    const candidates = (source?.tmdb?.matches ?? []).filter((match) => match.dateMatches === true &&
      match.episodeOnly !== true && Number.isSafeInteger(match.tmdbId) && match.tmdbId > 0 &&
      (match.type === 'movie' || (match.type === 'tv' || match.type == null) &&
        Number.isSafeInteger(match.seasonNumber) && match.seasonNumber > 0 &&
        match.dates?.seasonFirstDate === item.date));
    const distinct = new Map(candidates.map((m) => [`${m.type === 'movie' ? 'movie' : 'tv'}:${m.tmdbId}:${m.seasonNumber ?? ''}`, m]));
    const match = distinct.size === 1 ? [...distinct.values()][0] : null;
    const officialKr = item.market === 'KR' && Boolean(item.date);
    const status = !officialKr ? 'market_or_date_unverified'
      : item.premiereConfirmed ? 'official_first_release_review'
      : distinct.size > 1 ? 'ambiguous_tmdb_identity'
      : match ? 'official_kr_date_and_tmdb_season_match'
      : 'official_kr_listing_needs_first_release_review';
    return { platform: lineup.platform, title: item.title, officialKrDate: item.date ?? null,
      seasonNumber: item.seasonNumber ?? null, status, sourceUrl: lineup.sourceUrl,
      tmdb: match ? { type: match.type === 'movie' ? 'movie' : 'tv', id: match.tmdbId,
        seasonNumber: match.seasonNumber ?? null, krProviderMatched: match.krProviderMatched === true } : null,
      // TMDB provider absence cannot revoke a first-party listing.
      providerAbsenceVeto: false,
      eligibleForAutomaticPublication: false };
  });
  return { source: lineup.sourceUrl, total: rows.length,
    officialKrDated: rows.filter((r) => !['market_or_date_unverified'].includes(r.status)).length,
    tmdbDatedIdentity: rows.filter((r) => r.tmdb !== null).length,
    tmdbProviderMissingButRetained: rows.filter((r) => r.tmdb && !r.tmdb.krProviderMatched).length,
    readyForFirstReleaseReview: rows.filter((r) => ['official_kr_date_and_tmdb_season_match', 'official_first_release_review'].includes(r.status)).length,
    automaticallyPublished: 0, rows };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const [lineupFile, enrichmentFile, outputFile] = process.argv.slice(2);
    if (!lineupFile || !enrichmentFile || !outputFile || new Set([lineupFile, enrichmentFile, outputFile]).size !== 3)
      throw new Error('USAGE: node scripts/triage-official-ott-releases.mjs official.json tmdb-review.json report.json');
    const report = triageOfficialReleases(JSON.parse(await readFile(lineupFile, 'utf8')),
      JSON.parse(await readFile(enrichmentFile, 'utf8')));
    await writeFile(outputFile, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ outputFile, total: report.total, readyForFirstReleaseReview: report.readyForFirstReleaseReview,
      tmdbProviderMissingButRetained: report.tmdbProviderMissingButRetained, automaticallyPublished: 0 }));
  } catch (error) { console.error('OFFICIAL_OTT_TRIAGE_FAILED:', error.message); process.exitCode = 1; }
}
