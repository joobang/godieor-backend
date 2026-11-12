import test from 'node:test';
import assert from 'node:assert/strict';
import { triageOfficialReleases } from '../scripts/triage-official-ott-releases.mjs';

test('official KR availability and TMDB season premiere are retained despite missing TMDB provider', () => {
  const lineup = { platform: 'netflix', sourceUrl: 'https://about.netflix.com/ko/new-to-watch', items: [
    { title: '한국 드라마', date: '2026-11-14', market: 'KR', seasonNumber: null, premiereConfirmed: false },
  ] };
  const enrichment = { kind: 'official-first-tmdb-review', rows: [{ platform: 'netflix', title: '한국 드라마', date: '2026-11-14', seasonNumber: null,
    tmdb: { matches: [{ type: 'tv', tmdbId: 301354, seasonNumber: 1, dateMatches: true,
      episodeOnly: false, krProviderMatched: false, dates: { seasonFirstDate: '2026-11-14' } }] } }] };
  const report = triageOfficialReleases(lineup, enrichment);
  assert.equal(report.readyForFirstReleaseReview, 1);
  assert.equal(report.tmdbProviderMissingButRetained, 1);
  assert.equal(report.rows[0].status, 'official_kr_date_and_tmdb_season_match');
  assert.equal(report.rows[0].eligibleForAutomaticPublication, false);
});

test('broadcast date without first-party KR listing does not become Netflix evidence', () => {
  const result = triageOfficialReleases({ platform: 'netflix', sourceUrl: 'https://about.netflix.com/ko/new-to-watch',
    items: [{ title: '방송만 확인', date: '2026-11-25', market: null, premiereConfirmed: false }] },
  { kind: 'official-first-tmdb-review', rows: [] });
  assert.equal(result.readyForFirstReleaseReview, 0);
  assert.equal(result.rows[0].status, 'market_or_date_unverified');
});

test('different season date and ambiguous identities are not incorrectly approved', () => {
  const source = { platform: 'tving', sourceUrl: 'https://www.tving.com', items: [
    { title: '시즌2', date: '2026-12-01', market: 'KR', seasonNumber: null, premiereConfirmed: false },
  ] };
  const row = { platform: 'tving', title: '시즌2', date: '2026-12-01', seasonNumber: null };
  const match = (id) => ({ type: 'tv', tmdbId: id, seasonNumber: 2, dateMatches: true, episodeOnly: false,
    dates: { seasonFirstDate: '2026-12-01' } });
  const ambiguous = triageOfficialReleases(source, { kind: 'official-first-tmdb-review', rows: [{ ...row,
    tmdb: { matches: [match(12), match(13)] } }] });
  assert.equal(ambiguous.rows[0].status, 'ambiguous_tmdb_identity');
  const wrongDate = triageOfficialReleases(source, { kind: 'official-first-tmdb-review', rows: [{ ...row,
    tmdb: { matches: [{ ...match(12), dates: { seasonFirstDate: '2026-11-30' } }] } }] });
  assert.equal(wrongDate.readyForFirstReleaseReview, 0);
});
