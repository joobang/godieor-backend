import { Injectable } from "@nestjs/common";
import {
  Canonical,
  ProviderAdapter,
  Scope,
} from "../collection/domain/provider-record";
import {
  ReviewedMappingRepository,
  REVIEWED_PROVIDER_KEY,
} from "./reviewed-mapping.repository";

function freeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
@Injectable()
export class ReviewedOttAdapter implements ProviderAdapter {
  readonly key = REVIEWED_PROVIDER_KEY;
  readonly name = "Manually reviewed official OTT announcements";
  readonly origin = "provider" as const;
  private records: readonly Canonical[] | null = null;
  private preparedScopes: Scope[] = [];
  constructor(private readonly repository: ReviewedMappingRepository) {}
  get scopes(): Scope[] {
    return this.preparedScopes;
  }
  configure(records: Canonical[]): void {
    if (this.records || !records.length)
      throw new Error("INVALID_REVIEWED_CONFIGURATION");
    this.records = freeze(structuredClone(records));
    this.preparedScopes = freeze(
      [...new Set(records.map((x) => x.market!))]
        .sort()
        .map((market) => ({ category: "ott" as const, market })),
    );
  }
  assertConfigured(): void {
    if (!this.records) throw new Error("REVIEWED_NOT_CONFIGURED");
  }
  clear(): void {
    this.records = null;
    this.preparedScopes = [];
  }
  async fetch(scope: Scope, _mode: "backfill" | "daily"): Promise<unknown[]> {
    this.assertConfigured();
    if (
      !this.scopes.some(
        (x) => x.category === scope.category && x.market === scope.market,
      )
    )
      throw new Error("SCOPE_MISMATCH");
    // Validate ALL prepared identities before even the first scope can publish.
    // Do not acquire the same advisory lock again here.
    await this.repository.assertIdentities(this.records!);
    return structuredClone(
      this.records!.filter((x) => x.market === scope.market),
    );
  }
}
