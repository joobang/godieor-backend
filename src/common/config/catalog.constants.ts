import { DateTime, IANAZone } from "luxon";
export const CATEGORIES = ["movie", "ott", "game", "epl"] as const;
export const SERVICES = [
  "netflix",
  "disney_plus",
  "coupang_play",
  "tving",
] as const;
export const DEVICES = ["pc", "playstation", "xbox", "switch"] as const;
export const TIME_ZONES = [
  ...new Set(["UTC", ...Intl.supportedValuesOf("timeZone")]),
];
export const COUNTRIES = ["KR", "US", "GB", "JP"] as const;
export const KIND_CATEGORY = {
  theatrical_release: "movie",
  ott_season_premiere: "ott",
  game_release: "game",
  epl_match: "epl",
} as const;
export function validZone(zone: string) {
  return IANAZone.isValidZone(zone) || zone === "UTC";
}
export function iso(date: Date | null) {
  return date?.toISOString() ?? null;
}
export function calendarDate(date: Date) {
  return DateTime.fromJSDate(date, { zone: "utc" }).toISODate()!;
}
