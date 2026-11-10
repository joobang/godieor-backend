import { z } from "zod";
import { readFile } from "node:fs/promises";
import { normalize, Canonical, Category, ProviderAdapter, Scope } from "../collection/domain/provider-record";
import { COUNTRIES, KIND_CATEGORY } from "../common/config/catalog.constants";

const key = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,249}$/);
const entry = z.object({
  record: z.unknown(),
  reviewedBy: z.string().trim().min(2).max(120),
  reviewedAt: z.iso.datetime({ offset: true }),
  evidence: z.string().trim().min(20).max(2000),
}).strict();
const inputSchema = z.object({
  version: z.literal(1),
  category: z.enum(["movie", "game", "epl"]),
  market: z.enum(COUNTRIES),
  records: z.array(entry).min(1).max(250),
}).strict();

export type ReviewedBatch = { category: Category; market: string; records: Canonical[] };

export function prepareCatalogReview(input: unknown): ReviewedBatch {
  const parsed = inputSchema.parse(input);
  const scope: Scope = { category: parsed.category, market: parsed.market };
  const identities = new Set<string>();
  const records = parsed.records.map(({ record }) => {
    const canonical = normalize(record, scope);
    key.parse(canonical.externalId);
    key.parse(canonical.variantKey);
    if (canonical.content) key.parse(canonical.content.externalId);
    if (canonical.home) key.parse(canonical.home.externalId);
    if (canonical.away) key.parse(canonical.away.externalId);
    const identity = JSON.stringify([canonical.externalId, canonical.variantKey]);
    if (identities.has(identity)) throw new Error("DUPLICATE_SOURCE_KEY");
    identities.add(identity);
    if (KIND_CATEGORY[canonical.kind] !== parsed.category) throw new Error("SCOPE_MISMATCH");
    return canonical;
  });
  return { category: parsed.category, market: parsed.market, records };
}

export async function readCatalogReview(filename: string): Promise<ReviewedBatch> {
  return prepareCatalogReview(JSON.parse(await readFile(filename, "utf8")));
}

export class ReviewedCatalogAdapter implements ProviderAdapter {
  readonly origin = "provider" as const;
  readonly key: string;
  readonly name: string;
  readonly scopes: Scope[];
  constructor(private readonly batch: ReviewedBatch, private readonly preflight: (provider: string, records: readonly Canonical[]) => Promise<void>) {
    this.key = `reviewed_${batch.category}`;
    this.name = `Manually reviewed ${batch.category} official events`;
    this.scopes = [{ category: batch.category, market: batch.market }];
  }
  async fetch(scope: Scope): Promise<unknown[]> {
    if (scope.category !== this.batch.category || scope.market !== this.batch.market) throw new Error("SCOPE_MISMATCH");
    await this.preflight(this.key, this.batch.records);
    return structuredClone(this.batch.records);
  }
}
