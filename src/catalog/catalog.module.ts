import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { RuntimeConfigModule } from "../common/config/runtime-config.module";
import { CatalogController } from "./catalog.controller";
import { CatalogService } from "./catalog.service";
import { CatalogRepository } from "./catalog.repository";
import { CursorService } from "./cursor.service";
import {
  CalendarQueryPipe,
  ContentIdPipe,
  DetailQueryPipe,
  EventsQueryPipe,
} from "./dto/catalog-query.pipe";
@Module({
  imports: [DatabaseModule, RuntimeConfigModule],
  controllers: [CatalogController],
  providers: [
    CatalogService,
    CatalogRepository,
    CursorService,
    CalendarQueryPipe,
    ContentIdPipe,
    DetailQueryPipe,
    EventsQueryPipe,
  ],
})
export class CatalogModule {}
