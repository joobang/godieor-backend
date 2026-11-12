#!/usr/bin/env node
// Read-only comparison: a TMDB date or current KR watch provider is a hint, not a premiere confirmation.
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const normalize = (s) => String(s ?? '').normalize('NFKC').toLocaleLowerCase('ko').replace(/[\s\p{P}\p{S}]/gu, '');
const titlePlatformOf = (r) => `${r.platform}|${normalize(r.title)}`;
const seasonOf = (r) => r.seasonNumber ?? r.season ?? null;
const seasonCompatible = (a, b) => seasonOf(a) == null || seasonOf(b) == null || seasonOf(a) === seasonOf(b);
const keyOf = (r) => `${titlePlatformOf(r)}|${r.date}|${seasonOf(r) ?? ''}`;

// The persisted review queue contains official title/date evidence that might not
// exist in the checked-in lineup snapshots. Only join requested gap titles: the
// reference is a review list, not permission to publish all 75 Netflix arrivals.
export function withCandidateEvidence(tmdbReport, lineups, state) {
  if (!Array.isArray(tmdbReport?.rows) || !Array.isArray(lineups) || !Array.isArray(state?.candidates))
    throw new Error('INVALID_CANDIDATE_INPUT');
  const merged = lineups.map((lineup) => ({ ...lineup,
    items: Array.isArray(lineup.items) ? lineup.items.map((item) => ({ ...item })) : [] }));
  const targets = new Set(tmdbReport.rows.map(titlePlatformOf));
  for (const candidate of state.candidates) {
    const latest = candidate.revisions?.at(-1);
    const row = latest?.lineupEvidence;
    if (!row || row.market !== 'KR' || !targets.has(titlePlatformOf(row))) continue;
    // A past review becomes stale whenever the evidence revision changes.
    const reviewStatus = candidate.review?.value?.revision === latest.token ? 'reviewed' : 'needs_review';
    const queueReference = { candidateId: candidate.id, revisionToken: latest.token, reviewStatus };
    let source = merged.find((x) => x.platform === row.platform && x.sourceUrl === candidate.url);
    if (!source) {
      source = { platform: row.platform, sourceUrl: candidate.url, items: [] };
      merged.push(source);
    }
    const existing = source.items.find((item) =>
      normalize(item.title) === normalize(row.title) && item.date === row.date &&
      seasonCompatible(item, row));
    if (existing) {
      Object.assign(existing, row, queueReference);
    } else {
      source.items.push({ ...row, ...queueReference });
    }
  }
  return merged;
}

