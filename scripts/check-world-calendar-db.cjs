const assert = require("node:assert/strict");
const { DateTime, Settings } = require("luxon");
const { CollectionService } = require("../dist/src/collection/collection.service");
const { recentScheduleStart } = require("../dist/src/common/config/schedule-window");

module.exports = async function checkWorldCalendar(prisma, repository, readAPI, readStatus) {
  const zone = "Asia/Seoul";
  const cutoff = recentScheduleStart(zone);
  const previous = DateTime.fromISO(cutoff, { zone }).minus({ days: 1 }).toISODate();
  const content = { externalId: "820001", kind: "game", title: "Synthetic WORLD game", posterUrl: "https://example.com/a.jpg" };
  const row = (id, day, device) => ({
    externalId: id, variantKey: "world-" + device, kind: "game_release", title: content.title,
    content, seasonNumber: null, status: "scheduled", time: { type: "date_only", value: day },
    market: "WORLD", venueCountry: null, services: [], devices: [device], home: null, away: null,
    sourceUrl: "https://example.com/synthetic", sourceUpdatedAt: null, sourceReleaseRegion: 8,
  });
  let records = [row("820011", cutoff, "pc"), row("820012", cutoff, "xbox"), row("820013", previous, "playstation")];
  const adapter = {
    key: "igdb", name: "Synthetic IGDB", origin: "provider",
    scopes: [{ category: "game", market: "WORLD" }], fetch: async () => records,
  };
  const service = new CollectionService(repository, [adapter]);
  await service.onModuleInit();
  const before = process.env.CATALOG_PROVIDER_ONLY;
  process.env.CATALOG_PROVIDER_ONLY = "true";
  try {
    assert.equal((await service.collect("backfill"))[0].status, "succeeded");
    const events = await prisma.event_source.findMany({
      where: { provider_key: "igdb", external_id: { in: records.map((record) => record.externalId) } },
      orderBy: { external_id: "asc" }, include: { event: true },
    });
    assert.equal(events.length, 3);
    assert.equal(new Set(events.map(({ event }) => event.content_id)).size, 1);
    assert.equal(await prisma.event_change.count({ where: { event_id: { in: events.map((event) => event.event_id) } } }), 3);

    const month = cutoff.slice(0, 7);
    const calendar = await readAPI(`/calendar?month=${month}&categories=game&country=KR`);
    assert.equal(calendar.days.find(({ date }) => date === cutoff).total, 2);
    const old = await readAPI(`/events/${events[2].event_id}`);
    assert.equal(old.event.id, events[2].event_id);
    // The product may not have had a date before its fixed launch floor.
    if (previous >= "2026-10-01") {
      const oldList = await readAPI(`/events?schedule=dated&from=${previous}&to=${cutoff}&categories=game`);
      assert.equal(oldList.items.length, 0);
    }
    const next = DateTime.fromISO(cutoff, { zone }).plus({ days: 1 }).toISODate();
    const byDevice = await readAPI(`/events?schedule=dated&from=${cutoff}&to=${next}&categories=game&country=KR&devices=xbox`);
    assert.deepEqual(byDevice.items.map(({ id, releaseMarket, devices }) => [id, releaseMarket, devices]),
      [[events[1].event_id, "WORLD", ["xbox"]]]);

    assert.equal((await service.collect("backfill"))[0].status, "succeeded");
    const afterRetry = await prisma.event_source.findMany({
      where: { provider_key: "igdb", external_id: { in: records.map((record) => record.externalId) } },
      orderBy: { external_id: "asc" },
    });
    assert.deepEqual(afterRetry.map((event) => event.event_id), events.map((event) => event.event_id));
    assert.equal(await prisma.event_change.count({ where: { event_id: { in: events.map((event) => event.event_id) } } }), 3);

    records = [records[0], row("820012", next, "xbox"), records[2]];
    assert.equal((await service.collect("backfill"))[0].status, "succeeded");
    const changed = await readAPI(`/events/${events[1].event_id}`);
    assert.equal(changed.event.time.date, next);
    assert.equal(changed.previousTime.date, cutoff);
    records = [{ ...records[0], content: { ...content, posterUrl: "https://example.com/b.jpg" } }, ...records.slice(1)];
    assert.equal((await service.collect("backfill"))[0].status, "succeeded");
    assert.equal((await readAPI(`/contents/${events[0].event.content_id}`)).posterUrl, content.posterUrl);

    const nextMidnight = DateTime.now().setZone(zone).plus({ days: 1 }).startOf("day").toMillis();
    const clock = Settings.now;
    try {
      Settings.now = () => nextMidnight - 500;
      const prior = await readAPI(`/calendar?month=${month}&categories=game&country=KR`);
      Settings.now = () => nextMidnight + 500;
      const path = `/events?schedule=dated&from=${cutoff}&to=${next}&categories=game&country=KR&catalogRevision=${prior.catalogRevision}`;
      assert.equal(await readStatus(path), 409);
    } finally {
      Settings.now = clock;
    }
    console.log("WORLD 테스트: 일괄 저장·동일 작품 ID·재실행·변경 이력·기간 및 플랫폼 필터·오래된 상세 확인");
  } finally {
    if (before === undefined) delete process.env.CATALOG_PROVIDER_ONLY;
    else process.env.CATALOG_PROVIDER_ONLY = before;
  }
};
