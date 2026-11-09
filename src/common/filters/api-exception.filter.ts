import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const request = host.switchToHttp().getRequest();
    const http = error instanceof HttpException;
    const status = http ? error.getStatus() : 503;
    const payload = http ? error.getResponse() : null;
    const body =
      payload && typeof payload === "object"
        ? (payload as Record<string, unknown>)
        : {};
    if (
      request.url?.startsWith("/v1/me") ||
      request.url?.startsWith("/v1/auth")
    )
      response.setHeader("Cache-Control", "no-store");
    if (status === 401) response.setHeader("WWW-Authenticate", "Bearer");
    response
      .status(status)
      .json({
        code:
          body.code ??
          (status === 404
            ? "NOT_FOUND"
            : status === 503
              ? "SERVICE_UNAVAILABLE"
              : "REQUEST_FAILED"),
        message:
          body.message ??
          (status === 503
            ? "일시적으로 요청을 처리할 수 없습니다."
            : "요청을 확인하세요."),
        requestId: randomUUID(),
        details: body.details ?? [],
      });
  }
}
