import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuthRepository } from "./auth.repository";
import { GoogleTokenClient } from "./google-token.client";
@Module({imports:[DatabaseModule],controllers:[AuthController],providers:[AuthService,AuthRepository,GoogleTokenClient],exports:[AuthService]})
export class AuthModule {}
