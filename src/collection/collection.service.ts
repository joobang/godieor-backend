import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { DateTime } from "luxon";
import { CollectionRepository } from "./collection.repository";
import { normalize, ProviderAdapter, Scope } from "./domain/provider-record";
import { collectionDiagnostic } from "../common/collection-diagnostic";
export const PROVIDER_ADAPTERS = Symbol("PROVIDER_ADAPTERS");
export type CollectionOutcome = {
  provider: string;
  category: string;
  status: string;
  published?: number;
  errorCode?: string;
  causeCode?: string;
  market?: string;
  phase?: string;
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
      state.last_attempt_status === "succeeded" &&
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
    let phase = "fetch";
    try {
      const rawRecords = await adapter.fetch(scope, mode);
      phase = "normalize";
      const records = rawRecords.map((raw) =>
        normalize(raw, scope),
      );
      if (adapter.refreshMissing) {
        phase = "refresh_missing";
        const previous = (await this.repository.publishedRecords(adapter.key, scope)).map(raw => normalize(raw, scope));
        records.push(...(await adapter.refreshMissing(scope, previous, records)).map(raw => normalize(raw, scope)));
      }
      phase = "validate";
      const keys = new Set<string>();
      for (const record of records) {
        const key = JSON.stringify([record.externalId, record.variantKey]);
        if (keys.has(key)) throw new Error("DUPLICATE_SOURCE_KEY");
        keys.add(key);
      }
      phase = "publish";
      await this.repository.publishScope(adapter, state.id, records, runId);
      return {
        provider: adapter.key,
        category: scope.category,
        status: "succeeded",
        published: records.length,
      };
    } catch (error) {
      const diagnostic = collectionDiagnostic(error);
      const code = diagnostic.code;
      await this.repository.failRun(state.id, runId, code);
      return {
        provider: adapter.key,
        category: scope.category,
        status: "failed",
        errorCode: code,
        ...(diagnostic.causeCode ? { causeCode: diagnostic.causeCode } : {}),
        market: scope.market,
        phase,
      };
    }
  }
}
