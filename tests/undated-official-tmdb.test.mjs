import test from 'node:test';
import assert from 'node:assert/strict';
import { linkUndatedLineups } from '../scripts/link-undated-official-tmdb.mjs';

const lineup = (platform, title, date = null) => ({ platform, sourceUrl: platform === 'disney_plus'
  ? 'https://www.disneyplus.com/ko-kr/browse/page-36541dc7-6961-4bbb-a07b-ef97d7da7995'
  : 'https://news.coupang.com/archives/category/coupangplay/', observedAt: '2026-11-16T07:00:00Z', items: [
    { title, date, market: 'KR', contentKind: 'unknown', seasonNumber: null, premiereConfirmed: false, evidence: '공식 작품 제목만 확인' },
  ] });

test('undated KR listings get unique TMDB identity hints but never premiere approval', async () => {
  const request = async (path) => path === '/search/tv'
    ? { results: [{ id: 3, name: '예정작', first_air_date: '2025-03-01' }], total_pages: 1 }
    : { results: [], total_pages: 1 };
  const result = await linkUndatedLineups([lineup('disney_plus', '예정작'), lineup('disney_plus', '예정작')], request);
  assert.equal(result.total, 1);
  assert.equal(result.rows[0].status, 'identity_hint_only');
  assert.equal(result.rows[0].candidates[0].tmdbId, 3);
  assert.equal(result.rows[0].firstKrOttReleaseVerified, false);
  assert.equal(result.rows[0].publishEligible, false);
  assert.equal(result.rows[0].date, null);
});

test('multiple title matches stay ambiguous and partial search is reported', async () => {
  const result = await linkUndatedLineups([lineup('coupang_play', '예정작')], async (path) =>
    path === '/search/tv' ? { results: [{ id: 3, name: '예정작' }, { id: 4, name: '예정작' }], total_pages: 3 }
      : { results: [], total_pages: 1 });
  assert.equal(result.rows[0].status, 'lookup_incomplete');
  assert.equal(result.rows[0].candidates.length, 2);
  assert.equal(result.rows[0].searchTruncated, true);
});

test('dated or non-KR rows cannot enter undated identity report', async () => {
  const result = await linkUndatedLineups([lineup('disney_plus', '예정작', '2026-12-01')],
    async () => { throw Error('SHOULD_NOT_QUERY'); });
  assert.equal(result.total, 0);
});
