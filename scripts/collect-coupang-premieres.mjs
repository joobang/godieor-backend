#!/usr/bin/env node
// First-party work-scoped dates + cast identity. A recommendation is never a premiere proof.
import { ottSourceFailure } from './ott-source-diagnostics.mjs';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { SOURCE, parseCoupangNewsIndex } from './collect-coupangplay-kr-lineup.mjs';
import { createTmdbClient } from './tmdb-date-discovery.mjs';
import { configuredMonths } from './ott-schedule-window.mjs';
import { matchCast, normalizeName } from './ott-identity-evidence.mjs';

const require = createRequire(import.meta.url);
const { OttCandidatesRepository } = require('../dist/src/ott-candidates/ott-candidates.repository.js');
const { hash, merge, candidateId, applyReview, eligibility } = require('../dist/src/ott-candidates/domain/candidate.js');
const decode = s => s.replace(/&#(x[\da-f]+|\d+);/gi, (_, n) => String.fromCodePoint(n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n)))
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"');
const plain = s => decode(s.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
const validDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s;
const trusted = s => { const u = new URL(s); if (u.origin !== 'https://news.coupang.com' || !/^\/archives\/\d+\/$/.test(u.pathname) || u.search || u.hash) throw Error('UNTRUSTED_COUPANG_ARTICLE'); return u.href; };

export function parsePremiereArticle(html, sourceUrl) {
  trusted(sourceUrl);
  const canonical = /<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)/i.exec(html)?.[1];
  const publication = /<meta\b[^>]*property=["']article:published_time["'][^>]*content=["']([^"']+)/i.exec(html)?.[1];
  if (canonical !== sourceUrl || !/^20\d{2}-\d{2}-\d{2}T/.test(publication ?? '') ||
      !/<title>쿠팡플레이 금주의 추천작:/.test(html)) throw Error('COUPANG_ARTICLE_IDENTITY_CHANGED');
  const rows = [];
  for (const m of html.matchAll(/<p\b[^>]*class=["'][^"']*\bcpnr-intro\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/gi)) {
    const fields = new Map();
    for (const f of m[1].matchAll(/<strong\b[^>]*>([^<]+)<\/strong>([\s\S]*?)(?=<strong\b|$)/gi)) {
      const k = plain(f[1]); if (fields.has(k)) throw Error('COUPANG_DUPLICATE_FIELD'); fields.set(k, plain(f[2]));
    }
    const title = fields.get('제목'), release = fields.get('공개') ?? '';
    if (!title) continue;
    const season = /\s+시즌\s*(\d+)\s*$/.exec(title);
    const day = /^(?:(20\d{2})년\s*)?(\d{1,2})월\s*(\d{1,2})일(?:\(([월화수목금토일])\))?\s*(.*)$/.exec(release);
    let date = day ? `${day[1] ?? publication.slice(0, 4)}-${day[2].padStart(2, '0')}-${day[3].padStart(2, '0')}` : null;
    // Year context is allowed only within the article's calendar month. Never roll December into January.
    if (date && (!validDate(date) || !day[1] && date.slice(0, 7) !== publication.slice(0, 7) ||
        day[4] && '일월화수목금토'[new Date(date).getUTCDay()] !== day[4])) date = null;
    // Only the work's own release field can establish a first-premiere statement.
    const firstReleaseExplicit = Boolean(date && /(?:첫|최초)\s*공개/.test(day[5]) &&
      !/재공개|재방|예고편|티저|포스터|스틸|클립|미국|해외|극장/.test(release));
    rows.push({ title, searchTitle: season ? title.slice(0, season.index) : title, sourceUrl, publication,
      date, seasonNumber: season ? Number(season[1]) : null, releaseText: release,
      genre: fields.get('장르') ?? null, actors: (fields.get('출연') ?? '').split(',').map(s => s.trim()).filter(Boolean),
      firstReleaseExplicit, dateSemantics: !date ? 'unresolved' : firstReleaseExplicit ? 'explicit_first_premiere' :
        /부터\s*매주/.test(day[5]) ? 'platform_schedule_start' : 'platform_release_claim',
      yearContext: day?.[1] ? 'release_statement' : date ? 'same_article_calendar_month' : null });
  }
  if (!rows.length) throw Error('COUPANG_WORK_FIELDS_MISSING');
  return rows;
}

export async function identifyPremiere(item, request) {
  const matches = [], errors = [];
  for (const type of ['movie', 'tv']) {
    try {
      const result = await request(`/search/${type}`, { query: item.searchTitle, language: 'ko-KR', page: 1 });
      if (!Number.isInteger(result.total_pages) || result.total_pages < 0 || result.total_pages > 5) throw Error('SEARCH_INCOMPLETE');
      const hits = new Map((result.results ?? []).map(h => [h.id, h]));
      for (let page = 2; page <= result.total_pages; page++) {
        const next = await request(`/search/${type}`, { query: item.searchTitle, language: 'ko-KR', page });
        if (next.total_pages !== result.total_pages || next.page !== page) throw Error('SEARCH_PAGINATION_CHANGED');
        for (const hit of next.results ?? []) hits.set(hit.id, hit);
      }
      for (const hit of hits.values()) {
        if (![hit.name, hit.title, hit.original_name, hit.original_title].some(n => n && normalizeName(n) === normalizeName(item.searchTitle))) continue;
        if (!Number.isSafeInteger(hit.id) || hit.id < 1) throw Error('INVALID_TMDB_ID');
        if (type === 'movie' && item.seasonNumber !== null) continue;
        const detail = await request(`/${type}/${hit.id}`, { language: 'ko-KR' });
        if (detail.id !== hit.id || ![detail.name, detail.title, detail.original_name, detail.original_title].some(n => n && normalizeName(n) === normalizeName(item.searchTitle))) throw Error('TMDB_IDENTITY_CHANGED');
        const credits = await request(`/${type}/${hit.id}/${type === 'tv' ? 'aggregate_credits' : 'credits'}`, { language: 'ko-KR' });
        const identity = await matchCast(item.actors, credits.cast ?? [], request);
        if (!identity.complete) throw Error('CAST_LOOKUP_INCOMPLETE');
        if (identity.matchedPeople.length < 2) continue;
        if (type === 'tv') {
          // Missing season stays unknown; a single search result never implies season 1.
          if (!Number.isSafeInteger(item.seasonNumber) || item.seasonNumber < 1) continue;
          const season = await request(`/tv/${hit.id}/season/${item.seasonNumber}`, { language: 'ko-KR' });
          if (season.season_number !== item.seasonNumber || !validDate(season.air_date) ||
              season.episodes?.find(e => e.episode_number === 1)?.air_date !== season.air_date) throw Error('SEASON_FIRST_EPISODE_UNCONFIRMED');
        }
        const kind = detail.genres?.some(g => g.id === 16) ? 'animation' : detail.genres?.some(g => g.id === 99) ? 'documentary' :
          type === 'movie' ? 'movie' : item.genre === '예능' ? 'variety' : 'original_series';
        matches.push({ type, tmdbId: hit.id, seasonNumber: item.seasonNumber, contentKind: kind,
          matchedPeople: identity.matchedPeople, format: type === 'movie' ? 'movie' : 'series' });
      }
    } catch (e) { errors.push({ type, error: ottSourceFailure(e).errorCode }); }
  }
  const unique = [...new Map(matches.map(m => [`${m.type}:${m.tmdbId}:${m.seasonNumber}`, m])).values()];
  return { ...item, matches: unique, errors, eligible: item.firstReleaseExplicit && errors.length === 0 && unique.length === 1,
    holdReasons: [...(!item.firstReleaseExplicit ? ['first_release_not_explicit'] : []), ...(errors.length ? ['identity_lookup_incomplete'] : []),
      ...(unique.length !== 1 ? [unique.length ? 'ambiguous_identity' : 'identity_or_season_unconfirmed'] : [])] };
}

export async function collectPremieres(fetchImpl, request, months = configuredMonths()) {
  async function get(url) {
    const r = await fetchImpl(url, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw Error(`COUPANG_HTTP_${r.status}`);
    if (r.url && r.url !== url) throw Error('COUPANG_REDIRECT_HOST_CHANGED');
    return r.text();
  }
  const urls = parseCoupangNewsIndex(await get(SOURCE));
  const rows = [], errors = [];
  for (const url of urls) {
    try {
      for (const item of parsePremiereArticle(await get(url), url)) {
        if (item.date && months.includes(item.date.slice(0, 7))) rows.push(await identifyPremiere(item, request));
      }
    } catch (e) { errors.push({ sourceUrl: url, error: ottSourceFailure(e).errorCode }); }
  }
  // Conflicting observations of the same work remain held; never pick a date by recency.
  const groups = Map.groupBy(rows, r => JSON.stringify([normalizeName(r.title), r.seasonNumber]));
  for (const group of groups.values()) if (new Set(group.map(r => r.date)).size > 1) {
    for (const row of group) { row.eligible = false; row.holdReasons.push('conflicting_official_dates'); }
  }
  return { kind: 'coupang-official-premiere-review', referenceInputUsed: false, observedAt: new Date().toISOString(), months,
    sourceArticles: urls.length, rows, errors, complete: errors.length === 0 };
}

export async function stageAndReview(report, directory = 'work/ott-candidates', now = new Date().toISOString(), knownBindings = []) {
  if (report.kind !== 'coupang-official-premiere-review' || report.referenceInputUsed !== false || !report.complete || report.errors.length ||
      !Array.isArray(report.rows) || !Number.isFinite(Date.parse(report.observedAt)) ||
      Date.parse(now) - Date.parse(report.observedAt) > 3600000 || Date.parse(report.observedAt) > Date.parse(now) + 60000) throw Error('INCOMPLETE_OR_STALE_PREMIERE_REPORT');
  const repo = new OttCandidatesRepository(directory);
  return repo.transaction(async state => {
    let created = 0, approved = 0, preserved = 0, duplicateReviewed = 0;
    for (const [index, row] of report.rows.entries()) {
      const url = trusted(row.sourceUrl);
      const itemKey = `lineup:${hash(normalizeName(row.title))}`;
      const id = candidateId('coupang', url, itemKey);
      const old = state.candidates.find(c => c.id === id);
      if (old?.review) { preserved++; continue; }
      if (!old) created++;
      const lineupEvidence = { platform: 'coupang_play', title: row.title, date: row.date, market: 'KR', contentKind: 'unknown',
        seasonNumber: row.seasonNumber, premiereConfirmed: false, evidence: `공식 작품별 공개문구: ${row.releaseText}; ${row.yearContext}; 최초 공개 명시 ${row.firstReleaseExplicit}`,
        imageUrl: null, sourceItem: index + 1 };
      merge(state, [{ source: 'coupang', url, itemKey, headline: row.title, publishedRaw: null, publishedAt: null,
        contentHash: hash(JSON.stringify(lineupEvidence)), lineupEvidence }], now);
      if (!row.eligible || !row.firstReleaseExplicit || row.matches.length !== 1 || row.errors.length || row.holdReasons.length) continue;
      const candidate = state.candidates.find(c => c.id === id), match = row.matches[0];
      const identity = `TMDB ${match.type}/${match.tmdbId}`;
      const alreadyReviewed = state.candidates.some(c => c.id !== id && c.review &&
        c.review.value.platform === 'coupang_play' && c.review.value.seasonNumber === row.seasonNumber &&
        (c.review.value.evidence.includes(identity + ';') || c.review.value.evidence.includes(identity + ',') ||
         knownBindings.some(b => b.reviewCandidateId === c.id && b.platform === 'coupang_play' &&
           b.type === match.type && b.tmdbId === match.tmdbId && (b.seasonNumber ?? null) === row.seasonNumber)));
      if (alreadyReviewed) { duplicateReviewed++; continue; }
      const review = { id, revision: candidate.revisions.at(-1).token, reviewer: 'official-explicit-premiere-automation',
        title: row.title, platform: 'coupang_play', market: 'KR', contentKind: match.contentKind,
        ...(['animation', 'documentary'].includes(match.contentKind) ? { [`${match.contentKind}Format`]: match.format } : {}),
        premiereConfirmed: true, date: row.date, seasonNumber: row.seasonNumber, localTime: null, timeZone: null,
        announcedYear: Number(row.date.slice(0, 4)), announcedPeriod: null,
        evidence: `공식 작품별 첫 공개: ${row.releaseText}; ${url}; TMDB ${match.type}/${match.tmdbId}, 독립 인물 ${match.matchedPeople.map(p => p.tmdbPersonId).join(',')}`.slice(0, 500) };
      applyReview(state, review, now);
      if (eligibility(candidate).length) throw Error('PREMIERE_NOT_ELIGIBLE');
      approved++;
    }
    return { created, approved, preserved, duplicateReviewed, held: report.rows.filter(r => !r.eligible).length };
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const output = process.argv[2] ?? 'work/ott-lineups/coupang-premiere-review.json';
    const report = await collectPremieres(fetch, createTmdbClient(fetch, process.env.TMDB_API_READ_ACCESS_TOKEN));
    await mkdir(dirname(output), { recursive: true });
    await writeFile(`${output}.tmp`, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
    await rename(`${output}.tmp`, output);
    const known = JSON.parse(await readFile('data/curated/ott-official-tmdb-bindings-2026-11-13.json', 'utf8')).items;
    const staged = report.complete ? await stageAndReview(report, undefined, undefined, known) : null;
    const identityErrors = report.rows.flatMap(row => row.errors);
    const errorCodes = [...new Set([...report.errors, ...identityErrors].map(item => item.error))];
    console.log(JSON.stringify({ output, total: report.rows.length, sourceErrors: report.errors.length,
      identityErrors: identityErrors.length, ...staged, errorCodes }));
    if (!report.complete || report.rows.some(r => r.errors.length)) process.exitCode = 2;
  } catch (e) { console.error(JSON.stringify(ottSourceFailure(e))); process.exitCode = 1; }
}
