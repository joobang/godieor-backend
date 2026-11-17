#!/usr/bin/env node
// Recheck previously reviewed publications. Never approve a new claim or alter a review/DB row.
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { collectNetflixKrSchedule } from './collect-netflix-kr-schedule.mjs';
import { parseOfficialSource } from './official-ott-source.mjs';
import { parsePremiereArticle } from './collect-coupang-premieres.mjs';
import { configuredMonths } from './ott-schedule-window.mjs';
const require = createRequire(import.meta.url);
const { prepareReviewed } = require('../dist/src/reviewed-ott/domain/reviewed-mapping.js');
export const sha = s => createHash('sha256').update(s).digest('hex');
const reviewKey = r => JSON.stringify(Object.keys(r).sort().map(k => [k, r[k]]));
const norm = s => String(s ?? '').normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');
function date(value) {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value ?? '');
  if (!m) return null;
  const v = `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  return Number.isNaN(Date.parse(v)) || new Date(v).toISOString().slice(0, 10) !== v ? null : v;
}
function next(html) {
  const m = /<script\b(?=[^>]*\bid=["']__NEXT_DATA__["'])[^>]*>([\s\S]*?)<\/script>/i.exec(html);
  if (!m) throw Error('OFFICIAL_STRUCTURE_CHANGED');
  return JSON.parse(m[1]).props?.pageProps;
}
export function trustedUrl(value) {
  const u = new URL(value);
  if (u.protocol !== 'https:' || u.port || u.username || u.password || u.hash) throw Error('UNTRUSTED_OFFICIAL_URL');
  const allowed = u.hostname === 'www.netflix.com' && (/^\/kr\/title\/\d+$/.test(u.pathname) && !u.search ||
      /^\/title\/\d+$/.test(u.pathname) && u.searchParams.size === 1 && u.searchParams.get('locale') === 'ko-KR') ||
    u.hostname === 'about.netflix.com' && (u.pathname === '/ko/new-to-watch' && !u.search ||
      u.pathname === '/api/data/releases' && [...u.searchParams.keys()].every(k => ['language', 'country', 'page'].includes(k))) ||
    u.hostname === 'www.disneyplus.com' && /^\/ko-kr\/browse\/entity-[a-f0-9-]+$/.test(u.pathname) && !u.search ||
    u.hostname === 'www.tving.com' && /^\/contents\/P\d+$/.test(u.pathname) && !u.search ||
    u.hostname === 'news.coupang.com' && /^\/archives\/\d+\/$/.test(u.pathname) && !u.search;
  if (!allowed) throw Error('UNTRUSTED_OFFICIAL_URL');
  return u;
}
export function validateNetflixSnapshot(snapshot, now = Date.now(), months = configuredMonths()) {
  const stamp = Date.parse(snapshot?.observedAt);
  if (snapshot?.platform !== 'netflix' || snapshot.sourceUrl !== 'https://about.netflix.com/ko/new-to-watch' ||
      !Number.isFinite(stamp) || !/(?:Z|[+-]\d\d:\d\d)$/.test(snapshot.observedAt) || now - stamp > 3600000 || stamp > now + 60000 ||
      !Array.isArray(snapshot.items) || !snapshot.items.length || snapshot.items.some(r => r.market !== 'KR' || !date(r.date) || !months.includes(r.date.slice(0, 7))))
    throw Error('INVALID_OR_STALE_NETFLIX_SNAPSHOT');
  return snapshot;
}
export function validateBindings(batch, state, mappings, baselines, batchSha) {
  if (batch?.referenceInputUsed !== false || batch.reviewType !== 'implementer-manual-source-review-not-independent-approval' ||
      !Array.isArray(batch.additions) || !batch.additions.length || baselines?.version !== 1 || baselines.batchSha256 !== batchSha)
    throw Error('INVALID_OR_STALE_SOURCE_BINDINGS');
  prepareReviewed(mappings, state);
  const ids = new Set();
  for (const a of batch.additions) {
    const c = state.candidates.find(c => c.id === a.candidateId), r = c?.review?.value;
    const m = mappings.mappings.find(m => m.candidateId === a.candidateId);
    if (ids.has(a.candidateId) || !r || !m || r.revision !== a.revision || c.revisions.at(-1).token !== a.revision ||
        m.revision !== a.revision || m.eventKey !== a.mapping.eventKey || m.contentKey !== a.mapping.contentKey ||
        c.url !== a.sourceUrl || r.title !== a.title || r.platform !== a.platform || r.market !== 'KR' ||
        r.date !== a.date || r.seasonNumber !== a.seasonNumber || r.contentKind !== a.contentKind || !r.premiereConfirmed || reviewKey(r) !== reviewKey(a.review))
      throw Error('POSTED_REVIEW_BINDING_CHANGED');
    ids.add(a.candidateId);
    trustedUrl(a.platform === 'netflix' ? a.officialIdentity.requestedUrl : a.sourceUrl);
    if (a.platform === 'coupang_play') {
      const b = baselines.works.find(b => b.candidateId === a.candidateId);
      if (!b || !b.actors?.length || b.sourceTitle !== a.officialIdentity.sourceTitle || b.sourceSha256 !== a.sourceHashes[0] ||
          b.sourceSeasonNumber !== a.seasonNumber && (!b.cohortHeadingCue || b.cohortNumber !== a.seasonNumber))
        throw Error('MISSING_CURATED_IDENTITY_BASELINE');
    }
  }
}
export function checkNetflix(a, page, schedule, months) {
  const items = [...page.html.matchAll(/<script\b(?=[^>]*\btype=["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/gi)]
    .flatMap(m => { const x = JSON.parse(m[1]); return Array.isArray(x) ? x : [x]; });
  const works = items.filter(w => ['Movie', 'TVSeries'].includes(w['@type']));
  if (works.length !== 1) return { status: 'identity_changed' };
  const w = works[0], expected = a.officialIdentity;
  const boundId = /^https:\/\/www\.netflix\.com\/kr\/title\/(\d+)$/.exec(expected.canonicalUrl)?.[1];
  const final = trustedUrl(page.finalUrl);
  const boundFinal = boundId && final.hostname === 'www.netflix.com' &&
    (final.pathname === `/kr/title/${boundId}` || final.pathname === `/title/${boundId}` && final.searchParams.get('locale') === 'ko-KR');
  if (w.url !== expected.canonicalUrl || !boundFinal || norm(w.name) !== norm(a.title) || w['@type'] !== expected.format)
    return { status: 'identity_changed' };
  const observedDate = date(w.dateCreated);
  if (observedDate !== a.date) return { status: 'date_changed', observedDate };
  if (!months.includes(a.date.slice(0, 7))) return { status: 'matched', observedDate, evidenceScope: 'catalog_first_date_only_historical_kr_review_retained' };
  if (!schedule.lineup) return { status: 'schedule_lookup_failed', observedDate };
  const matches = schedule.lineup.items.filter(r => /Netflix videoID (\d+)/.exec(r.evidence)?.[1] === String(expected.videoId));
  if (matches.length !== 1 || matches[0].market !== 'KR' || norm(matches[0].title) !== norm(a.title)) return { status: 'current_kr_listing_missing_or_ambiguous', observedDate };
  if (matches[0].date !== a.date) return { status: 'date_changed', observedDate: matches[0].date, catalogDate: observedDate };
  return { status: 'matched', observedDate, evidenceScope: 'kr_schedule_and_bound_catalog_first_date' };
}
export function checkDisney(a, html) {
  const p = next(html), cs = p?.stitchDocument?.mainContent ?? [];
  if (p?.region !== 'kr' || p.language !== 'ko' || p.pathname !== new URL(a.sourceUrl).pathname.replace(/^\/ko-kr/, '')) return { status: 'identity_or_region_changed' };
  const heroes = cs.filter(c => c._type === 'DetailEntityHero');
  if (heroes.length !== 1) return { status: 'identity_changed' };
  const h = heroes[0], metadata = cs.find(c => c._type === 'Metadata');
  const works = (metadata?.ldJSON?.['@graph'] ?? []).filter(w => ['Movie', 'TVSeries'].includes(w['@type']));
  const title = h.titleVisual?.alt ?? metadata?.title?.split(' | ')[0];
  if (norm(title) !== norm(a.title) || works.length !== 1 || works[0]['@type'] !== a.officialIdentity.format || h.isReplayTitle !== false)
    return { status: 'identity_or_format_changed' };
  if (a.contentKind === 'animation' && !h.genres?.some(g => g.includes('애니메이션'))) return { status: 'classification_changed' };
  const m = /^(20\d{2})년\s*(\d+)월\s*(\d+)일,\s*디즈니\+에서\s*(?:시즌\s*(\d+)\s*)?공개$/.exec(h.promotion ?? '');
  if (!m) return { status: 'explicit_platform_date_missing' };
  const observedDate = date(`${m[1]}-${m[2]}-${m[3]}`), observedSeason = m[4] ? Number(m[4]) : null;
  return { status: observedDate !== a.date ? 'date_changed' : observedSeason !== a.seasonNumber ? 'season_changed' : 'matched', observedDate, observedSeason,
    evidenceScope: 'kr_entity_explicit_platform_promotion' };
}
export function checkTving(a, html) {
  let p;
  try { p = parseOfficialSource({ platform: a.platform, sourceUrl: a.sourceUrl, title: a.title, date: a.date, seasonNumber: a.seasonNumber }, html); }
  catch (e) { if (e.message === 'TVING_IDENTITY_CHANGED') return { status: 'identity_or_format_changed' }; throw e; }
  if (p.sourceIdentity?.programCode !== a.officialIdentity.programCode || norm(p.sourceWork?.title) !== norm(a.title) || p.sourceWork?.category !== '드라마')
    return { status: 'identity_or_format_changed' };
  const claims = p.sourceClaims;
  if (claims.length !== 1) return { status: 'explicit_platform_date_missing_or_ambiguous' };
  return { status: claims[0].date !== a.date ? 'date_changed' : claims[0].seasonNumber !== a.seasonNumber ? 'season_changed' : 'matched',
    observedDate: claims[0].date, observedSeason: claims[0].seasonNumber, evidenceScope: 'bound_program_explicit_open_text' };
}
export function workHeading(html, title) {
  const text = value => value.replace(/<[^>]*>/g, ' ').replace(/&#(x[\da-f]+|\d+);/gi, (_, n) =>
    String.fromCodePoint(n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n)))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  const intros = [...html.matchAll(/<p\b[^>]*class=["'][^"']*\bcpnr-intro\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/gi)]
    .filter(m => {
      const field = /<strong\b[^>]*>\s*제목\s*<\/strong>([\s\S]*?)(?=<br\b|<strong\b|$)/i.exec(m[1]);
      return field && norm(text(field[1])) === norm(title);
    });
  if (intros.length !== 1) return null;
  const headings = [...html.slice(0, intros[0].index).matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi)];
  return headings.length ? text(headings.at(-1)[1]) : null;
}
export function checkCoupang(a, html, baseline) {
  const rows = parsePremiereArticle(html, a.sourceUrl).filter(r => r.title === baseline.sourceTitle);
  if (rows.length !== 1) return { status: 'identity_missing_or_ambiguous' };
  const r = rows[0], actors = x => [...new Set(x.map(norm))].sort();
  if (JSON.stringify(actors(r.actors)) !== JSON.stringify(actors(baseline.actors))) return { status: 'identity_evidence_changed' };
  if (r.date !== a.date) return { status: 'date_changed', observedDate: r.date };
  if (r.seasonNumber !== baseline.sourceSeasonNumber) return { status: 'season_changed', observedSeason: r.seasonNumber };
  if (r.releaseText !== baseline.releaseText) return { status: 'release_statement_changed', observedDate: r.date };
  if (baseline.sourceSeasonNumber !== a.seasonNumber && (!baseline.cohortHeadingCue || baseline.cohortNumber !== a.seasonNumber))
    return { status: 'cohort_evidence_missing' };
  if (baseline.cohortHeadingCue && !norm(workHeading(html, baseline.sourceTitle)).includes(norm(baseline.cohortHeadingCue)))
    return { status: 'cohort_evidence_changed' };
  // A curated cohort must still be explicit in this work's own heading, never another work or season count.
  return { status: 'matched', observedDate: r.date, observedSeason: a.seasonNumber, evidenceScope: 'bound_article_work_fields_and_curated_identity' };
}
export async function recheckSources(batch, { fetchImpl = fetch, baselines, months = configuredMonths(), checkedAt = new Date().toISOString(), netflixSnapshot = null, retryDelayMs = 500 } = {}) {
  const cache = new Map();
  let transportRetries = 0;
  const pause = attempt => new Promise(resolve => setTimeout(resolve, retryDelayMs * (attempt + 1)));
  async function request(url, options) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const r = await fetchImpl(url, { ...options, redirect: 'manual', signal: AbortSignal.timeout(15000) });
        if (r.status >= 500 && attempt < 2) {
          if (r.body) await r.body.cancel().catch(() => {});
          transportRetries++; await pause(attempt); continue;
        }
        return r;
      } catch (e) {
        if (attempt === 2 || !['TypeError', 'TimeoutError', 'AbortError'].includes(e.name)) throw e;
        transportRetries++; await pause(attempt);
      }
    }
  }
  async function trustedFetch(input, options = {}) {
    let url = trustedUrl(String(input)).href;
    const origin = new URL(url).origin;
    for (let n = 0; n < 4; n++) {
      const r = await request(url, options);
      if (r.url && trustedUrl(r.url).origin !== origin) throw Error('OFFICIAL_REDIRECT_HOST_CHANGED');
      if (![301, 302, 303, 307, 308].includes(r.status)) return r;
      const target = r.headers.get('location'); if (!target) throw Error('OFFICIAL_REDIRECT_INVALID');
      url = trustedUrl(new URL(target, url).href).href;
      if (new URL(url).origin !== origin) throw Error('OFFICIAL_REDIRECT_HOST_CHANGED');
    }
    throw Error('OFFICIAL_REDIRECT_LIMIT');
  }
  async function read(url) {
    if (!cache.has(url)) cache.set(url, (async () => {
      const r = await trustedFetch(url);
      if (!r.ok) throw Error(`OFFICIAL_HTTP_${r.status}`);
      const html = await r.text(); if (html.length > 6_000_000) throw Error('OFFICIAL_RESPONSE_TOO_LARGE');
      return { html, finalUrl: r.url || url, sourceSha256: sha(html) };
    })());
    return cache.get(url);
  }
  let schedule = {};
  if (batch.additions.some(a => a.platform === 'netflix' && months.includes(a.date.slice(0, 7)))) {
    try { schedule = netflixSnapshot ? { lineup: validateNetflixSnapshot(netflixSnapshot, Date.parse(checkedAt), months), evidenceOrigin: 'same_pipeline_snapshot' } :
      { ...await collectNetflixKrSchedule(trustedFetch, { months }), evidenceOrigin: 'live_collection' }; } catch (e) { schedule = { error: e.message }; }
  }
  const rows = [];
  for (let i = 0; i < batch.additions.length; i += 4) await Promise.all(batch.additions.slice(i, i + 4).map(async a => {
    const sourceUrl = a.platform === 'netflix' ? a.officialIdentity.requestedUrl : a.sourceUrl;
    let observation, sourceSha256 = null;
    try {
      const page = await read(sourceUrl); sourceSha256 = page.sourceSha256;
      observation = a.platform === 'netflix' ? checkNetflix(a, page, schedule, months) : a.platform === 'disney_plus' ? checkDisney(a, page.html) :
        a.platform === 'tving' ? checkTving(a, page.html) : a.platform === 'coupang_play' ? checkCoupang(a, page.html, baselines.works.find(b => b.candidateId === a.candidateId)) : { status: 'unsupported_source' };
    } catch (e) { observation = { status: 'lookup_failed', error: e.message }; }
    rows.push({ candidateId: a.candidateId, eventKey: a.mapping.eventKey, title: a.title, platform: a.platform, sourceUrl,
      expectedDate: a.date, expectedSeason: a.seasonNumber, checkedAt, sourceSha256, ...observation });
  }));
  rows.sort((a, b) => a.eventKey.localeCompare(b.eventKey));
  return { kind: 'posted-official-source-recheck', referenceInputUsed: false, checkedAt, total: rows.length,
    matched: rows.filter(r => r.status === 'matched').length, gaps: rows.filter(r => r.status !== 'matched').length,
    statusCounts: Object.fromEntries([...new Set(rows.map(r => r.status))].sort().map(s => [s, rows.filter(r => r.status === s).length])),
    scheduleError: schedule.error ?? null, netflixScheduleEvidenceOrigin: schedule.evidenceOrigin ?? null,
    netflixScheduleSha256: schedule.lineup ? sha(JSON.stringify(schedule.lineup)) : null, transportRetries, publishingAllowed: false, reviewsModified: 0, rows };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const [batchFile = 'data/curated/ott-source-reviewed-batch-2026-11-16.json', output = 'work/ott-lineups/posted-source-recheck.json', netflixFile] = process.argv.slice(2);
    const batchRaw = await readFile(batchFile, 'utf8'), batch = JSON.parse(batchRaw);
    const [state, mappings, baselines] = await Promise.all(['work/ott-candidates/state.json', 'data/curated/ott-reviewed-mappings.json',
      'data/curated/ott-source-refresh-bindings-2026-11-17.json'].map(async p => JSON.parse(await readFile(p, 'utf8'))));
    validateBindings(batch, state, mappings, baselines, sha(batchRaw));
    const report = { ...await recheckSources(batch, { baselines, netflixSnapshot: netflixFile ? JSON.parse(await readFile(netflixFile, 'utf8')) : null }), batchSha256: sha(batchRaw),
      bindingDigest: sha(JSON.stringify(batch.additions.map(a => [a.candidateId, a.revision, a.mapping.contentKey, a.mapping.eventKey, sha(reviewKey(a.review))]))) };
    await mkdir(dirname(output), { recursive: true });
    const temporary = `${output}.${process.pid}.tmp`;
    await writeFile(temporary, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    await rename(temporary, output);
    console.log(JSON.stringify({ output, total: report.total, matched: report.matched, gaps: report.gaps, statusCounts: report.statusCounts, reviewsModified: 0 }));
    if (report.gaps) process.exitCode = 2;
  } catch (e) { console.error('POSTED_SOURCE_RECHECK_FAILED:', e.message); process.exitCode = 1; }
}
