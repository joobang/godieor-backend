import { Module } from "@nestjs/common";
export const RUNTIME_CONFIG = Symbol("RUNTIME_CONFIG");
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`필수 환경 변수 누락: ${name}`);
  return value;
}
export function readRuntimeConfig() {
  const databaseUrl = required("DATABASE_URL");
  try {
    const u = new URL(databaseUrl);
    if (!["postgres:", "postgresql:"].includes(u.protocol)) throw new Error();
  } catch {
    throw new Error("DATABASE_URL 형식 오류");
  }
  const cursorKey = required("CURSOR_SIGNING_KEY");
  if (Buffer.byteLength(cursorKey) < 32 || cursorKey.startsWith("replace-"))
    throw new Error("CURSOR_SIGNING_KEY 설정 필요");
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("PORT 설정 오류");
  return {
    databaseUrl,
    cursorKey,
    port,
    host: process.env.API_HOST ?? "127.0.0.1",
    schedule: process.env.COLLECTION_SCHEDULE_ENABLED === "true",
  };
}

export type RuntimeConfig = ReturnType<typeof readRuntimeConfig>;
@Module({
  providers: [{ provide: RUNTIME_CONFIG, useFactory: readRuntimeConfig }],
  exports: [RUNTIME_CONFIG],
})
export class RuntimeConfigModule {}
