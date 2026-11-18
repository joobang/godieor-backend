import { collectionDiagnostic } from "../common/collection-diagnostic";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { CollectionModule } from "../collection/collection.module";
import { providerOptions } from "./provider-options";
import { ProviderAdapter } from "../collection/domain/provider-record";
import { CollectionService, PROVIDER_ADAPTERS } from "../collection/collection.service";

async function main() {
  const options = providerOptions(process.argv.slice(2));
  const app = await NestFactory.createApplicationContext(CollectionModule.forCli(options), {
    logger: false,
    abortOnError: false,
  });
  try {
    const selected = app.get<ProviderAdapter[]>(PROVIDER_ADAPTERS);
    const service = app.get(CollectionService);
    const results = await service.collect(options.mode, options.force);
    console.log(JSON.stringify({ job: "provider_collection", mode: options.mode, providers: selected.map(a => a.key), ...(options.market ? { market: options.market } : {}), results }));
    if (results.some((r) => !["succeeded", "already_collected_today"].includes(r.status))) process.exitCode = 1;
  } finally {
    await app.close();
  }
}
main().catch((error: unknown) => {
  console.error(JSON.stringify({ job: "collect-daily", ...collectionDiagnostic(error) }));
  console.error("제공처 수집 실패. 제공처 키/DB/접근권한을 확인하세요.");
  process.exitCode = 1;
});
