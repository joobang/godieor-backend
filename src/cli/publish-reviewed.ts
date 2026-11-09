import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { parseArgs } from "node:util";
import { ReviewedOttModule } from "../reviewed-ott/reviewed-ott.module";
import { ReviewedPublishService } from "../reviewed-ott/reviewed-publish.service";

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: { file: { type: "string" } },
    allowPositionals: false,
  });
  if (!values.file?.trim()) throw new Error("MAPPING_FILE_REQUIRED");
  const app = await NestFactory.createApplicationContext(ReviewedOttModule, {
    logger: false,
    abortOnError: false,
  });
  try {
    const results = await app.get(ReviewedPublishService).publish(values.file);
    console.log(JSON.stringify({ dataOrigin: "provider", results }, null, 2));
    if (results.some((x) => x.status !== "succeeded")) process.exitCode = 1;
  } finally {
    await app.close();
  }
}
main().catch(() => {
  console.error(
    "검토 후보 publish 실패. 명시적 --file 매핑·현재 검토·DB 설정을 확인하세요.",
  );
  process.exitCode = 1;
});
