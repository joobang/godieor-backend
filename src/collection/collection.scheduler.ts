import { Inject, Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import {
  RUNTIME_CONFIG,
  RuntimeConfig,
} from "../common/config/runtime-config.module";
import { CollectionService } from "./collection.service";
@Injectable()
export class CollectionScheduler {
  constructor(
    private readonly service: CollectionService,
    @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig,
  ) {}
  @Cron("0 0 6 * * *", { timeZone: "Asia/Seoul", waitForCompletion: true })
  async daily() {
    if (!this.config.schedule) return;
    try {
      console.log(
        JSON.stringify({
          job: "daily_collection",
          results: await this.service.collect("daily"),
        }),
      );
    } catch {
      console.error(
        JSON.stringify({
          job: "daily_collection",
          errorCode: "COLLECTION_UNAVAILABLE",
        }),
      );
    }
  }
}
