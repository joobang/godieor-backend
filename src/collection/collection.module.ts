import { DynamicModule, Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { RuntimeConfigModule } from "../common/config/runtime-config.module";
import { CollectionRepository } from "./collection.repository";
import { CollectionService, PROVIDER_ADAPTERS } from "./collection.service";
import { CollectionScheduler } from "./collection.scheduler";
import { FixtureAdapter } from "./adapters/fixture.adapter";
import { IgdbAdapter, KobisAdapter, PremierLeagueAdapter } from "./adapters/official-sources";
import { providerOptions, selectCollectionAdapters } from "../cli/provider-options";

const CLI_SELECTION = Symbol("CLI_SELECTION");

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
      useFactory: (fixture: FixtureAdapter, kobis: KobisAdapter, epl: PremierLeagueAdapter,
        igdb: IgdbAdapter, selection?: ReturnType<typeof providerOptions>) => {
        const configured = [
          ...(process.env.COLLECTION_INCLUDE_FIXTURE === "true" ? [fixture] : []),
          ...(process.env.KOBIS_API_KEY ? [kobis] : []),
          ...(process.env.FOOTBALL_DATA_API_KEY ? [epl] : []),
          ...(process.env.IGDB_CLIENT_ID && process.env.IGDB_CLIENT_SECRET ? [igdb] : []),
        ];
        return selection ? selectCollectionAdapters(configured, selection) : configured;
      },
      inject: [FixtureAdapter, KobisAdapter, PremierLeagueAdapter, IgdbAdapter,
        { token: CLI_SELECTION, optional: true }],
    },
  ],
  exports: [CollectionService],
})
export class CollectionModule {
  static forCli(selection: ReturnType<typeof providerOptions>): DynamicModule {
    return { module: CollectionModule, providers: [{ provide: CLI_SELECTION, useValue: selection }] };
  }
}
