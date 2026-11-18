// Log classifications only: exception messages, queries and URLs may contain secrets.
const known = new Set([
  "MISSING_PROVIDER_KEY", "PROVIDER_HTTP_ERROR", "PROVIDER_AUTH_ERROR",
  "INVALID_PROVIDER_RESPONSE", "PROVIDER_PAGE_LIMIT", "INVALID_IGDB_REGION",
  "SCOPE_MISMATCH", "MARKET_MISMATCH", "INVALID_MATCH", "INVALID_CONTENT",
  "INVALID_SEASON_OR_SERVICE", "MISSING_OTT_EVIDENCE", "INVALID_DEVICE",
  "MISSING_GAME_DEVICE", "INVALID_DATE", "INVALID_INSTANT", "INVALID_SOURCE_URL",
  "DUPLICATE_SOURCE_KEY", "IDENTITY_CHANGED", "INVALID_FIXTURE_BATCH", "INVALID_FIXTURE_KIND",
  "SOURCE_REGION_CHANGED", "SOURCE_REGION_PROVIDER_MISMATCH", "INVALID_PUBLISHED_RECORD",
  "ADAPTER_ORIGIN_MISMATCH", "MAPPING_FILE_REQUIRED", "MISSING_REQUESTED_PROVIDER_KEY", "INVALID_COLLECTION_PUBLISH_TIMEOUT",
  "PROVIDER_TIMEOUT", "NORMALIZATION_FAILED", "INVALID_COLLECTION_CONTROL_TIMEOUT",
]);
const systemCodes = new Set(["ETIMEDOUT", "ECONNRESET", "ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN",
  "UND_ERR_CONNECT_TIMEOUT", "CERT_HAS_EXPIRED", "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "SELF_SIGNED_CERT_IN_CHAIN", "DEPTH_ZERO_SELF_SIGNED_CERT"]);
export const COLLECTION_PHASES = ["register", "find_scope", "begin_run", "fetch", "normalize",
  "refresh_missing", "validate", "publish", "fail_run"] as const;
export function collectionDiagnostic(error: unknown): { code: string; causeCode?: string; phase?: string } {
  const diagnostic = classify(error);
  const phase = error && typeof error === "object" ? (error as { collectionPhase?: unknown }).collectionPhase : undefined;
  return typeof phase === "string" && (COLLECTION_PHASES as readonly string[]).includes(phase)
    ? { ...diagnostic, phase } : diagnostic;
}
function classify(error: unknown): { code: string; causeCode?: string } {
  if (!error || typeof error !== "object") return { code: "COLLECTION_FAILED" };
  const e = error as { message?: unknown; name?: unknown; code?: unknown; cause?: unknown };
  if (typeof e.message === "string" && /^PROVIDER_HTTP_[1-5][0-9]{2}$/.test(e.message)) return { code: e.message };
  if (typeof e.message === "string" && known.has(e.message)) return { code: e.message };
  if (e.name === "ZodError") return { code: "NORMALIZATION_FAILED" };
  if (e.name === "TimeoutError" || e.name === "AbortError") return { code: "PROVIDER_TIMEOUT" };
  if (typeof e.code === "string" && /^P[12]\d{3}$/.test(e.code))
    return { code: e.code === "P2028" ? "DB_TRANSACTION_FAILED" : "DB_OPERATION_FAILED", causeCode: e.code };
  if (typeof e.code === "string" && systemCodes.has(e.code)) return { code: "CONNECTION_FAILED", causeCode: e.code };
  if (e.cause && e.cause !== error) {
    const cause = e.cause as { code?: unknown };
    if (typeof cause.code === "string" && systemCodes.has(cause.code))
      return { code: "CONNECTION_FAILED", causeCode: cause.code };
  }
  return { code: "COLLECTION_FAILED" };
}
