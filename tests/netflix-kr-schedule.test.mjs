import test from 'node:test';
import assert from 'node:assert/strict';
import { collectNetflixKrSchedule, parseNetflixKrSchedule, parseNetflixKrPages, SOURCE } from '../scripts/collect-netflix-kr-schedule.mjs';
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

test('A non-Korean landing page uses explicitly Korean pagination on the official endpoint', async () => {
  const landing = fixture([]);
  landing.props.currentRegion.countryCode = 'us';
  const requested = [];
  const fetchPage = async (url) => {
    if (url === SOURCE) return new Response(html(landing));
    assert.equal(url.origin + url.pathname, 'https://about.netflix.com/api/data/releases');
    assert.equal(url.searchParams.get('country'), 'kr');
    assert.equal(url.searchParams.get('language'), 'ko');
    const page = Number(url.searchParams.get('page'));
    requested.push(page);
    return Response.json({ totalItems: 2, totalPages: 2, current: page, data: [{
      country: 'KR', title1: `작품 ${page}`, startTime: Date.parse('2026-11-04T00:00:00Z'), videoID: page,
    }] });
  };
  const result = await collectNetflixKrSchedule(fetchPage, { months: ['2026-11'] });
  assert.deepEqual(requested, [1, 2]);
  assert.equal(result.coverage.firstPageSource, 'explicit_kr_pagination');
  assert.equal(result.coverage.fetchedPageItems, 2);
  assert.ok(result.lineup.items.every(item => item.market === 'KR' && !item.premiereConfirmed));
});

test('Explicit pagination rejects empty or foreign first pages, foreign later rows and redirects', async () => {
  const landing = fixture([]);
  landing.props.currentRegion.countryCode = 'us';
  const row = { country: 'KR', title1: '작품', startTime: Date.parse('2026-11-04T00:00:00Z'), videoID: 1 };
  const getPage = (firstRow, secondRow, urlOverride) => async url => {
    if (url === SOURCE) return new Response(html(landing));
    const current = Number(url.searchParams.get('page'));
    const item = current === 1 ? firstRow : secondRow;
    const response = Response.json({ totalItems: 2, totalPages: 2, current, data: item ? [item] : [] });
    if (urlOverride) Object.defineProperty(response, 'url', { value: urlOverride });
    return response;
  };
  const foreign = { ...row, country: 'US' };
  await assert.rejects(collectNetflixKrSchedule(getPage(null, row)), /NETFLIX_KR_REGION_NOT_VERIFIED/);
  await assert.rejects(collectNetflixKrSchedule(getPage(foreign, row)), /NETFLIX_KR_REGION_NOT_VERIFIED/);
  await assert.rejects(collectNetflixKrSchedule(getPage(row, foreign)), /NETFLIX_SCHEDULE_ITEM_CHANGED/);
  await assert.rejects(collectNetflixKrSchedule(getPage(row, row, 'https://about.netflix.com/ko/new-to-watch')),
    /NETFLIX_RELEASES_REDIRECT_CHANGED/);
  await assert.rejects(collectNetflixKrSchedule(getPage(row, row,
    'https://about.netflix.com/api/data/releases?country=kr&language=en&page=1')),
  /NETFLIX_RELEASES_REDIRECT_CHANGED/);
});
