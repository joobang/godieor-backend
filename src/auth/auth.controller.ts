import { Body, Controller, Delete, Header, Headers, HttpCode, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";
@Controller("auth")
export class AuthController {
  constructor(private readonly service: AuthService) {}
  @Post("google") @HttpCode(200) @Header("Cache-Control","no-store") google(@Body() body: unknown) { return this.service.google(body); }
  @Delete("session") @HttpCode(204) @Header("Cache-Control","no-store") session(@Headers("authorization") authorization?: string) { return this.service.session(authorization); }
}
