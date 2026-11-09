import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { RuntimeConfigModule } from "../common/config/runtime-config.module";
import { CollectionRepository } from "./collection.repository";
import { CollectionService, PROVIDER_ADAPTERS } from "./collection.service";
import { CollectionScheduler } from "./collection.scheduler";
import { FixtureAdapter } from "./adapters/fixture.adapter";
@Module({
  imports: [DatabaseModule, RuntimeConfigModule],
  providers: [
    CollectionRepository,
    CollectionService,
    CollectionScheduler,
    FixtureAdapter,
    {
      provide: PROVIDER_ADAPTERS,
      useFactory: (fixture: FixtureAdapter) => [fixture],
      inject: [FixtureAdapter],
    },
  ],
  exports: [CollectionService],
})
export class CollectionModule {}
