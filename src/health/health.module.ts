import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";
import { HealthRepository } from "./health.repository";
@Module({
  imports: [DatabaseModule],
  controllers: [HealthController],
  providers: [HealthService, HealthRepository],
})
export class HealthModule {}
