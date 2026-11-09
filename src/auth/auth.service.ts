import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
@Injectable()
export class AuthService {
  google() {
    throw new ServiceUnavailableException({
      code: "AUTH_NOT_IMPLEMENTED",
      message: "Google 서비스 인증은 후속 구현 예정입니다.",
    });
  }
  session() {
    throw new UnauthorizedException({
      code: "AUTH_REQUIRED",
      message: "유효한 서비스 세션이 필요합니다.",
    });
  }
}
