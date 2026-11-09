import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { configureHttp } from "./common/configure-http";
import {
  RUNTIME_CONFIG,
  RuntimeConfig,
} from "./common/config/runtime-config.module";
async function main() {
  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn", "log"],
  });
  configureHttp(app);
  const config = app.get<RuntimeConfig>(RUNTIME_CONFIG);
  await app.listen(config.port, config.host);
  console.log(
    `GODIEOR 로컬 API: http://${config.host}:${config.port}/v1 (가상 데이터 모드)`,
  );
}
main().catch(() => {
  console.error("API 시작 실패. 환경 설정·DB 연결·포트를 확인하세요.");
  process.exitCode = 1;
});
