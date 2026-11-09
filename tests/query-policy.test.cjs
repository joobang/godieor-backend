const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync, readdirSync } = require("node:fs");
const { join, relative } = require("node:path");
const ts = require("typescript");
const sql = require("../dist/src/catalog/queries/catalog.sql");
const {
  previousChangedTime,
} = require("../dist/src/catalog/queries/previous-time");
const { CatalogRepository } = require("../dist/src/catalog/catalog.repository");
const id = "00000000-0000-4000-8000-000000000001";
test("SQL 반환값은 수동 제네릭 대신 런타임에 행·개수·정렬 키를 검증한다", () => {
  const key = { id, sort_day: "2026-11-09", sort_rank: 0, sort_time: "" };
  assert.deepEqual(sql.decodeEventKeys([key]), [key]);
  for (const value of [
    [{ ...key, id: "bad" }],
    [{ ...key, sort_rank: 2 }],
    [{ ...key, sort_rank: 1, sort_time: "" }],
    {},
    null,
  ])
    assert.throws(() => sql.decodeEventKeys(value));
  assert.equal(
    sql.decodeCalendarKeys([{ ...key, day_total: 3n }])[0].day_total,
    3n,
  );
  for (const total of [3, 0n, -1n])
    assert.throws(() => sql.decodeCalendarKeys([{ ...key, day_total: total }]));
});
test("일반 미정 조회는 Client 관계 필터·안정 ID 페이지를 사용한다", async () => {
  let input;
  const tx = {
    catalog_state: { findUniqueOrThrow: async () => ({ revision: 2n }) },
    event: {
      findMany: async (q) => {
        if (q.select) {
          input = q;
          return [{ id }];
        }
        return [{ id }];
      },
    },
    collection_scope: { findMany: async () => [] },
  };
  const repository = new CatalogRepository({
    $transaction: async (fn) => fn(tx),
  });
  const result = await repository.findEvents(
    {
      schedule: "undated",
      categories: ["movie", "ott", "game"],
      country: "KR",
      services: ["netflix"],
      devices: ["pc"],
      contentId: id,
      limit: 1,
    },
    { version: "2", key: { id } },
  );
  assert.equal(result.rows[0].id, id);
  assert.equal(input.take, 2);
  assert.deepEqual(input.orderBy, { id: "asc" });
  assert.ok(input.where.AND.some((c) => c.id?.gt === id));
  assert.ok(input.where.AND.some((c) => c.content_id === id));
  assert.ok(
    input.where.AND.some((c) =>
      c.OR?.some((x) =>
        x.event_service?.some?.service?.in?.includes("netflix"),
      ),
    ),
  );
  assert.ok(
    input.where.AND.some((c) =>
      c.OR?.some((x) => x.event_device?.some?.device?.in?.includes("pc")),
    ),
  );
});
test("변경 이력은 제목만 변경된 100개 뒤의 실제 이전 날짜까지 탐색한다", async () => {
  const time = { type: "date_only", value: "2026-11-01" };
  const changes = Array.from({ length: 100 }, (_, i) => ({
    id: String(i),
    catalog_revision: BigInt(200 - i),
    before_value: { time },
    after_value: { time: { value: time.value, type: time.type } },
  }));
  let n = 0;
  const result = await previousChangedTime(
    {
      event_change: {
        findMany: async (q) => {
          n++;
          assert.equal(q.take, 100);
          if (n === 1) return changes;
          assert.deepEqual(q.where.AND[1].OR[0], {
            catalog_revision: { lt: 101n },
          });
          return [
            {
              id: "old",
              catalog_revision: 100n,
              before_value: { time },
              after_value: { time: { type: "unknown" } },
            },
          ];
        },
      },
    },
    id,
  );
  assert.deepEqual(result, time);
  assert.equal(n, 2);
});
test("이전 값이 없거나 깨진 이력은 사용자 날짜를 만들지 않는다", async () => {
  const tx = {
    event_change: {
      findMany: async () => [
        {
          id,
          catalog_revision: 1n,
          before_value: { time: { type: "date_only", value: "wrong" } },
          after_value: { time: null },
        },
      ],
    },
  };
  assert.equal(await previousChangedTime(tx, id), null);
});
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.name === "generated"
      ? []
      : e.isDirectory()
        ? files(join(dir, e.name))
        : [join(dir, e.name)],
  );
}
test("raw 실행은 등록된 두 쿼리와 advisory lock에만 있고 Unsafe를 허용하지 않는다", () => {
  const root = join(__dirname, "../src");
  let raw = 0,
    locks = 0;
  for (const path of files(root).filter((p) => p.endsWith(".ts"))) {
    const source = ts.createSourceFile(
      path,
      readFileSync(path, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    function visit(node) {
      if (ts.isCallExpression(node)) {
        const call = node.expression;
        if (ts.isPropertyAccessExpression(call)) {
          const method = call.name.text;
          assert.ok(
            !/^(\$queryRawUnsafe|\$executeRawUnsafe|\$executeRaw)$/.test(
              method,
            ),
            path,
          );
          if (method === "$queryRaw") {
            raw++;
            assert.equal(relative(root, path), "catalog/catalog.repository.ts");
            assert.equal(node.typeArguments?.[0]?.getText(source), "unknown");
          }
          if (method === "query") {
            locks++;
            assert.equal(relative(root, path), "database/prisma.service.ts");
            assert.match(
              node.arguments[0].getText(source),
              /pg_(try_advisory_lock|advisory_unlock)/,
            );
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  assert.equal(raw, 2);
  assert.equal(locks, 2);
});
