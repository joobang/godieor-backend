import { DateTime } from "luxon";
import { z } from "zod";
import { Prisma } from "../../generated/prisma/client";
import { KIND_CATEGORY } from "../../common/config/catalog.constants";
import { CatalogQuery } from "../dto/catalog-query.dto";
// SQL-CATALOG-01/02: docs/query-policy.md. Parameters stay bound; runtime shape is checked.
const keySchema = z
  .object({
    id: z.uuid(),
    sort_day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    sort_rank: z.union([z.literal(0), z.literal(1)]),
    sort_time: z.string(),
  })
  .refine((k) =>
    k.sort_rank === 0
      ? k.sort_time === ""
      : /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}$/.test(k.sort_time),
  );
export type EventKey = z.infer<typeof keySchema>;
export const decodeEventKeys = (value: unknown) =>
  z.array(keySchema).parse(value);
export const decodeCalendarKeys = (value: unknown) =>
  z
    .array(keySchema.and(z.object({ day_total: z.bigint().positive() })))
    .parse(value);
function conditions(query: CatalogQuery) {
  const kinds = Object.entries(KIND_CATEGORY)
    .filter(([, category]) => query.categories.includes(category))
    .map(([kind]) => Prisma.sql`${kind}::event_kind`);
  const clauses = [
    Prisma.sql`e.kind IN (${Prisma.join(kinds)})`,
    Prisma.sql`(e.kind = 'epl_match' OR e.release_market IN (${query.country}, 'WORLD'))`,
  ];
  if (query.contentId)
    clauses.push(Prisma.sql`e.content_id = ${query.contentId}::uuid`);
  if (query.services.length)
    clauses.push(
      Prisma.sql`(e.kind <> 'ott_season_premiere' OR EXISTS (SELECT 1 FROM event_service s WHERE s.event_id=e.id AND s.service IN (${Prisma.join(query.services.map((service) => Prisma.sql`${service}::ott_service`))})))`,
    );
  if (query.devices.length)
    clauses.push(
      Prisma.sql`(e.kind <> 'game_release' OR EXISTS (SELECT 1 FROM event_device d WHERE d.event_id=e.id AND d.device IN (${Prisma.join(query.devices.map((device) => Prisma.sql`${device}::game_device`))})))`,
    );
  const start = DateTime.fromISO(query.from!, { zone: query.zone })
    .toUTC()
    .toJSDate();
  const end = DateTime.fromISO(query.to!, { zone: query.zone })
    .toUTC()
    .toJSDate();
  clauses.push(
    Prisma.sql`((e.precision='date_only' AND e.local_date>=${query.from}::date AND e.local_date<${query.to}::date) OR (e.precision='instant' AND e.instant_at>=${start} AND e.instant_at<${end}))`,
  );
  return Prisma.join(clauses, " AND ");
}

function selection(query: CatalogQuery) {
  return Prisma.sql`SELECT e.id, CASE WHEN e.precision='date_only' THEN to_char(e.local_date, 'YYYY-MM-DD') WHEN e.precision='instant' THEN to_char(e.instant_at AT TIME ZONE ${query.zone}, 'YYYY-MM-DD') ELSE '' END AS sort_day, CASE WHEN e.precision='instant' THEN 1 ELSE 0 END AS sort_rank, CASE WHEN e.precision='instant' THEN to_char(e.instant_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US') ELSE '' END AS sort_time FROM event e WHERE ${conditions(query)}`;
}

export function datedEventsSql(query: CatalogQuery, after: EventKey | null) {
  const seek = after
    ? Prisma.sql`WHERE (sort_day, sort_rank, sort_time, id) > (${after.sort_day}, ${after.sort_rank}, ${after.sort_time}, ${after.id}::uuid)`
    : Prisma.empty;
  return Prisma.sql`WITH selected AS (${selection(query)}) SELECT * FROM selected ${seek} ORDER BY sort_day, sort_rank, sort_time, id LIMIT ${query.limit + 1}`;
}
export function calendarSql(query: CatalogQuery) {
  return Prisma.sql`WITH selected AS (${selection(query)}), ranked AS (SELECT *, count(*) OVER(PARTITION BY sort_day) AS day_total, row_number() OVER(PARTITION BY sort_day ORDER BY sort_rank, sort_time, id) AS rn FROM selected) SELECT id, sort_day, sort_rank, sort_time, day_total FROM ranked WHERE rn<=2 ORDER BY sort_day, sort_rank, sort_time, id`;
}
