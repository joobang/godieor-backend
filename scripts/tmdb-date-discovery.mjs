// Read-only TMDB candidate discovery. Global air dates and KR watch-provider
// metadata are hints, never evidence of a Korean OTT premiere.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

export const SERVICES = [
  { key: 'netflix', pattern: /\bnetflix\b/i },
  { key: 'tving', pattern: /\btving\b/i },
  { key: 'disney_plus', pattern: /disney\s*(?:plus|\+)/i },
  { key: 'coupang_play', pattern: /coupang/i },
];

export function monthRange(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('INVALID_MONTH');
  const [year, number] = month.split('-').map(Number);
  const last = new Date(Date.UTC(year, number, 0)).getUTCDate();
  return { start: `${month}-01`, end: `${month}-${String(last).padStart(2, '0')}` };
}

export function candidateDates(tv, season) {
  const episodes = (season?.episodes ?? []).filter((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.air_date ?? ''));
  return {
    seriesFirstDate: tv.first_air_date ?? null,
    seasonFirstDate: season?.air_date ?? null,
    firstEpisodeDate: episodes.find((ep) => ep.episode_number === 1)?.air_date ?? null,
    episodeDates: [...new Set(episodes.map((ep) => ep.air_date))].sort(),
  };
}

// TMDB Korean titles can be displayed as "'localized name' - Original name".
// Accept that specific wrapper without broadly substring-matching unrelated works.
export function titleMatchesReference(tmdbName, referenceTitle) {
  if (typeof tmdbName !== 'string' || typeof referenceTitle !== 'string') return false;
  const normalized = (value) => value.normalize('NFC').trim().toLocaleLowerCase('ko');
  const name = normalized(tmdbName);
  const reference = normalized(referenceTitle);
  if (!reference) return false;
  if (name === reference) return true;
  return ["'", '‘', '“', '"'].some((quote, index) => {
    const closing = ["'", '’', '”', '"'][index];
    return name.startsWith(`${quote}${reference}${closing} - `);
  });
}

export function auditCachedCatalog(referenceRows, catalogRows) {
  const key = (title) => title.normalize('NFC').trim().toLocaleLowerCase('ko');
  const byTitle = new Map();
  for (const item of catalogRows) {
    const title = key(item.title ?? '');
    if (!title) continue;
    const group = byTitle.get(title) ?? [];
    group.push(item);
    byTitle.set(title, group);
  }
  return referenceRows.map(([date, service, title, season]) => {
    const titleMatches = byTitle.get(key(title)) ?? [];
    const serviceMatches = titleMatches.filter((item) => item.services?.includes(service));
    const firstDateMatches = serviceMatches.filter((item) => item.tmdbFirstDate === date);
    const status = titleMatches.length === 0 ? 'title_not_in_cache'
      : serviceMatches.length === 0 ? 'service_not_in_cache'
      : firstDateMatches.length > 0 ? 'series_first_date_matches'
      : 'series_first_date_differs';
    return { date, service, title, season, status,
      candidates: titleMatches.map(({ tmdbId, type, tmdbFirstDate, services }) => ({ tmdbId, type, tmdbFirstDate, services })) };
  });
}

export function summarizeCached(rows) {
  const status = {};
  const services = {};
  for (const row of rows) {
    status[row.status] = (status[row.status] ?? 0) + 1;
    const service = services[row.service] ?? { total: 0, titleFound: 0, serviceFound: 0, firstDateMatched: 0 };
    service.total++;
    if (row.candidates.length) service.titleFound++;
    if (['series_first_date_matches', 'series_first_date_differs'].includes(row.status)) service.serviceFound++;
    if (row.status === 'series_first_date_matches') service.firstDateMatched++;
    services[row.service] = service;
  }
  return { total: rows.length, status, services };
}

