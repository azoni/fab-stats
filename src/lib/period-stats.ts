import type { MatchRecord } from "@/types";
import { MatchResult } from "@/types";

export type PeriodType = "week" | "month";

export interface PeriodStats {
  period: PeriodType;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  /** Delta vs previous period (null if no previous period data) */
  winRateDelta: number | null;
  previousMatches: number;
  topHero: string | null;
  topHeroRecord: string | null;
}

function getWeekBounds(): { start: string; prevStart: string; prevEnd: string } {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
  const prevMonday = new Date(monday.getTime() - 7 * 86400000);
  return {
    start: monday.toISOString().split("T")[0],
    prevStart: prevMonday.toISOString().split("T")[0],
    prevEnd: monday.toISOString().split("T")[0],
  };
}

function getMonthBounds(): { start: string; prevStart: string; prevEnd: string } {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return {
    start: firstOfMonth.toISOString().split("T")[0],
    prevStart: firstOfPrevMonth.toISOString().split("T")[0],
    prevEnd: firstOfMonth.toISOString().split("T")[0],
  };
}

function computeForPeriod(matches: MatchRecord[], start: string, end?: string): { wins: number; losses: number; draws: number; total: number; topHero: string | null; topHeroRecord: string | null } {
  const filtered = matches.filter((m) => {
    if (m.date < start) return false;
    if (end && m.date >= end) return false;
    return true;
  });

  const wins = filtered.filter((m) => m.result === MatchResult.Win).length;
  const losses = filtered.filter((m) => m.result === MatchResult.Loss).length;
  const draws = filtered.filter((m) => m.result === MatchResult.Draw).length;

  // Top hero by matches played
  const heroCounts: Record<string, { matches: number; wins: number; losses: number }> = {};
  for (const m of filtered) {
    if (!m.heroPlayed || m.heroPlayed === "Unknown") continue;
    if (!heroCounts[m.heroPlayed]) heroCounts[m.heroPlayed] = { matches: 0, wins: 0, losses: 0 };
    heroCounts[m.heroPlayed].matches++;
    if (m.result === MatchResult.Win) heroCounts[m.heroPlayed].wins++;
    if (m.result === MatchResult.Loss) heroCounts[m.heroPlayed].losses++;
  }

  const topEntry = Object.entries(heroCounts).sort((a, b) => b[1].matches - a[1].matches)[0];
  const topHero = topEntry ? topEntry[0] : null;
  const topHeroRecord = topEntry ? `${topEntry[1].wins}W-${topEntry[1].losses}L` : null;

  return { wins, losses, draws, total: filtered.length, topHero, topHeroRecord };
}

export function computePeriodStats(matches: MatchRecord[], period: PeriodType): PeriodStats {
  const bounds = period === "week" ? getWeekBounds() : getMonthBounds();

  const current = computeForPeriod(matches, bounds.start);
  const previous = computeForPeriod(matches, bounds.prevStart, bounds.prevEnd);

  const winRate = current.total > 0 ? (current.wins / current.total) * 100 : 0;
  const prevWinRate = previous.total > 0 ? (previous.wins / previous.total) * 100 : 0;

  return {
    period,
    matches: current.total,
    wins: current.wins,
    losses: current.losses,
    draws: current.draws,
    winRate,
    winRateDelta: previous.total > 0 && current.total > 0 ? winRate - prevWinRate : null,
    previousMatches: previous.total,
    topHero: current.topHero,
    topHeroRecord: current.topHeroRecord,
  };
}
