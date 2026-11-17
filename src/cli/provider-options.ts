export const REAL_PROVIDERS = ["kobis", "football_data_pl", "igdb"] as const;
export function providerOptions(args: string[]) {
  let mode: "daily" | "backfill" = "daily";
  let providers: string[] | null = null;
  let force = false;
  const seen = new Set<string>();
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (!flag || !["--mode", "--providers", "--force"].includes(flag) || seen.has(flag)) throw Error("INVALID_COLLECTION_OPTIONS");
    seen.add(flag);
    if (flag === "--force") { force = true; continue; }
    const value = args[++i];
    if (flag === "--mode") {
      if (value !== "daily" && value !== "backfill") throw Error("INVALID_COLLECTION_MODE");
      mode = value;
    } else {
      providers = value?.split(",") ?? [];
      if (!providers.length || new Set(providers).size !== providers.length ||
          providers.some(p => !(REAL_PROVIDERS as readonly string[]).includes(p))) throw Error("INVALID_COLLECTION_PROVIDERS");
    }
  }
  return { mode, providers, force };
}
export function selectProviders<T extends { key: string }>(configured: T[], requested: string[] | null): T[] {
  const selected = configured.filter(a => (REAL_PROVIDERS as readonly string[]).includes(a.key) && (!requested || requested.includes(a.key)));
  if (!selected.length || requested?.some(p => !selected.some(a => a.key === p))) throw Error("MISSING_REQUESTED_PROVIDER_KEY");
  return selected;
}
