#!/usr/bin/env node
// TMDB-first discovery. Reference/competitor rows are never collection inputs.
import { readFile, writeFile, mkdir, rename, open, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { parseOfficialSource, supportsOfficialSource } from './official-ott-source.mjs';
import { collectNetflixKrSchedule } from './collect-netflix-kr-schedule.mjs';
import { discoverByDate, createTmdbClient, monthRange, SERVICES } from './tmdb-date-discovery.mjs';

const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const dateValid = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const subscriptionProviders = (data) => ['flatrate', 'ads', 'free'].flatMap((bucket) =>
  (data?.results?.KR?.[bucket] ?? []).map((provider) => ({ ...provider, bucket })));
const servicesFor = (data) => SERVICES.filter((service) => subscriptionProviders(data).some((p) => service.pattern.test(p.provider_name))).map((s) => s.key);
const officialHosts = { netflix: ['about.netflix.com','www.netflix.com'], tving: ['www.tving.com','cjnews.cj.net'], disney_plus: ['www.disneyplus.com','thewaltdisneycompany.com'], coupang_play: ['news.coupang.com','www.coupangplay.com'] };
const trustedOfficial = (item) => {
  try { const url = new URL(item.sourceUrl); return url.protocol === 'https:' && !url.port && !url.username && !url.password && officialHosts[item.platform]?.includes(url.hostname); } catch { return false; }
};
const inMonths = (date, months) => dateValid(date) && months.includes(date.slice(0, 7));
const rawDates = (detail, season, movie) => movie ? { movieReleaseDate: detail.release_date ?? null } : {
  seriesFirstDate: detail.first_air_date ?? null, seasonFirstDate: season.air_date ?? null,
  firstEpisodeDate: season.episodes?.find((e) => e.episode_number === 1)?.air_date ?? null };

export function combineEvidence(candidate, official) {
  // Explicit stable identity binding comes from reviewed source evidence, not title similarity.
  const bound = official.filter((o) => o.type === candidate.type && o.tmdbId === candidate.tmdbId &&
    o.seasonNumber === candidate.seasonNumber && o.platform === candidate.platform && o.market === 'KR' &&
    o.identityVerified === true && trustedOfficial(o) && o.evidence && dateValid(o.date));
  const dates = [...new Set(bound.map((o) => o.date))];
  // TMDB records the original broadcast date, which can predate a Korean OTT
  // arrival. Only conflicting official KR claims are release-date conflicts.
  const conflict = dates.length > 1;
  const primary = dates.length === 1 ? dates[0] : null;
  const originalDateDiffers = Boolean(primary && candidate.dateHint && primary !== candidate.dateHint);
  const primaryFresh = bound.some((o) => o.date === primary && o.premiereConfirmed === true && o.sourceRefreshStatus === 'matched');
  return { ...candidate, officialEvidence: bound,
    verification: conflict ? 'official_date_conflict' : originalDateDiffers ? 'kr_ott_date_differs_from_tmdb_broadcast' :
      candidate.tmdbDateConflict && primary ? 'official_date_with_tmdb_episode_conflict' : primary && candidate.dateHint ? 'official_tmdb_date_match' :
      primary ? 'official_date_only' : 'tmdb_only_needs_official_check',
    officialPlatformDate: primary, market: 'KR',
    officialSourceRefresh: bound.length && bound.every((o) => o.sourceRefreshStatus === 'matched') ? 'matched' : 'recorded_or_unavailable',
    readyForBatchReview: !candidate.scopeHold && !conflict && Boolean(primary && primaryFresh && !candidate.tmdbDateConflict),
    publishingAllowed: false };
}

export async function refreshOfficialBindings(bindings, fetchImpl = fetch) {
  const checkedAt = new Date().toISOString();
  let netflix = null, netflixError = null;
  if (bindings.some((b) => b.sourceUrl === 'https://about.netflix.com/ko/new-to-watch')) {
    try { netflix = (await collectNetflixKrSchedule(fetchImpl)).lineup; }
    catch (e) { netflixError = e.message; }
  }
  const htmlCache = new Map();
  const results = [];
  for (const binding of bindings) {
    let sourceRefreshStatus = 'unsupported_primary_parser', sourceRefreshError = null;
    if (binding.sourceUrl === 'https://about.netflix.com/ko/new-to-watch') {
      const matching = netflix?.items.filter((i) => i.title.normalize('NFC') === binding.title.normalize('NFC')) ?? [];
      const dates = [...new Set(matching.map((i) => i.date))];
      sourceRefreshStatus = netflixError ? 'lookup_failed' : dates.length === 1 && dates[0] === binding.date ? 'matched' :
        dates.length ? 'date_conflict' : 'not_in_current_listing';
      sourceRefreshError = netflixError;
    } else if (trustedOfficial(binding) && supportsOfficialSource(binding)) {
      try {
        if (!htmlCache.has(binding.sourceUrl)) {
          const response = await fetchImpl(binding.sourceUrl, { signal: AbortSignal.timeout(15000) });
          if (!response.ok) throw new Error(`PRIMARY_HTTP_${response.status}`);
          if (response.url && new URL(response.url).origin !== new URL(binding.sourceUrl).origin) throw new Error('PRIMARY_REDIRECT_HOST_CHANGED');
          htmlCache.set(binding.sourceUrl, await response.text());
        }
        const parsed = parseOfficialSource(binding, htmlCache.get(binding.sourceUrl));
        results.push({ ...binding, ...parsed, sourceCheckedAt: checkedAt });
        continue;
      } catch (e) { sourceRefreshStatus = 'lookup_failed'; sourceRefreshError = e.message; }
    }
    results.push({ ...binding, sourceRefreshStatus, sourceRefreshError, sourceCheckedAt: checkedAt });
  }
  return results;
}

export async function collectReleaseCandidates(request, { months = ['2026-11', '2026-12'], maxPages = 500,
  officialBindings = [], discovery = null, changedIds = [] } = {}) {
  if (!Array.isArray(months) || !months.length) throw new Error('INVALID_MONTHS');
  months.forEach(monthRange);
  if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 500) throw new Error('INVALID_PAGE_LIMIT');
  const found = discovery ?? await discoverByDate(request, months, {
    maxPages, includeKoreanUpcoming: true, includeUnmappedAiring: true });
  const works = new Map(found.rows.map((row) => [`${row.type}:${row.tmdbId}`, {
    ...row, paths: [...new Set(['tmdb_monthly_discover', ...(row.discoveredBy ?? [])])] }]));
  for (const item of changedIds) {
    if (!['tv', 'movie'].includes(item.type) || !Number.isSafeInteger(item.tmdbId) || item.tmdbId < 1)
      throw Error('INVALID_CHANGED_ID');
    const key = `${item.type}:${item.tmdbId}`;
    const current = works.get(key) ?? { type: item.type, tmdbId: item.tmdbId, paths: [] };
    if (!current.paths.includes('tmdb_changes')) current.paths.push('tmdb_changes');
    works.set(key, current);
  }
  // Upcoming official titles may have no KR provider yet. Preserve them as a second independent source.
  for (const binding of officialBindings) {
    if (!['tv','movie'].includes(binding.type) || !Number.isSafeInteger(binding.tmdbId) || binding.tmdbId < 1 ||
      !['netflix','tving','disney_plus','coupang_play'].includes(binding.platform) || binding.market !== 'KR' ||
      !inMonths(binding.date, months) || binding.identityVerified !== true || !trustedOfficial(binding)) continue;
    const key = `${binding.type}:${binding.tmdbId}`;
    const row = works.get(key) ?? { type: binding.type, tmdbId: binding.tmdbId, paths: [] };
    if (!row.paths.includes('official_identity_seed')) row.paths.push('official_identity_seed');
    works.set(key, row);
  }
  const rows = [], errors = [], excluded = [], cache = new Map();
  async function get(path, params = {}) {
    const key = JSON.stringify([path, params]);
    if (!cache.has(key)) cache.set(key, request(path, params));
    return cache.get(key);
  }
  async function collectWork(work) {
    const { type, tmdbId } = work;
    try {
      const detail = await get(`/${type}/${tmdbId}`, { language: 'ko-KR' });
      if (detail.id !== tmdbId) throw new Error('TMDB_ID_MISMATCH');
      let seriesProviders = null;
      try { seriesProviders = await get(`/${type}/${tmdbId}/watch/providers`); }
      catch (e) { errors.push({ type, tmdbId, scope: 'series_or_movie_providers', error: e.message }); }
      const seeded = officialBindings.filter((o) => o.type === type && o.tmdbId === tmdbId && o.market === 'KR' &&
        SERVICES.some((s) => s.key === o.platform) && o.identityVerified === true && trustedOfficial(o));
      // TMDB season air dates are global broadcast dates. A recently aired season
      // can reach a Korean OTT months later, outside the season's original month.
      // Investigate up to two recent seasons when KR series-provider hints exist;
      // these hints must never become a Korean premiere date or publish approval.
      const earliestMonth = months.map((m) => `${m}-01`).sort()[0];
      const lookbackStart = `${Number(earliestMonth.slice(0, 4)) - 2}${earliestMonth.slice(4)}`;
      const recentHistorical = type === 'tv' && servicesFor(seriesProviders).length ? (detail.seasons ?? [])
        .filter((s) => s.season_number > 0 && dateValid(s.air_date) && s.air_date < earliestMonth && s.air_date >= lookbackStart)
        .sort((a, b) => b.season_number - a.season_number).slice(0, 2).map((s) => s.season_number) : [];
      const seasons = type === 'movie' ? [null] : [...new Set([
        ...(detail.seasons ?? []).filter((s) => s.season_number > 0 && (inMonths(s.air_date, months) || !s.air_date)).map((s) => s.season_number),
        ...seeded.filter((s) => Number.isInteger(s.seasonNumber) && s.seasonNumber > 0 && inMonths(s.date, months)).map((s) => s.seasonNumber),
        ...recentHistorical,
      ])];
      for (const seasonNumber of seasons) {
        try {
          const season = type === 'movie' ? null : await get(`/tv/${tmdbId}/season/${seasonNumber}`, { language: 'ko-KR' });
          if (season && season.season_number !== seasonNumber) throw new Error('TMDB_SEASON_MISMATCH');
          const dates = rawDates(detail, season, type === 'movie');
          const possible = [...new Set((type === 'movie' ? [dates.movieReleaseDate] : [dates.seasonFirstDate, dates.firstEpisodeDate]).filter(dateValid))];
          const originalDateInRange = possible.some((d) => inMonths(d, months));
          const officialDateInRange = seeded.some((o) => o.seasonNumber === seasonNumber && inMonths(o.date, months));
          const historicalInvestigation = recentHistorical.includes(seasonNumber) && !originalDateInRange && !officialDateInRange;
          if (!originalDateInRange && !officialDateInRange && !historicalInvestigation) continue;
          const scopeHold = null; // DATA56: animation is in the user-confirmed OTT scope; evidence gates still apply.
          if (scopeHold) excluded.push({ type, tmdbId, seasonNumber, reason: scopeHold, dates });
          let providers = type === 'movie' ? seriesProviders : null;
          if (type === 'tv') {
            try { providers = await get(`/tv/${tmdbId}/season/${seasonNumber}/watch/providers`); }
            catch (e) { errors.push({ type, tmdbId, seasonNumber, scope: 'season_providers', error: e.message }); }
          }
          const platforms = new Set([...servicesFor(seriesProviders), ...servicesFor(providers), ...seeded.filter((o) => o.seasonNumber === seasonNumber).map((o) => o.platform)]);
          // Keep unidentified-provider works in the investigation queue; do not invent a target OTT.
          if (platforms.size === 0) platforms.add(null);
          for (const platform of platforms) {
            const candidate = { id: `tmdb:${type}:${tmdbId}:${seasonNumber ?? 'movie'}:KR:${platform ?? 'unassigned'}`,
              type, tmdbId, seasonNumber, platform, title: detail.name ?? detail.title,
              originalTitle: detail.original_name ?? detail.original_title ?? null, dates,
              scopeHold, suggestedContentKind: detail.genres?.some((g) => g.id === 16) ? 'animation' : null, suggestedAnimationFormat: detail.genres?.some((g) => g.id === 16) ? type === 'movie' ? 'movie' : 'series' : null, genreIDs: (detail.genres ?? []).map((g) => g.id),
              dateHint: !historicalInvestigation && possible.length === 1 ? possible[0] : null,
              premiereWindowStatus: historicalInvestigation ? 'historical_season_kr_date_unconfirmed' : 'tmdb_or_official_month_hint',
              tmdbDateConflict: possible.length > 1,
              discoveryPaths: work.paths,
              platformEvidence: seeded.some((o) => o.platform === platform && o.seasonNumber === seasonNumber) ? 'official_identity_binding' :
                servicesFor(providers).includes(platform) ? 'tmdb_season_or_movie_provider' : platform ? 'tmdb_series_provider_hint_only' : 'unassigned',
              targetSeasonProviderMatched: servicesFor(providers).includes(platform), providerScope: type === 'tv' ? 'season' : 'movie',
              krProviderNames: [...new Set(subscriptionProviders(providers).map((p) => p.provider_name))].sort(),
              seriesKrProviderNames: [...new Set(subscriptionProviders(seriesProviders).map((p) => p.provider_name))].sort(),
              providerLookupStatus: providers ? (subscriptionProviders(providers).length ? 'available' : 'unlisted') : 'lookup_failed',
              attribution: { metadata: 'TMDB', watchProviders: 'JustWatch via TMDB' } };
            rows.push(combineEvidence(candidate, officialBindings));
          }
        } catch (e) { errors.push({ type, tmdbId, seasonNumber, scope: 'season', error: e.message }); }
      }
    } catch (e) { errors.push({ type, tmdbId, scope: 'detail', error: e.message }); }
  }
  const pendingWorks = [...works.values()];
  for (let i = 0; i < pendingWorks.length; i += 3) await Promise.all(pendingWorks.slice(i, i+3).map(collectWork));
  errors.sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  rows.sort((a,b) => a.id.localeCompare(b.id));
  return { kind: 'tmdb-first-ott-release-review', months, referenceInputUsed: false,
    discoveredWorks: found.rows.length, allWorksWithOfficialSeeds: works.size, discoveryCoverage: found.coverage,
    discoveryComplete: found.coverage.every((c) => !c.error && !c.truncated && c.reason !== 'provider_not_found'),
    rows, errors, excluded, total: rows.length, readyForBatchReview: rows.filter((r) => r.readyForBatchReview).length,
    publishingAllowed: false };
}

