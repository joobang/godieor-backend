import { z } from "zod";
import { DateTime } from "luxon";
import { COUNTRIES, validZone } from "../../common/config/catalog.constants";
import {
  Canonical,
  normalize,
  Scope,
} from "../../collection/domain/provider-record";
import {
  canonicalUrl,
  eligibility,
  reviewSchema,
  State,
} from "../../ott-candidates/domain/candidate";

// Curators assign durable opaque keys. Never derive them from titles, dates or seasons.
const curatorKey = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,249}$/);
const digest = z.string().regex(/^[a-f0-9]{64}$/);
export const mappingSchema = z
  .object({
    version: z.literal(1),
    mappings: z
      .array(
        z
          .object({
            candidateId: digest,
            revision: digest,
            contentKey: curatorKey,
            eventKey: curatorKey,
            sourceUrl: z.url().max(2000).optional(),
          })
          .strict(),
      )
      .min(1)
      .max(1000),
  })
  .strict();

export function prepareReviewed(input: unknown, state: State): Canonical[] {
  const { mappings } = mappingSchema.parse(input);
  const eventKeys = new Set<string>(),
    candidates = new Set<string>();
  return mappings.map((mapping) => {
    if (eventKeys.has(mapping.eventKey)) throw new Error("AMBIGUOUS_EVENT_KEY");
    if (candidates.has(mapping.candidateId))
      throw new Error("AMBIGUOUS_CANDIDATE");
    eventKeys.add(mapping.eventKey);
    candidates.add(mapping.candidateId);
    const candidate = state.candidates.find(
      (x) => x.id === mapping.candidateId,
    );
    if (!candidate) throw new Error("CANDIDATE_NOT_FOUND");
    if (candidate.revisions.at(-1)?.token !== mapping.revision)
      throw new Error("STALE_MAPPING");
    if (!candidate.review) throw new Error("MISSING_REVIEW");
    const review = reviewSchema.parse(candidate.review.value);
    if (review.id !== candidate.id || review.revision !== mapping.revision)
      throw new Error("STALE_REVIEW");
    if (eligibility(candidate).length) throw new Error("INELIGIBLE_REVIEW");
    const market = z.enum(COUNTRIES).parse(review.market);
    let time: Canonical["time"] = { type: "date_only", value: review.date! };
    if (review.localTime && review.timeZone) {
      const local = review.date + "T" + review.localTime;
      const dt = DateTime.fromISO(local, { zone: review.timeZone });
      if (
        !validZone(review.timeZone) ||
        !dt.isValid ||
        dt.toFormat("yyyy-MM-dd'T'HH:mm") !== local ||
        dt.getPossibleOffsets().length !== 1
      )
        throw new Error("INVALID_REVIEW_TIME");
      time = {
        type: "instant",
        value: dt.toUTC().toISO()!,
        sourceTimeZone: review.timeZone,
      };
    }
    // CJ ?p= URLs need an explicit query-free permalink from the same official host.
    // No fetching or inferred redirect/canonical URL.
    const sourceUrl = mapping.sourceUrl ?? candidate.url;
    if (canonicalUrl(candidate.source, sourceUrl) !== sourceUrl)
      throw new Error("INVALID_SOURCE_URL");
    const scope: Scope = { category: "ott", market };
    return normalize(
      {
        externalId: mapping.eventKey,
        variantKey: "premiere",
        kind: "ott_season_premiere",
        title: review.title,
        content: {
          externalId: mapping.contentKey,
          kind: "drama",
          title: review.title,
        },
        seasonNumber: review.seasonNumber,
        status: "scheduled",
        time,
        market,
        venueCountry: null,
        services: [review.platform!],
        devices: [],
        home: null,
        away: null,
        sourceUrl,
        // Candidate observation/review and article publication are not modification evidence.
        sourceUpdatedAt: null,
      },
      scope,
    );
  });
}

export type ExistingReviewedIdentity = {
  kind: string;
  origin: string;
  market: string | null;
  contentId: string | null;
  mappedContentId: string | null;
  season: number | null;
  services: string[];
};
export function assertReviewedIdentity(
  record: Canonical,
  prior: ExistingReviewedIdentity,
): void {
  if (
    prior.kind !== "ott_season_premiere" ||
    prior.origin !== "provider" ||
    prior.market !== record.market ||
    prior.contentId === null ||
    prior.contentId !== prior.mappedContentId ||
    prior.services.length !== 1 ||
    prior.services[0] !== record.services[0] ||
    (prior.season !== null && prior.season !== record.seasonNumber)
  )
    throw new Error("IDENTITY_CHANGED");
}
