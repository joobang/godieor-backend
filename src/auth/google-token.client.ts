import { Injectable, UnauthorizedException, ServiceUnavailableException } from "@nestjs/common";
import { createPublicKey, verify } from "node:crypto";

type Claims = { iss?: string; aud?: string; sub?: string; exp?: number; iat?: number; name?: string };
type GoogleKey = { kid: string; kty: string; alg?: string; use?: string; n?: string; e?: string };
@Injectable()
export class GoogleTokenClient {
  private cached?: { until: number; keys: GoogleKey[] };
  async verify(idToken: string): Promise<{ subject: string; name: string | null }> {
    const audience = process.env.GOOGLE_IOS_CLIENT_ID;
    if (!audience) throw new ServiceUnavailableException({ code: "GOOGLE_NOT_CONFIGURED", message: "Google OAuth 설정이 없습니다." });
    if (!idToken || idToken.length > 16384 || idToken.split(".").length !== 3)
      throw new UnauthorizedException({code:"INVALID_GOOGLE_TOKEN",message:"Google 인증을 확인할 수 없습니다."});
    try {
      const [head, body, signature] = idToken.split(".") as [string,string,string];
      const header = JSON.parse(Buffer.from(head,"base64url").toString("utf8")) as { alg?: string; kid?: string };
      const claims = JSON.parse(Buffer.from(body,"base64url").toString("utf8")) as Claims;
      const now = Math.floor(Date.now()/1000);
      if (header.alg !== "RS256" || !header.kid || !claims.sub || !claims.aud || claims.aud !== audience ||
          !["accounts.google.com","https://accounts.google.com"].includes(claims.iss ?? "") ||
          typeof claims.exp !== "number" || claims.exp <= now || typeof claims.iat !== "number" || claims.iat > now + 60)
        throw new Error("claims");
      const keys = await this.keys();
      const key = keys.find(k => k.kid === header.kid && k.kty === "RSA" && (!k.alg || k.alg === "RS256") && (!k.use || k.use === "sig"));
      if (!key) throw new Error("key");
      const publicKey = createPublicKey({ key: { kty: "RSA", n: key.n!, e: key.e! }, format: "jwk" });
      if (!verify("RSA-SHA256", Buffer.from(head+"."+body), publicKey, Buffer.from(signature,"base64url"))) throw new Error("signature");
      return { subject: claims.sub, name: typeof claims.name === "string" ? claims.name.slice(0,100) : null };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      throw new UnauthorizedException({code:"INVALID_GOOGLE_TOKEN",message:"Google 인증을 확인할 수 없습니다."});
    }
  }
  private async keys(): Promise<GoogleKey[]> {
    if (this.cached && Date.now() < this.cached.until) return this.cached.keys;
    let response: Response;
    try { response = await fetch("https://www.googleapis.com/oauth2/v3/certs", {signal: AbortSignal.timeout(5000)}); }
    catch { throw new ServiceUnavailableException({code:"GOOGLE_KEYS_UNAVAILABLE",message:"Google 인증 서버에 연결할 수 없습니다."}); }
    if (!response.ok) throw new ServiceUnavailableException({code:"GOOGLE_KEYS_UNAVAILABLE",message:"Google 인증 키 조회 실패"});
    const body = await response.json() as { keys?: GoogleKey[] };
    if (!Array.isArray(body.keys) || !body.keys.length) throw new ServiceUnavailableException({code:"GOOGLE_KEYS_UNAVAILABLE",message:"Google 인증 키를 확인할 수 없습니다."});
    const maxAge = /max-age=(\d+)/.exec(response.headers.get("cache-control") ?? "");
    const ttl = Math.min(Number(maxAge?.[1] ?? 300),3600);
    this.cached = {keys:body.keys,until:Date.now()+Math.max(60,ttl)*1000};
    return body.keys;
  }
}
