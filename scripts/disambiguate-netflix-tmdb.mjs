#!/usr/bin/env node
// Read-only identity evidence. An exact title alone never confirms a work.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createTmdbClient, titleMatchesReference } from './tmdb-date-discovery.mjs';

const personKey = (s) => s.normalize('NFKC').toLocaleLowerCase('en').replace(/[^\p{L}\p{N}]/gu, '');
export async function disambiguateNetflix(input, request, { maxPages = 5 } = {}) {
  if (input?.kind !== 'netflix-official-disambiguation-input' || !Array.isArray(input.rows) ||
    !Number.isInteger(maxPages) || maxPages < 1 || maxPages > 20) throw new Error('INVALID_INPUT');
  const seen = new Set();
  for (const row of input.rows) {
    if (!Number.isSafeInteger(row.videoId) || row.videoId <= 0 || seen.has(row.videoId) || row.market !== 'KR' ||
      row.platform !== 'netflix' || row.sourceUrl !== `https://www.netflix.com/title/${row.videoId}` ||
      !Number.isInteger(row.searchYear) || row.searchYear < 1900 || row.searchYear > 2200 ||
      typeof row.englishTitle !== 'string' || !row.englishTitle.trim() ||
      !Array.isArray(row.officialCast) || !row.officialCast.length ||
      row.officialCast.some((name) => typeof name !== 'string' || !personKey(name)) ||
      new Set(row.officialCast.map(personKey)).size !== row.officialCast.length ||
      !['movie', 'documentary_movie', 'stand_up', 'series', 'reality_series'].includes(row.observedFormat) ||
      row.expectedCountry != null && !/^[A-Z]{2}$/.test(row.expectedCountry)) throw new Error('INVALID_OFFICIAL_IDENTITY');
    seen.add(row.videoId);
  }
  const rows = [];
  for (const row of input.rows) {
    const kind = ['series', 'reality_series'].includes(row.observedFormat) ? 'tv' : 'movie';
    const errors = [], searches = [], candidates = [];
    const hits = new Map();
    try {
      for (const constrained of [true, false]) {
        // Unconstrained fallback reveals earlier productions; a year filter is not identity proof.
        const params = { query: row.englishTitle, language: 'en-US', ...(constrained ?
          { [kind === 'movie' ? 'primary_release_year' : 'first_air_date_year']: row.searchYear } : {}) };
        let totalPages = 1, pagesRead = 0;
        for (let page = 1; page <= Math.min(totalPages, maxPages); page++) {
          const data = await request(`/search/${kind}`, { ...params, page });
          if (!Array.isArray(data.results) || !Number.isInteger(data.total_pages) || data.total_pages < 0)
            throw new Error('SEARCH_SCHEMA_CHANGED');
          totalPages = data.total_pages; pagesRead++;
          for (const hit of data.results) {
            if (Number.isSafeInteger(hit.id) && hit.id > 0 &&
              [hit.title ?? hit.name, hit.original_title ?? hit.original_name].some((name) => titleMatchesReference(name, row.englishTitle)))
              hits.set(hit.id, hit);
          }
        }
        searches.push({ params, totalPages, pagesRead, truncated: pagesRead < totalPages });
        if (hits.size) break;
      }
      for (const id of hits.keys()) {
        const detail = await request(`/${kind}/${id}`, { language: 'en-US' });
        const credits = await request(`/${kind}/${id}/credits`, { language: 'en-US' });
        if (!Array.isArray(credits.cast)) throw new Error('CREDITS_SCHEMA_CHANGED');
        const cast = new Set(credits.cast.filter((p) => typeof p.name === 'string').map((p) => personKey(p.name)));
        const castMatches = row.officialCast.filter((name) => cast.has(personKey(name)));
        const countries = kind === 'tv' ? detail.origin_country ?? [] : (detail.production_countries ?? []).map((c) => c.iso_3166_1);
        const countryMatches = row.expectedCountry == null || countries.includes(row.expectedCountry);
        const titleMatches = [detail.title ?? detail.name, detail.original_title ?? detail.original_name]
          .some((name) => titleMatchesReference(name, row.englishTitle));
        const identityMatches = titleMatches && countryMatches && castMatches.length >= Math.min(2, row.officialCast.length);
        const seasons = [];
        if (kind === 'tv' && identityMatches) {
          for (const season of detail.seasons ?? []) {
            if (!Number.isInteger(season.season_number) || season.season_number <= 0) continue;
            const data = await request(`/tv/${id}/season/${season.season_number}`, { language: 'en-US' });
            seasons.push({ number: season.season_number, firstDate: data.air_date ?? null });
          }
        }
        candidates.push({ id, kind, title: detail.title ?? detail.name, originalTitle: detail.original_title ?? detail.original_name,
          countries, castMatches, titleMatches, identityMatches, movieReleaseDate: kind === 'movie' ? detail.release_date ?? null : null, seasons });
      }
    } catch (error) { errors.push(error.message); }
    const confirmed = candidates.filter((c) => c.identityMatches);
    const incomplete = errors.length > 0 || searches.some((s) => s.truncated);
    const dateMatches = confirmed.flatMap((c) => c.kind === 'movie' ? c.movieReleaseDate === row.date ? [null] : [] :
      c.seasons.filter((s) => s.firstDate === row.date).map((s) => s.number));
    const status = incomplete ? 'lookup_incomplete' : confirmed.length > 1 ? 'ambiguous_identity' :
      confirmed.length === 0 ? candidates.length ? 'identity_not_confirmed' : 'title_not_found' :
        dateMatches.length === 1 ? 'identity_and_date_match' : dateMatches.length > 1 ? 'ambiguous_season' : 'identity_confirmed_date_differs';
    rows.push({ ...row, searches, candidates, errors, status,
      matchedSeason: status === 'identity_and_date_match' ? dateMatches[0] : null, eligibleForAutomaticPublication: false });
  }
  return { kind: 'netflix-disambiguation-report', asOf: input.asOf, rows, publishedCountDelta: 0 };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const [source, output, flag] = process.argv.slice(2);
    if (!source || !output || flag !== '--live' || process.argv.length !== 5 || resolve(source) === resolve(output))
      throw new Error('USAGE: node scripts/disambiguate-netflix-tmdb.mjs input.json output.json --live');
    const result = await disambiguateNetflix(JSON.parse(await readFile(source, 'utf8')),
      createTmdbClient(fetch, process.env.TMDB_API_READ_ACCESS_TOKEN));
    await writeFile(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ total: result.rows.length, status: result.rows.map((r) => [r.title, r.status]), publishedCountDelta: 0 }));
  } catch (error) { console.error('NETFLIX_DISAMBIGUATION_FAILED:', error.message); process.exitCode = 1; }
}
