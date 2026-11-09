require("reflect-metadata");
const { execFileSync } = require("node:child_process");
const { randomBytes } = require("node:crypto");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve, join } = require("node:path");
const { NestFactory } = require("@nestjs/core");

async function main() {
  const root = resolve(__dirname, "..");
  const container = "godieor-be03-" + randomBytes(5).toString("hex");
  const password = randomBytes(24).toString("hex");
  const image = /image:\s+(\S+)/.exec(
    readFileSync(join(root, "compose.yaml"), "utf8"),
  )[1];
  const docker = (args) =>
    execFileSync("docker", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, POSTGRES_PASSWORD: password },
    }).trim();
  const apps = [];
  let created = false;
  let phase = "temporary database";
  try {
    docker([
      "run",
      "--pull=never",
      "--rm",
      "-d",
      "--name",
      container,
      "-e",
      "POSTGRES_USER=godieor",
      "-e",
      "POSTGRES_DB=godieor_be03",
      "-e",
      "POSTGRES_PASSWORD",
      "-p",
      "127.0.0.1::5432",
      "--tmpfs",
      "/var/lib/postgresql/data",
      image,
    ]);
    created = true;
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try {
        docker([
          "exec",
          container,
          "pg_isready",
          "-U",
          "godieor",
          "-d",
          "godieor_be03",
        ]);
        ready = true;
        break;
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    assert.ok(ready, "temporary Postgres did not start");
    const port = /:(\d+)$/.exec(docker(["port", container, "5432/tcp"]))[1];
    process.env.DATABASE_URL = `postgresql://godieor:${password}@127.0.0.1:${port}/godieor_be03`;
    process.env.CURSOR_SIGNING_KEY = randomBytes(32).toString("hex");
    process.env.COLLECTION_SCHEDULE_ENABLED = "false";
    process.env.API_HOST = "127.0.0.1";
    process.env.PORT = "3001";
    phase = "migrations";
    execFileSync(
      process.execPath,
      [join(root, "node_modules/prisma/build/index.js"), "migrate", "deploy"],
      { cwd: root, env: process.env, stdio: "pipe" },
    );

    const { AppModule } = require("../dist/src/app.module");
    const {
      CollectionService,
    } = require("../dist/src/collection/collection.service");
    const {
      CollectionRepository,
    } = require("../dist/src/collection/collection.repository");
    const { PrismaService } = require("../dist/src/database/prisma.service");
    const { configureHttp } = require("../dist/src/common/configure-http");
    phase = "new Nest application DI";
    const current = await NestFactory.create(AppModule, { logger: false });
    apps.push(current);
    configureHttp(current);
    await current.listen(0, "127.0.0.1");
    const url = await current.getUrl();
    const collection = current.get(CollectionService);
    const prisma = current.get(PrismaService);
    phase = "fixture storage";
    const firstRun = await collection.collect("backfill");
    assert.equal(
      firstRun.reduce((sum, outcome) => sum + (outcome.published || 0), 0),
      7,
    );
    assert.ok(firstRun.every((outcome) => outcome.status === "succeeded"));
    const beforeIds = (
      await prisma.event.findMany({ orderBy: { id: "asc" } })
    ).map((row) => row.id);
    const initialChanges = await prisma.event_change.count();
    await collection.collect("backfill");
    assert.deepEqual(
      (await prisma.event.findMany({ orderBy: { id: "asc" } })).map(
        (row) => row.id,
      ),
      beforeIds,
    );
    assert.equal(await prisma.event_change.count(), initialChanges);
    console.log(
      "임시 DB: migration/전체 Nest DI/가상 7건 저장·재조회·반복 수집 ID 보존 확인",
    );

    const read = async (base, path) => {
      const response = await fetch(base + "/v1" + path);
      return {
        status: response.status,
        cache: response.headers.get("cache-control"),
        body: await response.json(),
      };
    };
    phase = "repository query behavior";
    const listPath = "/events?schedule=dated&from=2026-11-01&to=2026-12-01";
    const listed = await read(url, listPath);
    assert.equal(listed.status, 200);
    assert.equal(listed.body.items.length, 5);
    assert.equal(
      (await read(url, "/events?schedule=undated")).body.items.length,
      1,
    );
    const basic = await read(
      url,
      "/calendar?month=2026-11&categories=movie,ott",
    );
    assert.equal(basic.status, 200);
    assert.equal(basic.body.days.length, 30);
    for (const event of listed.body.items)
      assert.equal(
        (await read(url, "/events/" + event.id)).body.event.id,
        event.id,
      );

    const baseline = process.argv[2];
    if (baseline) {
      phase = "baseline application";
      const legacy = require(join(resolve(baseline), "dist/src/module.js"));
      const previous = await NestFactory.create(legacy.AppModule, {
        logger: false,
      });
      apps.push(previous);
      previous.setGlobalPrefix("v1");
      previous.useGlobalFilters(new legacy.ErrorFilter());
      await previous.listen(0, "127.0.0.1");
      const oldUrl = await previous.getUrl();
      const scrub = (value) => {
        if (Array.isArray(value)) return value.map(scrub);
        if (value && typeof value === "object")
          return Object.fromEntries(
            Object.entries(value)
              .filter(([key]) => key !== "requestId")
              .map(([key, item]) => [
                key,
                key === "nextCursor" ? !!item : scrub(item),
              ]),
          );
        return value;
      };
      const paths = [
        "/health",
        "/catalog/options",
        "/calendar?month=2026-11",
        "/calendar?month=2026-11&categories=movie,ott&services=netflix",
        "/calendar?month=2026-11&country=US",
        listPath,
        listPath + "&limit=1",
        "/events?schedule=undated",
        "/calendar?month=2026-00",
        "/events",
        "/me/settings",
        ...listed.body.items.map((event) => "/events/" + event.id),
        ...listed.body.items
          .filter((event) => event.contentId)
          .map((event) => "/contents/" + event.contentId),
        "/events/" + listed.body.items[0].id + "?unknown=x",
      ];
      for (const path of paths) {
        const old = await read(oldUrl, path),
          next = await read(url, path);
        assert.deepEqual(scrub(next), scrub(old), "API mismatch: " + path);
      }
      for (const [from, to] of [
        [oldUrl, url],
        [url, oldUrl],
      ]) {
        const first = await read(from, listPath + "&limit=1");
        const next = await read(
          to,
          listPath +
            "&limit=1&cursor=" +
            encodeURIComponent(first.body.nextCursor),
        );
        assert.equal(next.status, 200);
        assert.ok(
          next.body.items.every((item) => item.id !== first.body.items[0].id),
        );
      }
      console.log(
        `이전 빌드와 ${paths.length}개 API 응답 비교·양방향 커서 호환 확인`,
      );
    }
    phase = "postponement and failed collection";
    const fixture = JSON.parse(
      readFileSync(join(root, "data/fixtures/provider.json"), "utf8"),
    );
    const movies = fixture.filter((row) => row.kind === "theatrical_release");
    const changed = structuredClone(movies);
    changed[0].time = { type: "date_only", value: "2026-12-03" };
    changed[0].status = "postponed";
    const adapter = {
      key: "fixture",
      name: "가상 검사",
      origin: "fixture",
      scopes: [{ category: "movie", market: "KR" }],
      async fetch() {
        return changed;
      },
    };
    const checkService = new CollectionService(
      current.get(CollectionRepository),
      [adapter],
    );
    const source = await prisma.event_source.findUniqueOrThrow({
      where: {
        provider_key_external_id_variant_key: {
          provider_key: "fixture",
          external_id: movies[0].externalId,
          variant_key: movies[0].variantKey,
        },
      },
    });
    await checkService.collect("backfill");
    const detail = await read(url, "/events/" + source.event_id);
    assert.equal(detail.body.event.id, source.event_id);
    assert.equal(detail.body.event.time.date, "2026-12-03");
    assert.equal(detail.body.previousTime.date, movies[0].time.value);
    const lastSuccessful = (
      await prisma.collection_scope.findUniqueOrThrow({
        where: {
          provider_key_category_scope_market: {
            provider_key: "fixture",
            category: "movie",
            scope_market: "KR",
          },
        },
      })
    ).last_successful_at;
    adapter.fetch = async () => [...changed, { invalid: true }];
    const failed = await checkService.collect("backfill");
    assert.equal(failed[0].status, "failed");
    const scope = await prisma.collection_scope.findUniqueOrThrow({
      where: {
        provider_key_category_scope_market: {
          provider_key: "fixture",
          category: "movie",
          scope_market: "KR",
        },
      },
    });
    assert.equal(
      scope.last_successful_at.toISOString(),
      lastSuccessful.toISOString(),
    );
    assert.equal(scope.last_attempt_status, "failed");
    assert.equal(
      (await read(url, "/events/" + source.event_id)).body.event.time.date,
      "2026-12-03",
    );
    assert.equal(await prisma.event.count(), 7);
    console.log(
      "일정 연기 시 ID/이전 날짜 보존, 수집 실패 시 마지막 성공·기존 일정 보존 확인",
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message.replaceAll(password, "[redacted]")
        : "unknown";
    console.error(
      "임시 DB 회귀 검사 실패 (" + phase + "): " + message.slice(0, 1200),
    );
    process.exitCode = 1;
  } finally {
    for (const app of apps.reverse()) await app.close().catch(() => {});
    if (created) {
      docker(["rm", "-f", container]);
      console.log("검사용 임시 컨테이너 제거 완료");
    }
  }
}
main().catch(() => {
  console.error("임시 DB 검사 환경 오류");
  process.exitCode = 1;
});
