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
  console.log(`GODIEOR 로컬 API: http://${config.host}:${config.port}/v1`);
}
main().catch((error: unknown) => {
  const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  const databaseUrl = process.env.DATABASE_URL;
  let redacted = detail;
  if (databaseUrl) {
    redacted = redacted.replaceAll(databaseUrl, "[DATABASE_URL REDACTED]");
    try {
      const password = new URL(databaseUrl).password;
      if (password) redacted = redacted.replaceAll(password, "[DB PASSWORD REDACTED]");
    } catch {
      // Keep the original startup error visible if the connection URL is malformed.
    }
  }
  console.error("API 시작 실패:", redacted);
  process.exitCode = 1;
});
