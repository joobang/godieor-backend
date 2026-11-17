import { DateTime } from "luxon";
export type CollectionMode = "backfill" | "daily";
// Shared lower bound for all published schedule categories and collection scopes.
export const PRODUCT_START_DAY = "2026-10-01";
export function withinProductWindow(day: string) { return day >= PRODUCT_START_DAY; }
export function gameCollectionWindow(mode: CollectionMode, now = DateTime.utc()) {
  const floor = DateTime.fromISO(PRODUCT_START_DAY, { zone: "utc" });
  const start = mode === "backfill" ? floor : DateTime.max(floor, now.toUTC().startOf("day").minus({ days: 30 }));
  return { from: Math.floor(start.toSeconds()), to: Math.floor(now.toUTC().startOf("day").plus({ days: 400 }).toSeconds()) };
}
export function movieCollectionYears(mode: CollectionMode, now = DateTime.now()) {
  const year = now.setZone("Asia/Seoul").year;
  const first = mode === "backfill" ? 2026 : Math.max(2026, year);
  return Array.from({ length: Math.max(0, year + 2 - first) }, (_, n) => first + n);
}
export function premierLeagueSeasons(mode: CollectionMode, now = DateTime.now()) {
  const local = now.setZone("Europe/London");
  const current = local.month >= 7 ? local.year : local.year - 1;
  const first = mode === "backfill" ? 2026 : Math.max(2026, current);
  return { current, years: Array.from({ length: Math.max(0, current + 2 - first) }, (_, n) => first + n) };
}
