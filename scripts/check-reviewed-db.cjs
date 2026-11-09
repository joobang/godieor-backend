// Synthetic integration cases. Invoked with an isolated, migrated PostgreSQL by check-refactor-db.
const assert = require("node:assert/strict");
const { mkdtemp, writeFile, readFile, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
module.exports = async function checkReviewed(root, prisma) {
  const load = (p) => require(join(root, "dist/src", p));
  const c = load("ott-candidates/domain/candidate");
  const { OttCandidatesRepository } = load(
    "ott-candidates/ott-candidates.repository",
  );
  const { ReviewedMappingRepository } = load(
    "reviewed-ott/reviewed-mapping.repository",
  );
  const { ReviewedOttAdapter } = load("reviewed-ott/reviewed-ott.adapter");
  const { ReviewedPublishService } = load(
    "reviewed-ott/reviewed-publish.service",
  );
  const { CollectionRepository } = load("collection/collection.repository");
  const { ReviewedCollectionService } = load(
    "reviewed-ott/reviewed-collection.service",
  );
  const directory = await mkdtemp(join(tmpdir(), "godieor-reviewed-db-"));
  try {
    const now = "2026-11-09T01:00:00.000Z";
    const state = {
      version: 2,
      stage: "candidate-not-published",
      candidates: [],
      attempts: {},
    };
    const id = c.addCandidate(
      state,
      {
        source: "netflix",
        url: "https://about.netflix.com/ko/news/synthetic-integration",
        headline: "Synthetic integration",
        publishedRaw: null,
        evidenceRevision: "synthetic-v1",
      },
      now,
    );
    const candidate = state.candidates[0];
    const review = {
      id,
      revision: candidate.revisions.at(-1).token,
      reviewer: "synthetic-curator",
      title: "가상 통합 드라마",
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
      evidence: "가상 통합 예제·실제 작품 아님",
    };
    c.applyReview(state, review, now);
    const input = {
      version: 1,
      mappings: [
        {
          candidateId: id,
          revision: review.revision,
          contentKey: "synthetic-work-a",
          eventKey: "synthetic-event-a",
        },
      ],
    };
    const file = join(directory, "mapping.json");
    const save = async () => {
      await writeFile(join(directory, "state.json"), JSON.stringify(state));
      await writeFile(file, JSON.stringify(input));
    };
    const candidates = new OttCandidatesRepository(directory),
      mapping = new ReviewedMappingRepository(prisma);
    const adapter = new ReviewedOttAdapter(mapping),
      repository = new CollectionRepository(prisma),
      collection = new ReviewedCollectionService(repository, [adapter]);
    await collection.onModuleInit();
    const publisher = new ReviewedPublishService(
      candidates,
      mapping,
      adapter,
      repository,
      collection,
    );
    await save();
    const first = await publisher.publish(file);
    assert.equal(first[0].published, 1);
    const source = await prisma.event_source.findUniqueOrThrow({
      where: {
        provider_key_external_id_variant_key: {
          provider_key: "ott_reviewed",
          external_id: "synthetic-event-a",
          variant_key: "premiere",
        },
      },
    });
    const initialChanges = await prisma.event_change.count({
      where: { event_id: source.event_id },
    });
    assert.equal(
      (await prisma.event.findUniqueOrThrow({ where: { id: source.event_id } }))
        .origin,
      "provider",
    );
    await publisher.publish(file);
    assert.equal(
      await prisma.event_change.count({ where: { event_id: source.event_id } }),
      initialChanges,
    );
    Object.assign(candidate.review.value, {
      date: "2027-03-02",
      title: "가상 정정 제목",
      seasonNumber: 2,
    });
    await save();
    await publisher.publish(file);
    const event = await prisma.event.findUniqueOrThrow({
      where: { id: source.event_id },
      include: { drama_season: true },
    });
    assert.equal(event.local_date.toISOString().slice(0, 10), "2027-03-02");
    assert.equal(event.drama_season.season_number, 2);
    const changes = await prisma.event_change.count({
      where: { event_id: source.event_id },
    });
    // Known season, content, market and platform cannot be remapped to an old event key.
    for (const patch of [
      { seasonNumber: 3 },
      { market: "US" },
      { platform: "tving" },
    ]) {
      const old = { ...candidate.review.value };
      Object.assign(candidate.review.value, patch);
      await save();
      const outcomes = await publisher.publish(file);
      assert.ok(outcomes.every((x) => x.status === "failed"));
      candidate.review.value = old;
    }
    input.mappings[0].contentKey = "synthetic-work-b";
    await save();
    assert.equal((await publisher.publish(file))[0].status, "failed");
    input.mappings[0].contentKey = "synthetic-work-a";
    input.mappings[0].revision = "0".repeat(64);
    await save();
    await assert.rejects(publisher.publish(file), /STALE_MAPPING/);
    input.mappings[0].revision = review.revision;
    input.mappings.push({
      ...input.mappings[0],
      candidateId: "f".repeat(64),
      eventKey: "invalid-batch-tail",
    });
    await save();
    await assert.rejects(publisher.publish(file), /CANDIDATE_NOT_FOUND/);
    input.mappings.pop();
    assert.equal(
      await prisma.event_change.count({ where: { event_id: source.event_id } }),
      changes,
    );
    assert.equal(
      await prisma.event.count({ where: { origin: "provider" } }),
      1,
    );
    await candidates.transaction(async () => {}, false); // lock released after rejected inputs
    console.log(
      "임시 DB: 검토 후보 provider 저장/재수집/ID·작품·시즌 정정, 변경 거부·오래된 매핑·부분 입력 오류 보존 확인",
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
};
