import { Injectable } from "@nestjs/common";
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
export type { EventKey } from "./queries/catalog.sql";
import {
  EventKey,
  datedEventsSql,
  calendarSql,
  decodeEventKeys,
  decodeCalendarKeys,
} from "./queries/catalog.sql";
import { previousChangedTime } from "./queries/previous-time";
export type CursorPosition = { version: string; key: EventKey };
export class CatalogVersionChangedError extends Error {}

@Injectable()
export class CatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  private undatedWhere(
    query: CatalogQuery,
    after: CursorPosition | null,
  ): Prisma.eventWhereInput {
    const kinds = Object.entries(KIND_CATEGORY)
      .filter(([, category]) => query.categories.includes(category))
      .map(([kind]) => kind as EventRow["kind"]);
    return {
      AND: [
        { kind: { in: kinds } },
        {
          OR: [
            { kind: "epl_match" },
            { release_market: { in: [query.country, "WORLD"] } },
          ],
        },
        ...(query.contentId ? [{ content_id: query.contentId }] : []),
        ...(query.services.length
          ? [
              {
                OR: [
                  { kind: { not: "ott_season_premiere" as const } },
                  {
                    event_service: {
                      some: {
                        service: {
                          in: query.services as (
                            "netflix" | "disney_plus" | "coupang_play" | "tving"
                          )[],
                        },
                      },
                    },
                  },
                ],
              },
            ]
          : []),
        ...(query.devices.length
          ? [
              {
                OR: [
                  { kind: { not: "game_release" as const } },
                  {
                    event_device: {
                      some: {
                        device: {
                          in: query.devices as (
                            "pc" | "playstation" | "xbox" | "switch"
                          )[],
                        },
                      },
                    },
                  },
                ],
              },
            ]
          : []),
        { precision: "unknown" },
        { OR: [{ announced_year: null }, { announced_year: { gte: 2026 } }] },
        ...(after ? [{ id: { gt: after.key.id } }] : []),
      ],
    };
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
      // Ordinary relation filtering/keyset pagination uses Prisma Client.
      const keys: EventKey[] =
        query.schedule === "undated"
          ? (
              await transaction.event.findMany({
                where: this.undatedWhere(query, after),
                select: { id: true },
                orderBy: { id: "asc" },
                take: query.limit + 1,
              })
            ).map(({ id }) => ({
              id,
              sort_day: "",
              sort_rank: 0,
              sort_time: "",
            }))
          : decodeEventKeys(
              await transaction.$queryRaw<unknown>(
                datedEventsSql(query, after?.key ?? null),
              ),
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
      const keys = decodeCalendarKeys(
        await transaction.$queryRaw<unknown>(calendarSql(query)),
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
        return {
          row,
          previous: await previousChangedTime(transaction, eventId),
        };
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
