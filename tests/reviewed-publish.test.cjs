// Synthetic requirement-derived examples only; no .env, real DB or network.
require("reflect-metadata");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { mkdtemp, rm, writeFile, readFile } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { spawnSync } = require("node:child_process");
const { Module } = require("@nestjs/common");
const { NestFactory } = require("@nestjs/core");
const c = require("../dist/src/ott-candidates/domain/candidate");
const {
  prepareReviewed,
  assertReviewedIdentity,
} = require("../dist/src/reviewed-ott/domain/reviewed-mapping");
const {
  ReviewedMappingRepository,
} = require("../dist/src/reviewed-ott/reviewed-mapping.repository");
const {
  ReviewedOttAdapter,
} = require("../dist/src/reviewed-ott/reviewed-ott.adapter");
const {
  ReviewedPublishService,
} = require("../dist/src/reviewed-ott/reviewed-publish.service");
const {
  ReviewedOttModule,
} = require("../dist/src/reviewed-ott/reviewed-ott.module");
const {
  CollectionService,
  PROVIDER_ADAPTERS,
} = require("../dist/src/collection/collection.service");
const {
  CollectionRepository,
} = require("../dist/src/collection/collection.repository");
const {
  OttCandidatesRepository,
} = require("../dist/src/ott-candidates/ott-candidates.repository");
const {
  OttCandidatesModule,
} = require("../dist/src/ott-candidates/ott-candidates.module");
const { DatabaseModule } = require("../dist/src/database/database.module");
const now = "2026-11-09T01:00:00.000Z";
function fixture(
  changes = {},
  source = "netflix",
  url = "https://about.netflix.com/ko/news/synthetic",
) {
  const state = {
    version: 2,
    stage: "candidate-not-published",
    candidates: [],
    attempts: {},
  };
  const id = c.addCandidate(
    state,
    {
      source,
      url,
      headline: "Synthetic announcement",
      publishedRaw: "2026년 11월 1일",
      evidenceRevision: "synthetic-v1",
    },
    now,
  );
  const revision = state.candidates[0].revisions.at(-1).token;
  c.applyReview(
    state,
    {
      id,
      revision,
      reviewer: "synthetic-curator",
      title: "가상 드라마",
      platform: "netflix",
      market: "KR",
      contentKind: "drama",
      premiereConfirmed: true,
      date: "2027-02-28",
      localTime: null,
      timeZone: null,
      seasonNumber: null,
      announcedYear: null,
      announcedPeriod: null,
      evidence: "가상 공식 근거: 한국 최초 공개일 명시",
      ...changes,
    },
    now,
  );
  const input = {
    version: 1,
    mappings: [
      {
        candidateId: id,
        revision,
        contentKey: "curator-work-a",
        eventKey: "curator-event-a",
      },
    ],
  };
  return { state, input };
}
const prepared = () => {
  const f = fixture();
  return prepareReviewed(f.input, f.state);
};
function prior(changes = {}) {
  return {
    kind: "ott_season_premiere",
    origin: "provider",
    market: "KR",
    contentId: "content-a",
    mappedContentId: "content-a",
    season: null,
    services: ["netflix"],
    ...changes,
  };
}

test("explicit stable keys survive title/date/season corrections; missing time stays date-only", () => {
  const f = fixture({ localTime: "09:00" });
  const first = prepareReviewed(f.input, f.state)[0];
  assert.equal(first.externalId, "curator-event-a");
  assert.equal(first.variantKey, "premiere");
  assert.equal(first.content.externalId, "curator-work-a");
  assert.deepEqual(first.time, { type: "date_only", value: "2027-02-28" });
  assert.equal(first.seasonNumber, null);
  assert.equal(first.sourceUpdatedAt, null); // publication/observedAt/reviewedAt exist but are not source modification
  assert.deepEqual(first.services, ["netflix"]);
  Object.assign(f.state.candidates[0].review.value, {
    title: "가상 정정 제목",
    date: "2027-03-02",
    seasonNumber: 2,
  });
  const next = prepareReviewed(f.input, f.state)[0];
  assert.equal(next.externalId, first.externalId);
  assert.equal(next.content.externalId, first.content.externalId);
  assert.equal(next.title, "가상 정정 제목");
  assert.equal(next.seasonNumber, 2);
});

