import { createHash } from "node:crypto";
import { DateTime } from "luxon";
import { z } from "zod";

export const SOURCES = {
  netflix: {
    host: "about.netflix.com",
    feed: "https://about.netflix.com/ko/feed.xml",
  },
  coupang: { host: "news.coupang.com", feed: "https://news.coupang.com/feed/" },
  cj: { host: "cjnews.cj.net", feed: "https://cjnews.cj.net/feed/" },
  disney: { host: "www.disneyplus.com", feed: null },
} as const;
export const sourceSchema = z.enum(["netflix", "coupang", "cj", "disney"]);
export type Source = z.infer<typeof sourceSchema>;
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const stamp = z.iso.datetime({ offset: true });
export const shortText = z.string().min(1).max(500);
export const reviewSchema = z
  .object({
    id: digest,
    revision: digest,
    reviewer: z.string().min(1).max(100),
    title: shortText,
    platform: z
      .enum(["netflix", "disney_plus", "coupang_play", "tving"])
      .nullable(),
    market: z
      .string()
      .regex(/^[A-Z]{2}$/)
      .nullable(),
    contentKind: z.enum(["drama", "other", "unknown"]),
    premiereConfirmed: z.boolean(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
    localTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .nullable(),
    timeZone: z.string().max(100).nullable(),
    seasonNumber: z.number().int().positive().nullable(),
    announcedYear: z.number().int().min(1900).max(9999).nullable(),
    announcedPeriod: z.string().max(100).nullable(),
    evidence: shortText,
  })
  .strict()
  .superRefine((r, ctx) => {
    if (
      r.date &&
      (!DateTime.fromISO(r.date).isValid ||
        DateTime.fromISO(r.date).toISODate() !== r.date)
    )
      ctx.addIssue({ code: "custom", message: "INVALID_DATE" });
    if (r.timeZone && !DateTime.fromMillis(0, { zone: r.timeZone }).isValid)
      ctx.addIssue({ code: "custom", message: "INVALID_TIME_ZONE" });
    if (r.timeZone && !r.localTime)
      ctx.addIssue({ code: "custom", message: "TIME_ZONE_WITHOUT_TIME" });
    if (r.localTime && !r.date)
      ctx.addIssue({ code: "custom", message: "TIME_WITHOUT_DATE" });
    if (
      r.date &&
      r.announcedYear !== null &&
      Number(r.date.slice(0, 4)) !== r.announcedYear
    )
      ctx.addIssue({ code: "custom", message: "YEAR_CONFLICT" });
  });
export type Review = z.infer<typeof reviewSchema>;
const revisionSchema = z
  .object({
    token: digest,
    hash: digest,
    observedAt: stamp,
    headline: shortText,
    publishedRaw: z.string().max(200).nullable(),
    publishedAt: stamp.nullable(),
  })
  .strict();
const candidateSchema = z
  .object({
    id: digest,
    source: sourceSchema,
    url: z.string().max(2000),
    firstSeenAt: stamp,
    lastSeenAt: stamp,
    revisions: z.array(revisionSchema).min(1),
    review: z
      .object({ value: reviewSchema, reviewedAt: stamp })
      .strict()
      .nullable(),
  })
  .strict();
export type Candidate = z.infer<typeof candidateSchema>;
const stateSchema = z
  .object({
    version: z.literal(2),
    stage: z.literal("candidate-not-published"),
    candidates: z.array(candidateSchema),
    attempts: z.record(
      z.string(),
      z
        .object({
          at: stamp,
          status: z.enum(["succeeded", "failed"]),
          discovered: z.number().int().nonnegative(),
          error: z.string().nullable(),
        })
        .strict(),
    ),
  })
  .strict();
export type State = z.infer<typeof stateSchema>;
const legacyStateSchema = stateSchema.extend({
  version: z.literal(1),
  candidates: z.array(
    candidateSchema.extend({
      revisions: z.array(revisionSchema.omit({ token: true })).min(1),
    }),
  ),
});
export type Discovery = {
  source: Source;
  url: string;
  headline: string;
  publishedRaw: string | null;
  publishedAt: string | null;
  contentHash: string;
};
export const hash = (text: string): string =>
  createHash("sha256").update(text).digest("hex");
export function canonicalUrl(source: Source, text: string): string {
  const url = new URL(text);
  if (
    url.protocol !== "https:" ||
    url.hostname !== SOURCES[source].host ||
    url.port ||
    url.username ||
    url.password
  )
    throw new Error("UNTRUSTED_SOURCE_URL");
  for (const key of [...url.searchParams.keys()]) {
    if (key.startsWith("utm_") || key === "msockid")
      url.searchParams.delete(key);
    else if (!(
      source === "cj" &&
      key === "p" &&
      /^\d+$/.test(url.searchParams.get(key)!)
    ))
      throw new Error("UNEXPECTED_SOURCE_QUERY");
  }
  url.hash = "";
  return url.toString();
}
export function publishedDate(raw: string | null): string | null {
  if (!raw) return null;
  const ko = /^(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일$/.exec(raw.trim());
  const dt = ko
    ? DateTime.fromObject(
        { year: Number(ko[1]), month: Number(ko[2]), day: Number(ko[3]) },
        { zone: "Asia/Seoul" },
      )
    : DateTime.fromRFC2822(raw, { setZone: true });
  return dt.isValid ? dt.toUTC().toISO() : null;
}
export function merge(state: State, entries: Discovery[], now: string): void {
  for (const entry of entries) {
    const id = hash(entry.source + "\n" + entry.url);
    let candidate = state.candidates.find((x) => x.id === id);
    if (!candidate) {
      candidate = {
        id,
        source: entry.source,
        url: entry.url,
        firstSeenAt: now,
        lastSeenAt: now,
        revisions: [],
        review: null,
      };
      state.candidates.push(candidate);
    }
    candidate.lastSeenAt = now;
    if (candidate.revisions.at(-1)?.hash !== entry.contentHash) {
      candidate.revisions.push({
        token: hash(
          candidate.id +
            "\n" +
            (candidate.revisions.length + 1) +
            "\n" +
            entry.contentHash,
        ),
        hash: entry.contentHash,
        observedAt: now,
        headline: entry.headline,
        publishedRaw: entry.publishedRaw,
        publishedAt: entry.publishedAt,
      });
      candidate.review = null;
    }
  }
}
export function eligibility(candidate: Candidate): string[] {
  const review = candidate.review?.value;
  if (!review || review.revision !== candidate.revisions.at(-1)!.token)
    return ["needs_review"];
  const reasons: string[] = [];
  if (!review.date) reasons.push("missing_exact_date");
  else if (review.date < "2026-01-01") reasons.push("before_2026");
  if (!review.platform) reasons.push("unconfirmed_platform");
  if (!review.market) reasons.push("unconfirmed_market");
  if (review.contentKind !== "drama") reasons.push("not_confirmed_drama");
  if (!review.premiereConfirmed) reasons.push("not_confirmed_premiere");
  return reasons;
}
export function applyReview(state: State, value: unknown, now: string): void {
  const review = reviewSchema.parse(value);
  const candidate = state.candidates.find((x) => x.id === review.id);
  if (!candidate) throw new Error("CANDIDATE_NOT_FOUND");
  if (candidate.revisions.at(-1)!.token !== review.revision)
    throw new Error("STALE_REVIEW");
  candidate.review = { value: review, reviewedAt: now };
}
export function reviewedExport(state: State): unknown[] {
  return state.candidates
    .filter((x) => eligibility(x).length === 0)
    .map((candidate) => ({
      sourceUrl: candidate.url,
      sourceRevision: candidate.revisions.at(-1)!.token,
      ...candidate.review!.value,
      reviewedAt: candidate.review!.reviewedAt,
      // No inferred season, timezone or UTC midnight. These are still review inputs, not product events.
      precision:
        candidate.review!.value.localTime && candidate.review!.value.timeZone
          ? "local_datetime"
          : "date_only",
    }));
}

export function decodeState(input: unknown): {
  state: State;
  upgraded: boolean;
} {
  let state: State;
  if ((input as { version?: unknown })?.version === 1) {
    const legacy = legacyStateSchema.parse(input);
    state = stateSchema.parse({
      ...legacy,
      version: 2,
      candidates: legacy.candidates.map((candidate) => ({
        ...candidate,
        review: null,
        revisions: candidate.revisions.map((revision, index) => ({
          ...revision,
          token: hash(candidate.id + "\n" + (index + 1) + "\n" + revision.hash),
        })),
      })),
    });
  } else state = stateSchema.parse(input);
  const ids = new Set<string>();
  for (const candidate of state.candidates) {
    if (
      canonicalUrl(candidate.source, candidate.url) !== candidate.url ||
      hash(candidate.source + "\n" + candidate.url) !== candidate.id ||
      ids.has(candidate.id)
    )
      throw new Error("INVALID_STORED_ID");
    ids.add(candidate.id);
    if (
      candidate.review &&
      (candidate.review.value.id !== candidate.id ||
        candidate.review.value.revision !== candidate.revisions.at(-1)!.token)
    )
      throw new Error("INVALID_STORED_REVIEW");
  }
  return { state, upgraded: (input as { version?: unknown })?.version === 1 };
}
export const manualCandidateSchema = z
  .object({
    source: sourceSchema,
    url: z.string(),
    headline: shortText,
    publishedRaw: z.string().max(200).nullable(),
    evidenceRevision: z.string().min(1).max(200),
  })
  .strict();
export function addCandidate(
  state: State,
  input: unknown,
  now: string,
): string {
  const value = manualCandidateSchema.parse(input);
  const url = canonicalUrl(value.source, value.url);
  merge(
    state,
    [
      {
        source: value.source,
        url,
        headline: value.headline,
        publishedRaw: value.publishedRaw,
        publishedAt: publishedDate(value.publishedRaw),
        contentHash: hash(
          JSON.stringify([
            value.headline,
            value.publishedRaw,
            value.evidenceRevision,
          ]),
        ),
      },
    ],
    now,
  );
  return hash(value.source + "\n" + url);
}
export function candidateList(state: State) {
  return {
    stage: state.stage,
    candidates: state.candidates.map((x) => ({
      id: x.id,
      source: x.source,
      url: x.url,
      headline: x.revisions.at(-1)!.headline,
      revision: x.revisions.at(-1)!.token,
      revisions: x.revisions.length,
      reasons: eligibility(x),
    })),
  };
}
