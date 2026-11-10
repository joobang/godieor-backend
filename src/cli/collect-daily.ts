import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { CollectionModule } from "../collection/collection.module";
import { CollectionService } from "../collection/collection.service";

async function main() {
  if (!process.env.KOBIS_API_KEY && !process.env.FOOTBALL_DATA_API_KEY &&
      !(process.env.IGDB_CLIENT_ID && process.env.IGDB_CLIENT_SECRET))
    throw new Error("수집할 실데이터 제공처 키가 없습니다.");
  const app = await NestFactory.createApplicationContext(CollectionModule, {
    logger: ["error", "warn"],
  });
  try {
    const results = await app.get(CollectionService).collect("daily");
    console.log(JSON.stringify({ job: "daily_provider_collection", results }));
    if (results.some((r) => r.status === "failed")) process.exitCode = 1;
  } finally {
    await app.close();
  }
}
main().catch(() => {
  console.error("일간 수집 실패. 제공처 키/DB/접근권한을 확인하세요.");
  process.exitCode = 1;
});
