const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Pool } = require('pg');

module.exports = async function checkTheatricalPosters(prisma, readContent) {
  const { enrichTheatricalPosters } = await import('./enrich-theatrical-posters.mjs');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const day = '2026-11-18';
  const existingPoster = 'https://example.com/existing.jpg';
  const cases = [
    { code: '90000001', title: 'Poster fixture A', listed: true, before: null },
    { code: '90000002', title: 'Poster fixture B', listed: false, before: null },
    { code: '90000003', title: 'Poster fixture C', listed: true, before: existingPoster },
  ];
  try {
    await prisma.provider.upsert({
      where: { key: 'kobis' },
      create: { key: 'kobis', name: 'Synthetic KOBIS poster test', origin: 'provider' },
      update: {},
    });
    for (const fixture of cases) {
      fixture.contentId = randomUUID();
      fixture.eventId = randomUUID();
      await prisma.content.create({ data: {
        id: fixture.contentId, kind: 'movie', title: fixture.title, poster_url: fixture.before,
      } });
      await prisma.content_source.create({ data: {
        provider_key: 'kobis', external_id: fixture.code, content_type: 'movie', content_id: fixture.contentId,
      } });
      await prisma.event.create({ data: {
        id: fixture.eventId, kind: 'theatrical_release', title: fixture.title, content_id: fixture.contentId,
        content_type: 'movie', precision: 'date_only', local_date: new Date(day),
        release_market: 'KR', origin: 'provider', is_listed: fixture.listed,
      } });
      await prisma.event_source.create({ data: {
        provider_key: 'kobis', external_id: fixture.code, variant_key: 'kr-theatrical', event_id: fixture.eventId,
        source_url: 'https://example.com/synthetic', observed_at: new Date(),
      } });
    }
    const eventsBefore = await prisma.event.findMany({ where: { id: { in: cases.map((item) => item.eventId) } }, orderBy: { id: 'asc' } });
    const lookup = async (path, params) => {
      if (path === '/search/movie') {
        assert.equal(params.query, cases[0].title);
        return { total_pages: 1, results: [{ id: 1, title: params.query }] };
      }
      return {
        id: 1, title: cases[0].title, poster_path: '/synthetic.jpg',
        release_dates: { results: [{ iso_3166_1: 'KR', release_dates: [{ type: 3, release_date: day + 'T00:00:00Z' }] }] },
      };
    };
    const payload = { pool, lookup };
    const dry = await enrichTheatricalPosters(payload);
    assert.deepEqual([dry.total, dry.beforeWithPoster, dry.matched, dry.updated, dry.lookupFailures], [2, 1, 1, 0, 0]);
    assert.equal((await readContent(cases[0].contentId)).posterUrl, null);
    assert.equal((await enrichTheatricalPosters({ ...payload, apply: true })).updated, 1);
    assert.equal((await enrichTheatricalPosters({ ...payload, apply: true })).updated, 0);
    assert.equal((await readContent(cases[0].contentId)).posterUrl, 'https://image.tmdb.org/t/p/w500/synthetic.jpg');
    assert.equal((await readContent(cases[1].contentId)).posterUrl, null);
    assert.equal((await readContent(cases[2].contentId)).posterUrl, existingPoster);
    assert.deepEqual(await prisma.event.findMany({ where: { id: { in: cases.map((item) => item.eventId) } }, orderBy: { id: 'asc' } }), eventsBefore);
    console.log('극장 포스터 dry-run, 적용·재적용, 비노출·기존 포스터·일정 보존 및 상세 API 확인');
  } finally {
    await pool.end();
  }
};
