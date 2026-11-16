#!/usr/bin/env node
// Bring individual official TVING programme evidence into the durable reviewed-publish queue.
// A schedule claim alone does not establish a Korean OTT *first* release.
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { OttCandidatesRepository } = require('../dist/src/ott-candidates/ott-candidates.repository.js');
const { canonicalUrl, hash, merge, candidateId } = require('../dist/src/ott-candidates/domain/candidate.js');

export function tvingDiscoveries(report) {
  if (report?.kind !== 'tving-official-upcoming-review' || !Array.isArray(report.rows) ||
      report.errors?.length || report.rows.length !== report.totalPrograms) throw Error('INCOMPLETE_TVING_REPORT');
  const seen = new Set();
  return report.rows.map((row, index) => {
    const url = canonicalUrl('tving', row.sourceUrl);
    if (seen.has(url)) throw Error('DUPLICATE_TVING_PROGRAM');
    seen.add(url);
    if (typeof row.title !== 'string' || !row.title.trim()) throw Error('INVALID_TVING_TITLE');
    const claims = row.sourceClaims ?? [];
    if (!Array.isArray(claims)) throw Error('INVALID_TVING_CLAIMS');
    const claim = claims.length === 1 ? claims[0] : null;
    const date = claim?.date ?? null;
    if (date !== null && (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      new Date(date + 'T00:00:00Z').toISOString().slice(0, 10) !== date)) throw Error('INVALID_TVING_DATE');
    const kind = row.sourceIdentity?.movieCode ? 'movie' : row.sourceWork?.category === '드라마' ? 'drama' :
      row.sourceWork?.category === '예능' ? 'variety' : 'other';
    const seasonNumber = Number.isInteger(claim?.seasonNumber) && claim.seasonNumber > 0 ? claim.seasonNumber : null;
    const matches = row.matches ?? [];
    if (!Array.isArray(matches)) throw Error('INVALID_TMDB_MATCHES');
    // Keep TMDB identity as a hint; the curator still verifies date semantics and first premiere.
    const tmdb = matches.map((m) => ({ id: m.tmdbId, season: m.seasonNumber, method: m.identityMethod }));
    const evidence = `TVING 공식 프로그램 ${url} 공개 주장 ${date ?? '날짜 없음'}. TMDB 식별 ${JSON.stringify(tmdb)}. 상태 ${row.status}. OTT 최초 공개는 별도 검토 필요.`;
    const lineupEvidence = {
      platform: 'tving', title: row.title, date, market: 'KR', contentKind: kind,
      seasonNumber, premiereConfirmed: false, evidence, imageUrl: null, sourceItem: index + 1,
    };
    return { source: 'tving', url, headline: row.title, publishedRaw: null,
      publishedAt: null, lineupEvidence, contentHash: hash(JSON.stringify({ lineupEvidence, tmdb })) };
  });
}

export async function bridgeTvingUpcoming(filename, directory, now = new Date().toISOString()) {
  const report = JSON.parse(await readFile(filename, 'utf8'));
  const discoveries = tvingDiscoveries(report);
  const repository = new OttCandidatesRepository(directory);
  return repository.transaction(async (state) => {
    const existing = new Map(state.candidates.map((c) => [c.id, {
      reviewed: Boolean(c.review), hash: c.revisions.at(-1).hash,
    }]));
    // Preserve already-reviewed revisions and published mappings. A later official
    // schedule observation must not silently erase the review of a programme.
    const safe = discoveries.filter((d) => !existing.get(candidateId(d.source, d.url))?.reviewed);
    const preservedReviewed = discoveries.length - safe.length;
    merge(state, safe, now);
    return {
      sourceRows: discoveries.length,
      created: safe.filter((d) => !existing.has(candidateId(d.source, d.url))).length,
      revised: safe.filter((d) => existing.has(candidateId(d.source, d.url)) &&
        existing.get(candidateId(d.source, d.url)).hash !== d.contentHash).length,
      preservedReviewed, published: 0,
      requiresFirstReleaseReview: safe.length,
    };
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [filename, directory = 'work/ott-candidates'] = process.argv.slice(2);
  if (!filename) { console.error('Usage: node scripts/bridge-tving-upcoming.mjs report.json [candidate-directory]'); process.exitCode = 1; }
  else {
    try { console.log(JSON.stringify(await bridgeTvingUpcoming(filename, directory))); }
    catch (e) { console.error('TVING_BRIDGE_FAILED:', e.message); process.exitCode = 1; }
  }
}
