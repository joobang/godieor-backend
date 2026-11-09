import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { createHmac, timingSafeEqual } from "node:crypto";
import {
  RUNTIME_CONFIG,
  RuntimeConfig,
} from "../common/config/runtime-config.module";
import { CatalogQuery } from "./dto/catalog-query.dto";
import { EventKey } from "./catalog.repository";
@Injectable()
export class CursorService {
  constructor(@Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig) {}
  private fingerprint(q: CatalogQuery) {
    const { cursor, revision, ...rest } = q;
    return JSON.stringify(rest);
  }
  encode(q: CatalogQuery, version: string, row: EventKey) {
    const payload = Buffer.from(
      JSON.stringify({
        filter: this.fingerprint(q),
        version,
        key: row,
        expires: Date.now() + 15 * 60 * 1000,
      }),
    ).toString("base64url");
    const signature = createHmac("sha256", this.config.cursorKey)
      .update(payload)
      .digest("base64url");
    return payload + "." + signature;
  }
  decode(q: CatalogQuery): { version: string; key: EventKey } | null {
    if (!q.cursor) return null;
    try {
      const [payload, signature, extra] = q.cursor.split(".");
      if (!payload || !signature || extra) throw new Error();
      const expected = createHmac("sha256", this.config.cursorKey)
        .update(payload)
        .digest();
      const actual = Buffer.from(signature, "base64url");
      if (
        expected.length !== actual.length ||
        !timingSafeEqual(expected, actual)
      )
        throw new Error();
      const data = JSON.parse(
        Buffer.from(payload, "base64url").toString("utf8"),
      ) as { filter: string; version: string; key: EventKey; expires: number };
      if (
        data.filter !== this.fingerprint(q) ||
        data.expires < Date.now() ||
        (q.revision && q.revision !== data.version)
      )
        throw new Error();
      return data;
    } catch {
      throw new BadRequestException({
        code: "INVALID_CURSOR",
        message: "목록을 처음부터 다시 조회하세요.",
      });
    }
  }
}
