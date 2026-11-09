import { DateTime } from "luxon";
import { calendarDate, iso } from "../../common/config/catalog.constants";
import { EventRow, ScopeRow } from "../catalog.repository";
import { CatalogQuery } from "../dto/catalog-query.dto";
export function presentTime(
  e: {
    precision: string;
    instant_at: Date | null;
    local_date: Date | null;
    source_time_zone: string | null;
    announced_year: number | null;
    announced_period: string | null;
  },
  zone: string,
) {
  if (e.precision === "instant" && e.instant_at) {
    const dt = DateTime.fromJSDate(e.instant_at, { zone });
    return {
      type: "instant",
      instantUtc: e.instant_at.toISOString(),
      sourceTimeZone: e.source_time_zone,
      displayDate: dt.toISODate(),
      displayTime: dt.toFormat("HH:mm"),
    };
  }
  if (e.precision === "date_only" && e.local_date)
    return { type: "date_only", date: calendarDate(e.local_date) };
  return {
    type: "unknown",
    announcedYear: e.announced_year,
    announcedPeriod: e.announced_period,
  };
}
export function presentEvent(e: EventRow, zone: string) {
  return {
    id: e.id,
    kind: e.kind,
    title: e.title,
    contentId: e.content_id,
    season: e.drama_season
      ? { id: e.drama_season.id, number: e.drama_season.season_number }
      : null,
    status: e.status,
    time: presentTime(e, zone),
    releaseMarket: e.release_market,
    venueCountry: e.venue_country,
    services: e.event_service.map((x) => x.service).sort(),
    devices: e.event_device.map((x) => x.device).sort(),
    match:
      e.kind === "epl_match"
        ? {
            competition: "epl",
            home: {
              id: e.team_event_home_team_idToteam!.id,
              name: e.team_event_home_team_idToteam!.name,
            },
            away: {
              id: e.team_event_away_team_idToteam!.id,
              name: e.team_event_away_team_idToteam!.name,
            },
          }
        : null,
    dataOrigin: e.origin,
    updatedAt: e.updated_at.toISOString(),
  };
}

export function presentFreshness(scopes: ScopeRow[], q: CatalogQuery) {
  const selected = new Map<string, ScopeRow>();
  for (const scope of scopes) {
    const key = scope.provider_key + ":" + scope.category;
    const prior = selected.get(key);
    if (
      !prior ||
      scope.category === "epl" ||
      scope.scope_market === q.country ||
      (scope.scope_market === "WORLD" && prior.scope_market !== q.country)
    )
      selected.set(key, scope);
  }
  return [...selected.values()].map((s) => {
    const matches =
      s.category === "epl" || [q.country, "WORLD"].includes(s.scope_market);
    return {
      providerKey: s.provider_key,
      category: s.category,
      scopeCountry: s.category === "epl" ? null : q.country,
      coverage: matches ? s.coverage : "unsupported",
      lastAttemptStatus: matches ? s.last_attempt_status : "never",
      lastAttemptAt: matches ? iso(s.last_attempt_at) : null,
      lastSuccessfulAt: matches ? iso(s.last_successful_at) : null,
      dataOrigin: s.provider.origin,
    };
  });
}
