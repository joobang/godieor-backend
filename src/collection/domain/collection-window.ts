import { DateTime } from "luxon";
export type CollectionMode = "backfill" | "daily";
import { PRODUCT_START_DAY, recentScheduleStart } from "../../common/config/schedule-window";
export { PRODUCT_START_DAY };
export function withinProductWindow(day: string) { return day >= PRODUCT_START_DAY; }
export function gameCollectionWindow(mode: CollectionMode, now = DateTime.utc()) {
  // IGDB provides a civil date encoded in a UTC epoch. Use an earliest supported local day
  // for collection, then apply the exact display-timezone window on the read path.
  // Backfills also look for corrections moving a previously published date out of view.
  const earliest = mode === "backfill" ? PRODUCT_START_DAY : recentScheduleStart("Etc/GMT+12", now);
  const start = DateTime.fromISO(earliest, { zone: "utc" });
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