export function evaluateReference(reference, matches, errors = []) {
  if (!matches.length) return { ...reference, status: errors.length ? 'lookup_failed' : 'title_not_found', matches: [], errors };
  const expectedSeason = reference.season;
  const evaluated = matches.map((match) => {
    const info = match.dates ?? {};
    const seasonKnown = match.seasonNumber != null;
    const seasonMatches = expectedSeason == null || (seasonKnown && match.seasonNumber === expectedSeason);
    const dateMatches = [info.seasonFirstDate, info.firstEpisodeDate, info.movieReleaseDate].includes(reference.date);
    const episodeOnly = (info.episodeDates ?? []).includes(reference.date) && !dateMatches;
    return { ...match, seasonMatches, dateMatches, episodeOnly };
  });
  let status = 'date_mismatch';
  if (evaluated.some((m) => m.seasonMatches && m.dateMatches && m.type !== 'movie')) status = 'tmdb_season_date_match';
  else if (evaluated.some((m) => m.seasonMatches && m.dateMatches && m.type === 'movie')) status = 'tmdb_movie_release_date_match';
  else if (evaluated.some((m) => m.seasonMatches && m.episodeOnly)) status = 'episode_only_match';
  else if (evaluated.some((m) => !m.seasonMatches && m.dateMatches)) status = 'different_season';
  else if (evaluated.every((m) => m.dates == null)) status = errors.length ? 'lookup_failed' : 'date_not_available';
  return { ...reference, status, matches: evaluated, errors };
}

export function createTmdbClient(fetchImpl, token) {
  if (!token) throw new Error('TMDB_API_READ_ACCESS_TOKEN required');
  return async (path, params = {}) => {
    const url = new URL(`https://api.themoviedb.org/3${path}`);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
    let lastError;
    for (let retry = 0; retry < 3; retry++) {
      try {
        const response = await fetchImpl(url, {
          headers: { Authorization: `Bearer ${token}`, accept: 'application/json' },
          signal: AbortSignal.timeout(10000),
        });
        if (response.ok) return await response.json();
        lastError = new Error(`TMDB_HTTP_${response.status}`);
        if (response.status !== 429 && response.status < 500) break;
      } catch (error) { lastError = error; }
      if (retry < 2) await new Promise((resolve) => setTimeout(resolve, 500 * (retry + 1)));
    }
    throw new Error(`TMDB_REQUEST_FAILED:${lastError?.message ?? 'unknown'}`);
  };
}

