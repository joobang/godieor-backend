import { INestApplication } from "@nestjs/common";
import { ApiExceptionFilter } from "./filters/api-exception.filter";
export function configureHttp(app: INestApplication): void {
  app.setGlobalPrefix("v1");
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();
}
