import { BadRequestException, ConflictException, Inject, Injectable } from "@nestjs/common";
import { createHmac, timingSafeEqual } from "node:crypto";
import { RUNTIME_CONFIG, RuntimeConfig } from "../common/config/runtime-config.module";

type Favorite = { targetType: string; targetId: string; savedAt: string };
type FavoriteList = { favoritesVersion: string; items: Favorite[] };
type Cursor = {userId: string; version: string; offset: number; limit: number; expires: number};

@Injectable()
export class FavoriteCursorService {
  constructor(@Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig) {}
  private invalid(): never { throw new BadRequestException({code:"INVALID_CURSOR",message:"찜 목록을 처음부터 다시 조회해 주세요."}); }
  private signature(payload: string): Buffer { return createHmac("sha256",this.config.cursorKey).update("favorite:"+payload).digest(); }
  private encode(data: Cursor): string {
    const payload=Buffer.from(JSON.stringify(data)).toString("base64url");
    return payload+"."+this.signature(payload).toString("base64url");
  }
  private decode(value: string): Cursor {
    try {
      if(value.length>4096) return this.invalid();
      const [payload,signature,extra]=value.split(".");
      if(!payload||!signature||extra) return this.invalid();
      const expected=this.signature(payload);
      const actual=Buffer.from(signature,"base64url");
      if(actual.length!==expected.length||!timingSafeEqual(actual,expected)) return this.invalid();
      const decoded=JSON.parse(Buffer.from(payload,"base64url").toString("utf8")) as Cursor;
      if(!decoded||typeof decoded.userId!=="string"||typeof decoded.version!=="string"||
        !Number.isSafeInteger(decoded.offset)||decoded.offset<1||
        !Number.isSafeInteger(decoded.limit)||decoded.limit<1||decoded.limit>100||
        typeof decoded.expires!=="number"||decoded.expires<Date.now()) return this.invalid();
      return decoded;
    } catch { return this.invalid(); }
  }
  page(userId:string,list:FavoriteList,query:unknown) {
    const q=query as Record<string,unknown>;
    if(!q||typeof q!=="object"||Object.keys(q).some(k=>!["limit","cursor","favoritesVersion"].includes(k)))
      throw new BadRequestException({code:"INVALID_QUERY",message:"찜 조회 조건을 확인해 주세요."});
    if(q.limit!==undefined && (typeof q.limit!=="string"||!/^(?:[1-9]|[1-9][0-9]|100)$/.test(q.limit)))
      throw new BadRequestException({code:"INVALID_QUERY",message:"limit은 1~100입니다."});
    if(q.favoritesVersion!==undefined && (typeof q.favoritesVersion!=="string"||!/^[1-9][0-9]*$/.test(q.favoritesVersion)))
      throw new BadRequestException({code:"INVALID_QUERY",message:"찜 버전을 확인해 주세요."});
    if(q.cursor!==undefined && (typeof q.cursor!=="string"||!q.cursor.length)) return this.invalid();
    const limit=q.limit===undefined?50:Number(q.limit);
    const cursor=q.cursor?this.decode(q.cursor as string):null;
    if(cursor && (cursor.userId!==userId||cursor.limit!==limit)) return this.invalid();
    if((cursor&&cursor.version!==list.favoritesVersion)||
      (q.favoritesVersion&&q.favoritesVersion!==list.favoritesVersion))
      throw new ConflictException({code:"FAVORITES_CONFLICT",message:"찜 목록이 변경되었습니다. 다시 조회해 주세요."});
    const offset=cursor?.offset??0;
    if(offset>list.items.length) return this.invalid();
    const items=list.items.slice(offset,offset+limit);
    const next=offset+items.length;
    return {favoritesVersion:list.favoritesVersion,items,
      nextCursor:next<list.items.length?this.encode({userId,version:list.favoritesVersion,offset:next,limit,expires:Date.now()+15*60*1000}):null};
  }
}