test("same title does not merge separate curator content/event keys", () => {
  const a = fixture();
  const b = fixture(
    {},
    "netflix",
    "https://about.netflix.com/ko/news/synthetic-b",
  );
  b.input.mappings[0].contentKey = "curator-work-b";
  b.input.mappings[0].eventKey = "curator-event-b";
  a.state.candidates.push(...b.state.candidates);
  a.input.mappings.push(...b.input.mappings);
  const records = prepareReviewed(a.input, a.state);
  assert.equal(records.length, 2);
  assert.notEqual(records[0].content.externalId, records[1].content.externalId);
});

test("missing, stale and ineligible review inputs all refuse publication preparation", () => {
  const cases = [
    (f) => f.state.candidates.splice(0),
    (f) => (f.input.mappings[0].revision = "f".repeat(64)),
    (f) => (f.state.candidates[0].review = null),
    (f) => (f.state.candidates[0].review.value.revision = "f".repeat(64)),
    (f) => (f.state.candidates[0].review.value.id = "f".repeat(64)),
    (f) => (f.state.candidates[0].review.value.date = null),
    (f) => (f.state.candidates[0].review.value.date = "2025-12-31"),
    (f) => (f.state.candidates[0].review.value.date = "2027-02-30"),
    (f) => (f.state.candidates[0].review.value.platform = null),
    (f) => (f.state.candidates[0].review.value.market = "ZZ"),
    (f) => (f.state.candidates[0].review.value.contentKind = "other"),
    (f) => (f.state.candidates[0].review.value.premiereConfirmed = false),
  ];
  for (const change of cases) {
    const f = fixture();
    change(f);
    assert.throws(() => prepareReviewed(f.input, f.state));
  }
});

test("strict mapping schema requires version, nonempty explicit keys and rejects ambiguous batch", () => {
  for (const mutate of [
    (f) => (f.input.version = 2),
    (f) => (f.input.mappings = []),
    (f) => delete f.input.mappings[0].eventKey,
    (f) => (f.input.mappings[0].contentKey = " "),
    (f) => (f.input.mappings[0].extra = true),
    (f) => f.input.mappings.push({ ...f.input.mappings[0] }),
    (f) =>
      f.input.mappings.push({
        ...f.input.mappings[0],
        eventKey: "another-event",
      }),
  ]) {
    const f = fixture();
    mutate(f);
    assert.throws(() => prepareReviewed(f.input, f.state));
  }
  const a = fixture(),
    b = fixture({}, "netflix", "https://about.netflix.com/ko/news/b");
  a.state.candidates.push(...b.state.candidates);
  a.input.mappings.push(b.input.mappings[0]);
  assert.throws(() => prepareReviewed(a.input, a.state), /AMBIGUOUS_EVENT_KEY/);
});

test("local time converts only with exact roundtrip and one possible offset", () => {
  const f = fixture({
    date: "2027-02-28",
    localTime: "09:30",
    timeZone: "Asia/Seoul",
  });
  assert.deepEqual(prepareReviewed(f.input, f.state)[0].time, {
    type: "instant",
    value: "2027-02-28T00:30:00.000Z",
    sourceTimeZone: "Asia/Seoul",
  });
  for (const [date, localTime] of [
    ["2026-03-08", "02:30"],
    ["2026-11-01", "01:30"],
  ]) {
    const f = fixture({ date, localTime, timeZone: "America/New_York" });
    assert.throws(
      () => prepareReviewed(f.input, f.state),
      /INVALID_REVIEW_TIME/,
    );
  }
});

test("CJ query needs explicit official query-free canonical URL; off-host/credentials/query/hash refuse", () => {
  const f = fixture(
    { platform: "tving" },
    "cj",
    "https://cjnews.cj.net/?p=123",
  );
  assert.throws(() => prepareReviewed(f.input, f.state), /INVALID_SOURCE_URL/);
  for (const url of [
    "http://cjnews.cj.net/story/",
    "https://example.com/story/",
    "https://user:password@cjnews.cj.net/story/",
    "https://cjnews.cj.net/story/?utm_test=x",
    "https://cjnews.cj.net/story/#part",
    "https://cjnews.cj.net:444/story/",
  ]) {
    f.input.mappings[0].sourceUrl = url;
    assert.throws(() => prepareReviewed(f.input, f.state));
  }
  f.input.mappings[0].sourceUrl = "https://cjnews.cj.net/synthetic-canonical/";
  assert.equal(
    prepareReviewed(f.input, f.state)[0].sourceUrl,
    f.input.mappings[0].sourceUrl,
  );
});

