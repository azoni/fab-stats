import type { HeroMatchupDoc } from "@/types";
import { refineEventType } from "@/lib/stats";

export interface CommunityMatchupCell {
  hero1: string;
  hero2: string;
  hero1Wins: number;
  hero2Wins: number;
  draws: number;
  total: number;
}

function parseDate(value: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new RangeError("Invalid community matchup date range");
  }
  return date;
}

function monthString(date: Date): string {
  return date.toISOString().slice(0, 7);
}

/**
 * Community records are monthly aggregates, not exact-day records.
 * Only "all" returns an empty list, the reader's explicit all-time sentinel.
 * Legacy 30d/90d presets retain their two-/three-calendar-month windows.
 */
export function getMonthsForPreset(preset: string, now = new Date()): string[] {
  if (preset === "all") return [];

  if (preset.startsWith("custom:")) {
    const parts = preset.split(":");
    if (parts.length !== 3) {
      throw new RangeError("Invalid community matchup date range");
    }
    const start = parseDate(parts[1]);
    const end = parseDate(parts[2]);
    if (start > end) {
      throw new RangeError("Invalid community matchup date range");
    }
    // Start at day one so late-month dates cannot skip shorter months or the
    // final month when its end day is earlier than the range's starting day.
    start.setUTCDate(1);
    end.setUTCDate(1);
    const months: string[] = [];
    for (; start <= end; start.setUTCMonth(start.getUTCMonth() + 1)) {
      months.push(monthString(start));
    }
    return months;
  }

  if (!Number.isFinite(now.getTime())) {
    throw new RangeError("Invalid community matchup date");
  }
  const current = new Date(now);
  current.setUTCDate(1);
  current.setUTCHours(0, 0, 0, 0);
  const count = preset === "30d" ? 2 : preset === "90d" ? 3 : 1;
  current.setUTCMonth(current.getUTCMonth() - count + 1);
  const months: string[] = [];
  for (let i = 0; i < count; i++) {
    months.push(monthString(current));
    current.setUTCMonth(current.getUTCMonth() + 1);
  }
  return months;
}

type MatchupTally = Pick<CommunityMatchupCell, "hero1Wins" | "hero2Wins" | "draws" | "total">;

const EVENT_TYPE_ALIASES: Record<string, string> = {
  calling: "The Calling",
  "the calling": "The Calling",
  rtn: "Road to Nationals",
  "road to national": "Road to Nationals",
  "road to nationals": "Road to Nationals",
  pq: "ProQuest",
  proquest: "ProQuest",
  "pro quest": "ProQuest",
  "battle hardened": "Battle Hardened",
  "pro tour": "Pro Tour",
  worlds: "Worlds",
  "world championship": "Worlds",
};

function normalizeEventTypeLabel(value: string): string {
  const trimmed = value.trim();
  return EVENT_TYPE_ALIASES[trimmed.toLowerCase()] || refineEventType(trimmed, trimmed);
}

function findEventTypeStats(map: Record<string, MatchupTally> | undefined, target: string): MatchupTally | null {
  if (!map) return null;
  if (map[target]) return map[target];
  const normalizedTarget = normalizeEventTypeLabel(target);
  for (const [key, stats] of Object.entries(map)) {
    if (key === target || key.toLowerCase() === target.toLowerCase()) return stats;
    if (normalizeEventTypeLabel(key) === normalizedTarget) return stats;
  }
  return null;
}

function findFormatEventTypeStats(
  map: HeroMatchupDoc["byFormatEventType"],
  format: string,
  eventType: string,
): MatchupTally | null {
  if (!map) return null;
  const formatMap = map[format] || Object.entries(map).find(([key]) => key.toLowerCase() === format.toLowerCase())?.[1];
  return findEventTypeStats(formatMap, eventType);
}

/** Aggregate only available dimensions; callers must guard unsupported rated intersections. */
export function aggregateCommunityHeroMatchups(
  docs: readonly HeroMatchupDoc[],
  format?: string,
  rated?: "rated" | "unrated",
  eventType?: string,
): CommunityMatchupCell[] {
  const pairMap = new Map<string, CommunityMatchupCell>();

  for (const doc of docs) {
    let source: MatchupTally | null;
    if (format && eventType) {
      // An absent intersection must not admit this event's other formats.
      source = findFormatEventTypeStats(doc.byFormatEventType, format, eventType);
    } else if (eventType) {
      source = findEventTypeStats(doc.byEventType, eventType);
    } else if (format) {
      // Preserve the existing format precedence for legacy callers. There is
      // no format/rated intersection in the stored monthly schema.
      source = doc.byFormat?.[format] || null;
    } else if (rated) {
      source = doc.byRated?.[rated] || null;
    } else {
      source = doc;
    }
    if (!source) continue;

    const key = JSON.stringify([doc.hero1, doc.hero2]);
    let cell = pairMap.get(key);
    if (!cell) {
      cell = {
        hero1: doc.hero1,
        hero2: doc.hero2,
        hero1Wins: 0,
        hero2Wins: 0,
        draws: 0,
        total: 0,
      };
      pairMap.set(key, cell);
    }
    cell.hero1Wins += source.hero1Wins;
    cell.hero2Wins += source.hero2Wins;
    cell.draws += source.draws;
    cell.total += source.total;
  }
  return [...pairMap.values()].filter((cell) => cell.total > 0);
}
