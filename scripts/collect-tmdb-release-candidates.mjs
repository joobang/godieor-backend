#!/usr/bin/env node
// TMDB-first discovery. Reference/competitor rows are never collection inputs.
import { readFile, writeFile, mkdir, rename, open, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
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
  const conflict = candidate.tmdbDateConflict === true || dates.length > 1 || dates.length === 1 && candidate.dateHint && dates[0] !== candidate.dateHint;
  const primary = dates.length === 1 ? dates[0] : null;
  return { ...candidate, officialEvidence: bound,
    verification: conflict ? 'date_conflict' : primary && candidate.dateHint ? 'official_tmdb_date_match' :
      primary ? 'official_date_only' : 'tmdb_only_needs_official_check',
    officialPlatformDate: primary, market: 'KR',
    officialSourceRefresh: bound.length && bound.every((o) => o.sourceRefreshStatus === 'matched') ? 'matched' : 'recorded_or_unavailable',
    readyForBatchReview: !candidate.scopeHold && !conflict && Boolean(primary && candidate.dateHint && bound.some((o) => o.premiereConfirmed === true && o.sourceRefreshStatus === 'matched')),
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
    } else if (binding.platform === 'tving' && /^https:\/\/www\.tving\.com\/contents\/P[0-9]+$/.test(binding.sourceUrl)) {
      try {
        if (!htmlCache.has(binding.sourceUrl)) {
          const response = await fetchImpl(binding.sourceUrl, { signal: AbortSignal.timeout(15000) });
          if (!response.ok) throw new Error(`PRIMARY_HTTP_${response.status}`);
          htmlCache.set(binding.sourceUrl, await response.text());
        }
        const html = htmlCache.get(binding.sourceUrl);
        const match = /<script\b(?=[^>]*\bid=["']__NEXT_DATA__["'])[^>]*>([\s\S]*?)<\/script>/i.exec(html);
        if (!match) throw new Error('TVING_PUBLIC_DATA_MISSING');
        const page = JSON.parse(match[1]).props?.pageProps;
        if (page?.contentInfo?.code !== new URL(binding.sourceUrl).pathname.split('/').at(-1)) throw new Error('TVING_IDENTITY_CHANGED');
        const claim = /^시즌\s+(\d+),\s*(\d+)월\s*(\d+)일\s+공개$/.exec(page?.openText ?? '');
        const year = page?.contentInfo?.broad_dt?.slice(0,4);
        if (!claim || !/^\d{4}$/.test(year ?? '')) sourceRefreshStatus = 'explicit_ott_date_not_found';
        else {
          const date = `${year}-${claim[2].padStart(2,'0')}-${claim[3].padStart(2,'0')}`;
          sourceRefreshStatus = date === binding.date && Number(claim[1]) === binding.seasonNumber ? 'matched' : 'date_or_season_conflict';
        }
      } catch (e) { sourceRefreshStatus = 'lookup_failed'; sourceRefreshError = e.message; }
    }
    results.push({ ...binding, sourceRefreshStatus, sourceRefreshError, sourceCheckedAt: checkedAt });
  }
  return results;
}

export async function collectReleaseCandidates(request, { months = ['2026-11', '2026-12'], maxPages = 500,
  officialBindings = [], discovery = null } = {}) {
  if (!Array.isArray(months) || !months.length) throw new Error('INVALID_MONTHS');
  months.forEach(monthRange);
  if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 500) throw new Error('INVALID_PAGE_LIMIT');
  const found = discovery ?? await discoverByDate(request, months, { maxPages, includeKoreanUpcoming: true });
  const works = new Map(found.rows.map((row) => [`${row.type}:${row.tmdbId}`, { ...row, paths: ['tmdb_monthly_discover'] }]));
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
      const seasons = type === 'movie' ? [null] : [...new Set([
        ...(detail.seasons ?? []).filter((s) => s.season_number > 0 && (inMonths(s.air_date, months) || !s.air_date)).map((s) => s.season_number),
        ...seeded.filter((s) => Number.isInteger(s.seasonNumber) && s.seasonNumber > 0 && inMonths(s.date, months)).map((s) => s.seasonNumber),
      ])];
      for (const seasonNumber of seasons) {
        try {
          const season = type === 'movie' ? null : await get(`/tv/${tmdbId}/season/${seasonNumber}`, { language: 'ko-KR' });
          if (season && season.season_number !== seasonNumber) throw new Error('TMDB_SEASON_MISMATCH');
          const dates = rawDates(detail, season, type === 'movie');
          const possible = [...new Set((type === 'movie' ? [dates.movieReleaseDate] : [dates.seasonFirstDate, dates.firstEpisodeDate]).filter(dateValid))];
          if (!possible.some((d) => inMonths(d, months)) && !seeded.some((o) => o.seasonNumber === seasonNumber && inMonths(o.date, months))) continue;
          const scopeHold = detail.genres?.some((g) => g.id === 16) ? 'animation_scope_review' : null;
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
              scopeHold, genreIDs: (detail.genres ?? []).map((g) => g.id),
              dateHint: possible.length === 1 ? possible[0] : null,
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
    const report = await collectReleaseCandidates(createTmdbClient(fetch, process.env.TMDB_API_READ_ACCESS_TOKEN), { officialBindings });
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
