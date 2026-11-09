import { Injectable } from "@nestjs/common";
import { OttCandidatesRepository } from "../ott-candidates/ott-candidates.repository";
import { CollectionRepository } from "../collection/collection.repository";
import { CollectionService } from "../collection/collection.service";
import { prepareReviewed } from "./domain/reviewed-mapping";
import { ReviewedMappingRepository } from "./reviewed-mapping.repository";
import { ReviewedOttAdapter } from "./reviewed-ott.adapter";

@Injectable()
export class ReviewedPublishService {
  constructor(
    private readonly candidates: OttCandidatesRepository,
    private readonly mappings: ReviewedMappingRepository,
    private readonly adapter: ReviewedOttAdapter,
    private readonly repository: CollectionRepository,
    private readonly collection: CollectionService,
  ) {}
  publish(filename: string) {
    return this.candidates.transaction(async (state) => {
      const records = prepareReviewed(
        await this.mappings.readInput(filename),
        state,
      );
      this.adapter.configure(records);
      try {
        await this.repository.register([this.adapter]);
        return await this.collection.collect("backfill", true);
      } finally {
        this.adapter.clear();
      }
    }, false);
  }
}
