import { Inject, Injectable } from "@nestjs/common";
import {
  CollectionService,
  PROVIDER_ADAPTERS,
} from "../collection/collection.service";
import { CollectionRepository } from "../collection/collection.repository";
import { ReviewedOttAdapter } from "./reviewed-ott.adapter";

// Empty scopes are intentional during onModuleInit registration, but not during collection.
@Injectable()
export class ReviewedCollectionService extends CollectionService {
  constructor(
    repository: CollectionRepository,
    @Inject(PROVIDER_ADAPTERS) private readonly reviewed: ReviewedOttAdapter[],
  ) {
    super(repository, reviewed);
  }
  override collect(mode: "backfill" | "daily", force = false) {
    this.reviewed.forEach((adapter) => adapter.assertConfigured());
    return super.collect(mode, force);
  }
}
