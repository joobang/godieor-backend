import { Injectable, UnauthorizedException, BadRequestException } from "@nestjs/common";
import { AuthRepository } from "./auth.repository";
import { GoogleTokenClient } from "./google-token.client";
@Injectable()
export class AuthService {
  constructor(private readonly repo: AuthRepository, private readonly googleClient: GoogleTokenClient) {}
  async google(body: unknown) {
    if (!body || typeof body !== "object" || typeof (body as {idToken?:unknown}).idToken !== "string")
      throw new BadRequestException({code:"INVALID_REQUEST",message:"idToken이 필요합니다."});
    const {subject,name} = await this.googleClient.verify((body as {idToken:string}).idToken);
    return this.repo.issue(subject,name);
  }
  token(header?: string): string {
    const parts = header?.match(/^Bearer ([A-Za-z0-9_-]{43})$/);
    if (!parts) throw new UnauthorizedException({code:"AUTH_REQUIRED",message:"유효한 서비스 세션이 필요합니다."});
    return parts[1]!;
  }
  async user(header?: string): Promise<string> {
    const token=this.token(header);
    const session=await this.repo.session(token);
    if (!session || session.revoked_at || session.expires_at <= new Date())
      throw new UnauthorizedException({code:"AUTH_REQUIRED",message:"유효한 서비스 세션이 필요합니다."});
    return session.user_id;
  }
  async session(header?: string) { const token=this.token(header); await this.user(header); await this.repo.revoke(token); }
}
