import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { CollectionModule } from "../collection/collection.module";
import { CollectionRepository } from "../collection/collection.repository";
import { providerOptions, selectProviders } from "./provider-options";
import { ProviderAdapter } from "../collection/domain/provider-record";
import { CollectionService, PROVIDER_ADAPTERS } from "../collection/collection.service";

async function main() {
  const options = providerOptions(process.argv.slice(2));
  const app = await NestFactory.createApplicationContext(CollectionModule, {
    logger: ["error", "warn"],
  });
  try {
    const selected = selectProviders(app.get<ProviderAdapter[]>(PROVIDER_ADAPTERS), options.providers);
    const service = new CollectionService(app.get(CollectionRepository), selected);
    const results = await service.collect(options.mode, options.force);
    console.log(JSON.stringify({ job: "provider_collection", mode: options.mode, providers: selected.map(a => a.key), results }));
    if (results.some((r) => !["succeeded", "already_collected_today"].includes(r.status))) process.exitCode = 1;
  } finally {
    await app.close();
  }
}
main().catch(() => {
  console.error("제공처 수집 실패. 제공처 키/DB/접근권한을 확인하세요.");
  process.exitCode = 1;
});
