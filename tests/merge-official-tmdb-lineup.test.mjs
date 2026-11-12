import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeOfficialTmdbLineup } from '../scripts/merge-official-tmdb-lineup.mjs';

const item = (title) => ({ title, date: '2026-11-12', market: 'KR', contentKind: 'unknown', seasonNumber: null,
  premiereConfirmed: false, evidence: 'Netflix 한국 공식 공개일 11월 12일 확인.' });
const lineup = () => ({ platform: 'netflix', sourceUrl: 'https://about.netflix.com/ko/new-to-watch',
  observedAt: '2026-11-12T01:00:00Z', items: [item('드라마'), item('검색 실패'), item('영화')] });
const row = (title, matches) => ({ platform: 'netflix', title, date: '2026-11-12', seasonNumber: null,
  tmdb: { matches } });
const match = (type, tmdbId, dateMatches = true, krProviderMatched = true, seasonNumber = null) =>
  ({ type, tmdbId, dateMatches, krProviderMatched, seasonNumber, episodeOnly: false,
    dates: seasonNumber ? { seasonFirstDate: '2026-11-12' } : {} });

test('TMDB 날짜·한국 제공처·고유 ID가 일치하면 종류와 시즌만 보강한다', () => {
  const enrichment = { kind: 'official-first-tmdb-review', rows: [
    row('드라마', [match(undefined, 123, true, true, 2)]),
    row('영화', [match('movie', 456)]),
    row('검색 실패', []),
  ] };
  const { lineup: result, coverage } = mergeOfficialTmdbLineup(lineup(), enrichment);
  assert.equal(coverage.classified, 2);
  assert.equal(result.items[0].contentKind, 'original_series');
  assert.equal(result.items[0].seasonNumber, 2);
  assert.equal(result.items[2].contentKind, 'movie');
  assert.equal(result.items[1].contentKind, 'unknown');
  assert.equal(result.items.every((x) => x.date === '2026-11-12' && x.premiereConfirmed === false), true);
});

test('날짜 불일치, 해외 제공, 여러 후보는 원본을 보존한다', () => {
  const enrichment = { kind: 'official-first-tmdb-review', rows: [
    row('드라마', [match('tv', 123, false, true, 2)]),
    row('영화', [match('movie', 11), match('movie', 12)]),
    row('검색 실패', [match('movie', 44, true, false)]),
  ] };
  const source = lineup();
  const result = mergeOfficialTmdbLineup(source, enrichment);
  assert.deepEqual(result.lineup, source);
  assert.deepEqual([result.coverage.classified, result.coverage.ambiguous], [0, 1]);
});
