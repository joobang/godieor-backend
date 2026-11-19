import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../database/prisma.service";
import { Canonical, ProviderAdapter, Scope } from "./domain/provider-record";
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
    const batchSize = 100;
    const batches = Math.max(1, Math.ceil(records.length / batchSize));
    for (let index = 0; index < batches; index++) {
      const batch = records.slice(index * batchSize, (index + 1) * batchSize);
      const lastBatch = index === batches - 1;
      await this.transaction("publish", async (tx) => {
        const catalog = await this.bump(tx);
        for (const record of batch)
          await this.publish(tx, adapter, record, catalog.revision);
        if (lastBatch) {
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
      }, this.publishTimeout(adapter.key));
    }
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
