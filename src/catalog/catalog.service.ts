import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DateTime } from "luxon";
import {
  CATEGORIES,
  COUNTRIES,
  DEVICES,
  iso,
  SERVICES,
  TIME_ZONES,
} from "../common/config/catalog.constants";
import {
  CatalogRepository,
  CatalogVersionChangedError,
} from "./catalog.repository";
import { CatalogQuery } from "./dto/catalog-query.dto";
import { CursorService } from "./cursor.service";
import {
  presentEvent,
  presentFreshness,
  presentTime,
} from "./presenters/catalog.presenter";

@Injectable()
export class CatalogService {
  constructor(
    private readonly repository: CatalogRepository,
    private readonly cursor: CursorService,
  ) {}

  options() {
    return {
      contractVersion: "0.1.0-draft.2",
      categories: CATEGORIES,
      services: SERVICES,
      devices: DEVICES,
      countries: COUNTRIES,
      timeZones: TIME_ZONES,
      queryDefaults: { country: "KR", timeZone: "Asia/Seoul" },
      newAccountDefaults: {
        version: "1",
        country: "KR",
        timeZone: "Asia/Seoul",
        enabledCategories: ["movie", "ott"],
        services: [],
        devices: [],
        view: "calendar",
      },
    };
  }

  private async consistent<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof CatalogVersionChangedError)
        throw new ConflictException({
          code: "CATALOG_CHANGED",
          message: "일정이 갱신되어 다시 조회해야 합니다.",
        });
      throw error;
    }
  }

  async events(query: CatalogQuery) {
    const after = this.cursor.decode(query);
    const criteria = after ? { ...query, revision: after.version } : query;
    const page = await this.consistent(() =>
      this.repository.findEvents(criteria, after),
    );
    return {
      catalogRevision: page.version,
      items: page.rows.map((row) => presentEvent(row, criteria.zone)),
      nextCursor: page.hasMore
        ? this.cursor.encode(criteria, page.version, page.lastKey!)
        : null,
      freshness: presentFreshness(page.scopes, criteria),
    };
  }

  async calendar(query: CatalogQuery) {
    const snapshot = await this.consistent(() =>
      this.repository.findCalendar(query),
    );
    const byId = new Map(snapshot.rows.map((row) => [row.id, row]));
    const first = DateTime.fromISO(query.from!, { zone: query.zone });
    const days = Array.from({ length: first.daysInMonth! }, (_, index) => {
      const date = first.plus({ days: index }).toISODate()!;
      const selected = snapshot.keys.filter((key) => key.sort_day === date);
      return {
        date,
        total: Number(selected[0]?.day_total ?? 0),
        previews: selected.map((key) =>
          presentEvent(byId.get(key.id)!, query.zone),
        ),
      };
    });
    return {
      month: query.month,
      catalogRevision: snapshot.version,
      days,
      freshness: presentFreshness(snapshot.scopes, query),
    };
  }

  async detail(eventId: string, zone: string) {
    const result = await this.repository.findEventDetail(eventId);
    if (!result)
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "일정을 찾을 수 없습니다.",
      });
    const { row, previous } = result;
    let previousTime = null;
    if (previous?.type === "instant" && previous.value)
      previousTime = presentTime(
        {
          precision: "instant",
          instant_at: new Date(previous.value),
          local_date: null,
          source_time_zone: previous.sourceTimeZone ?? null,
          announced_year: null,
          announced_period: null,
        },
        zone,
      );
    if (previous?.type === "date_only" && previous.value)
      previousTime = { type: "date_only", date: previous.value };
    return {
      event: presentEvent(row, zone),
      sources: row.event_source.map((source) => ({
        providerKey: source.provider_key,
        url: source.source_url,
        observedAt: source.observed_at.toISOString(),
        sourceUpdatedAt: iso(source.source_updated_at),
      })),
      previousTime,
    };
  }

  async content(contentId: string) {
    const row = await this.repository.findContent(contentId);
    if (!row)
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "작품을 찾을 수 없습니다.",
      });
    return {
      id: row.id,
      kind: row.kind,
      title: row.title,
      originalTitle: row.original_title,
      posterUrl: row.poster_url,
      synopsis: row.synopsis,
      seasons: row.drama_season.map((season) => ({
        id: season.id,
        number: season.season_number,
      })),
    };
  }
}
