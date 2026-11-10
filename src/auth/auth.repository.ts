import { Injectable } from "@nestjs/common";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { PrismaService } from "../database/prisma.service";
@Injectable()
export class AuthRepository {
  constructor(private readonly db: PrismaService) {}
  hash(token: string): Uint8Array<ArrayBuffer> { return new Uint8Array(createHash("sha256").update(token).digest()); }
  async issue(subject: string, name: string | null) {
    const token = randomBytes(32).toString("base64url");
    const expires = new Date(Date.now()+30*86400*1000);
    // A simultaneous first login can race on the unique Google subject.
    // Retry once after the competing transaction commits.
    let user: {id: string;display_name: string | null} | undefined;
    for (let attempt = 0; attempt < 2; attempt++) {
    try {
    user = await this.db.$transaction(async tx => {
      const identity = await tx.auth_identity.findUnique({where:{provider_subject:{provider:"google",subject}}});
      let userId = identity?.user_id;
      if (!userId) {
        userId = randomUUID();
        await tx.app_user.create({data:{id:userId,display_name:name,auth_identity:{create:{id:randomUUID(),provider:"google",subject}},user_settings:{create:{user_enabled_category:{create:[{category:"movie"},{category:"ott"}]}}}}});
      }
      await tx.service_session.create({data:{id:randomUUID(),user_id:userId,token_hash:this.hash(token),expires_at:expires}});
      return tx.app_user.findUniqueOrThrow({where:{id:userId}});
    });
    break;
    } catch (error) {
      if (attempt === 0 && typeof error === "object" && error !== null && "code" in error && error.code === "P2002") continue;
      throw error;
    }
    }
    if (!user) throw new Error("Google login transaction returned no user");
    return {accessToken:token,expiresAt:expires.toISOString(),user:{id:user.id,displayName:user.display_name}};
  }
  async session(token: string) {
    return this.db.service_session.findUnique({where:{token_hash:this.hash(token)},include:{app_user:true}});
  }
  async revoke(token: string) {
    await this.db.service_session.updateMany({where:{token_hash:this.hash(token),revoked_at:null},data:{revoked_at:new Date()}});
  }
}
