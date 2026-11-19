import { Injectable } from "@nestjs/common";
import { DateTime } from "luxon";
import { Canonical, ProviderAdapter, Scope } from "../domain/provider-record";

import { gameCollectionWindow, movieCollectionYears, premierLeagueSeasons } from "../domain/collection-window";

type JsonObject = Record<string, unknown>;
function object(value: unknown): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("INVALID_PROVIDER_RESPONSE");
  return value as JsonObject;
}
function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
function dateOnly(value: string): string | null {
  if (!/^\d{8}$/.test(value)) return null;
  const day = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6)}`;
  return DateTime.fromISO(day).toISODate() === day ? day : null;
}
async function getJson(url: URL, headers: Record<string, string> = {}): Promise<JsonObject> {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`PROVIDER_HTTP_${response.status}`);
  return object(await response.json());
}

/** Conservative commercial-distribution evidence from KOBIS company names. */
const commercialDistributors = [
  "씨제이이엔엠", "씨제이엔터테인먼트", "cj enm", "롯데엔터테인먼트",
  "쇼박스", "플러스엠", "메가박스중앙", "넥스트엔터테인먼트월드",
  "에이스메이커", "바이포엠", "월트디즈니", "디즈니컴퍼니",
  "워너브러더스", "워너브라더스", "유니버설픽쳐스", "소니픽쳐스",
  "파라마운트", "이십세기폭스", "20세기폭스", "스튜디오앤뉴",
];
const excludedGenres = ["다큐멘터리", "실험", "단편", "공연", "성인물"];
function commercialTheatricalMovie(movie: JsonObject): boolean {
  const type = text(movie.typeNm);
  const genres = [text(movie.genreAlt), ...(Array.isArray(movie.genres) ? movie.genres.map(g => g && typeof g === "object" ? text((g as JsonObject).genreNm) : "") : [])].join(",");
  if (type && type !== "장편") return false;
  if (excludedGenres.some(genre => genres.includes(genre))) return false;
  const companies = Array.isArray(movie.companys) ? movie.companys : [];
  return companies.some(company => {
    if (!company || typeof company !== "object") return false;
    const details = company as JsonObject;
    if (!text(details.companyPartNm).includes("배급")) return false;
    const name = text(details.companyNm).toLowerCase().replace(/\s+/g, "");
    return commercialDistributors.some(distributor => name.includes(distributor.replace(/\s+/g, "")));
  });
}

async function kobisMovieDetail(key: string, id: string): Promise<JsonObject> {
  const url = new URL("https://www.kobis.or.kr/kobisopenapi/webservice/rest/movie/searchMovieInfo.json");
  url.searchParams.set("key", key);
  url.searchParams.set("movieCd", id);
  const data = object((await getJson(url)).movieInfoResult);
  const info = object(data.movieInfo);
  if (text(info.movieCd) !== id) throw new Error("PROVIDER_MOVIE_ID_MISMATCH");
  return info;
}

/** KOBIS listings require confirmed major theatrical distributors in movie detail. */
@Injectable()
export class KobisAdapter implements ProviderAdapter {
  readonly key = "kobis";
  readonly name = "영화진흥위원회 KOBIS";
  readonly origin = "provider" as const;
  readonly scopes: Scope[] = [{ category: "movie", market: "KR" }];
  async fetch(_scope: Scope, mode: "backfill" | "daily"): Promise<unknown[]> {
    const key = process.env.KOBIS_API_KEY;
    if (!key) throw new Error("MISSING_PROVIDER_KEY");
    const years = movieCollectionYears(mode);
    const records = new Map<string, unknown>();
    const candidates = new Map<string, { title: string; day: string }>();
    for (const y of years) {
      for (let page = 1; page <= 20; page++) {
        const url = new URL("https://www.kobis.or.kr/kobisopenapi/webservice/rest/movie/searchMovieList.json");
        url.searchParams.set("key", key);
        url.searchParams.set("openStartDt", String(y));
        url.searchParams.set("openEndDt", String(y));
        url.searchParams.set("itemPerPage", "100");
        url.searchParams.set("curPage", String(page));
        const data = object((await getJson(url)).movieListResult);
        const items = data.movieList;
        if (!Array.isArray(items)) throw new Error("INVALID_PROVIDER_RESPONSE");
        for (const row of items) {
          const movie = object(row);
          const id = text(movie.movieCd);
          const title = text(movie.movieNm);
          const day = dateOnly(text(movie.openDt));
          if (!id || !title || !day || day < "2026-10-01") continue;
          if (text(movie.typeNm) && text(movie.typeNm) !== "장편") continue;
          if (excludedGenres.some(genre => text(movie.genreAlt).includes(genre))) continue;
          const companies = Array.isArray(movie.companys) ? movie.companys : [];
          if (!companies.some(company => {
            if (!company || typeof company !== "object") return false;
            const name = text((company as JsonObject).companyNm).toLowerCase().replace(/\s+/g, "");
            return commercialDistributors.some(distributor => name.includes(distributor.replace(/\s+/g, "")));
          })) continue;
          // The list reports companies without roles. Detail identifies actual distributors.
          candidates.set(id, { title, day });
        }
        if (items.length < 100) break;
        if (page === 20) throw new Error("PROVIDER_PAGE_LIMIT");
      }
    }
    const pending = [...candidates.entries()];
    for (let start = 0; start < pending.length; start += 6) {
      await Promise.all(pending.slice(start, start + 6).map(async ([id, listing]) => {
        const movie = await kobisMovieDetail(key, id);
        if (!commercialTheatricalMovie(movie)) return;
        const title = text(movie.movieNm) || listing.title;
        const day = dateOnly(text(movie.openDt));
        if (!day) return;
        records.set(id, {
            externalId: id, variantKey: "kr-theatrical", kind: "theatrical_release",
            title, content: { externalId: id, kind: "movie", title },
            seasonNumber: null, status: "scheduled",
            time: { type: "date_only", value: day },
            market: "KR", venueCountry: null, services: [], devices: [],
            home: null, away: null,
            sourceUrl: "https://www.kobis.or.kr/kobisopenapi/homepg/apiservice/searchServiceInfo.do",
            sourceUpdatedAt: null,
          });
      }));
    }
    return [...records.values()];
  }
  async refreshMissing(_scope: Scope, previous: readonly Canonical[], current: readonly Canonical[]): Promise<unknown[]> {
    const key = process.env.KOBIS_API_KEY;
    if (!key) throw new Error("MISSING_PROVIDER_KEY");
    const present = new Set(current.map(movie => movie.externalId));
    const missing = previous.filter(movie => !present.has(movie.externalId) &&
      (movie.time.type === "unknown" || (movie.time.type === "date_only" && movie.time.value >= "2026-10-01")));
    // Recheck only a bounded set of absent titles for officially withdrawn dates.
    if (missing.length > 100) return [];
    const retained: unknown[] = [];
    for (const movie of missing) {
      const info = await kobisMovieDetail(key, movie.externalId);
      if (!commercialTheatricalMovie(info)) continue;
      const day = text(info.openDt);
      if (day && !dateOnly(day)) throw new Error("INVALID_PROVIDER_DATE");
      if (!day) retained.push({
        ...movie, time: { type: "unknown", announcedYear: null, announcedPeriod: null },
      });
    }
    return retained;
  }

}

/** football-data.org Premier League fixtures. Preserve undecided kickoff as unknown. */
@Injectable()
export class PremierLeagueAdapter implements ProviderAdapter {
  readonly key = "football_data_pl";
  readonly name = "football-data.org 프리미어리그";
  readonly origin = "provider" as const;
  readonly scopes: Scope[] = [{ category: "epl", market: "WORLD" }];
  async fetch(_scope: Scope, mode: "backfill" | "daily"): Promise<unknown[]> {
    const key = process.env.FOOTBALL_DATA_API_KEY;
    if (!key) throw new Error("MISSING_PROVIDER_KEY");
    const { current: season, years: seasons } = premierLeagueSeasons(mode);
    const records = new Map<string, unknown>();
    for (const startYear of seasons) {
      const url = new URL("https://api.football-data.org/v4/competitions/PL/matches");
      url.searchParams.set("season", String(startYear));
      const http = await fetch(url, {
        headers: { "X-Auth-Token": key }, signal: AbortSignal.timeout(15000),
      });
      // The upcoming season may not have been published yet.
      if (http.status === 404 && startYear > season) continue;
      if (!http.ok) throw new Error(`PROVIDER_HTTP_${http.status}`);
      const response = object(await http.json());
      if (!Array.isArray(response.matches)) throw new Error("INVALID_PROVIDER_RESPONSE");
      for (const value of response.matches) {
        const match = object(value);
        const home = object(match.homeTeam);
        const away = object(match.awayTeam);
        const id = match.id;
        const homeId = home.id;
        const awayId = away.id;
        const kickoff = text(match.utcDate);
        const state = text(match.status);
        if (![id, homeId, awayId].every((x) => typeof x === "number") ||
            !text(home.name) || !text(away.name)) continue;
        const status = state === "POSTPONED" || state === "SUSPENDED"
          ? "postponed" : state === "CANCELLED" ? "cancelled" : "scheduled";
        const kickoffDate = DateTime.fromISO(kickoff, { zone: "utc" });
        const kickoffValid = kickoffDate.isValid;
        // An unconfirmed kickoff is not displayed as dated, but an official
        // fixture strictly before the product window must not be ingested.
        if (kickoffValid && kickoffDate.toISODate()! < "2026-10-01") continue;
        const confirmed = ["TIMED", "IN_PLAY", "PAUSED", "FINISHED", "AWARDED"].includes(state);
        const time = confirmed && kickoffValid
          ? { type: "instant", value: kickoff, sourceTimeZone: "UTC" }
          : { type: "unknown", announcedYear: startYear, announcedPeriod: null };
        records.set(String(id), {
          externalId: String(id), variantKey: "pl",
          kind: "epl_match", title: `${text(home.name)} vs ${text(away.name)}`,
          content: null, seasonNumber: null, status, time, market: null,
          venueCountry: "GB", services: [], devices: [],
          home: { externalId: String(homeId), name: text(home.name) },
          away: { externalId: String(awayId), name: text(away.name) },
          sourceUrl: "https://www.football-data.org/",
          sourceUpdatedAt: null,
        });
      }
    }
    return [...records.values()];
  }
}

/** IGDB release rows carry their own platform and region; no first-release-date guessing. */
@Injectable()
export class IgdbAdapter implements ProviderAdapter {
  readonly key = "igdb";
  readonly name = "IGDB 게임 출시일";
  readonly origin = "provider" as const;
  // IGDB release_region values identify release territories, not the user's locale.
  // Keep country releases separate from the worldwide release calendar.
  readonly scopes: Scope[] = ["WORLD", "KR", "JP", "AU", "NZ", "CN", "BR"].map(
    (market) => ({ category: "game", market }),
  );
  async fetch(scope: Scope, mode: "backfill" | "daily"): Promise<unknown[]> {
    const clientId = process.env.IGDB_CLIENT_ID;
    const clientSecret = process.env.IGDB_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error("MISSING_PROVIDER_KEY");
    const params = new URLSearchParams({
      client_id: clientId, client_secret: clientSecret, grant_type: "client_credentials",
    });
    const tokenResponse = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST", body: params, signal: AbortSignal.timeout(15000),
    });
    if (!tokenResponse.ok) throw new Error(`PROVIDER_HTTP_${tokenResponse.status}`);
    const token = text(object(await tokenResponse.json()).access_token);
    if (!token) throw new Error("PROVIDER_AUTH_ERROR");
    const regionByMarket: Record<string, number> = {
      WORLD: 8, KR: 9, JP: 5, AU: 3, NZ: 4, CN: 6, BR: 10,
    };
    const regions = scope.market === "WORLD" ? [1, 2, 7, 8] : [regionByMarket[scope.market]];
    if (regions.some((region) => !region)) throw new Error("INVALID_IGDB_REGION");
    const { from, to } = gameCollectionWindow(mode);
    const out: unknown[] = [];
    // Page in 30-day windows to avoid truncating prolific regions at an arbitrary 2000-row cap.
    for (const region of regions) {
      for (let start = from; start < to; start += 30 * 86400) {
        const end = Math.min(start + 30 * 86400, to);
        for (let offset = 0; offset <= 10000; offset += 500) {
          const query = `fields id,date,game.id,game.name,game.game_type,game.cover.image_id,platform.id,platform.name,release_region,date_format,m,y,updated_at; where date >= ${start} & date < ${end} & release_region = ${region}; sort date asc; limit 500; offset ${offset};`;
          // IGDB limits requests to four per second. Keep sequential fetches below the limit.
          await new Promise((resolve) => setTimeout(resolve, 275));
          const response = await fetch("https://api.igdb.com/v4/release_dates", {
            method: "POST",
            headers: { "Client-ID": clientId, Authorization: `Bearer ${token}`, "Content-Type": "text/plain" },
            body: query, signal: AbortSignal.timeout(15000),
          });
          if (!response.ok) throw new Error(`PROVIDER_HTTP_${response.status}`);
          const items: unknown = await response.json();
          if (!Array.isArray(items)) throw new Error("INVALID_PROVIDER_RESPONSE");
          for (const row of items) {
            const release = object(row);
            if (typeof release.id !== "number") continue;
            if (!release.game || !release.platform) continue;
            const game = object(release.game);
            const platform = object(release.platform);
            // Only day-precision dates. Month/quarter/year/TBD cannot be put on a specific day.
            if (release.date_format !== 0 || typeof release.y !== "number" ||
                typeof release.m !== "number" || typeof release.date !== "number") continue;
            // Explicit game-type classification: 0 main game (exclude DLC, editions, beta).
            if (game.game_type !== 0 || typeof game.id !== "number") continue;
            const platformName = text(platform.name).toLowerCase();
            const device = platformName === "ios" || platformName.includes("iphone") || platformName.includes("ipad") ? "ios"
              : platformName === "android" ? "android"
              : platformName.includes("playstation") ? "playstation"
              : platformName.includes("xbox") ? "xbox"
                : platformName.includes("switch") ? "switch"
                  : platformName.includes("pc") || platformName.includes("windows") || platformName.includes("linux") || platformName.includes("mac") ? "pc" : null;
            if (!device || !text(game.name)) continue;
            const releaseDate = DateTime.fromSeconds(release.date, { zone: "utc" });
            const day = releaseDate.isValid ? releaseDate.toISODate() : null;
            if (!day || releaseDate.year !== release.y || releaseDate.month !== release.m) continue;
            const imageId = game.cover && typeof game.cover === "object"
              ? text(object(game.cover).image_id) : "";
            const posterUrl = /^[a-z0-9_]+$/i.test(imageId)
              ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg` : null;
            out.push({
              externalId: String(release.id), variantKey: `${scope.market.toLowerCase()}-${platform.id}`,
              kind: "game_release", title: text(game.name),
              content: { externalId: String(game.id), kind: "game", title: text(game.name), posterUrl },
              seasonNumber: null, status: "scheduled",
              time: { type: "date_only", value: day },
              market: scope.market, venueCountry: null, services: [], devices: [device],
              home: null, away: null,
              sourceUrl: "https://www.igdb.com/", sourceUpdatedAt: null,
              sourceReleaseRegion: region,
            });
          }
          if (items.length < 500) break;
          if (offset === 10000) throw new Error("PROVIDER_PAGE_LIMIT");
        }
      }
    }
    return out;
  }
}
