import { XMLParser, XMLValidator } from "fast-xml-parser";
import { z } from "zod";
import {
  canonicalUrl,
  Discovery,
  hash,
  publishedDate,
  shortText,
  Source,
} from "./candidate";

export function parseFeed(source: Source, xml: string): Discovery[] {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml) || Buffer.byteLength(xml) > 2_000_000)
    throw new Error("UNSAFE_XML");
  if (XMLValidator.validate(xml) !== true) throw new Error("INVALID_XML");
  const document = new XMLParser({
    ignoreAttributes: true,
    parseTagValue: false,
    processEntities: true,
    trimValues: true,
  }).parse(xml);
  if (!document?.rss?.channel || typeof document.rss.channel !== "object")
    throw new Error("NOT_RSS");
  const raw = document.rss.channel.item;
  const items = raw === undefined ? [] : Array.isArray(raw) ? raw : [raw];
  if (items.length > 500) throw new Error("TOO_MANY_ITEMS");
  const entries = new Map<string, Discovery>();
  for (const item of items) {
    const headline = shortText.parse(item.title);
    const url = canonicalUrl(source, z.string().parse(item.link));
    const rawDate =
      item.pubDate === undefined
        ? null
        : z.string().max(200).parse(item.pubDate);
    const description = [item.description, item["content:encoded"]]
      .filter((x) => typeof x === "string")
      .join("\n");
    // Keep a fingerprint, not article bodies/images or inferred release dates.
    const contentHash = hash(JSON.stringify([headline, rawDate, description]));
    const prior = entries.get(url);
    if (prior && prior.contentHash !== contentHash)
      throw new Error("CONFLICTING_DUPLICATE_ITEM");
    entries.set(url, {
      source,
      url,
      headline,
      publishedRaw: rawDate,
      publishedAt: publishedDate(rawDate),
      contentHash,
    });
  }
  return [...entries.values()];
}
