import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../database/prisma.service";
import { Canonical, ProviderAdapter, Scope } from "./domain/provider-record";
import { safeRetentionBounds } from "../common/config/schedule-window";
import { collectionDiagnostic } from "../common/collection-diagnostic";
type Tx = Prisma.TransactionClient;
function stable(value: unknown): string {
  return JSON.stringify(value, (_key, x) =>
    x && typeof x === "object" && !Array.isArray(x)
      ? Object.fromEntries(
          Object.entries(x).sort(([a], [b]) => a.localeCompare(b)),
        )
      : x,
  );
}
function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
@Injectable()
export class CollectionRepository {
  constructor(private readonly db: PrismaService) {}
  private controlTimeout(): number {
    const value = process.env.COLLECTION_CONTROL_TIMEOUT_MS;
    if (value === undefined) return 60000;
    const timeout = Number(value);
    if (!Number.isSafeInteger(timeout) || timeout < 10000 || timeout > 300000)
      throw new Error("INVALID_COLLECTION_CONTROL_TIMEOUT");
    return timeout;
  }
  private async transaction<T>(phase: "register" | "begin_run" | "publish" | "fail_run",
    operation: (tx: Tx) => Promise<T>, timeout: number): Promise<T> {
    try {
      return await this.db.$transaction(operation, { timeout, maxWait: 10000 });
    } catch (error) {
      const diagnostic = collectionDiagnostic(error);
      // Never attach the original message, SQL, URL or driver metadata to public errors.
      throw Object.assign(new Error(diagnostic.code), {
        code: diagnostic.causeCode, collectionPhase: phase,
      });
    }
  }
  // Review-only ingestion: protect stable IDs already referenced by account favorites.
  // Called under the provider collector lock before any records are written.
  async assertReviewedCatalogIdentities(provider: string, records: readonly Canonical[]) {
    for (const record of records) {
      const source = await this.db.event_source.findUnique({
        where: { provider_key_external_id_variant_key: {
          provider_key: provider, external_id: record.externalId, variant_key: record.variantKey,
        } },
        include: { event: true },
      });
      if (!source) continue;
      const event = source.event;
      if (event.kind !== record.kind || event.origin !== "provider" ||
          event.release_market !== record.market) throw new Error("IDENTITY_CHANGED");
      if (record.content) {
        const mapped = await this.db.content_source.findUnique({
          where: { provider_key_content_type_external_id: {
            provider_key: provider, content_type: record.content.kind, external_id: record.content.externalId,
          } },
        });
        if (!mapped || mapped.content_id !== event.content_id) throw new Error("IDENTITY_CHANGED");
      } else if (event.content_id !== null) throw new Error("IDENTITY_CHANGED");
      if (record.home && record.away) {
        const [home, away] = await Promise.all([record.home, record.away].map((team) =>
          this.db.team_source.findUnique({ where: { provider_key_external_id: {
            provider_key: provider, external_id: team.externalId,
          } } })));
        if (!home || !away || home.team_id !== event.home_team_id ||
            away.team_id !== event.away_team_id) throw new Error("IDENTITY_CHANGED");
      } else if (event.home_team_id !== null || event.away_team_id !== null) throw new Error("IDENTITY_CHANGED");
    }
  }
  async register(adapters: ProviderAdapter[]) {
    await this.transaction("register", async (tx) => {
      let changed = false;
      for (const adapter of adapters) {
        const registered = await tx.provider.findUnique({
          where: { key: adapter.key },
        });
        if (registered && registered.origin !== adapter.origin)
          throw new Error("ADAPTER_ORIGIN_MISMATCH");
        await tx.provider.upsert({
          where: { key: adapter.key },
          create: {
            key: adapter.key,
            name: adapter.name,
            origin: adapter.origin,
          },
          update: {},
        });
        for (const scope of adapter.scopes) {
          const found = await tx.collection_scope.findUnique({
            where: {
              provider_key_category_scope_market: {
                provider_key: adapter.key,
                category: scope.category,
                scope_market: scope.market,
              },
            },
          });
          if (!found) {
            await tx.collection_scope.create({
              data: {
                id: randomUUID(),
                provider_key: adapter.key,
                category: scope.category,
                scope_market: scope.market,
              },
            });
            changed = true;
          }
        }
      }
      if (changed) await this.bump(tx);
    }, this.controlTimeout());
  }
  private async bump(tx: Tx) {
    return tx.catalog_state.update({
      where: { singleton: true },
      data: { revision: { increment: 1 }, published_at: new Date() },
    });
  }

