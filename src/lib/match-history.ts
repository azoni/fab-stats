import { GameFormat, MatchResult, type MatchRecord } from "@/types";
import {
  FORMAT_SHORT,
  getEventName,
  getEventType,
  getMatchVenue,
  getRoundNumber,
  getVenueOptions,
  normalizeOpponentName,
} from "@/lib/stats";

export interface MatchHistoryFilters {
  query: string;
  hero: string;
  opponentHero: string;
  opponent: string;
  event: string;
  format: string;
  eventType: string;
  venue: string;
  missing: string;
  result: string;
  from: string;
  to: string;
  sort: "newest" | "oldest";
  page: number;
}

export const DEFAULT_MATCH_FILTERS: MatchHistoryFilters = {
  query: "",
  hero: "",
  opponentHero: "",
  opponent: "",
  event: "",
  format: "",
  eventType: "",
  venue: "",
  missing: "",
  result: "",
  from: "",
  to: "",
  sort: "newest",
  page: 1,
};

const PARAMS = {
  query: "q",
  hero: "hero",
  opponentHero: "opponentHero",
  opponent: "player",
  event: "event",
  format: "format",
  eventType: "eventType",
  venue: "venue",
  missing: "filter",
  result: "result",
  from: "from",
  to: "to",
} as const;

const formats = new Set<string>(Object.values(GameFormat));
const results = new Set<string>(Object.values(MatchResult));
const missingValues = new Set(["no-hero", "no-opp-hero"]);

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}

function normalizeFilters(filters: MatchHistoryFilters): MatchHistoryFilters {
  return {
    ...filters,
    format: formats.has(filters.format) ? filters.format : "",
    missing: missingValues.has(filters.missing) ? filters.missing : "",
    result: results.has(filters.result) ? filters.result : "",
    from: validDate(filters.from) ? filters.from : "",
    to: validDate(filters.to) ? filters.to : "",
    sort: filters.sort === "oldest" ? "oldest" : "newest",
    page: Number.isSafeInteger(filters.page) && filters.page > 0 ? filters.page : 1,
  };
}

/** Stale selections remain explicit, so a removed event never broadens a saved view. */
export function readMatchFilters(params: URLSearchParams): MatchHistoryFilters {
  const filters = { ...DEFAULT_MATCH_FILTERS };
  for (const field of Object.keys(PARAMS) as (keyof typeof PARAMS)[]) {
    filters[field] = params.get(PARAMS[field]) ?? "";
  }
  filters.sort = params.get("sort") === "oldest" ? "oldest" : "newest";
  const page = params.get("page") ?? "";
  filters.page = /^\d+$/.test(page) ? Number(page) : 1;
  return normalizeFilters(filters);
}

/** Returns a new parameter object; unrelated parameters and the input are preserved. */
export function writeMatchFilters(filters: MatchHistoryFilters, existingParams?: URLSearchParams): URLSearchParams {
  const params = new URLSearchParams(existingParams);
  const normalized = normalizeFilters(filters);
  for (const field of Object.keys(PARAMS) as (keyof typeof PARAMS)[]) {
    const key = PARAMS[field];
    params.delete(key);
    if (normalized[field]) params.set(key, normalized[field]);
  }
  params.delete("sort");
  params.delete("page");
  if (normalized.sort !== "newest") params.set("sort", normalized.sort);
  if (normalized.page !== 1) params.set("page", String(normalized.page));
  return params;
}

/** Mirrors computeEventStats grouping without delimiter collisions or format splits. */
export function getMatchEventKey(match: MatchRecord): string {
  const parts = [getEventName(match), match.date, (match.venue || "").trim().toLowerCase()];
  if (!match.notes?.split(" | ")[0]?.trim()) parts.push(match.format);
  return JSON.stringify(parts);
}

function normalizedName(name: string): string {
  return normalizeOpponentName(name.replace(/\s+/g, " "));
}

/** No inferred merging: name-only records stay distinct from identified GEM players. */
export function getMatchOpponentKey(match: MatchRecord): string {
  const gemId = match.opponentGemId?.trim();
  if (gemId) return `gem:${gemId}`;
  const name = normalizedName(match.opponentName || "");
  return name === "unknown" ? "unknown" : `name:${name}`;
}

export interface MatchFilterOption {
  value: string;
  label: string;
  detail?: string;
}

function unknownHero(hero: string | undefined): boolean {
  return !hero?.trim() || hero.trim().toLowerCase() === "unknown";
}

function isBye(match: MatchRecord): boolean {
  return match.result === MatchResult.Bye || /^bye$/i.test(match.opponentName?.trim() || "");
}

function heroOptions(values: string[]): MatchFilterOption[] {
  const options = [...new Set(values.filter((value) => !unknownHero(value)))]
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ value, label: value }));
  if (values.some(unknownHero)) options.push({ value: "none", label: "Unknown" });
  return options;
}

