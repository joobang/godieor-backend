import { BadRequestException } from "@nestjs/common";
import { DateTime } from "luxon";
import {
  CATEGORIES,
  COUNTRIES,
  DEVICES,
  SERVICES,
  TIME_ZONES,
  validZone,
} from "../../common/config/catalog.constants";
export type CatalogQuery = {
  country: string;
  zone: string;
  categories: string[];
  services: string[];
  devices: string[];
  revision?: string;
  month?: string;
  schedule?: string;
  from?: string;
  to?: string;
  contentId?: string;
  limit: number;
  cursor?: string;
};
export function invalidQuery(field: string): never {
  throw new BadRequestException({
    code: "INVALID_QUERY",
    message: "조회 조건을 확인하세요.",
    details: [{ field, reason: "유효하지 않거나 지원하지 않는 값" }],
  });
}
export function parseIdentifier(value: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  )
    invalidQuery("id");
  return value;
}
function revision(value: string | undefined) {
  if (value && !/^[1-9][0-9]{0,18}$/.test(value))
    invalidQuery("catalogRevision");
  return value;
}
export function parseCatalogQuery(
  raw: Record<string, unknown>,
  calendar: boolean,
): CatalogQuery {
  const allowed = new Set([
    "country",
    "timeZone",
    "categories",
    "services",
    "devices",
    "catalogRevision",
    ...(calendar
      ? ["month"]
      : ["schedule", "from", "to", "contentId", "limit", "cursor"]),
  ]);
  const values: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!allowed.has(k) || typeof v !== "string" || v.length > 4096)
      invalidQuery(k);
    values[k] = v;
  }
  function list(
    key: string,
    valid: readonly string[],
    fallback: readonly string[],
  ) {
    const value = values[key];
    const a = value ? value.split(",") : [...fallback];
    if (new Set(a).size !== a.length || a.some((x) => !valid.includes(x)))
      invalidQuery(key);
    return [...new Set(a)].sort();
  }
  const q: CatalogQuery = {
    country: values.country || "KR",
    zone: values.timeZone || "Asia/Seoul",
    categories: list("categories", CATEGORIES, CATEGORIES),
    services: list("services", SERVICES, []),
    devices: list("devices", DEVICES, []),
    revision: revision(values.catalogRevision),
    limit: Number(values.limit || 50),
    cursor: values.cursor,
  };
  if (!(COUNTRIES as readonly string[]).includes(q.country))
    invalidQuery("country");
  if (!validZone(q.zone) || !TIME_ZONES.includes(q.zone))
    invalidQuery("timeZone");
  if (!Number.isInteger(q.limit) || q.limit < 1 || q.limit > 100)
    invalidQuery("limit");
  function date(value: string | undefined, field: string) {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) invalidQuery(field);
    const dt = DateTime.fromISO(value, { zone: q.zone });
    if (!dt.isValid || dt.toISODate() !== value) invalidQuery(field);
    return dt;
  }
  if (calendar) {
    if (!values.month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(values.month))
      invalidQuery("month");
    const first = date(values.month + "-01", "month");
    if (values.month < "2026-01") invalidQuery("month");
    q.month = values.month;
    q.schedule = "dated";
    q.from = first.toISODate()!;
    q.to = first.plus({ months: 1 }).toISODate()!;
  } else {
    if (!["dated", "undated"].includes(values.schedule ?? ""))
      invalidQuery("schedule");
    q.schedule = values.schedule;
    if (q.schedule === "dated") {
      const from = date(values.from, "from");
      const to = date(values.to, "to");
      const days = to.diff(from, "days").days;
      if (values.from! < "2026-01-01" || days <= 0 || days > 62)
        invalidQuery("from/to");
      q.from = values.from;
      q.to = values.to;
    } else if ("from" in values || "to" in values) invalidQuery("from/to");
    if (values.contentId) q.contentId = parseIdentifier(values.contentId);
  }
  return q;
}
