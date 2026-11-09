import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { OttCandidatesModule } from "../ott-candidates/ott-candidates.module";
import { CollectionRepository } from "../collection/collection.repository";
import {
  CollectionService,
  PROVIDER_ADAPTERS,
} from "../collection/collection.service";
import { ReviewedCollectionService } from "./reviewed-collection.service";
import { ReviewedMappingRepository } from "./reviewed-mapping.repository";
import { ReviewedOttAdapter } from "./reviewed-ott.adapter";
import { ReviewedPublishService } from "./reviewed-publish.service";

@Module({
  imports: [DatabaseModule, OttCandidatesModule],
  providers: [
    CollectionRepository,
    { provide: CollectionService, useClass: ReviewedCollectionService },
    ReviewedMappingRepository,
    ReviewedOttAdapter,
    ReviewedPublishService,
    {
      provide: PROVIDER_ADAPTERS,
      useFactory: (adapter: ReviewedOttAdapter) => [adapter],
      inject: [ReviewedOttAdapter],
    },
  ],
  exports: [ReviewedPublishService, CollectionService],
})
export class ReviewedOttModule {}
