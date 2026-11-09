import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { parseArgs } from "node:util";
import { z } from "zod";
import { OttCandidatesModule } from "../ott-candidates/ott-candidates.module";
import { OttCandidatesService } from "../ott-candidates/ott-candidates.service";

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    options: { file: { type: "string" } },
    allowPositionals: true,
  });
  const command = positionals[0];
  if (
    positionals.length !== 1 ||
    !["collect", "list", "add", "review", "export"].includes(command!)
  )
    throw new Error(
      "명령: collect | list | add --file 파일 | review --file 파일 | export",
    );
  if (["add", "review"].includes(command!) !== !!values.file)
    throw new Error("add/review에만 --file이 필요합니다.");
  const app = await NestFactory.createApplicationContext(OttCandidatesModule, {
    logger: false,
    abortOnError: false,
  });
  try {
    const service = app.get(OttCandidatesService);
    const now = new Date().toISOString();
    if (command === "collect") {
      const result = await service.collect(now);
      if (Object.values(result.attempts).some((x) => x.status === "failed"))
        process.exitCode = 1;
      console.log(JSON.stringify(result, null, 2));
    } else if (command === "add")
      console.log(JSON.stringify(await service.add(values.file!, now)));
    else if (command === "review")
      console.log(JSON.stringify(await service.review(values.file!, now)));
    else if (command === "export")
      console.log(JSON.stringify(await service.export(now)));
    else console.log(JSON.stringify(await service.list(), null, 2));
  } finally {
    await app.close();
  }
}
main().catch((error) => {
  // Do not log arbitrary source bodies, local review input or credentials.
  console.error(
    error instanceof z.ZodError
      ? "후보 입력 형식/날짜가 유효하지 않습니다."
      : error instanceof Error &&
          /^(STALE_REVIEW|CANDIDATE_NOT_FOUND|INVALID_STORED_|SYMLINK_)/.test(
            error.message,
          )
        ? error.message
        : "후보 명령 실패: 인자·파일·writer.lock·소스 접근 상태를 확인하세요.",
  );
  process.exitCode = 1;
});
