import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common";
import {
  CatalogQuery,
  invalidQuery,
  parseCatalogQuery,
  parseIdentifier,
} from "./catalog-query.dto";
import { TIME_ZONES, validZone } from "../../common/config/catalog.constants";
@Injectable()
export class CalendarQueryPipe implements PipeTransform<
  Record<string, unknown>,
  CatalogQuery
> {
  transform(raw: Record<string, unknown>) {
    return parseCatalogQuery(raw, true);
  }
}
@Injectable()
export class EventsQueryPipe implements PipeTransform<
  Record<string, unknown>,
  CatalogQuery
> {
  transform(raw: Record<string, unknown>) {
    return parseCatalogQuery(raw, false);
  }
}
@Injectable()
export class ContentIdPipe implements PipeTransform<string, string> {
  transform(value: string) {
    return parseIdentifier(value);
  }
}
@Injectable()
export class DetailQueryPipe implements PipeTransform<
  Record<string, unknown>,
  string
> {
  transform(raw: Record<string, unknown>) {
    if (
      Object.keys(raw).some((key) => key !== "timeZone") ||
      (raw.timeZone !== undefined && typeof raw.timeZone !== "string")
    )
      throw new BadRequestException({
        code: "INVALID_QUERY",
        message: "시간대를 확인하세요.",
      });
    const zone =
      raw.timeZone === undefined ? "Asia/Seoul" : (raw.timeZone as string);
    if (!validZone(zone) || !TIME_ZONES.includes(zone))
      invalidQuery("timeZone");
    return zone;
  }
}
