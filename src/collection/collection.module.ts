import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { RuntimeConfigModule } from "../common/config/runtime-config.module";
import { CollectionRepository } from "./collection.repository";
import { CollectionService, PROVIDER_ADAPTERS } from "./collection.service";
import { CollectionScheduler } from "./collection.scheduler";
import { FixtureAdapter } from "./adapters/fixture.adapter";
import { IgdbAdapter, KobisAdapter, PremierLeagueAdapter } from "./adapters/official-sources";
@Module({
  imports: [DatabaseModule, RuntimeConfigModule],
  providers: [
    CollectionRepository,
    CollectionService,
    CollectionScheduler,
    FixtureAdapter,
    KobisAdapter,
    PremierLeagueAdapter,
    IgdbAdapter,
    {
      provide: PROVIDER_ADAPTERS,
      useFactory: (fixture: FixtureAdapter, kobis: KobisAdapter, epl: PremierLeagueAdapter, igdb: IgdbAdapter) => [
        ...(process.env.COLLECTION_INCLUDE_FIXTURE === "true" ? [fixture] : []),
        ...(process.env.KOBIS_API_KEY ? [kobis] : []),
        ...(process.env.FOOTBALL_DATA_API_KEY ? [epl] : []),
        ...(process.env.IGDB_CLIENT_ID && process.env.IGDB_CLIENT_SECRET ? [igdb] : []),
      ],
      inject: [FixtureAdapter, KobisAdapter, PremierLeagueAdapter, IgdbAdapter],
    },
  ],
  exports: [CollectionService],
})
export class CollectionModule {}