test("identity permits unknown→known season, refuses known→other/null and market/platform/content changes", () => {
  const [r] = prepared();
  assert.doesNotThrow(() =>
    assertReviewedIdentity({ ...r, seasonNumber: 2 }, prior()),
  );
  assert.doesNotThrow(() =>
    assertReviewedIdentity({ ...r, seasonNumber: 2 }, prior({ season: 2 })),
  );
  for (const p of [
    prior({ season: 1 }),
    prior({ market: "US" }),
    prior({ services: ["tving"] }),
    prior({ services: ["netflix", "tving"] }),
    prior({ services: [] }),
    prior({ mappedContentId: null }),
    prior({ mappedContentId: "content-b" }),
    prior({ kind: "theatrical_release" }),
    prior({ origin: "fixture" }),
  ]) {
    assert.throws(() => assertReviewedIdentity(r, p), /IDENTITY_CHANGED/);
  }
  assert.throws(
    () =>
      assertReviewedIdentity({ ...r, seasonNumber: 2 }, prior({ season: 1 })),
    /IDENTITY_CHANGED/,
  );
});

test("mapping repository uses Prisma relation reads and compares actual persisted identity", async () => {
  const calls = [];
  const db = {
    event_source: {
      async findUnique(args) {
        calls.push(args);
        return {
          event: {
            kind: "ott_season_premiere",
            origin: "provider",
            release_market: "KR",
            content_id: "a",
            drama_season: { season_number: 2 },
            event_service: [{ service: "netflix" }],
          },
        };
      },
    },
    content_source: {
      async findUnique(args) {
        calls.push(args);
        return { content_id: "a" };
      },
    },
  };
  const repo = new ReviewedMappingRepository(db);
  const [record] = prepared();
  await repo.assertIdentities([{ ...record, seasonNumber: 2 }]);
  assert.deepEqual(calls[0].where.provider_key_external_id_variant_key, {
    provider_key: "ott_reviewed",
    external_id: "curator-event-a",
    variant_key: "premiere",
  });
  assert.equal(calls[0].include.event.include.drama_season, true);
  assert.equal(
    calls[1].where.provider_key_content_type_external_id.external_id,
    "curator-work-a",
  );
  await assert.rejects(repo.assertIdentities([record]), /IDENTITY_CHANGED/);
  db.event_source.findUnique = async () => null;
  await repo.assertIdentities([record]);
});

function collectorRepository() {
  return {
    locked: false,
    published: [],
    failures: [],
    registrations: [],
    async register(adapters) {
      this.registrations.push(adapters.map((x) => structuredClone(x.scopes)));
    },
    async withCollectorLock(key, action) {
      assert.equal(key, "ott_reviewed");
      assert.equal(this.locked, false, "no nested lock");
      this.locked = true;
      try {
        return await action();
      } finally {
        this.locked = false;
      }
    },
    async findScope() {
      return { id: "synthetic-scope", last_successful_at: null };
    },
    async beginRun() {
      return "synthetic-run";
    },
    async publishScope(adapter, scope, records) {
      assert.equal(this.locked, true);
      this.published.push(...records);
    },
    async failRun(scope, run, code) {
      this.failures.push(code);
    },
  };
}

