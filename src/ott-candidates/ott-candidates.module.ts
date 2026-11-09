import { DynamicModule, Module } from "@nestjs/common";
import { resolve } from "node:path";
import {
  Fetcher,
  OfficialFeedClient,
  OFFICIAL_FEED_FETCHER,
} from "./official-feed.client";
import {
  CANDIDATE_DIRECTORY,
  OttCandidatesRepository,
} from "./ott-candidates.repository";
import { OttCandidatesService } from "./ott-candidates.service";

@Module({
  providers: [
    {
      provide: CANDIDATE_DIRECTORY,
      useFactory: () => resolve("work/ott-candidates"),
    },
    { provide: OFFICIAL_FEED_FETCHER, useValue: fetch },
    OttCandidatesRepository,
    OfficialFeedClient,
    OttCandidatesService,
  ],
  exports: [OttCandidatesService, OttCandidatesRepository, OfficialFeedClient],
})
export class OttCandidatesModule {
  static register(options: {
    directory: string;
    fetcher?: Fetcher;
  }): DynamicModule {
    return {
      module: OttCandidatesModule,
      providers: [
        { provide: CANDIDATE_DIRECTORY, useValue: options.directory },
        ...(options.fetcher
          ? [{ provide: OFFICIAL_FEED_FETCHER, useValue: options.fetcher }]
          : []),
      ],
    };
  }
}
