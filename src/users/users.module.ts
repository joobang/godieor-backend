import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../database/database.module";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { FavoriteCursorService } from "./favorite-cursor.service";
import { RuntimeConfigModule } from "../common/config/runtime-config.module";
import { UsersRepository } from "./users.repository";
@Module({imports:[DatabaseModule,AuthModule,RuntimeConfigModule],controllers:[UsersController],providers:[UsersService,UsersRepository,FavoriteCursorService]})
export class UsersModule {}