  withCollectorLock<T>(provider: string, operation: () => Promise<T>) {
    return this.db.withCollectorLock("collector:" + provider, operation);
  }
  findScope(provider: string, scope: Scope) {
    return this.db.collection_scope.findUniqueOrThrow({
      where: {
        provider_key_category_scope_market: {
          provider_key: provider,
          category: scope.category,
          scope_market: scope.market,
        },
      },
    });
  }
  async publishedRecords(provider: string, scope: Scope): Promise<unknown[]> {
    const kinds = { movie: "theatrical_release", ott: "ott_season_premiere", game: "game_release", epl: "epl_match" } as const;
    const rows = await this.db.event_source.findMany({
      where: { provider_key: provider, event: { kind: kinds[scope.category], release_market: scope.category === "epl" ? null : scope.market } },
      select: { external_id: true, variant_key: true, event: { select: { event_change: {
        orderBy: { catalog_revision: "desc" }, take: 1, select: { after_value: true },
      } } } },
    });
    return rows.map(row => {
      const record = row.event.event_change[0]?.after_value;
      if (!record || typeof record !== "object" || Array.isArray(record) ||
          record.externalId !== row.external_id || record.variantKey !== row.variant_key) throw Error("INVALID_PUBLISHED_RECORD");
      return record;
    });
  }
  private async retainPublishableRecords(tx: Tx, provider: string, records: Canonical[]) {
    const { date, instant } = safeRetentionBounds();
    const old = records.filter((row) => row.time.type === "date_only" ? row.time.value < date
      : row.time.type === "instant" && Date.parse(row.time.value) < instant.getTime());
    if (!old.length) return records;
    const sources = await tx.event_source.findMany({
      where: { provider_key: provider, OR: old.map((record) => ({
        external_id: record.externalId, variant_key: record.variantKey,
      })) },
      select: { external_id: true, variant_key: true },
    });
    const oldRows = new Set(old);
    const existing = new Set(sources.map((source) => JSON.stringify([source.external_id, source.variant_key])));
    return records.filter((row) => !oldRows.has(row) || existing.has(JSON.stringify([row.externalId, row.variantKey])));
  }

