import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { CatalogModule } from "./catalog/catalog.module";
import { HealthModule } from "./health/health.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { CollectionModule } from "./collection/collection.module";
@Module({
  imports: [
    ScheduleModule.forRoot(),
    HealthModule,
    CatalogModule,
    AuthModule,
    UsersModule,
    CollectionModule,
  ],
})
export class AppModule {}
