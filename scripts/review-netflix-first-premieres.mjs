#!/usr/bin/env node
// New first releases require two fresh first-party observations. No TMDB date inference.
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { netflixDiscoveries } from './bridge-netflix-lineup.mjs';
import { trustedUrl, validateNetflixSnapshot, sha } from './recheck-posted-official-sources.mjs';
const require = createRequire(import.meta.url);
const { OttCandidatesRepository } = require('../dist/src/ott-candidates/ott-candidates.repository.js');
const { candidateId, applyReview, eligibility } = require('../dist/src/ott-candidates/domain/candidate.js');
const norm = v => String(v ?? '').normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');
const excluded = /보너스|플레이리스트|예고편|스페셜\s*룩|\b(?:WWE|NFL|game|trailer|bonus|playlist)\b/i;
const normalizedDate = v => {
  const m = /^(20\d\d)-(\d{1,2})-(\d{1,2})$/.exec(v ?? '');
  if (!m) return null;
  const d = `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  return Number.isFinite(Date.parse(d)) && new Date(d).toISOString().slice(0,10) === d ? d : null;
};

export function inspectCatalog(item, page) {
  if (excluded.test(item.title)) return { status: 'excluded_non_premiere' };
  const final = trustedUrl(page.finalUrl);
  if (final.hostname !== 'www.netflix.com') throw Error('CATALOG_WRONG_HOST');
  const records = [...page.html.matchAll(/<script\b(?=[^>]*\btype=["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/gi)]
    .flatMap(m => { const x = JSON.parse(m[1]); return Array.isArray(x) ? x : [x]; });
  const works = records.filter(x => ['Movie', 'TVSeries'].includes(x?.['@type']));
  if (works.length !== 1) return { status: 'work_missing_or_ambiguous' };
  const w = works[0];
  const canonicalId = /^https:\/\/www\.netflix\.com\/kr\/title\/(\d+)$/.exec(w.url)?.[1];
  if (!canonicalId || norm(w.name) !== norm(item.title) ||
      !(final.pathname === `/kr/title/${canonicalId}` || final.pathname === `/title/${canonicalId}` && final.searchParams.get('locale') === 'ko-KR'))
    return { status: 'identity_or_region_mismatch' };
  const identity = { canonicalId, canonicalUrl: w.url, format: w['@type'], catalogDate: normalizedDate(w.dateCreated) };
  if (!identity.catalogDate) return { ...identity, status: 'first_date_missing' };
  if (identity.catalogDate !== item.date) return { ...identity, status: 'not_series_or_movie_first_date' };
  const genres = Array.isArray(w.genre) ? w.genre : typeof w.genre === 'string' ? [w.genre] : [];
  if (!genres.length || genres.some(g => typeof g !== 'string')) return { ...identity, status: 'classification_missing' };
  if (genres.some(g => /스포츠|게임|sports|video games/i.test(g))) return { ...identity, status: 'excluded_non_premiere' };
  const animation = genres.some(g => /애니메이션/.test(g));
  const documentary = genres.some(g => /다큐멘터리/.test(g));
  if (animation && documentary) return { ...identity, status: 'classification_ambiguous' };
  const contentKind = animation ? 'animation' : documentary ? 'documentary' : w['@type'] === 'Movie' ? 'movie' :
    genres.some(g => /드라마/.test(g)) ? 'drama' : genres.some(g => /리얼리티|버라이어티/.test(g)) ? 'variety' : 'original_series';
  return { ...identity, status: 'verified_first_premiere', contentKind,
    ...(animation ? { animationFormat: w['@type'] === 'Movie' ? 'movie' : 'series' } : {}),
    ...(documentary ? { documentaryFormat: w['@type'] === 'Movie' ? 'movie' : 'series' } : {}),
    seasonNumber: null };
}

export async function readCatalog(videoId, fetchImpl = fetch, retryDelayMs = 300) {
  const requestedUrl = `https://www.netflix.com/kr/title/${videoId}`;
  let url = requestedUrl;
  for (let redirects = 0; redirects < 4; redirects++) {
    const u = trustedUrl(url);
    if (u.hostname !== 'www.netflix.com') throw Error('CATALOG_REDIRECT_HOST_CHANGED');
    let response;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await fetchImpl(url, { redirect: 'manual', signal: AbortSignal.timeout(15000),
          headers: { 'user-agent': 'Mozilla/5.0 (compatible; GODIEOR/1.0)' } });
        if (response.url && response.url !== url) throw Error('UNEXPECTED_AUTOMATIC_REDIRECT');
        if (response.status < 500 || attempt === 2) break;
        await response.body?.cancel();
      } catch (e) {
        if (attempt === 2 || !['TypeError', 'TimeoutError', 'AbortError'].includes(e.name)) throw e;
      }
      await new Promise(r => setTimeout(r, retryDelayMs * (attempt + 1)));
    }
    if ([301,302,303,307,308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) throw Error('CATALOG_REDIRECT_INVALID');
      const target = trustedUrl(new URL(location, url).href);
      if (target.hostname !== 'www.netflix.com') throw Error('CATALOG_REDIRECT_HOST_CHANGED');
      url = target.href; continue;
    }
    if (!response.ok) throw Error(`CATALOG_HTTP_${response.status}`);
    const html = await response.text();
    if (html.length > 6_000_000) throw Error('CATALOG_RESPONSE_TOO_LARGE');
    return { requestedUrl, finalUrl: url, html, sourceSha256: sha(html) };
  }
  throw Error('CATALOG_REDIRECT_LIMIT');
}