// Search every reference title directly. A series can begin years before the
// requested month, so discover-by-first_air_date alone will never suffice.
export async function reverseLookup(referenceRows, request, { searchPages = 2 } = {}) {
  const searchCache = new Map();
  const tvCache = new Map();
  const seasonCache = new Map();
  const providerCache = new Map();
  const movieSearchCache = new Map();
  const movieCache = new Map();
  const movieProviderCache = new Map();
  const results = [];
  for (const [date, service, title, season] of referenceRows) {
    const errors = [];
    const key = title.normalize('NFC');
    if (!searchCache.has(key)) {
      const hits = [];
      try {
        const first = await request('/search/tv', { query: title, language: 'ko-KR', page: 1 });
        hits.push(...(first.results ?? []));
        const pages = Math.min(searchPages, first.total_pages ?? 1);
        for (let page = 2; page <= pages; page++) {
          const data = await request('/search/tv', { query: title, language: 'ko-KR', page });
          hits.push(...(data.results ?? []));
        }
        searchCache.set(key, { hits, truncated: (first.total_pages ?? 1) > searchPages });
      } catch (e) { searchCache.set(key, { hits: [], error: e.message }); }
    }
    const search = searchCache.get(key);
    if (search.error) errors.push(search.error);
    const matches = [];
    // Titles can be localized differently. Keep ambiguous matches visible; do
    // not claim that a search hit proves the exact StreamPick work.
    for (const hit of search.hits) {
      if (!hit.id) continue;
      const exactTitle = [hit.name, hit.original_name].some((name) => titleMatchesReference(name, key));
      if (!exactTitle) continue;
      const id = hit.id;
      try {
        if (!tvCache.has(id)) tvCache.set(id, await request(`/tv/${id}`, { language: 'ko-KR' }));
        if (!providerCache.has(id)) providerCache.set(id, await request(`/tv/${id}/watch/providers`));
        const tv = tvCache.get(id);
        const provider = providerCache.get(id);
        const krProviders = ['flatrate', 'ads', 'free', 'rent', 'buy'].flatMap((bucket) => provider.results?.KR?.[bucket] ?? []);
        const providerNames = [...new Set(krProviders.map((p) => p.provider_name))];
        const providerMatched = SERVICES.find((s) => s.key === service)?.pattern;
        const targetSeasons = season != null ? [season] : (tv.seasons ?? []).map((s) => s.season_number).filter((n) => n != null);
        for (const n of targetSeasons) {
          const seasonKey = `${id}:${n}`;
          try {
            if (!seasonCache.has(seasonKey)) seasonCache.set(seasonKey, await request(`/tv/${id}/season/${n}`, { language: 'ko-KR' }));
            matches.push({ tmdbId: id, tmdbTitle: tv.name, seasonNumber: n,
              providerNames, krProviderMatched: providerMatched ? krProviders.some((p) => providerMatched.test(p.provider_name)) : false,
              dates: candidateDates(tv, seasonCache.get(seasonKey)) });
          } catch (e) { errors.push(`${id}:season${n}:${e.message}`); }
        }
      } catch (e) { errors.push(`${id}:${e.message}`); }
    }
    // A reference without a season may be a film. Query movie separately;
    // TMDB movie release_date is only a global release hint, never KR OTT proof.
    let movieSearchTruncated = false;
    if (season == null) {
      if (!movieSearchCache.has(key)) {
        const hits = [];
        try {
          const first = await request('/search/movie', { query: title, language: 'ko-KR', page: 1 });
          hits.push(...(first.results ?? []));
          const pages = Math.min(searchPages, first.total_pages ?? 1);
          for (let page = 2; page <= pages; page++) {
            const data = await request('/search/movie', { query: title, language: 'ko-KR', page });
            hits.push(...(data.results ?? []));
          }
          movieSearchCache.set(key, { hits, truncated: (first.total_pages ?? 1) > searchPages });
        } catch (e) { movieSearchCache.set(key, { hits: [], error: e.message }); }
      }
      const movieSearch = movieSearchCache.get(key);
      movieSearchTruncated = movieSearch.truncated ?? false;
      if (movieSearch.error) errors.push(`movie:${movieSearch.error}`);
      for (const hit of movieSearch.hits) {
        if (!hit.id || ![hit.title, hit.original_title].some((name) => titleMatchesReference(name, key))) continue;
        try {
          if (!movieCache.has(hit.id)) movieCache.set(hit.id, await request(`/movie/${hit.id}`, { language: 'ko-KR' }));
          if (!movieProviderCache.has(hit.id)) movieProviderCache.set(hit.id, await request(`/movie/${hit.id}/watch/providers`));
          const movie = movieCache.get(hit.id);
          const provider = movieProviderCache.get(hit.id);
          const krProviders = ['flatrate', 'ads', 'free', 'rent', 'buy'].flatMap((bucket) => provider.results?.KR?.[bucket] ?? []);
          const providerPattern = SERVICES.find((s) => s.key === service)?.pattern;
          matches.push({ type: 'movie', tmdbId: hit.id, tmdbTitle: movie.title, seasonNumber: null,
            providerNames: [...new Set(krProviders.map((p) => p.provider_name))],
            krProviderMatched: providerPattern ? krProviders.some((p) => providerPattern.test(p.provider_name)) : false,
            dates: { movieReleaseDate: movie.release_date ?? null } });
        } catch (e) { errors.push(`movie:${hit.id}:${e.message}`); }
      }
    }
    const result = evaluateReference({ date, service, title, season }, matches, errors);
    result.searchTruncated = search.truncated ?? false;
    result.movieSearchTruncated = movieSearchTruncated;
    result.searchResultCount = search.hits.length;
    results.push(result);
  }
  return results;
}

