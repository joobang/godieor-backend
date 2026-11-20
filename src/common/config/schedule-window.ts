import { DateTime } from "luxon";

export const PRODUCT_START_DAY = "2026-10-01";

export function recentScheduleStart(zone: string, now = DateTime.now()): string {
  const recent = now.setZone(zone).minus({ months: 1 }).toISODate()!;
  return recent < PRODUCT_START_DAY ? PRODUCT_START_DAY : recent;
}


// Keep a date that can still fall inside any supported user's rolling window.
export function safeRetentionBounds(now = DateTime.now()) {
  const date = recentScheduleStart("Etc/GMT+12", now);
  const instant = DateTime.fromISO(date, { zone: "Pacific/Kiritimati" }).toUTC().toJSDate();
  return { date, instant };
}
