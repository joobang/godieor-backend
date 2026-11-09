require("reflect-metadata");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync, readdirSync } = require("node:fs");
const { join } = require("node:path");
const ts = require("typescript");
const { Module } = require("@nestjs/common");
const { NestFactory } = require("@nestjs/core");
const { CatalogController } = require("../dist/src/catalog/catalog.controller");
const { CatalogService } = require("../dist/src/catalog/catalog.service");
const {
  CatalogRepository,
  CatalogVersionChangedError,
} = require("../dist/src/catalog/catalog.repository");
const { CursorService } = require("../dist/src/catalog/cursor.service");
const pipes = require("../dist/src/catalog/dto/catalog-query.pipe");
const { HealthController } = require("../dist/src/health/health.controller");
const { HealthService } = require("../dist/src/health/health.service");
const { HealthRepository } = require("../dist/src/health/health.repository");
const { AuthModule } = require("../dist/src/auth/auth.module");
const { UsersModule } = require("../dist/src/users/users.module");
const {
  RUNTIME_CONFIG,
} = require("../dist/src/common/config/runtime-config.module");
const { configureHttp } = require("../dist/src/common/configure-http");

function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((item) =>
    item.name === "generated"
      ? []
      : item.isDirectory()
        ? files(join(directory, item.name))
        : [join(directory, item.name)],
  );
}

