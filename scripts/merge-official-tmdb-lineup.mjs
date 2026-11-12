#!/usr/bin/env node
// Enrich official KR schedules with unambiguous TMDB identity hints. Never infer a premiere.
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { prepareLineup } from './prepare-ott-lineup.mjs';

const keyOf = (platform, title, date, season) => JSON.stringify([platform, title, date, season ?? null]);

export function mergeOfficialTmdbLineup(lineup, enrichment) {
  prepareLineup(lineup);
  if (enrichment?.kind !== 'official-first-tmdb-review' || !Array.isArray(enrichment.rows))
    throw new Error('INVALID_ENRICHMENT');
  const indexes = new Map();
  for (const row of enrichment.rows) {
    const key = keyOf(row.platform, row.title, row.date, row.seasonNumber);
    if (indexes.has(key)) throw new Error('DUPLICATE_ENRICHMENT');
    indexes.set(key, row);
  }
  let classified = 0, retained = 0, ambiguous = 0, classifiedWithoutTmdbKrProvider = 0;
  const items = lineup.items.map((item) => {
    const evidence = indexes.get(keyOf(lineup.platform, item.title, item.date, item.seasonNumber));
    if (item.market !== 'KR' || !item.date || item.contentKind !== 'unknown' || !evidence?.tmdb) {
      retained++;
      return item;
    }
    // The first-party KR lineup already establishes platform availability.
    // TMDB's current KR watch-provider snapshot may omit a scheduled/older title.
    // Use TMDB only as a date/identity hint; never infer first-premiere approval.
    const matches = evidence.tmdb.matches?.filter((match) =>
      match.dateMatches === true &&
      match.episodeOnly !== true && (match.type === 'movie' ||
        (Number.isSafeInteger(match.seasonNumber) && match.seasonNumber > 0 && match.dates?.seasonFirstDate === item.date)) &&
      Number.isSafeInteger(match.tmdbId) && match.tmdbId > 0) ?? [];
    const identities = new Map(matches.map((match) => [`${match.type === 'movie' ? 'movie' : 'tv'}:${match.tmdbId}:${match.seasonNumber ?? ''}`, match]));
    if (identities.size !== 1) {
      if (identities.size > 1) ambiguous++;
      retained++;
      return item;
    }
    const match = [...identities.values()][0];
    const seasonNumber = match.type === 'movie' ? null : match.seasonNumber;
    classified++;
    if (match.krProviderMatched !== true) classifiedWithoutTmdbKrProvider++;
    return {
      ...item,
      contentKind: match.type === 'movie' ? 'movie' : 'original_series',
      seasonNumber,
      // Preserve official KR date and first-premiere status; TMDB alone cannot approve publication.
      evidence: `${item.evidence} TMDB 보조 식별: ${match.type === 'movie' ? 'movie' : 'tv'}/${match.tmdbId}${seasonNumber ? `/season/${seasonNumber}` : ''}; TMDB 날짜 일치, KR 플랫폼 등록은 공식 목록 근거(최초 공개 근거 아님).`.slice(0, 1000),
    };
  });
  const result = { ...lineup, items };
  prepareLineup(result);
  return { lineup: result, coverage: { total: items.length, classified, classifiedWithoutTmdbKrProvider, retained, ambiguous, publishEligible: items.filter((x) => x.premiereConfirmed).length } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [input, enrichment, output] = process.argv.slice(2);
  if (!input || !enrichment || !output || [input, enrichment].includes(output)) {
    console.error('사용법: node scripts/merge-official-tmdb-lineup.mjs official.json enriched.json output.json');
    process.exitCode = 1;
  } else {
    try {
      const result = mergeOfficialTmdbLineup(JSON.parse(await readFile(input, 'utf8')),
        JSON.parse(await readFile(enrichment, 'utf8')));
      await writeFile(output, JSON.stringify(result.lineup, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
      console.log(JSON.stringify({ output, ...result.coverage }));
    } catch (error) {
      console.error('OFFICIAL_TMDB_MERGE_FAILED:', error.message);
      process.exitCode = 1;
    }
  }
}
