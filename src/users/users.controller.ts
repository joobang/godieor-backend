import { All, Controller, Header } from "@nestjs/common";
import { UsersService } from "./users.service";
@Controller("me")
export class UsersController {
  constructor(private readonly service: UsersService) {}
  @All(["", "*path"]) @Header("Cache-Control", "no-store") blocked() {
    return this.service.blocked();
  }
}