  async beginRun(scopeId: string, mode: "backfill" | "daily") {
    const runId = randomUUID(),
      started = new Date();
    await this.transaction("begin_run", async (tx) => {
      await tx.collection_scope.update({
        where: { id: scopeId },
        data: {
          last_attempt_at: started,
          last_attempt_status: "running",
          last_error_code: null,
        },
      });
      await tx.collection_run.create({
        data: {
          id: runId,
          scope_id: scopeId,
          mode,
          status: "running",
          started_at: started,
        },
      });
      await this.bump(tx);
    }, this.controlTimeout());
    return runId;
  }
  private publishTimeout(provider: string): number {
    const configured = process.env.COLLECTION_PUBLISH_TIMEOUT_MS;
    if (configured === undefined) return provider === "igdb" ? 180000 : 30000;
    const timeout = Number(configured);
    if (!Number.isSafeInteger(timeout) || timeout < 30000 || timeout > 1800000)
      throw new Error("INVALID_COLLECTION_PUBLISH_TIMEOUT");
    return timeout;
  }
  async publishScope(
    adapter: ProviderAdapter,
    scopeId: string,
    records: Canonical[],
    runId: string,
  ) {
    // Remote DB round trips can exhaust a single interactive transaction.
    // Retry-safe upserts retain event IDs and append history only for changes.
    let unlisted = 0;
    let published = 0;
    const retainRecent = adapter.origin === "provider" && process.env.COLLECTION_RETAIN_RECENT_ONLY !== "false";
    const batchSize = 100;
    const batches = Math.max(1, Math.ceil(records.length / batchSize));
    for (let index = 0; index < batches; index++) {
      const input = records.slice(index * batchSize, (index + 1) * batchSize);
      const lastBatch = index === batches - 1;
      published += await this.transaction("publish", async (tx) => {
        // Cleanup also locks catalog_state before reading source bindings.
        const catalog = await this.bump(tx);
        const batch = retainRecent ? await this.retainPublishableRecords(tx, adapter.key, input) : input;
        if (adapter.key === "igdb" && adapter.origin === "provider" && batch.length &&
            batch.every((record) => record.kind === "game_release" && record.time.type === "date_only" &&
              record.content?.kind === "game" && record.seasonNumber === null &&
              !record.home && !record.away && !record.services.length)) {
          await this.publishGameBatch(tx, adapter, batch, catalog.revision);
        } else {
          for (const record of batch) await this.publish(tx, adapter, record, catalog.revision);
        }
        if (lastBatch) {
          if (adapter.key === "kobis" && records.length >= 5) {
            const result = await tx.event.updateMany({
              where: {
                kind: "theatrical_release",
                event_source: { some: { provider_key: "kobis", external_id: { notIn: records.map(r => r.externalId) } } },
                is_listed: true,
              },
              data: { is_listed: false },
            });
            unlisted = result.count;
          }
          const finished = new Date();
          await tx.collection_scope.update({
            where: { id: scopeId },
            data: {
              coverage: "partial",
              last_attempt_status: "succeeded",
              last_successful_at: finished,
              last_error_code: null,
            },
          });
          await tx.collection_run.update({
            where: { id: runId },
            data: { status: "succeeded", finished_at: finished },
          });
        }
        return batch.length;
      }, this.publishTimeout(adapter.key));
    }
    return { unlisted, published };
  }
  async failRun(scopeId: string, runId: string, code: string) {
    await this.transaction("fail_run", async (tx) => {
      await tx.collection_scope.update({
        where: { id: scopeId },
        data: { last_attempt_status: "failed", last_error_code: code },
      });
      await tx.collection_run.update({
        where: { id: runId },
        data: { status: "failed", finished_at: new Date(), error_code: code },
      });
      await this.bump(tx);
    }, this.controlTimeout());
  }
  private async content(
    tx: Tx,
    providerKey: string,
    c: NonNullable<Canonical["content"]>,
  ) {
    const key = {
      provider_key: providerKey,
      content_type: c.kind,
      external_id: c.externalId,
    };
    const found = await tx.content_source.findUnique({
      where: { provider_key_content_type_external_id: key },
    });
    if (found) {
      await tx.content.update({
        where: { id: found.content_id },
        data: {
          title: c.title,
          ...(c.posterUrl ? { poster_url: c.posterUrl } : {}),
          updated_at: new Date(),
        },
      });
      return found.content_id;
    }
    const id = randomUUID();
    await tx.content.create({ data: {
      id, kind: c.kind, title: c.title, poster_url: c.posterUrl ?? null,
    } });
    await tx.content_source.create({ data: { ...key, content_id: id } });
    return id;
  }
  private async team(
    tx: Tx,
    providerKey: string,
    team: NonNullable<Canonical["home"]>,
  ) {
    const key = { provider_key: providerKey, external_id: team.externalId };
    const found = await tx.team_source.findUnique({
      where: { provider_key_external_id: key },
    });
    if (found) {
      await tx.team.update({
        where: { id: found.team_id },
        data: { name: team.name },
      });
      return found.team_id;
    }
    const id = randomUUID();
    await tx.team.create({ data: { id, name: team.name } });
    await tx.team_source.create({ data: { ...key, team_id: id } });
    return id;
  }
  private async publishGameBatch(tx: Tx, adapter: ProviderAdapter, records: Canonical[], revision: bigint) {
    const unique = <T>(items: T[]) => [...new Set(items)];
    const key = (id: string, variant: string) => JSON.stringify([id, variant]);
    const observedAt = new Date();
    const sources = await tx.event_source.findMany({
      where: {
        provider_key: adapter.key,
        external_id: { in: unique(records.map((row) => row.externalId)) },
        variant_key: { in: unique(records.map((row) => row.variantKey)) },
      },
      include: { event: { include: {
        event_change: { orderBy: { catalog_revision: "desc" }, take: 1, select: { after_value: true } },
      } } },
    });
    const bySource = new Map(sources.map((row) => [key(row.external_id, row.variant_key), row]));
    const mappings = await tx.content_source.findMany({
      where: {
        provider_key: adapter.key,
        content_type: "game",
        external_id: { in: unique(records.map((row) => row.content!.externalId)) },
      },
      include: { content: true },
    });
    const byContent = new Map(mappings.map((row) => [row.external_id, row]));
    const newContents = new Map<string, Prisma.contentCreateManyInput>();
    const newEvents: Prisma.eventCreateManyInput[] = [];
    const newSources: Prisma.event_sourceCreateManyInput[] = [];
    const newDevices: Prisma.event_deviceCreateManyInput[] = [];
    const newChanges: Prisma.event_changeCreateManyInput[] = [];
    const unchanged: { external_id: string; variant_key: string }[] = [];
    const updates: Canonical[] = [];
    const firstMetadata = new Map<string, string>();
    const conflictingMetadata = new Set<string>();
    for (const record of records) {
      const content = record.content!;
      const signature = JSON.stringify([content.title, content.posterUrl ?? null]);
      const first = firstMetadata.get(content.externalId);
      if (first === undefined) firstMetadata.set(content.externalId, signature);
      else if (first !== signature) conflictingMetadata.add(content.externalId);
    }

    for (const record of records) {
      const content = record.content!;
      if (conflictingMetadata.has(content.externalId)) {
        updates.push(record);
        continue;
      }
      const mapped = byContent.get(content.externalId);
      const source = bySource.get(key(record.externalId, record.variantKey));
      const { sourceReleaseRegion, ...eventRecord } = record;
      const after = json(eventRecord);
      const sourceUpdatedAt = record.sourceUpdatedAt ? new Date(record.sourceUpdatedAt) : null;
      const contentMatches = !mapped || (mapped.content.title === content.title &&
        (!content.posterUrl || mapped.content.poster_url === content.posterUrl));

      if (source) {
        if (source.event.kind === record.kind && source.event.origin === adapter.origin &&
            source.event.is_listed && contentMatches && mapped?.content_id === source.event.content_id &&
            source.source_release_region === (sourceReleaseRegion ?? null) && source.source_url === record.sourceUrl &&
            (source.source_updated_at?.getTime() ?? null) === (sourceUpdatedAt?.getTime() ?? null) &&
            stable(source.event.event_change[0]?.after_value) === stable(after)) {
          unchanged.push({ external_id: record.externalId, variant_key: record.variantKey });
        } else {
          updates.push(record);
        }
        continue;
      }

      let contentId = mapped?.content_id;
      if (!contentId) {
        const previous = newContents.get(content.externalId);
        contentId = previous?.id ?? randomUUID();
        if (!previous) newContents.set(content.externalId,
          { id: contentId, kind: "game", title: content.title, poster_url: content.posterUrl ?? null });
      } else if (!contentMatches) {
        updates.push(record);
        continue;
      }

      // Eligibility is checked by the caller; retain the original source key and separate platform rows.
      if (record.time.type !== "date_only") throw Error("INVALID_GAME_BATCH_TIME");
      const eventId = randomUUID();
      newEvents.push({
        id: eventId, kind: record.kind, content_type: "game", content_id: contentId,
        title: record.title, status: record.status, precision: "date_only",
        local_date: new Date(record.time.value + "T00:00:00Z"), release_market: record.market,
        venue_country: record.venueCountry, origin: adapter.origin,
      });
      newSources.push({
        provider_key: adapter.key, external_id: record.externalId, variant_key: record.variantKey,
        event_id: eventId, source_url: record.sourceUrl, observed_at: observedAt,
        source_updated_at: sourceUpdatedAt, source_release_region: sourceReleaseRegion ?? null,
      });
      newDevices.push(...record.devices.map((device) => ({ event_id: eventId, device })));
      newChanges.push({
        id: randomUUID(), event_id: eventId, catalog_revision: revision,
        before_value: Prisma.DbNull, after_value: after,
      });
    }

    if (newContents.size) {
      await tx.content.createMany({ data: [...newContents.values()] });
      await tx.content_source.createMany({ data: [...newContents].map(([externalId, row]) => ({
        provider_key: adapter.key, content_type: "game", external_id: externalId, content_id: row.id,
      })) });
    }
    if (newEvents.length) {
      await tx.event.createMany({ data: newEvents });
      await tx.event_source.createMany({ data: newSources });
      if (newDevices.length) await tx.event_device.createMany({ data: newDevices });
      await tx.event_change.createMany({ data: newChanges });
    }
    if (unchanged.length) {
      await tx.event_source.updateMany({
        where: { provider_key: adapter.key, OR: unchanged }, data: { observed_at: observedAt },
      });
    }
    for (const record of updates) await this.publish(tx, adapter, record, revision);
  }