// Date-based discovery is a second, independent path beyond popularity pages.
// TMDB discover TV air_date is not guaranteed to mean a new season premiere.
export async function discoverByDate(request, months, { maxPages = 20, includeKoreanUpcoming = false } = {}) {
  const windows = months.map(monthRange);
  const rows = new Map();
  const coverage = [];
  for (const kind of ['tv', 'movie']) {
    const response = await request(`/watch/providers/${kind}`, { watch_region: 'KR' });
    for (const service of SERVICES) {
      const ids = (response.results ?? []).filter((p) => service.pattern.test(p.provider_name)).map((p) => p.provider_id);
      if (!ids.length) { coverage.push({ kind, service: service.key, providerIds: [], count: 0, reason: 'provider_not_found' }); continue; }
      for (const window of windows) {
        let totalPages = 0;
        const strategies = kind === 'tv'
          ? [{ 'air_date.gte': window.start, 'air_date.lte': window.end }, { 'first_air_date.gte': window.start, 'first_air_date.lte': window.end }]
          : [{ 'primary_release_date.gte': window.start, 'primary_release_date.lte': window.end }];
        for (const strategy of strategies) {
          let retrieved = 0;
          totalPages = 0;
          const params = { watch_region: 'KR', with_watch_providers: ids.join('|'), with_watch_monetization_types: 'flatrate',
            language: 'ko-KR', sort_by: 'popularity.desc', ...strategy };
          let total = 1;
          let pagesRead = 0;
          let failure = null;
          for (let page = 1; page <= Math.min(total, maxPages); page++) {
            try {
              const data = await request(`/discover/${kind}`, { ...params, page });
              total = data.total_pages ?? 1;
              totalPages = Math.max(totalPages, total);
              pagesRead++;
              for (const item of data.results ?? []) {
                if (!item.id) continue;
                const id = `${kind}:${item.id}`;
                const row = rows.get(id) ?? { tmdbId: item.id, type: kind, title: item.name ?? item.title, seriesFirstDate: item.first_air_date ?? null,
                  movieReleaseDate: item.release_date ?? null, services: [], discoveredBy: [] };
                if (!row.services.includes(service.key)) row.services.push(service.key);
                const method = Object.keys(strategy)[0].split('.')[0];
                if (!row.discoveredBy.includes(method)) row.discoveredBy.push(method);
                rows.set(id, row);
                retrieved++;
              }
            } catch (e) { failure = e.message; break; }
          }
          coverage.push({ kind, service: service.key, window, filter: Object.keys(strategy)[0].split('.')[0],
            providerIds: ids, totalPages: total, pagesRead, truncated: pagesRead < total, retrieved, error: failure });
        }
      }
    }
  }
  if (includeKoreanUpcoming) {
    // Upcoming KR productions often have no provider mapping yet.
    for (const window of windows) {
      for (const field of ['air_date', 'first_air_date']) {
        let total = 1, pagesRead = 0, retrieved = 0, error = null;
        for (let page = 1; page <= Math.min(total, maxPages, 500); page++) {
          try {
            const data = await request('/discover/tv', { language: 'ko-KR', with_origin_country: 'KR',
              [`${field}.gte`]: window.start, [`${field}.lte`]: window.end, sort_by: 'first_air_date.asc', page });
            total = data.total_pages ?? 1; pagesRead++;
            for (const item of data.results ?? []) {
              if (!item.id) continue;
              const key = `tv:${item.id}`;
              const row = rows.get(key) ?? { tmdbId: item.id, type: 'tv', title: item.name,
                seriesFirstDate: item.first_air_date ?? null, movieReleaseDate: null, services: [], discoveredBy: [] };
              if (!row.discoveredBy.includes(`kr_origin_${field}`)) row.discoveredBy.push(`kr_origin_${field}`);
              rows.set(key, row); retrieved++;
            }
          } catch (e) { error = e.message; break; }
        }
        coverage.push({ kind: 'tv', service: null, window, filter: `kr_origin_${field}`,
          totalPages: total, pagesRead, truncated: pagesRead < total, retrieved, error });
      }
    }
  }
  return { rows: [...rows.values()], coverage };
}

