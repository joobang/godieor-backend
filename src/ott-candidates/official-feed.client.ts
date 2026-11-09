import { Inject, Injectable } from "@nestjs/common";
import { SOURCES } from "./domain/candidate";
import { parseFeed } from "./domain/rss";

export const OFFICIAL_FEED_FETCHER = "OFFICIAL_FEED_FETCHER";
export const FEED_SOURCES = ["netflix", "coupang", "cj"] as const;
// Match the current honest user-agent against robots groups; do not impersonate an allowed bot.
export function robotsAllows(text: string, path: string): boolean {
  if (text.includes("<html") || text.length > 100_000) return false;
  const groups: {
    agents: string[];
    rules: { allow: boolean; path: string }[];
  }[] = [];
  let group = {
    agents: [] as string[],
    rules: [] as { allow: boolean; path: string }[],
  };
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*([\w-]+)\s*:\s*([^#]*)/.exec(line);
    if (!match) continue;
    const key = match[1]!.toLowerCase(),
      value = match[2]!.trim();
    if (key === "user-agent") {
      if (group.rules.length) {
        groups.push(group);
        group = { agents: [], rules: [] };
      }
      group.agents.push(value.toLowerCase());
    } else if (
      (key === "allow" || key === "disallow") &&
      group.agents.length &&
      value
    )
      group.rules.push({ allow: key === "allow", path: value });
  }
  groups.push(group);
  const specificity = (g: typeof group) =>
    Math.max(
      -1,
      ...g.agents.map((a) =>
        a === "*" ? 0 : "godieor-candidates".startsWith(a) ? a.length : -1,
      ),
    );
  const longest = Math.max(0, ...groups.map(specificity));
  const rules = groups
    .filter((g) => specificity(g) === longest)
    .flatMap((g) => g.rules)
    .filter((rule) => {
      const regex =
        "^" +
        rule.path
          .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
          .replace(/\*/g, ".*")
          .replace(/\\\$$/, "$");
      return new RegExp(regex).test(path);
    })
    .sort(
      (a, b) =>
        b.path.replace(/\*/g, "").length - a.path.replace(/\*/g, "").length ||
        Number(b.allow) - Number(a.allow),
    );
  return rules[0]?.allow ?? true;
}
export type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;
export async function fetchText(
  url: string,
  fetcher: Fetcher = fetch,
): Promise<string> {
  const response = await fetcher(url, {
    redirect: "error",
    signal: AbortSignal.timeout(20_000),
    headers: {
      "user-agent": "GODIEOR-candidates/0.1 (public RSS candidate discovery)",
      accept: "application/rss+xml, application/xml, text/xml, text/plain",
    },
  });
  if (!response.ok) throw new Error("HTTP_" + response.status);
  if (!response.body) throw new Error("EMPTY_RESPONSE");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > 2_000_000) throw new Error("RESPONSE_TOO_LARGE");
      chunks.push(part.value);
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  return Buffer.concat(chunks).toString("utf8");
}

@Injectable()
export class OfficialFeedClient {
  constructor(
    @Inject(OFFICIAL_FEED_FETCHER) private readonly fetcher: Fetcher,
  ) {}
  async discover(source: (typeof FEED_SOURCES)[number]) {
    const feed = SOURCES[source].feed;
    const robots = await fetchText(
      "https://" + SOURCES[source].host + "/robots.txt",
      this.fetcher,
    );
    if (!robotsAllows(robots, new URL(feed).pathname))
      throw new Error("ROBOTS_DISALLOWED");
    return parseFeed(source, await fetchText(feed, this.fetcher));
  }
}
