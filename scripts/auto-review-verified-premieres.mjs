#!/usr/bin/env node
// Promote only previously verified, freshly rechecked first-party KR premieres.
// A source schedule, TMDB date, or a title match alone cannot authorize posting.
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { OttCandidatesRepository } = require('../dist/src/ott-candidates/ott-candidates.repository.js');
const { applyReview, eligibility } = require('../dist/src/ott-candidates/domain/candidate.js');

export function verifiedReviewProposals(report, state) {
  if (report?.kind !== 'tmdb-first-ott-release-review' || report.referenceInputUsed !== false ||
      !Array.isArray(report.rows)) throw Error('INVALID_TMDB_REPORT');
  const candidates = new Map(state.candidates.map((c) => [c.id, c]));
  const proposals = new Map(), rejected = [];
  for (const row of report.rows) {
    if (!row.readyForBatchReview || row.scopeHold || row.tmdbDateConflict ||
        !['movie', 'tv'].includes(row.type) || !Number.isSafeInteger(row.tmdbId)) continue;
    for (const binding of row.officialEvidence ?? []) {
      const candidate = candidates.get(binding.reviewCandidateId);
      if (!candidate || candidate.review) continue;
      const current = candidate.revisions.at(-1);
      const source = current?.lineupEvidence;
      // Independently confirm the binding points to this source's dated item.
      // Previously verified bindings are curator evidence, not TMDB guesses.
      const good = binding.identityVerified === true && binding.premiereConfirmed === true &&
        binding.sourceRefreshStatus === 'matched' && binding.market === 'KR' &&
        binding.platform === row.platform && binding.date === row.officialPlatformDate &&
        binding.title === row.title && binding.sourceUrl === candidate.url &&
        binding.type === row.type && binding.tmdbId === row.tmdbId &&
        (binding.seasonNumber ?? null) === (row.seasonNumber ?? null) &&
        source?.market === 'KR' && source.platform === row.platform &&
        source.title === binding.title && source.date === binding.date &&
        (source.seasonNumber === null || source.seasonNumber === row.seasonNumber) &&
        ((row.type === 'movie' && row.seasonNumber === null) ||
          (row.type === 'tv' && Number.isSafeInteger(row.seasonNumber) && row.seasonNumber > 0));
      if (!good) { rejected.push({ candidateId: candidate.id, reason: 'identity_or_first_release_not_verified' }); continue; }
      const contentKind = row.suggestedContentKind === 'animation' ? 'animation' :
        row.suggestedContentKind === 'documentary' ? 'documentary' :
        row.type === 'movie' ? 'movie' : ['drama', 'variety', 'original_series'].includes(source.contentKind)
          ? source.contentKind : 'original_series';
      const format = row.type === 'movie' ? 'movie' : 'series';
      const review = {
        id: candidate.id, revision: current.token, reviewer: 'verified-official-tmdb-automation',
        title: binding.title, platform: binding.platform, market: 'KR', contentKind,
        ...(contentKind === 'animation' ? { animationFormat: format } : {}),
        ...(contentKind === 'documentary' ? { documentaryFormat: format } : {}),
        premiereConfirmed: true, date: binding.date, localTime: null, timeZone: null,
        seasonNumber: row.seasonNumber ?? null, announcedYear: Number(binding.date.slice(0, 4)),
        announcedPeriod: null,
        evidence: `검증된 공식 첫 공개 근거: ${binding.evidence}; TMDB ${row.type}/${row.tmdbId}; 원문 재확인 ${binding.sourceCheckedAt ?? '날짜 미기록'}`.slice(0, 500),
      };
      if (proposals.has(candidate.id)) {
        proposals.delete(candidate.id);
        rejected.push({ candidateId: candidate.id, reason: 'ambiguous_multiple_bindings' });
      } else if (!rejected.some((r) => r.candidateId === candidate.id)) proposals.set(candidate.id, review);
    }
  }
  return { proposals: [...proposals.values()], rejected };
}

export async function autoReviewVerified(reportPath, directory = 'work/ott-candidates', now = new Date().toISOString()) {
  const report = JSON.parse(await readFile(reportPath, 'utf8'));
  const repo = new OttCandidatesRepository(directory);
  return repo.transaction(async (state) => {
    const { proposals, rejected } = verifiedReviewProposals(report, state);
    let approved = 0;
    for (const review of proposals) {
      const candidate = state.candidates.find((c) => c.id === review.id);
      try {
        applyReview(state, review, now);
        if (eligibility(candidate).length) throw Error('NOT_ELIGIBLE');
        approved++;
      } catch (error) {
        candidate.review = null;
        rejected.push({ candidateId: candidate.id, reason: error.message });
      }
    }
    return { approved, rejected, previouslyReviewed: state.candidates.filter((c) => c.review).length };
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  autoReviewVerified(process.argv[2] ?? 'work/tmdb-release-candidates/latest.json', process.argv[3])
    .then((result) => console.log(JSON.stringify(result)))
    .catch((error) => { console.error('AUTO_REVIEW_FAILED:', error.message); process.exitCode = 1; });
}