export function reportSummary(rows) {
  const statuses = {};
  for (const row of rows) statuses[row.status] = (statuses[row.status] ?? 0) + 1;
  const dateMatched = (row) => ['tmdb_season_date_match', 'tmdb_movie_release_date_match'].includes(row.status);
  const providerAndDateMatched = (row) => dateMatched(row) && row.matches.some((m) => m.dateMatches && m.krProviderMatched);
  const byService = {};
  for (const row of rows) {
    const current = byService[row.service] ?? { reference: 0, dateMatched: 0, providerAndDateMatched: 0 };
    current.reference++;
    if (dateMatched(row)) current.dateMatched++;
    if (providerAndDateMatched(row)) current.providerAndDateMatched++;
    byService[row.service] = current;
  }
  return { totalReference: rows.length, statuses,
    seasonDateMatched: rows.filter((r) => r.status === 'tmdb_season_date_match').length,
    movieReleaseDateMatched: rows.filter((r) => r.status === 'tmdb_movie_release_date_match').length,
    krProviderAndSeasonDateMatched: rows.filter((r) => r.status === 'tmdb_season_date_match' && r.matches.some((m) => m.dateMatches && m.seasonMatches && m.krProviderMatched)).length,
    tmdbDateMatched: rows.filter(dateMatched).length,
    krProviderAndDateMatched: rows.filter(providerAndDateMatched).length,
    byService,
    lookupErrors: rows.filter((r) => r.errors?.length).length };
}

async function main() {
  const args = process.argv.slice(2);
  const reference = JSON.parse(await readFile('data/reference/streampick-2026-11-12-titles.json', 'utf8'));
  if (!Array.isArray(reference.rows)) throw new Error('INVALID_REFERENCE');
  const live = args.includes('--live');
  const output = args.find((x) => x.startsWith('--output='))?.slice(9) ?? '/private/tmp/godieor-tmdb-date-discovery.json';
  const catalog = JSON.parse(await readFile('work/tmdb/latest.json', 'utf8'));
  const cachedAudit = auditCachedCatalog(reference.rows, catalog.rows ?? []);
  const referenceRows = reference.rows.map(([date, service, title, season]) => {
    const matches = (catalog.rows ?? []).filter((c) => c.title === title && c.services?.includes(service));
    return { date, service, title, season, catalogMatched: matches.length > 0, catalogIds: matches.map((m) => m.tmdbId) };
  });
  let reverse = [];
  let dateDiscovery = { rows: [], coverage: [] };
  let liveError = null;
  if (live) {
    const request = createTmdbClient(fetch, process.env.TMDB_API_READ_ACCESS_TOKEN);
    // A failed DNS/API check should not trigger 35 costly independent retries.
    try { await request('/configuration'); }
    catch (error) { liveError = error.message; }
    if (!liveError) {
      reverse = await reverseLookup(reference.rows, request);
      if (!args.includes('--skip-discover')) {
        try { dateDiscovery = await discoverByDate(request, ['2026-11', '2026-12']); }
        catch (error) { liveError = error.message; }
      }
    }
  }
  const result = { observedAt: new Date().toISOString(), liveAttempted: live, liveError, referenceSource: reference.source,
    catalogObservedAt: catalog.observedAt, catalogCoverage: { total: referenceRows.length, matched: referenceRows.filter((r) => r.catalogMatched).length },
    referenceRows, cachedAudit, cachedSummary: summarizeCached(cachedAudit), reverse, summary: reportSummary(reverse), dateDiscovery,
    caveat: 'Global TMDB air/episode dates and KR watch availability do not prove the premiere date on a Korean OTT. Nothing published.' };
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({ catalogCoverage: result.catalogCoverage, cachedSummary: result.cachedSummary, liveError, reverse: result.summary,
    discovered: dateDiscovery.rows.length, coverage: dateDiscovery.coverage.map(({ kind, service, window, filter, truncated, error }) => ({ kind, service, month: window.start.slice(0, 7), filter, truncated, error })), calendarPublished: 0 }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(`TMDB_DATE_DISCOVERY_FAILED:${error.message}`); process.exitCode = 1; });
}
