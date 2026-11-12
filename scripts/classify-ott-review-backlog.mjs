#!/usr/bin/env node
// Saved observations only. A date difference is not proof of a catalog arrival.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { triageOfficialReleases } from './triage-official-ott-releases.mjs';

const key = (platform, title, date, season) => JSON.stringify([platform, title.normalize('NFC'), date, season ?? null]);
const validDate = (date) => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) &&
  Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
const count = (rows, field) => Object.fromEntries([...new Set(rows.map((r) => r[field]))].sort()
  .map((value) => [value, rows.filter((r) => r[field] === value).length]));

export function classifyReviewBacklog(lineup, enrichment, reviewed) {
  if (reviewed?.kind !== 'reviewed-mapping-snapshot' || !Array.isArray(reviewed.rows)) throw new Error('INVALID_REVIEW_SNAPSHOT');
  if (!Array.isArray(lineup?.items) || lineup.items.some((r) => typeof r.title !== 'string' || !r.title.trim() ||
    !validDate(r.date))) throw new Error('INVALID_LINEUP_ROW');
  const keys = lineup.items.map((r) => key(lineup.platform, r.title, r.date, r.seasonNumber));
  if (new Set(keys).size !== keys.length) throw new Error('DUPLICATE_LINEUP_ROW');
  const triage = triageOfficialReleases(lineup, enrichment);
  const sources = new Map(enrichment.rows.map((r) => [key(r.platform, r.title, r.date, r.seasonNumber), r]));
  const rows = triage.rows.map((row, index) => {
    const source = sources.get(key(row.platform, row.title, row.officialKrDate, row.seasonNumber));
    const tmdb = source?.tmdb;
    const matches = tmdb?.matches ?? [];
    // A missing season is unresolved, never a wildcard for any season.
    const mapped = reviewed.rows.filter((r) => r.platform === row.platform && r.market === 'KR' &&
      r.title.normalize('NFC') === row.title.normalize('NFC') && r.date === row.officialKrDate);
    const exact = mapped.filter((r) => (r.seasonNumber ?? null) === row.seasonNumber);
    const mappedReview = exact.length === 1 ? 'mapped_review_same_title_date_season'
      : mapped.length ? 'mapped_review_season_requires_review' : 'no_matching_mapped_review';
    const incomplete = !tmdb || (tmdb.errors?.length ?? 0) > 0 || tmdb.searchTruncated === true ||
      tmdb.movieSearchTruncated === true || /error|failed/.test(tmdb.status ?? '');
    const dates = [...new Set(matches.flatMap((m) => [m.dates?.movieReleaseDate, m.dates?.seasonFirstDate])
      .filter(validDate))].sort();
    let reason;
    if (lineup.items[index].market !== 'KR') reason = 'market_unverified';
    else if (incomplete) reason = 'lookup_incomplete';
    else if (row.tmdb) reason = 'single_dated_identity';
    else if (row.status === 'ambiguous_tmdb_identity') reason = 'ambiguous_dated_identity';
    else if (!matches.length) reason = tmdb.status === 'title_not_found' ? 'title_not_found' : 'identity_unresolved';
    else if (!dates.length) reason = 'candidate_date_missing';
    else if (dates.every((d) => d < row.officialKrDate)) reason = 'candidate_dates_before_listing';
    else if (dates.every((d) => d > row.officialKrDate)) reason = 'candidate_dates_after_listing';
    else reason = 'candidate_dates_mixed_or_unresolved';
    return { platform: row.platform, title: row.title, date: row.officialKrDate, seasonNumber: row.seasonNumber,
      market: lineup.items[index].market,
      reason, mappedReview, candidateDates: dates,
      candidateIdentities: [...new Set(matches.map((m) => `${m.type === 'movie' ? 'movie' : 'tv'}:${m.tmdbId}`))],
      sourceUrl: row.sourceUrl, eligibleForAutomaticPublication: false };
  });
  const backlog = rows.filter((r) => r.reason !== 'single_dated_identity');
  return { kind: 'official-ott-review-backlog', total: rows.length,
    singleDatedIdentity: rows.length - backlog.length, backlog: backlog.length,
    backlogReasons: count(backlog, 'reason'), backlogMappedReviews: count(backlog, 'mappedReview'),
    databaseQueried: false, liveSourcesQueried: false, publishedCountDelta: 0,
    warning: 'Candidate identities are search hints. Earlier dates do not establish a Korean catalog arrival; mapped reviews do not establish current DB publication.',
    rows };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 4 || new Set(args.map((p) => resolve(p))).size !== 4)
      throw new Error('USAGE: node scripts/classify-ott-review-backlog.mjs lineup.json enrichment.json reviewed.json output.json');
    const inputs = await Promise.all(args.slice(0, 3).map(async (file) => JSON.parse(await readFile(file, 'utf8'))));
    const result = classifyReviewBacklog(...inputs);
    await writeFile(args[3], JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    const { rows, ...summary } = result;
    console.log(JSON.stringify(summary));
  } catch (error) { console.error('OTT_BACKLOG_FAILED:', error.message); process.exitCode = 1; }
}
