import { z } from "zod";
import { DateTime } from "luxon";
import {
  DEVICES,
  SERVICES,
  KIND_CATEGORY,
  validZone,
} from "../../common/config/catalog.constants";
const identifier = z.string().min(1).max(250);
const content = z
  .object({
    externalId: identifier,
    kind: z.enum(["movie", "drama", "game"]),
    title: identifier,
  })
  .strict();
const team = z.object({ externalId: identifier, name: identifier }).strict();
const time = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("instant"),
      value: z.string().regex(/(Z|[+-]\d{2}:\d{2})$/),
      sourceTimeZone: z.string().nullable(),
    })
    .strict(),
  z
    .object({
      type: z.literal("date_only"),
      value: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
    .strict(),
  z
    .object({
      type: z.literal("unknown"),
      announcedYear: z.number().int().min(1900).max(9999).nullable(),
      announcedPeriod: z.string().max(100).nullable(),
    })
    .strict(),
]);
const recordSchema = z
  .object({
    externalId: identifier,
    variantKey: identifier,
    kind: z.enum([
      "theatrical_release",
      "ott_season_premiere",
      "game_release",
      "epl_match",
    ]),
    title: identifier,
    content: content.nullable(),
    seasonNumber: z.number().int().positive().nullable(),
    status: z.enum(["scheduled", "postponed", "cancelled"]),
    time,
    market: z
      .string()
      .regex(/^([A-Z]{2}|WORLD)$/)
      .nullable(),
    venueCountry: z
      .string()
      .regex(/^[A-Z]{2}$/)
      .nullable(),
    services: z.array(z.enum(SERVICES)),
    devices: z.array(z.enum(DEVICES)),
    home: team.nullable(),
    away: team.nullable(),
    sourceUrl: z.url().max(2000),
    sourceUpdatedAt: z.iso.datetime({ offset: true }).nullable(),
  })
  .strict();
export type Category = "movie" | "ott" | "game" | "epl";
export type Scope = { category: Category; market: string };
export type Canonical = z.infer<typeof recordSchema>;
export interface ProviderAdapter {
  key: string;
  name: string;
  origin: "fixture" | "provider";
  scopes: Scope[];
  fetch(scope: Scope, mode: "backfill" | "daily"): Promise<unknown[]>;
}
export function normalize(value: unknown, scope: Scope): Canonical {
  const r = recordSchema.parse(value);
  if (KIND_CATEGORY[r.kind] !== scope.category)
    throw new Error("SCOPE_MISMATCH");
  if (r.market !== (r.kind === "epl_match" ? null : scope.market))
    throw new Error("MARKET_MISMATCH");
  if (r.kind === "epl_match") {
    if (
      r.content ||
      r.seasonNumber !== null ||
      !r.home ||
      !r.away ||
      r.home.externalId === r.away.externalId
    )
      throw new Error("INVALID_MATCH");
  } else {
    const expected =
      r.kind === "theatrical_release"
        ? "movie"
        : r.kind === "ott_season_premiere"
          ? "drama"
          : "game";
    if (!r.content || r.content.kind !== expected || r.home || r.away)
      throw new Error("INVALID_CONTENT");
  }
  if (
    r.kind !== "ott_season_premiere" &&
    (r.seasonNumber !== null || r.services.length)
  )
    throw new Error("INVALID_SEASON_OR_SERVICE");
  if (
    r.kind === "ott_season_premiere" &&
    (!r.services.length || r.market === "WORLD")
  )
    throw new Error("MISSING_OTT_EVIDENCE");
  if (r.kind !== "game_release" && r.devices.length)
    throw new Error("INVALID_DEVICE");
  if (r.kind === "game_release" && !r.devices.length)
    throw new Error("MISSING_GAME_DEVICE");
  r.services = [...new Set(r.services)].sort();
  r.devices = [...new Set(r.devices)].sort();
  if (r.time.type === "date_only") {
    const dt = DateTime.fromISO(r.time.value, { zone: "UTC" });
    if (!dt.isValid || dt.toISODate() !== r.time.value)
      throw new Error("INVALID_DATE");
  } else if (r.time.type === "instant") {
    const dt = DateTime.fromISO(r.time.value, { setZone: true });
    if (
      !dt.isValid ||
      (r.time.sourceTimeZone && !validZone(r.time.sourceTimeZone))
    )
      throw new Error("INVALID_INSTANT");
    r.time.value = dt.toUTC().toISO()!;
  }
  const url = new URL(r.sourceUrl);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error("INVALID_SOURCE_URL");
  return r;
}
