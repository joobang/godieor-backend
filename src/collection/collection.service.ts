import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { DateTime } from "luxon";
import { CollectionRepository } from "./collection.repository";
import { normalize, ProviderAdapter, Scope } from "./domain/provider-record";
export const PROVIDER_ADAPTERS = Symbol("PROVIDER_ADAPTERS");
export type CollectionOutcome = {
  provider: string;
  category: string;
  status: string;
  published?: number;
  errorCode?: string;
};
@Injectable()
export class CollectionService implements OnModuleInit {
  constructor(
    private readonly repository: CollectionRepository,
    @Inject(PROVIDER_ADAPTERS) private readonly adapters: ProviderAdapter[],
  ) {}
  onModuleInit() {
    return this.repository.register(this.adapters);
  }
  async collect(
    mode: "backfill" | "daily",
    force = false,
  ): Promise<CollectionOutcome[]> {
    const outcomes: CollectionOutcome[] = [];
    for (const adapter of this.adapters) {
      const got = await this.repository.withCollectorLock(
        adapter.key,
        async () => {
          for (const scope of adapter.scopes)
            outcomes.push(await this.collectScope(adapter, scope, mode, force));
          return true;
        },
      );
      if (got === null)
        outcomes.push({
          provider: adapter.key,
          category: "all",
          status: "already_running",
        });
    }
    return outcomes;
  }

  private async collectScope(
    adapter: ProviderAdapter,
    scope: Scope,
    mode: "backfill" | "daily",
    force: boolean,
  ): Promise<CollectionOutcome> {
    const state = await this.repository.findScope(adapter.key, scope);
    if (
      mode === "daily" &&
      !force &&
      state.last_successful_at &&
      DateTime.fromJSDate(state.last_successful_at, {
        zone: "Asia/Seoul",
      }).toISODate() === DateTime.now().setZone("Asia/Seoul").toISODate()
    )
      return {
        provider: adapter.key,
        category: scope.category,
        status: "already_collected_today",
      };
    const runId = await this.repository.beginRun(state.id, mode);
    try {
      const records = (await adapter.fetch(scope, mode)).map((raw) =>
        normalize(raw, scope),
      );
      const keys = new Set<string>();
      for (const record of records) {
        const key = JSON.stringify([record.externalId, record.variantKey]);
        if (keys.has(key)) throw new Error("DUPLICATE_SOURCE_KEY");
        keys.add(key);
      }
      await this.repository.publishScope(adapter, state.id, records, runId);
      return {
        provider: adapter.key,
        category: scope.category,
        status: "succeeded",
        published: records.length,
      };
    } catch (error) {
      const known = new Set([
        "SCOPE_MISMATCH",
        "MARKET_MISMATCH",
        "INVALID_MATCH",
        "INVALID_CONTENT",
        "INVALID_SEASON_OR_SERVICE",
        "MISSING_OTT_EVIDENCE",
        "INVALID_DEVICE",
        "MISSING_GAME_DEVICE",
        "INVALID_DATE",
        "INVALID_INSTANT",
        "INVALID_SOURCE_URL",
        "DUPLICATE_SOURCE_KEY",
        "IDENTITY_CHANGED",
        "INVALID_FIXTURE_BATCH",
        "INVALID_FIXTURE_KIND",
      ]);
      const code =
        error instanceof Error && known.has(error.message)
          ? error.message
          : error instanceof Error && error.name === "ZodError"
            ? "NORMALIZATION_FAILED"
            : "COLLECTION_FAILED";
      await this.repository.failRun(state.id, runId, code);
      return {
        provider: adapter.key,
        category: scope.category,
        status: "failed",
        errorCode: code,
      };
    }
  }
}
