import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { parseArgs } from "node:util";
import { CollectionRepository } from "../collection/collection.repository";
import { ReviewedCatalogModule } from "../reviewed-catalog/reviewed-catalog.module";
import { readCatalogReview, ReviewedCatalogAdapter } from "../reviewed-catalog/reviewed-catalog";
import { CollectionService } from "../collection/collection.service";

async function main(): Promise<void> {
  const { values } = parseArgs({ options: { file: { type: "string" } } });
  if (!values.file?.trim()) throw new Error("REVIEW_FILE_REQUIRED");
  // Validate the complete input before opening a DB connection or changing its state.
  const batch = await readCatalogReview(values.file);
  const app = await NestFactory.createApplicationContext(ReviewedCatalogModule, { logger: false, abortOnError: false });
  try {
    const repository = app.get(CollectionRepository);
    const adapter = new ReviewedCatalogAdapter(batch, (provider, records) => repository.assertReviewedCatalogIdentities(provider, records));
    await repository.register([adapter]);
    const service = new CollectionService(repository, [adapter]);
    const result = await service.collect("backfill", true);
    console.log(JSON.stringify({ dataOrigin: "provider", result }, null, 2));
    if (result.some((x) => x.status !== "succeeded")) process.exitCode = 1;
  } finally {
    await app.close();
  }
}
main().catch((error) => {
  console.error("검토 일정 적재 실패:", error instanceof Error ? error.message : "UNKNOWN_ERROR");
  process.exitCode = 1;
});
