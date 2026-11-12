import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyReviewBacklog } from '../scripts/classify-ott-review-backlog.mjs';

// Synthetic examples, independent of the observed Netflix report.
const item = { title: '가상 작품', date: '2026-11-10', market: 'KR', seasonNumber: null };
function run(tmdb, reviews = [], overrides = {}) {
  const entry = { ...item, ...overrides };
  return classifyReviewBacklog({ platform: 'netflix', sourceUrl: 'https://example.test/synthetic', items: [entry] },
    { kind: 'official-first-tmdb-review', rows: [{ platform: 'netflix', ...entry, tmdb }] },
    { kind: 'reviewed-mapping-snapshot', rows: reviews });
}
const match = (date) => ({ type: 'movie', tmdbId: 1, dateMatches: false, dates: { movieReleaseDate: date } });

test('earlier/later/mixed candidate dates remain review hints without publication', () => {
  for (const [dates, reason] of [
    [['2020-01-01'], 'candidate_dates_before_listing'],
    [['2026-12-01'], 'candidate_dates_after_listing'],
    [['2020-01-01', '2026-12-01'], 'candidate_dates_mixed_or_unresolved'],
  ]) {
    const result = run({ status: 'date_mismatch', matches: dates.map(match) });
    assert.equal(result.rows[0].reason, reason);
    assert.equal(result.rows[0].eligibleForAutomaticPublication, false);
    assert.equal(result.publishedCountDelta, 0);
    assert.equal(result.databaseQueried, false);
  }
});
test('not-found is distinct from failed, truncated, missing and undated lookup', () => {
  assert.equal(run({ status: 'title_not_found', matches: [] }).rows[0].reason, 'title_not_found');
  for (const tmdb of [null, { status: 'title_not_found', errors: ['HTTP_503'] },
    { status: 'title_not_found', searchTruncated: true }, { status: 'request_failed' }])
    assert.equal(run(tmdb).rows[0].reason, 'lookup_incomplete');
  assert.equal(run({ matches: [match('')] }).rows[0].reason, 'candidate_date_missing');
});
test('mapping comparison preserves market, platform, date and season boundaries', () => {
  const tmdb = { status: 'title_not_found', matches: [] };
  const review = { ...item, platform: 'netflix' };
  assert.equal(run(tmdb, [review]).rows[0].mappedReview, 'mapped_review_same_title_date_season');
  for (const change of [{ platform: 'tving' }, { market: 'US' }, { date: '2026-11-11' }])
    assert.equal(run(tmdb, [{ ...review, ...change }]).rows[0].mappedReview, 'no_matching_mapped_review');
  assert.equal(run(tmdb, [{ ...review, seasonNumber: 2 }]).rows[0].mappedReview, 'mapped_review_season_requires_review');
});
test('dated identity missing provider is retained but never automatically published', () => {
  const result = run({ status: 'tmdb_movie_release_date_match', matches: [{ ...match(item.date), dateMatches: true,
    krProviderMatched: false }] });
  assert.equal(result.singleDatedIdentity, 1);
  assert.equal(result.backlog, 0);
  assert.equal(result.rows[0].eligibleForAutomaticPublication, false);
});
test('separate dated identities and episode-only hints remain unresolved', () => {
  const matches = [1, 2].map((tmdbId) => ({ ...match(item.date), dateMatches: true, tmdbId }));
  assert.equal(run({ matches }).rows[0].reason, 'ambiguous_dated_identity');
  assert.equal(run({ matches: [{ ...matches[0], episodeOnly: true }] }).rows[0].reason, 'candidate_dates_mixed_or_unresolved');
});
test('invalid or duplicate lineup rows fail rather than inflate counts', () => {
  const lineup = { platform: 'netflix', items: [item, item] };
  const evidence = { kind: 'official-first-tmdb-review', rows: [] };
  const reviewed = { kind: 'reviewed-mapping-snapshot', rows: [] };
  assert.throws(() => classifyReviewBacklog(lineup, evidence, reviewed), /DUPLICATE_LINEUP_ROW/);
  assert.throws(() => run(null, [], { date: '2026-02-30' }), /INVALID_LINEUP_ROW/);
});

test('unverified market cannot be counted as a Korean dated identity', () => {
  const result = run({ matches: [{ ...match(item.date), dateMatches: true }] }, [], { market: null });
  assert.equal(result.singleDatedIdentity, 0);
  assert.equal(result.rows[0].reason, 'market_unverified');
});