  private async publish(
    tx: Tx,
    adapter: ProviderAdapter,
    r: Canonical,
    revision: bigint,
  ) {
    const key = {
      provider_key: adapter.key,
      external_id: r.externalId,
      variant_key: r.variantKey,
    };
    const source = await tx.event_source.findUnique({
      where: { provider_key_external_id_variant_key: key },
    });
    if (r.sourceReleaseRegion != null && adapter.key !== "igdb")
      throw new Error("SOURCE_REGION_PROVIDER_MISMATCH");
    if (source?.source_release_region != null && r.sourceReleaseRegion != null &&
        source.source_release_region !== r.sourceReleaseRegion)
      throw new Error("SOURCE_REGION_CHANGED");
    const prior = source
      ? await tx.event.findUniqueOrThrow({ where: { id: source.event_id } })
      : null;
    if (prior && (prior.kind !== r.kind || prior.origin !== adapter.origin))
      throw new Error("IDENTITY_CHANGED");
    const contentId = r.content
      ? await this.content(tx, adapter.key, r.content)
      : null;
    let seasonId: string | null = null;
    if (contentId && r.seasonNumber !== null) {
      seasonId = (
        await tx.drama_season.upsert({
          where: {
            content_id_season_number: {
              content_id: contentId,
              season_number: r.seasonNumber,
            },
          },
          create: {
            id: randomUUID(),
            content_id: contentId,
            season_number: r.seasonNumber,
          },
          update: {},
        })
      ).id;
    }
    const t = r.time;
    const data = {
      kind: r.kind,
      ott_category: r.kind === "ott_season_premiere" ? (r.ottCategory ?? "series") : null,
      title: r.title,
      content_id: contentId,
      content_type: r.content?.kind ?? null,
      season_id: seasonId,
      status: r.status,
      is_listed: true,
      precision: t.type,
      instant_at: t.type === "instant" ? new Date(t.value) : null,
      local_date:
        t.type === "date_only" ? new Date(t.value + "T00:00:00Z") : null,
      source_time_zone: t.type === "instant" ? t.sourceTimeZone : null,
      announced_year: t.type === "unknown" ? t.announcedYear : null,
      announced_period: t.type === "unknown" ? t.announcedPeriod : null,
      release_market: r.market,
      venue_country: r.venueCountry,
      home_team_id: r.home ? await this.team(tx, adapter.key, r.home) : null,
      away_team_id: r.away ? await this.team(tx, adapter.key, r.away) : null,
      origin: adapter.origin,
    };
    const eventId = prior?.id ?? randomUUID();
    const last = prior
      ? await tx.event_change.findFirst({
          where: { event_id: eventId },
          orderBy: { catalog_revision: "desc" },
        })
      : null;
    // Provenance belongs to the source binding, not to the public event history.
    const { sourceReleaseRegion: _sourceReleaseRegion, ...eventRecord } = r;
    const after = json(eventRecord);
    if (!last || stable(last.after_value) !== stable(after)) {
      await tx.event.upsert({
        where: { id: eventId },
        create: { id: eventId, ...data },
        update: { ...data, updated_at: new Date() },
      });
      await tx.event_service.deleteMany({ where: { event_id: eventId } });
      await tx.event_device.deleteMany({ where: { event_id: eventId } });
      if (r.services.length)
        await tx.event_service.createMany({
          data: r.services.map((service) => ({ event_id: eventId, service })),
        });
      if (r.devices.length)
        await tx.event_device.createMany({
          data: r.devices.map((device) => ({ event_id: eventId, device })),
        });
      await tx.event_change.create({
        data: {
          id: randomUUID(),
          event_id: eventId,
          catalog_revision: revision,
          before_value: last?.after_value ?? Prisma.DbNull,
          after_value: after,
        },
      });
    }
    if (prior && !prior.is_listed)
      await tx.event.update({ where: { id: eventId }, data: { is_listed: true } });
    await tx.event_source.upsert({
      where: { provider_key_external_id_variant_key: key },
      create: {
        ...key,
        event_id: eventId,
        source_url: r.sourceUrl,
        observed_at: new Date(),
        source_updated_at: r.sourceUpdatedAt
          ? new Date(r.sourceUpdatedAt)
          : null,
        source_release_region: r.sourceReleaseRegion ?? null,
      },
      update: {
        source_url: r.sourceUrl,
        observed_at: new Date(),
        source_updated_at: r.sourceUpdatedAt
          ? new Date(r.sourceUpdatedAt)
          : null,
        ...(r.sourceReleaseRegion != null ? { source_release_region: r.sourceReleaseRegion } : {}),
      },
    });
  }
}