export function applyObservations(state, rows, now) {
  const outcomes = [];
  for (const row of rows) {
    const candidate = state.candidates.find(c => c.id === row.candidateId);
    const latest = candidate?.revisions.at(-1);
    if (!candidate || latest?.token !== row.revision || candidate.itemKey !== `netflix-video:${row.videoId}` ||
        candidate.url !== 'https://about.netflix.com/ko/new-to-watch' || candidate.source !== 'netflix') {
      outcomes.push({ ...row, status: 'candidate_changed_or_missing' }); continue;
    }
    if (candidate.review) { outcomes.push({ ...row, status: 'existing_review_preserved', observationStatus: row.status }); continue; }
    if (latest.lineupEvidence?.platform !== 'netflix' || latest.lineupEvidence?.date !== row.date || norm(latest.lineupEvidence?.title) !== norm(row.title) || latest.lineupEvidence?.market !== 'KR') {
      outcomes.push({ ...row, status: 'candidate_changed_or_missing' }); continue;
    }
    if (row.status !== 'verified_first_premiere') { outcomes.push(row); continue; }
    // Blocking a title collision is conservative; it never merges identity by title.
    const existing = state.candidates.some(c => c.review?.value.platform === 'netflix' &&
      (norm(c.review.value.title) === norm(row.title) || c.review.value.evidence.includes(row.canonicalUrl)));
    const aliases = rows.filter(other => other.canonicalId === row.canonicalId && other.candidateId !== row.candidateId);
    if (existing || aliases.length) { outcomes.push({ ...row, status: 'existing_or_ambiguous_identity' }); continue; }
    const review = { id: candidate.id, revision: latest.token, reviewer: 'official-netflix-first-premiere-automation',
      title: row.title, platform: 'netflix', market: 'KR', contentKind: row.contentKind,
      ...(row.animationFormat ? { animationFormat: row.animationFormat } : {}),
      ...(row.documentaryFormat ? { documentaryFormat: row.documentaryFormat } : {}),
      premiereConfirmed: true, date: row.date, localTime: null, timeZone: null, seasonNumber: null,
      announcedYear: Number(row.date.slice(0,4)), announcedPeriod: null,
      evidence: `Netflix KR 공식 일정 videoID ${row.videoId} ${row.date}; ${row.canonicalUrl}; 동일 작품 제목/${row.format}/dateCreated ${row.catalogDate} 대조; 시즌 추정 없음`.slice(0,500) };
    try {
      applyReview(state, review, now);
      if (eligibility(candidate).length) throw Error('NOT_ELIGIBLE');
      outcomes.push({ ...row, status: 'new_review_created' });
    } catch (e) {
      candidate.review = null;
      outcomes.push({ ...row, status: 'review_rejected', error: e.message });
    }
  }
  return outcomes;
}

export async function reviewNetflixPremieres(snapshot, { directory = 'work/ott-candidates', fetchImpl = fetch,
  now = new Date().toISOString(), apply = false, repository = new OttCandidatesRepository(directory), months } = {}) {
  validateNetflixSnapshot(snapshot, Date.parse(now), months);
  const discoveries = netflixDiscoveries(snapshot);
  const state = await repository.readState();
  const rows = [];
  for (let i = 0; i < discoveries.length; i += 4) await Promise.all(discoveries.slice(i,i+4).map(async d => {
    const id = candidateId(d.source, d.url, d.itemKey), c = state.candidates.find(c => c.id === id);
    const row = { candidateId: id, revision: c?.revisions.at(-1)?.token ?? null, videoId: d.itemKey.slice('netflix-video:'.length),
      title: d.lineupEvidence.title, date: d.lineupEvidence.date, checkedAt: now };
    if (excluded.test(row.title)) { rows.push({ ...row, status: 'excluded_non_premiere' }); return; }
    try { const page = await readCatalog(row.videoId, fetchImpl); rows.push({ ...row, ...inspectCatalog(row,page),
      requestedUrl: page.requestedUrl, finalUrl: page.finalUrl, sourceSha256: page.sourceSha256 }); }
    catch (e) { rows.push({ ...row, status: 'lookup_failed', error: e.message }); }
  }));
  rows.sort((a,b) => a.candidateId.localeCompare(b.candidateId));
  const outcomes = apply ? await repository.transaction(async current => applyObservations(current,rows,now)) : applyObservations(structuredClone(state),rows,now);
  const statusCounts = Object.fromEntries([...new Set(outcomes.map(r => r.status))].sort().map(k => [k,outcomes.filter(r => r.status === k).length]));
  return { kind: 'netflix-first-premiere-review', referenceInputUsed: false, checkedAt: now, applied: apply,
    scheduleSha256: sha(JSON.stringify(snapshot)), total: rows.length,
    newReviews: outcomes.filter(r => r.status === 'new_review_created').length,
    errors: outcomes.filter(r => ['lookup_failed','review_rejected','candidate_changed_or_missing'].includes(r.status) || r.observationStatus === 'lookup_failed').length,
    statusCounts, rows: outcomes };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const [input, output = 'work/ott-lineups/netflix-first-premiere-review.json'] = process.argv.slice(2).filter(a => !a.startsWith('--'));
    if (!input) throw Error('NETFLIX_SNAPSHOT_REQUIRED');
    const report = await reviewNetflixPremieres(JSON.parse(await readFile(input,'utf8')), { apply: process.argv.includes('--apply') });
    await mkdir(dirname(output),{recursive:true});
    const temporary = `${output}.${process.pid}.tmp`;
    await writeFile(temporary,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600}); await rename(temporary,output);
    console.log(JSON.stringify({output,total:report.total,newReviews:report.newReviews,errors:report.errors,statusCounts:report.statusCounts,applied:report.applied}));
    if (report.errors) process.exitCode=2;
  } catch(e) { console.error('NETFLIX_FIRST_PREMIERE_REVIEW_FAILED:',e.message); process.exitCode=1; }
}