export function getMatchFilterOptions(matches: MatchRecord[]): {
  heroes: MatchFilterOption[];
  opponentHeroes: MatchFilterOption[];
  opponents: MatchFilterOption[];
  events: MatchFilterOption[];
  formats: MatchFilterOption[];
  eventTypes: MatchFilterOption[];
  venues: MatchFilterOption[];
} {
  const opponents = new Map<string, { option: MatchFilterOption; date: string }>();
  const events = new Map<string, { option: MatchFilterOption; date: string }>();

  for (const match of matches) {
    const event = getMatchEventKey(match);
    if (!events.has(event)) {
      const venue = getMatchVenue(match);
      events.set(event, {
        date: match.date,
        option: {
          value: event,
          label: getEventName(match),
          detail: [match.date, venue !== "Unknown" ? venue : ""].filter(Boolean).join(" · "),
        },
      });
    }
    if (isBye(match)) continue;
    const key = getMatchOpponentKey(match);
    const name = match.opponentName?.trim();
    const hasName = !!name && normalizedName(name) !== "unknown";
    const existing = opponents.get(key);
    if (!existing || (hasName && (existing.option.label === "Unknown player" || match.date > existing.date))) {
      opponents.set(key, {
        date: match.date,
        option: {
          value: key,
          label: hasName ? name : "Unknown player",
          ...(key.startsWith("gem:") ? { detail: `GEM ID ${key.slice(4)}` } : {}),
        },
      });
    }
  }

  const opponentOptions = [...opponents.values()].map(({ option }) => option);
  const nameCounts = new Map<string, number>();
  for (const option of opponentOptions) {
    const name = normalizedName(option.label);
    nameCounts.set(name, (nameCounts.get(name) || 0) + 1);
  }
  for (const option of opponentOptions) {
    if (option.value.startsWith("name:") && (nameCounts.get(normalizedName(option.label)) || 0) > 1) {
      option.detail = "Name only · no GEM ID";
    }
  }

  const textOptions = (values: string[]): MatchFilterOption[] =>
    [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b)).map((value) => ({ value, label: value }));

  return {
    heroes: heroOptions(matches.map((match) => match.heroPlayed)),
    opponentHeroes: heroOptions(matches.map((match) => match.opponentHero)),
    opponents: opponentOptions.sort((a, b) => a.label.localeCompare(b.label) || a.value.localeCompare(b.value)),
    events: [...events.values()]
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date) ||
          a.option.label.localeCompare(b.option.label) ||
          a.option.value.localeCompare(b.option.value),
      )
      .map(({ option }) => option),
    formats: textOptions(matches.map((match) => match.format)),
    eventTypes: textOptions(matches.map(getEventType)),
    venues: getVenueOptions(matches).map((value) => ({ value, label: value })),
  };
}

function matchesHero(hero: string, selected: string): boolean {
  return !selected || (selected === "none" ? unknownHero(hero) : hero === selected);
}

function timestamp(value: string): number {
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : 0;
}

/** Filters all records before pagination. Result can be omitted to calculate contextual pills. */
export function filterMatchHistory(
  matches: MatchRecord[],
  filters: MatchHistoryFilters,
  { includeResult = true, obfuscateOpponents = false }: { includeResult?: boolean; obfuscateOpponents?: boolean } = {},
): MatchRecord[] {
  const active = normalizeFilters(filters);
  const tokens = active.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const filtered = matches.filter((match) => {
    if (!matchesHero(match.heroPlayed, active.hero) || !matchesHero(match.opponentHero, active.opponentHero))
      return false;
    // Obfuscation is display-only: keep an explicitly selected player applied.
    if (active.opponent && (isBye(match) || getMatchOpponentKey(match) !== active.opponent)) return false;
    if (active.event && getMatchEventKey(match) !== active.event) return false;
    if (active.format && match.format !== active.format) return false;
    if (active.eventType && getEventType(match) !== active.eventType) return false;
    if (active.venue && getMatchVenue(match) !== active.venue) return false;
    if (active.missing === "no-hero" && !unknownHero(match.heroPlayed)) return false;
    if (active.missing === "no-opp-hero" && !unknownHero(match.opponentHero)) return false;
    if (includeResult && active.result && match.result !== active.result) return false;
    if ((active.from || active.to) && !validDate(match.date)) return false;
    if (active.from && match.date < active.from) return false;
    if (active.to && match.date > active.to) return false;
    if (tokens.length) {
      const fields = [
        match.heroPlayed,
        match.opponentHero,
        getEventName(match),
        getMatchVenue(match),
        match.format,
        FORMAT_SHORT[match.format],
        getEventType(match),
        match.date,
        match.result,
      ];
      if (!obfuscateOpponents)
        fields.push(match.opponentName || "", normalizedName(match.opponentName || ""), match.opponentGemId || "");
      const haystack = fields.join(" ").toLowerCase();
      if (!tokens.every((token) => haystack.includes(token))) return false;
    }
    return true;
  });
  return filtered.sort((a, b) => {
    const newestFirst =
      timestamp(b.date) - timestamp(a.date) ||
      getRoundNumber(b) - getRoundNumber(a) ||
      timestamp(b.createdAt) - timestamp(a.createdAt) ||
      a.id.localeCompare(b.id);
    return active.sort === "oldest" ? -newestFirst : newestFirst;
  });
}