export function mergeCandidateState(previous, report, now) {
  if (previous && (previous.version !== 1 || previous.stage !== 'tmdb-release-review')) throw new Error('INVALID_CANDIDATE_STATE');
  const byID = new Map((previous?.candidates ?? []).map((r) => [r.id, structuredClone(r)]));
  let created = 0, revised = 0;
  for (const candidate of report.rows) {
    const revisionValue = { ...candidate, officialEvidence: candidate.officialEvidence?.map(({ sourceCheckedAt, ...evidence }) => evidence) };
    const revision = hash(revisionValue), old = byID.get(candidate.id);
    if (!old) { created++; byID.set(candidate.id, { id: candidate.id, firstSeenAt: now, lastSeenAt: now, revisions: [{ revision, candidate, observedAt: now }] }); }
    else { old.lastSeenAt = now; if (old.revisions.at(-1).revision !== revision) { revised++; old.revisions.push({ revision, candidate, observedAt: now }); } }
  }
  return { state: { version: 1, stage: 'tmdb-release-review', candidates: [...byID.values()].sort((a,b) => a.id.localeCompare(b.id)) },
    summary: { created, revised, unchanged: report.rows.length - created - revised, stored: byID.size } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const dir = process.argv[2] ?? 'work/tmdb-release-candidates';
  const officialFile = process.argv[3];
  let lock;
  try {
    await mkdir(dir, { recursive: true });
    lock = await open(`${dir}/writer.lock`, 'wx');
    let officialBindings = officialFile ? JSON.parse(await readFile(officialFile, 'utf8')).items : [];
    if (!Array.isArray(officialBindings)) throw new Error('INVALID_OFFICIAL_BINDINGS');
    officialBindings = await refreshOfficialBindings(officialBindings);
    let changedIds = [];
    try {
      const changes = JSON.parse(await readFile('work/tmdb-changes/latest.json', 'utf8'));
      if (changes.kind !== 'tmdb-incremental-changes' || changes.referenceInputUsed !== false || !Array.isArray(changes.rows))
        throw Error('INVALID_TMDB_CHANGES');
      // Changes API is global (today: thousands of unrelated edits). Refresh
      // relevant previously discovered works; monthly discover finds new IDs.
      let priorSnapshot = null;
      try { priorSnapshot = JSON.parse(await readFile(`${dir}/latest.json`, 'utf8')); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      const known = new Set((priorSnapshot?.rows ?? []).map((r) => `${r.type}:${r.tmdbId}`));
      changedIds = changes.rows.filter((r) => known.has(`${r.type}:${r.tmdbId}`));
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    const report = await collectReleaseCandidates(createTmdbClient(fetch, process.env.TMDB_API_READ_ACCESS_TOKEN), { officialBindings, changedIds });
    let prior = null;
    try { prior = JSON.parse(await readFile(`${dir}/state.json`, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    const result = mergeCandidateState(prior, report, new Date().toISOString());
    await writeFile(`${dir}/state.json.tmp`, JSON.stringify(result.state,null,2)+'\n');
    await rename(`${dir}/state.json.tmp`, `${dir}/state.json`);
    await writeFile(`${dir}/latest.json`, JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({ output: dir, ...result.summary, total: report.total, errors: report.errors.length,
      discoveryComplete: report.discoveryComplete, readyForBatchReview: report.readyForBatchReview }));
    if (!report.discoveryComplete || report.errors.length) process.exitCode = 2;
  } catch (e) { console.error('TMDB_RELEASE_COLLECTION_FAILED:', e.code === 'EEXIST' ? 'writer_locked' : e.message); process.exitCode = 1; }
  finally { if (lock) { await lock.close(); await unlink(`${dir}/writer.lock`); } }
}