test("adapter snapshots are immutable; fetch validates every market under the existing collector lock", async () => {
  const repository = collectorRepository();
  const records = prepared();
  records.push({
    ...structuredClone(records[0]),
    market: "US",
    externalId: "us-event",
  });
  const adapter = new ReviewedOttAdapter({
    async assertIdentities(all) {
      assert.equal(repository.locked, true);
      assert.equal(all.length, 2);
      throw new Error("IDENTITY_CHANGED"); // conflicting US event must block KR before any publish
    },
  });
  adapter.configure(records);
  records[0].title = "mutated outside adapter";
  assert.equal(Object.isFrozen(adapter.scopes), true);
  const collection = new CollectionService(repository, [adapter]);
  const outcomes = await collection.collect("backfill", true);
  assert.equal(outcomes.length, 2);
  assert.ok(
    outcomes.every(
      (x) => x.status === "failed" && x.errorCode === "IDENTITY_CHANGED",
    ),
  );
  assert.deepEqual(repository.published, []);
  const good = new ReviewedOttAdapter({ async assertIdentities() {} });
  const inputs = prepared();
  good.configure(inputs);
  inputs[0].content.title = "changed";
  const fetched = await good.fetch(
    { category: "ott", market: "KR" },
    "backfill",
  );
  assert.equal(fetched[0].content.title, "가상 드라마");
  fetched[0].content.title = "changed fetch result";
  assert.equal(
    (await good.fetch(good.scopes[0], "backfill"))[0].content.title,
    "가상 드라마",
  );
});

test("Nest provider wiring registers empty then prepared scopes, uses reviewed adapter only, refuses unconfigured collect", async (t) => {
  assert.deepEqual(Reflect.getMetadata("imports", ReviewedOttModule), [
    DatabaseModule,
    OttCandidatesModule,
  ]);
  const repository = collectorRepository();
  const f = fixture();
  let candidateLocked = false;
  const candidates = {
    async transaction(action, invalidate) {
      assert.equal(invalidate, false);
      candidateLocked = true;
      try {
        return await action(f.state);
      } finally {
        candidateLocked = false;
      }
    },
  };
  const mappings = {
    async readInput(filename) {
      assert.equal(candidateLocked, true);
      assert.equal(filename, "explicit.json");
      return f.input;
    },
    async assertIdentities() {
      assert.equal(candidateLocked, true);
      assert.equal(repository.locked, true);
    },
  };
  class SyntheticModule {}
  // Use the real module's provider declarations with persistence-only test doubles.
  const replaced = new Map([
    [CollectionRepository, repository],
    [ReviewedMappingRepository, mappings],
  ]);
  Module({
    providers: [
      ...Reflect.getMetadata("providers", ReviewedOttModule).map((p) => {
        const key = typeof p === "function" ? p : p.provide;
        return replaced.has(key)
          ? { provide: key, useValue: replaced.get(key) }
          : p;
      }),
      { provide: OttCandidatesRepository, useValue: candidates },
    ],
  })(SyntheticModule);
  const app = await NestFactory.createApplicationContext(SyntheticModule, {
    logger: false,
    abortOnError: false,
  });
  t.after(() => app.close());
  const adapter = app.get(ReviewedOttAdapter);
  assert.deepEqual(adapter.scopes, []);
  assert.deepEqual(app.get(PROVIDER_ADAPTERS), [adapter]);
  assert.deepEqual(repository.registrations, [[[]]]);
  assert.throws(
    () => app.get(CollectionService).collect("backfill"),
    /REVIEWED_NOT_CONFIGURED/,
  );
  const result = await app.get(ReviewedPublishService).publish("explicit.json");
  assert.equal(result[0].published, 1);
  assert.equal(result[0].status, "succeeded");
  assert.deepEqual(repository.registrations[1], [
    [{ category: "ott", market: "KR" }],
  ]);
  assert.equal(repository.published[0].sourceUpdatedAt, null);
  assert.deepEqual(adapter.scopes, []);
  assert.throws(
    () => app.get(CollectionService).collect("backfill"),
    /REVIEWED_NOT_CONFIGURED/,
  );
});

