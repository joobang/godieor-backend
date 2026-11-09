import { Injectable } from "@nestjs/common";
import { readFile } from "node:fs/promises";
import { PrismaService } from "../database/prisma.service";
import { Canonical } from "../collection/domain/provider-record";
import { assertReviewedIdentity } from "./domain/reviewed-mapping";

export const REVIEWED_PROVIDER_KEY = "ott_reviewed";
@Injectable()
export class ReviewedMappingRepository {
  constructor(private readonly db: PrismaService) {}
  async readInput(filename: string): Promise<unknown> {
    return JSON.parse(await readFile(filename, "utf8"));
  }
  // Called only from adapter.fetch, under CollectionService's provider advisory lock.
  async assertIdentities(records: readonly Canonical[]): Promise<void> {
    for (const record of records) {
      const source = await this.db.event_source.findUnique({
        where: {
          provider_key_external_id_variant_key: {
            provider_key: REVIEWED_PROVIDER_KEY,
            external_id: record.externalId,
            variant_key: "premiere",
          },
        },
        include: {
          event: { include: { drama_season: true, event_service: true } },
        },
      });
      if (!source) continue;
      const mapped = await this.db.content_source.findUnique({
        where: {
          provider_key_content_type_external_id: {
            provider_key: REVIEWED_PROVIDER_KEY,
            content_type: "drama",
            external_id: record.content!.externalId,
          },
        },
      });
      const event = source.event;
      assertReviewedIdentity(record, {
        kind: event.kind,
        origin: event.origin,
        market: event.release_market,
        contentId: event.content_id,
        mappedContentId: mapped?.content_id ?? null,
        season: event.drama_season?.season_number ?? null,
        services: event.event_service.map((x) => x.service),
      });
    }
  }
}
