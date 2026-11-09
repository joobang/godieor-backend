import { Injectable, UnauthorizedException } from "@nestjs/common";
@Injectable()
export class UsersService {
  blocked() {
    throw new UnauthorizedException({
      code: "AUTH_REQUIRED",
      message: "계정 기능은 인증 구현 후 제공됩니다.",
    });
  }
}
