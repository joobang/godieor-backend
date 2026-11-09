import { Injectable } from "@nestjs/common";
import { DateTime } from "luxon";
import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../database/prisma.service";
import { KIND_CATEGORY } from "../common/config/catalog.constants";
import { CatalogQuery } from "./dto/catalog-query.dto";

type Tx = Prisma.TransactionClient;
export const eventIncludes = {
  event_service: true,
  event_device: true,
  drama_season: true,
  team_event_home_team_idToteam: true,
  team_event_away_team_idToteam: true,
} as const;
export type EventRow = Prisma.eventGetPayload<{
  include: typeof eventIncludes;
}>;
export type ScopeRow = Prisma.collection_scopeGetPayload<{
  include: { provider: true };
}>;
export type EventKey = {
  id: string;
  sort_day: string;
  sort_rank: number;
  sort_time: string;
};
export type CursorPosition = { version: string; key: EventKey };
export class CatalogVersionChangedError extends Error {}

@Injectable()
export class CatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  private conditions(query: CatalogQuery) {
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
    if (query.schedule === "undated")
      clauses.push(
        Prisma.sql`e.precision='unknown' AND (e.announced_year IS NULL OR e.announced_year>=2026)`,
      );
    else {
      const start = DateTime.fromISO(query.from!, { zone: query.zone })
        .toUTC()
        .toJSDate();
      const end = DateTime.fromISO(query.to!, { zone: query.zone })
        .toUTC()
        .toJSDate();
      clauses.push(
        Prisma.sql`((e.precision='date_only' AND e.local_date>=${query.from}::date AND e.local_date<${query.to}::date) OR (e.precision='instant' AND e.instant_at>=${start} AND e.instant_at<${end}))`,
      );
    }
    return Prisma.join(clauses, " AND ");
  }

  private selection(query: CatalogQuery) {
    return Prisma.sql`SELECT e.id, CASE WHEN e.precision='date_only' THEN to_char(e.local_date, 'YYYY-MM-DD') WHEN e.precision='instant' THEN to_char(e.instant_at AT TIME ZONE ${query.zone}, 'YYYY-MM-DD') ELSE '' END AS sort_day, CASE WHEN e.precision='instant' THEN 1 ELSE 0 END AS sort_rank, CASE WHEN e.precision='instant' THEN to_char(e.instant_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US') ELSE '' END AS sort_time FROM event e WHERE ${this.conditions(query)}`;
  }

  private snapshot<T>(
    query: CatalogQuery,
    operation: (transaction: Tx, version: string) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(
      async (transaction) => {
        const current = await transaction.catalog_state.findUniqueOrThrow({
          where: { singleton: true },
        });
        const version = current.revision.toString();
        if (query.revision && query.revision !== version)
          throw new CatalogVersionChangedError();
        return operation(transaction, version);
      },
      { isolationLevel: "RepeatableRead" },
    );
  }

  private scopes(transaction: Tx, query: CatalogQuery) {
    return transaction.collection_scope.findMany({
      where: {
        category: {
          in: query.categories as ("movie" | "ott" | "game" | "epl")[],
        },
      },
      include: { provider: true },
      orderBy: [{ provider_key: "asc" }, { category: "asc" }],
    });
  }

  findEvents(query: CatalogQuery, after: CursorPosition | null) {
    return this.snapshot(query, async (transaction, version) => {
      const seek = after
        ? query.schedule === "undated"
          ? Prisma.sql`WHERE id > ${after.key.id}::uuid`
          : Prisma.sql`WHERE (sort_day, sort_rank, sort_time, id) > (${after.key.sort_day}, ${after.key.sort_rank}, ${after.key.sort_time}, ${after.key.id}::uuid)`
        : Prisma.empty;
      const order =
        query.schedule === "undated"
          ? Prisma.sql`id`
          : Prisma.sql`sort_day, sort_rank, sort_time, id`;
      const keys = await transaction.$queryRaw<EventKey[]>(
        Prisma.sql`WITH selected AS (${this.selection(query)}) SELECT * FROM selected ${seek} ORDER BY ${order} LIMIT ${query.limit + 1}`,
      );
      const shown = keys.slice(0, query.limit);
      const rows = await transaction.event.findMany({
        where: { id: { in: shown.map((row) => row.id) } },
        include: eventIncludes,
      });
      const byId = new Map(rows.map((row) => [row.id, row]));
      return {
        version,
        rows: shown.map((key) => byId.get(key.id)!),
        lastKey: shown.at(-1),
        hasMore: keys.length > query.limit,
        scopes: await this.scopes(transaction, query),
      };
    });
  }

  findCalendar(query: CatalogQuery) {
    return this.snapshot(query, async (transaction, version) => {
      const keys = await transaction.$queryRaw<
        (EventKey & { day_total: bigint })[]
      >(
        Prisma.sql`WITH selected AS (${this.selection(query)}), ranked AS (SELECT *, count(*) OVER(PARTITION BY sort_day) AS day_total, row_number() OVER(PARTITION BY sort_day ORDER BY sort_rank, sort_time, id) AS rn FROM selected) SELECT id, sort_day, sort_rank, sort_time, day_total FROM ranked WHERE rn<=2 ORDER BY sort_day, sort_rank, sort_time, id`,
      );
      const rows = await transaction.event.findMany({
        where: { id: { in: keys.map((key) => key.id) } },
        include: eventIncludes,
      });
      return {
        version,
        keys,
        rows,
        scopes: await this.scopes(transaction, query),
      };
    });
  }

  findEventDetail(eventId: string) {
    return this.prisma.$transaction(
      async (transaction) => {
        const row = await transaction.event.findUnique({
          where: { id: eventId },
          include: { ...eventIncludes, event_source: true },
        });
        if (!row) return null;
        const history = await transaction.$queryRaw<
          {
            before_value: {
              time?: {
                type: string;
                value?: string;
                sourceTimeZone?: string | null;
              };
            };
          }[]
        >(
          Prisma.sql`SELECT before_value FROM event_change WHERE event_id=${eventId}::uuid AND before_value->'time' IS DISTINCT FROM after_value->'time' AND before_value->'time'->>'type' IN ('instant', 'date_only') ORDER BY catalog_revision DESC LIMIT 1`,
        );
        return { row, previous: history[0]?.before_value.time ?? null };
      },
      { isolationLevel: "RepeatableRead" },
    );
  }

  findContent(contentId: string) {
    return this.prisma.content.findUnique({
      where: { id: contentId },
      include: { drama_season: { orderBy: { season_number: "asc" } } },
    });
  }
}
