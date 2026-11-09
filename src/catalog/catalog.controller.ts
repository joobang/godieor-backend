import { Controller, Get, Param, Query } from "@nestjs/common";
import { CatalogService } from "./catalog.service";
import {
  CalendarQueryPipe,
  ContentIdPipe,
  DetailQueryPipe,
  EventsQueryPipe,
} from "./dto/catalog-query.pipe";
import { CatalogQuery } from "./dto/catalog-query.dto";

@Controller()
export class CatalogController {
  constructor(private readonly service: CatalogService) {}

  @Get("catalog/options")
  options() {
    return this.service.options();
  }

  @Get("calendar")
  calendar(@Query(CalendarQueryPipe) query: CatalogQuery) {
    return this.service.calendar(query);
  }

  @Get("events")
  events(@Query(EventsQueryPipe) query: CatalogQuery) {
    return this.service.events(query);
  }

  @Get("events/:id")
  detail(
    @Param("id", ContentIdPipe) id: string,
    @Query(DetailQueryPipe) zone: string,
  ) {
    return this.service.detail(id, zone);
  }

  @Get("contents/:id")
  content(@Param("id", ContentIdPipe) id: string) {
    return this.service.content(id);
  }
}
