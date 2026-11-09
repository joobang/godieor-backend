import { Controller, Delete, Header, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";
@Controller("auth")
export class AuthController {
  constructor(private readonly service: AuthService) {}
  @Post("google") @Header("Cache-Control", "no-store") google() {
    return this.service.google();
  }
  @Delete("session") @Header("Cache-Control", "no-store") session() {
    return this.service.session();
  }
}