test("candidate writer lock spans mapping read, validation and collection; invalid late input publishes nothing", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "godieor-reviewed-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const f = fixture();
  const candidates = new OttCandidatesRepository(directory);
  await candidates.transaction(async (s) => Object.assign(s, f.state));
  await writeFile(
    join(directory, "reviewed.json"),
    "STALE EXPORT MUST NOT BE READ",
  );
  const inputPath = join(directory, "mapping.json");
  await writeFile(inputPath, JSON.stringify(f.input));
  const mappings = new ReviewedMappingRepository({});
  const adapter = new ReviewedOttAdapter(mappings);
  const repository = collectorRepository();
  let collected = 0;
  const collection = {
    async collect(mode, force) {
      assert.equal(mode, "backfill");
      assert.equal(force, true);
      collected++;
      await assert.rejects(
        candidates.transaction(async () => {}),
        { code: "EEXIST" },
      );
      return [
        {
          provider: "ott_reviewed",
          category: "ott",
          status: "succeeded",
          published: 1,
        },
      ];
    },
  };
  const publish = new ReviewedPublishService(
    candidates,
    mappings,
    adapter,
    repository,
    collection,
  );
  await publish.publish(inputPath);
  assert.equal(collected, 1);
  assert.equal(
    await readFile(join(directory, "reviewed.json"), "utf8"),
    "STALE EXPORT MUST NOT BE READ",
  );
  f.input.mappings.push({
    ...f.input.mappings[0],
    candidateId: "f".repeat(64),
    eventKey: "bad-late-input",
  });
  await writeFile(inputPath, JSON.stringify(f.input));
  await assert.rejects(publish.publish(inputPath), /CANDIDATE_NOT_FOUND/);
  assert.equal(collected, 1);
  assert.equal(repository.registrations.length, 1);
  assert.deepEqual(adapter.scopes, []);
  // Failure releases file lock; no export invalidation.
  await candidates.transaction(async () => {}, false);
});

test("failed collection still clears configured adapter and releases candidate lock", async () => {
  const f = fixture();
  let held = false;
  const candidates = {
    async transaction(action) {
      held = true;
      try {
        return await action(f.state);
      } finally {
        held = false;
      }
    },
  };
  const adapter = new ReviewedOttAdapter({});
  const service = new ReviewedPublishService(
    candidates,
    {
      async readInput() {
        return f.input;
      },
    },
    adapter,
    { async register() {} },
    {
      async collect() {
        throw new Error("synthetic failure");
      },
    },
  );
  await assert.rejects(service.publish("explicit.json"), /synthetic failure/);
  assert.equal(held, false);
  assert.deepEqual(adapter.scopes, []);
});

test("CLI requires explicit mapping and sanitizes invalid arguments and bootstrap errors", () => {
  const cli = join(__dirname, "../dist/src/cli/publish-reviewed.js");
  const env = { ...process.env };
  delete env.DATABASE_URL;
  delete env.CURSOR_SIGNING_KEY;
  for (const args of [
    [],
    ["--file"],
    ["--file", ""],
    ["--unknown=secret"],
    ["--file", "/synthetic-secret.json"],
  ]) {
    const result = spawnSync(process.execPath, [cli, ...args], {
      env,
      encoding: "utf8",
    });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /검토 후보 publish 실패/);
    assert.doesNotMatch(
      result.stderr,
      /synthetic-secret|DATABASE_URL|stack|Error:/,
    );
  }
});

test("CLI closes created context on success and publish failure without printing private errors", () => {
  const cli = join(__dirname, "../dist/src/cli/publish-reviewed.js");
  for (const fail of [false, true]) {
    const code = `
      const { NestFactory } = require('@nestjs/core');
      NestFactory.createApplicationContext = async () => ({
        get() { return { async publish(file) {
          if (file !== 'explicit-map.json') throw new Error('wrong mapping argument');
          ${fail ? "throw new Error('private-db-secret')" : "return [{ provider: 'ott_reviewed', category: 'ott', status: 'succeeded', published: 1 }]"};
        } }; },
        async close() { process.stdout.write('SYNTHETIC_CONTEXT_CLOSED\\n'); }
      });
      process.argv = [process.execPath, '--file', 'explicit-map.json'];
      require(${JSON.stringify(cli)});
    `;
    const result = spawnSync(process.execPath, ["-e", code], {
      encoding: "utf8",
      cwd: join(__dirname, ".."),
    });
    assert.equal(result.status, fail ? 1 : 0);
    assert.match(result.stdout, /SYNTHETIC_CONTEXT_CLOSED/);
    assert.doesNotMatch(
      result.stdout + result.stderr,
      /private-db-secret|Error:/,
    );
    if (!fail) assert.match(result.stdout, /"published": 1/);
  }
});
