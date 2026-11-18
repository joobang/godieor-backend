import type { ProviderAdapter } from "../collection/domain/provider-record";

export const REAL_PROVIDERS = ["kobis", "football_data_pl", "igdb"] as const;
export function providerOptions(args: string[]) {
  let mode: "daily" | "backfill" = "daily";
  let providers: string[] | null = null;
  let force = false;
  let market: string | undefined;
  const seen = new Set<string>();
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (!flag || !["--mode", "--providers", "--force", "--market"].includes(flag) || seen.has(flag)) throw Error("INVALID_COLLECTION_OPTIONS");
    seen.add(flag);
    if (flag === "--force") { force = true; continue; }
    const value = args[++i];
    if (flag === "--mode") {
      if (value !== "daily" && value !== "backfill") throw Error("INVALID_COLLECTION_MODE");
      mode = value;
    } else if (flag === "--market") {
      if (!value || !/^[A-Z]{2}$|^WORLD$/.test(value)) throw Error("INVALID_COLLECTION_MARKET");
      market = value;
    } else {
      providers = value?.split(",") ?? [];
      if (!providers.length || new Set(providers).size !== providers.length ||
          providers.some(p => !(REAL_PROVIDERS as readonly string[]).includes(p))) throw Error("INVALID_COLLECTION_PROVIDERS");
    }
  }
  if (market && (mode !== "backfill" || providers?.length !== 1 || providers[0] !== "igdb"))
    throw Error("INVALID_COLLECTION_MARKET");
  return { mode, providers, force, ...(market ? { market } : {}) };
}
export function selectProviders<T extends { key: string }>(configured: T[], requested: string[] | null): T[] {
  const selected = configured.filter(a => (REAL_PROVIDERS as readonly string[]).includes(a.key) && (!requested || requested.includes(a.key)));
  if (!selected.length || requested?.some(p => !selected.some(a => a.key === p))) throw Error("MISSING_REQUESTED_PROVIDER_KEY");
  return selected;
}

export function selectCollectionAdapters(configured: ProviderAdapter[], options: ReturnType<typeof providerOptions>) {
  const selected = selectProviders(configured, options.providers);
  if (!options.market) return selected;
  const igdb = selected[0];
  const scope = igdb?.scopes.find(candidate => candidate.market === options.market);
  if (!igdb || igdb.key !== "igdb" || !scope) throw Error("INVALID_COLLECTION_MARKET");
  return [{
    key: igdb.key,
    name: igdb.name,
    origin: igdb.origin,
    scopes: [scope],
    fetch: igdb.fetch.bind(igdb),
    refreshMissing: igdb.refreshMissing?.bind(igdb),
  }];
}
