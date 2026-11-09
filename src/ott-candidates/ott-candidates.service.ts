import { Injectable } from "@nestjs/common";
import {
  addCandidate,
  applyReview,
  candidateList,
  merge,
  reviewedExport,
} from "./domain/candidate";
import { FEED_SOURCES, OfficialFeedClient } from "./official-feed.client";
import { OttCandidatesRepository } from "./ott-candidates.repository";

@Injectable()
export class OttCandidatesService {
  constructor(
    private readonly repository: OttCandidatesRepository,
    private readonly client: OfficialFeedClient,
  ) {}
  async collect(now = new Date().toISOString()) {
    return this.repository.transaction(async (state) => {
      for (const source of FEED_SOURCES) {
        try {
          const entries = await this.client.discover(source);
          merge(state, entries, now);
          state.attempts[source] = {
            at: now,
            status: "succeeded",
            discovered: entries.length,
            error: null,
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : "";
          const known =
            /^(HTTP_\d{3}|ROBOTS_DISALLOWED|UNSAFE_XML|INVALID_XML|NOT_RSS|TOO_MANY_ITEMS|RESPONSE_TOO_LARGE|CONFLICTING_DUPLICATE_ITEM|UNTRUSTED_SOURCE_URL|UNEXPECTED_SOURCE_QUERY)$/;
          state.attempts[source] = {
            at: now,
            status: "failed",
            discovered: 0,
            error: known.test(message) ? message : "FEED_UNAVAILABLE",
          };
        }
      }
      return {
        stage: state.stage,
        attempts: state.attempts,
        candidates: state.candidates.length,
        published: 0,
      };
    });
  }
  async list() {
    return this.repository.transaction(
      async (state) => candidateList(state),
      false,
    );
  }
  async add(filename: string, now = new Date().toISOString()) {
    return this.repository.transaction(async (state) => ({
      id: addCandidate(state, await this.repository.readInput(filename), now),
      published: 0,
    }));
  }
  async review(filename: string, now = new Date().toISOString()) {
    return this.repository.transaction(async (state) => {
      applyReview(state, await this.repository.readInput(filename), now);
      return { stage: state.stage, reviewed: true, published: 0 };
    });
  }
  async export(now = new Date().toISOString()) {
    return this.repository.transaction(async (state) => {
      const ready = reviewedExport(state);
      await this.repository.writeExport(ready, now);
      return {
        path: "work/ott-candidates/reviewed.json",
        candidates: ready.length,
        published: 0,
      };
    }, false);
  }
}