export function reconcileGaps(tmdbReport, lineups, { includeOfficialDiscoveries = true } = {}) {
  if (!Array.isArray(tmdbReport?.rows) || !Array.isArray(lineups)) throw new Error('INVALID_INPUT');
  const evidence = new Map();
  const byTitleAndPlatform = new Map();
  const officialRows = new Map();
  for (const lineup of lineups) {
    if (!Array.isArray(lineup.items)) continue;
    for (const item of lineup.items) {
      if (item.market !== 'KR') continue;
      const key = keyOf({ ...item, platform: lineup.platform });
      if (item.date) officialRows.set(key, { title: item.title, platform: lineup.platform,
        date: item.date, seasonNumber: item.seasonNumber ?? null });
      const matches = evidence.get(key) ?? [];
      matches.push({ sourceUrl: lineup.sourceUrl, premiereConfirmed: item.premiereConfirmed === true,
        evidence: item.evidence ?? null, seasonNumber: item.seasonNumber ?? null,
        ...(item.candidateId ? { candidateId: item.candidateId, revisionToken: item.revisionToken,
          reviewStatus: item.reviewStatus } : {}) });
      evidence.set(key, matches);
      // A verified provider title can differ from a third-party/TMDB title.
      // Explicit aliases live with the evidence; do not infer translations.
      for (const title of new Set([item.title, ...(Array.isArray(item.aliases) ? item.aliases : [])])) {
        const titleKey = titlePlatformOf({ title, platform: lineup.platform });
        const titleItems = byTitleAndPlatform.get(titleKey) ?? [];
        titleItems.push({ date: item.date, ...matches.at(-1) });
        byTitleAndPlatform.set(titleKey, titleItems);
      }
    }
  }
  const rows = tmdbReport.rows.map((row) => {
    const sameTitle = (byTitleAndPlatform.get(titlePlatformOf(row)) ?? []).filter((e) => seasonCompatible(row, e));
    const officialCandidates = sameTitle.filter((e) => e.date === row.date);
    const alternateOfficialDates = sameTitle.filter((e) => e.date && e.date !== row.date);
    const confirmed = officialCandidates.some((e) => e.premiereConfirmed &&
      (row.seasonNumber == null || e.seasonNumber === row.seasonNumber));
    const classification = alternateOfficialDates.length ? 'official_date_conflict'
      : confirmed ? 'official_kr_premiere_candidate'
      : officialCandidates.length ? 'official_kr_listing_needs_premiere_review'
      : row.dateMatched && row.krProviderMatched ? 'tmdb_date_and_provider_only'
      : row.dateMatched && row.koreanOrigin ? 'korean_origin_target_provider_unlisted'
      : row.dateMatched ? 'tmdb_date_only' : 'tmdb_date_unmatched';
    return { title: row.title, platform: row.platform, date: row.date, seasonNumber: seasonOf(row), contentId: row.contentId,
      tmdbId: row.tmdbId, tmdbStatus: row.status, tmdbDateFields: row.dates,
      krProviderNames: row.krProviderNames, originCountries: row.originCountries??[],
      broadcastNetworks: row.broadcastNetworks??[], koreanOrigin: row.koreanOrigin===true,
      otherKoreanProviders: row.otherKoreanProviders??[], officialCandidates, alternateOfficialDates, classification,
      publishEligible: false };
  });
  // A platform's own schedule can discover a title that TMDB's provider filter never returned.
  // Keep each platform/date as a separate event candidate; no cross-platform date inference.
  const discoveredKeys = new Set(tmdbReport.rows.map(keyOf));
  for (const [key, row] of includeOfficialDiscoveries ? officialRows : []) {
    if (discoveredKeys.has(key) || tmdbReport.rows.some((tmdb) =>
      (titlePlatformOf(tmdb) === titlePlatformOf(row) || (byTitleAndPlatform.get(titlePlatformOf(tmdb)) ?? [])
        .some((e) => e.date === row.date && seasonCompatible(tmdb, e))) &&
      tmdb.date === row.date && seasonCompatible(tmdb, row))) continue;
    // A date disagreement for the SAME season is already represented as a conflict.
    if (tmdbReport.rows.some((tmdb) => titlePlatformOf(tmdb) === titlePlatformOf(row) &&
      seasonCompatible(tmdb, row))) continue;
    const officialCandidates = evidence.get(key) ?? [];
    rows.push({ ...row, contentId: null, tmdbId: null, tmdbStatus: 'not_matched',
      tmdbDateFields: null, krProviderNames: [], originCountries: [], broadcastNetworks: [],
      koreanOrigin: false, otherKoreanProviders: [], officialCandidates,
      alternateOfficialDates: [], classification: officialCandidates.some((item) => item.premiereConfirmed)
        ? 'official_kr_premiere_without_tmdb_match' : 'official_kr_listing_without_tmdb_match',
      publishEligible: false });
  }
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
    const statePath = process.argv[5] ?? 'work/ott-candidates/state.json';
    const state = JSON.parse(await readFile(statePath, 'utf8'));
    // Gap accounting must retain the original 11 StreamPick-only targets.
    // The full official lineup is a separate discovery population.
    const result = reconcileGaps(tmdb, withCandidateEvidence(tmdb, lineups, state),
      { includeOfficialDiscoveries: false });
    await writeFile(outPath, JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify({ total: result.total, summary: result.summary, rows: result.rows.map(({title,platform,date,classification}) => ({title,platform,date,classification})), publishedCountDelta: 0 }, null, 2));
  } catch (error) { console.error(`STREAMPICK_RECONCILIATION_FAILED:${error.message}`); process.exitCode = 1; }
}