test("Controller/Service가 Prisma·파일·네트워크 IO를 직접 수행하지 않는다", () => {
  const sources = files(join(__dirname, "../src"));
  for (const path of sources.filter(
    (path) =>
      /\.(controller|service)\.ts$/.test(path) &&
      !path.endsWith("prisma.service.ts"),
  )) {
    const source = ts.createSourceFile(
      path,
      readFileSync(path, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    function visit(node) {
      if (ts.isImportDeclaration(node)) {
        const dependency = node.moduleSpecifier.text;
        assert.ok(
          !/^(node:)?(fs|https?|net|pg)(\/|$)|generated\/prisma|@prisma\//.test(
            dependency,
          ),
          `${path}: ${dependency}`,
        );
      }
      if (ts.isCallExpression(node)) {
        const callee = node.expression;
        const directFetch = ts.isIdentifier(callee) && callee.text === "fetch";
        const rawDatabase =
          ts.isPropertyAccessExpression(callee) &&
          ["$queryRaw", "$executeRaw", "$transaction"].includes(
            callee.name.text,
          );
        const globalFetch =
          ts.isPropertyAccessExpression(callee) &&
          callee.expression.getText(source) === "globalThis" &&
          callee.name.text === "fetch";
        assert.ok(
          !directFetch && !globalFetch && !rawDatabase,
          `${path}: ${callee.getText(source)}`,
        );
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
});

test("Nest HTTP 경계가 서비스·레포지토리 분리 후에도 계약 동작을 유지한다", async (t) => {
  const id = "00000000-0000-4000-8000-000000000001";
  const row = {
    id,
    kind: "theatrical_release",
    title: "가상 영화",
    content_id: id,
    drama_season: null,
    status: "scheduled",
    precision: "date_only",
    instant_at: null,
    local_date: new Date("2026-02-07T00:00:00Z"),
    source_time_zone: null,
    announced_year: null,
    announced_period: null,
    release_market: "KR",
    venue_country: null,
    event_service: [],
    event_device: [],
    origin: "fixture",
    updated_at: new Date("2026-01-01T00:00:00Z"),
    event_source: [],
  };
  const key = { id, sort_day: "2026-02-07", sort_rank: 0, sort_time: "" };
  const calls = [];
  const repository = {
    async findEvents(query, after) {
      calls.push({ query, after });
      if (query.revision === "99") throw new CatalogVersionChangedError();
      if (query.contentId === "00000000-0000-4000-8000-000000000099")
        throw new Error("private database failure");
      return {
        version: "7",
        rows: after ? [] : [row],
        lastKey: after ? undefined : key,
        hasMore: !after,
        scopes: [],
      };
    },
    async findCalendar(query) {
      calls.push({ query });
      return {
        version: "7",
        keys: [{ ...key, day_total: 1n }],
        rows: [row],
        scopes: [],
      };
    },
    async findEventDetail(eventId) {
      return eventId === id
        ? { row, previous: { type: "date_only", value: "2026-02-06" } }
        : null;
    },
    async findContent(contentId) {
      return contentId === id
        ? {
            id,
            kind: "movie",
            title: "가상 영화",
            original_title: null,
            poster_url: null,
            synopsis: null,
            drama_season: [],
          }
        : null;
    },
  };
  class BoundaryTestModule {}
  Module({
    imports: [AuthModule, UsersModule],
    controllers: [CatalogController, HealthController],
    providers: [
      CatalogService,
      CursorService,
      ...Object.values(pipes),
      HealthService,
      { provide: CatalogRepository, useValue: repository },
      {
        provide: HealthRepository,
        useValue: {
          async checkConnection() {
            return [{ origin: "fixture", _count: 1 }];
          },
        },
      },
      {
        provide: RUNTIME_CONFIG,
        useValue: { cursorKey: "synthetic-signing-key-with-32-characters" },
      },
    ],
  })(BoundaryTestModule);
  const app = await NestFactory.create(BoundaryTestModule, { logger: false });
  configureHttp(app);
  await app.listen(0, "127.0.0.1");
  t.after(() => app.close());
  const url = await app.getUrl();
  const get = async (path) => {
    const response = await fetch(url + "/v1" + path);
    return { response, body: await response.json() };
  };

  await t.test("월간 날짜·지역 날짜 표시·필터 해석을 유지한다", async () => {
    const { response, body } = await get(
      "/calendar?month=2026-02&categories=movie,ott&services=netflix",
    );
    assert.equal(response.status, 200);
    assert.equal(body.days.length, 28);
    assert.equal(body.days[6].total, 1);
    assert.deepEqual(body.days[6].previews[0].time, {
      type: "date_only",
      date: "2026-02-07",
    });
    assert.deepEqual(calls.at(-1).query.categories, ["movie", "ott"]);
    assert.equal(calls.at(-1).query.to, "2026-03-01");
  });
  await t.test(
    "잘못된 입력은 레포지토리에 도달하기 전에 거부한다",
    async () => {
      const before = calls.length;
      for (const path of [
        "/calendar?month=2026-02&unknown=x",
        "/calendar?month=2026-00",
        "/events",
        `/events/${id}?timeZone=Mars`,
        `/events/${id}?extra=x`,
      ])
        assert.equal((await get(path)).response.status, 400);
      assert.equal(calls.length, before);
    },
  );
  await t.test(
    "서명 커서는 같은 필터만 허용하고 버전 충돌은 409다",
    async () => {
      const path =
        "/events?schedule=dated&from=2026-02-01&to=2026-03-01&limit=1";
      const first = (await get(path)).body;
      assert.ok(first.nextCursor);
      const next = await get(
        path + "&cursor=" + encodeURIComponent(first.nextCursor),
      );
      assert.equal(next.response.status, 200);
      assert.deepEqual(next.body.items, []);
      assert.equal(calls.at(-1).after.key.id, id);
      assert.equal(
        (
          await get(
            path + "&country=US&cursor=" + encodeURIComponent(first.nextCursor),
          )
        ).response.status,
        400,
      );
      const conflict = await get(path + "&catalogRevision=99");
      assert.equal(conflict.response.status, 409);
      assert.equal(conflict.body.code, "CATALOG_CHANGED");
    },
  );
  await t.test("상세 이전 날짜·작품·404를 유지한다", async () => {
    assert.deepEqual((await get(`/events/${id}`)).body.previousTime, {
      type: "date_only",
      date: "2026-02-06",
    });
    assert.equal((await get(`/contents/${id}`)).body.kind, "movie");
    assert.equal(
      (await get("/events/00000000-0000-4000-8000-000000000002")).response
        .status,
      404,
    );
  });
  await t.test(
    "미구현 인증/개인 API는 계속 차단하며 no-store를 유지한다",
    async () => {
      const google = await fetch(url + "/v1/auth/google", { method: "POST" });
      assert.equal(google.status, 503);
      assert.equal(google.headers.get("cache-control"), "no-store");
      const personal = await get("/me/settings");
      assert.equal(personal.response.status, 401);
      assert.equal(personal.response.headers.get("cache-control"), "no-store");
      assert.equal(personal.response.headers.get("www-authenticate"), "Bearer");
    },
  );
  await t.test(
    "DB 오류의 내부 내용은 HTTP 응답에 노출하지 않는다",
    async () => {
      const { response, body } = await get(
        "/events?schedule=dated&from=2026-02-01&to=2026-03-01&contentId=00000000-0000-4000-8000-000000000099",
      );
      assert.equal(response.status, 503);
      assert.equal(body.code, "SERVICE_UNAVAILABLE");
      assert.ok(!JSON.stringify(body).includes("private database"));
    },
  );
});
