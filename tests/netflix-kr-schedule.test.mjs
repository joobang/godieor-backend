import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNetflixKrSchedule, parseNetflixKrPages } from '../scripts/collect-netflix-kr-schedule.mjs';
const html = (data) => `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data)}</script>`;
const fixture = (entries) => ({ props: { currentRegion: { countryCode: 'kr' }, currentLanguage: { code: 'ko' },
  pageProps: { data: { totalItems: 100, totalPages: 5, current: 1, data: entries } } } });
test('Korean date-only listings are staged separately from premiere approval, with duplicates removed', () => {
  const timestamp = Date.parse('2026-11-03T15:00:00Z');
  const entry = { country: 'KR', title1: '작품', startTime: timestamp, videoID: 1234 };
  const result = parseNetflixKrSchedule(html(fixture([entry, entry])));
  assert.equal(result.lineup.items.length, 1);
  assert.equal(result.lineup.items[0].date, '2026-11-04');
  assert.equal(result.lineup.items[0].premiereConfirmed, false);
  assert.equal(result.coverage.complete, false);
});
test('Wrong market and changed schema fail closed', () => {
  const data = fixture([]); data.props.currentRegion.countryCode = 'us';
  assert.throws(() => parseNetflixKrSchedule(html(data)), /NETFLIX_KR_REGION_NOT_VERIFIED/);
  assert.throws(() => parseNetflixKrSchedule('<html></html>'), /NETFLIX_NEXT_DATA_NOT_FOUND/);
});
test('Full pagination preserves later dates and rejects mismatched page metadata', () => {
  const item = (title, date, videoID) => ({ country: 'KR', title1: title,
    startTime: Date.parse(`${date}T15:00:00Z`), videoID });
  const p1 = { totalItems: 2, totalPages: 2, current: 1, data: [item('첫 작품', '2026-11-01', 1)] };
  const p2 = { totalItems: 2, totalPages: 2, current: 2, data: [item('다음 작품', '2026-12-01', 2)] };
  const result = parseNetflixKrPages([p1, p2]);
  assert.equal(result.coverage.complete, true);
  assert.deepEqual(result.lineup.items.map((row) => row.date), ['2026-11-02', '2026-12-02']);
  assert.throws(() => parseNetflixKrPages([p1, { ...p2, current: 3 }]), /PAGINATION_CHANGED/);
});
