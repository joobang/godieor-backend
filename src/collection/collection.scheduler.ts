import { Inject, Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
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
  // Only enable on an always-on Render instance with a persistent OTT review-state store.
  @Cron("0 0 9 * * *", { timeZone: "Asia/Seoul", waitForCompletion: true })
  async officialOttDaily() {
    if (!this.config.schedule || process.env.COLLECTION_OTT_SCHEDULE_ENABLED !== "true") return;
    if (process.env.COLLECTION_OTT_PERSISTENT_STATE !== "true" ||
        !existsSync("work/ott-candidates/state.json")) {
      console.error(JSON.stringify({ job: "official_ott_daily", errorCode: "PERSISTENT_REVIEW_STATE_REQUIRED" }));
      return;
    }
    const exitCode = await new Promise<number>((resolve) => {
      const child = spawn(process.execPath, ["scripts/run-official-ott-daily.mjs"], {
        stdio: "ignore", env: { ...process.env, COLLECTION_SCHEDULE_ENABLED: "false" },
      });
      const timer = setTimeout(() => child.kill("SIGTERM"), 185 * 60_000);
      child.once("error", () => { clearTimeout(timer); resolve(1); });
      child.once("close", (code) => { clearTimeout(timer); resolve(code ?? 1); });
    });
    console.log(JSON.stringify({ job: "official_ott_daily", exitCode,
      status: exitCode === 0 ? "completed" : exitCode === 2 ? "partial" : "failed" }));
  }

  @Cron("0 30 8 * * *", { timeZone: "Asia/Seoul", waitForCompletion: true })
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
