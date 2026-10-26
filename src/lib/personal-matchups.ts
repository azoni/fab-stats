import { computeHeroStats } from "@/lib/stats";
import {
  DEFAULT_MATCH_FILTERS,
  filterMatchHistory,
  readMatchFilters,
  writeMatchFilters,
  type MatchHistoryFilters,
} from "@/lib/match-history";
import { MatchResult, type MatchRecord } from "@/types";

export type MatchupFilters = Pick<
  MatchHistoryFilters,
  "hero" | "opponentHero" | "opponent" | "event" | "format" | "eventType" | "from" | "to"
> & {
  rated: "" | "rated" | "unrated";
  view: "list" | "grid";
  order: "played" | "best" | "worst" | "alpha";
};

export const DEFAULT_MATCHUP_FILTERS: MatchupFilters = {
  hero: "",
  opponentHero: "",
  opponent: "",
  event: "",
  format: "",
  eventType: "",
  from: "",
  to: "",
  rated: "",
  view: "list",
  order: "played",
};

export function readMatchupFilters(params: URLSearchParams): MatchupFilters {
  const history = readMatchFilters(params);
  const rated = params.get("rated");
  const order = params.get("order");
  return {
    hero: history.hero,
    opponentHero: history.opponentHero,
    opponent: history.opponent,
    event: history.event,
    format: history.format,
    eventType: history.eventType,
    from: history.from,
    to: history.to,
    rated: rated === "rated" || rated === "unrated" ? rated : "",
    view: params.get("view") === "grid" ? "grid" : "list",
    order: order === "best" || order === "worst" || order === "alpha" ? order : "played",
  };
}

export function writeMatchupFilters(filters: MatchupFilters, existing?: URLSearchParams): URLSearchParams {
  const params = writeMatchFilters({ ...DEFAULT_MATCH_FILTERS, ...filters }, existing);
  for (const key of ["rated", "view", "order"] as const) {
    params.delete(key);
    if (filters[key] !== DEFAULT_MATCHUP_FILTERS[key]) params.set(key, filters[key]);
  }
  return params;
}

export function hasKnownHeroes(match: MatchRecord): boolean {
  return [match.heroPlayed, match.opponentHero].every(
    (hero) => !!hero?.trim() && hero.trim().toLowerCase() !== "unknown",
  );
}

/** Use one record set for totals, the matrix and the match list behind a pairing. */
export function getPersonalMatchups(matches: MatchRecord[], filters: MatchupFilters) {
  const scoped = filterMatchHistory(matches, { ...DEFAULT_MATCH_FILTERS, ...filters }).filter(
    (match) =>
      match.result !== MatchResult.Bye &&
      (!filters.rated || (filters.rated === "rated" ? match.rated === true : match.rated !== true)),
  );
  const records = scoped.filter(hasKnownHeroes);
  const heroStats = computeHeroStats(records, false).sort(
    (a, b) => b.totalMatches - a.totalMatches || a.heroName.localeCompare(b.heroName),
  );
  return { records, heroStats, missingHeroes: scoped.length - records.length };
}
