import type { MatchRecord } from "@/types";
import { MatchResult } from "@/types";
import {
  computeOverallStats,
  computeHeroStats,
  computeOpponentStats,
  computeEventStats,
  computeEventTypeStats,
  computeVenueStats,
} from "./stats";

export interface WrappedStats {
  totalMatches: number;
  totalEvents: number;
  dateRange: { first: string; last: string };
  record: { wins: number; losses: number; draws: number; winRate: number };
  mostPlayedHero: { name: string; matches: number; winRate: number } | null;
  bestHero: { name: string; matches: number; winRate: number } | null;
  nemesis: {
    name: string;
    matches: number;
    wins: number;
    losses: number;
  } | null;
  rival: {
    name: string;
    matches: number;
    wins: number;
    losses: number;
    winRate: number;
  } | null;
  longestWinStreak: number;
  longestLossStreak: number;
  formatBreakdown: { name: string; count: number }[];
  favoriteFormat: { name: string; count: number; winRate: number } | null;
  homeVenue: { name: string; matches: number; winRate: number } | null;
  eventTypeBreakdown: { type: string; count: number; winRate: number }[];
  monthlyData: {
    month: string;
    matches: number;
    wins: number;
    winRate: number;
  }[];
  bestMonth: { month: string; matches: number; winRate: number } | null;
  playoffAppearances: { top8: number; top4: number; finals: number };
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function computeWrappedStats(matches: MatchRecord[]): WrappedStats {
  const overall = computeOverallStats(matches);
  const heroStats = computeHeroStats(matches);
  const opponentStats = computeOpponentStats(matches);
  const eventStats = computeEventStats(matches);
  const eventTypeStats = computeEventTypeStats(matches);
  const venueStats = computeVenueStats(matches).filter(
    (v) => v.venue !== "Unknown"
  );

  // Date range
  const sorted = [...matches].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const dateRange = {
    first: sorted[0]?.date || "",
    last: sorted[sorted.length - 1]?.date || "",
  };

  // Hero stats — filter out "Unknown"
  const realHeroes = heroStats.filter((h) => h.heroName !== "Unknown");
  const mostPlayedHero =
    realHeroes.length > 0
      ? {
          name: realHeroes[0].heroName,
          matches: realHeroes[0].totalMatches,
          winRate: realHeroes[0].winRate,
        }
      : null;

  const bestHero =
    realHeroes.filter((h) => h.totalMatches >= 5).length > 0
      ? (() => {
          const best = [...realHeroes]
            .filter((h) => h.totalMatches >= 5)
            .sort((a, b) => b.winRate - a.winRate)[0];
          return {
            name: best.heroName,
            matches: best.totalMatches,
            winRate: best.winRate,
          };
        })()
      : null;

  // Opponent stats — filter out "Unknown"
  const realOpponents = opponentStats.filter(
    (o) => o.opponentName !== "Unknown"
  );
  const nemesis =
    realOpponents.length > 0
      ? {
          name: realOpponents[0].opponentName,
          matches: realOpponents[0].totalMatches,
          wins: realOpponents[0].wins,
          losses: realOpponents[0].losses,
        }
      : null;

  // Rival — worst win rate against (min 3 matches)
  const rivalCandidates = realOpponents.filter((o) => o.totalMatches >= 3);
  const rival =
    rivalCandidates.length > 0
      ? (() => {
          const worst = [...rivalCandidates].sort(
            (a, b) => a.winRate - b.winRate
          )[0];
          return {
            name: worst.opponentName,
            matches: worst.totalMatches,
            wins: worst.wins,
            losses: worst.losses,
            winRate: worst.winRate,
          };
        })()
      : null;

  // Format breakdown
  const formatMap = new Map<string, number>();
  for (const m of matches) {
    formatMap.set(m.format, (formatMap.get(m.format) ?? 0) + 1);
  }
  const formatBreakdown = Array.from(formatMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Favorite format — most played with win rate
  const favoriteFormat =
    formatBreakdown.length > 0
      ? (() => {
          const fav = formatBreakdown[0];
          const favMatches = matches.filter((m) => m.format === fav.name);
          const wins = favMatches.filter(
            (m) => m.result === MatchResult.Win
          ).length;
          return {
            name: fav.name,
            count: fav.count,
            winRate: favMatches.length > 0 ? (wins / favMatches.length) * 100 : 0,
          };
        })()
      : null;

  // Home venue
  const homeVenue =
    venueStats.length > 0
      ? {
          name: venueStats[0].venue,
          matches: venueStats[0].totalMatches,
          winRate: venueStats[0].winRate,
        }
      : null;

  // Event type breakdown
  const eventTypeBreakdown = eventTypeStats
    .filter((e) => e.eventType !== "Other")
    .map((e) => ({
      type: e.eventType,
      count: e.totalMatches,
      winRate: e.winRate,
    }));

  // Monthly data — build all 12 months
  const monthlyData = MONTH_NAMES.map((monthName, i) => {
    const monthStr = String(i + 1).padStart(2, "0");
    const monthMatches = matches.filter((m) => {
      const parts = m.date.split("-");
      return parts[1] === monthStr;
    });
    const wins = monthMatches.filter(
      (m) => m.result === MatchResult.Win
    ).length;
    return {
      month: monthName,
      matches: monthMatches.length,
      wins,
      winRate:
        monthMatches.length > 0 ? (wins / monthMatches.length) * 100 : 0,
    };
  });

  // Best month (min 3 matches)
  const activeMonths = monthlyData.filter((m) => m.matches >= 3);
  const bestMonth =
    activeMonths.length > 0
      ? [...activeMonths].sort((a, b) => b.winRate - a.winRate)[0]
      : null;

  // Playoff appearances — parse from notes
  let top8 = 0;
  let top4 = 0;
  let finals = 0;
  for (const m of matches) {
    const roundInfo = m.notes?.split(" | ")[1];
    if (!roundInfo) continue;
    if (roundInfo === "Top 8") top8++;
    else if (roundInfo === "Top 4") top4++;
    else if (roundInfo === "Finals") finals++;
  }

  return {
    totalMatches: overall.totalMatches,
    totalEvents: eventStats.length,
    dateRange,
    record: {
      wins: overall.totalWins,
      losses: overall.totalLosses,
      draws: overall.totalDraws,
      winRate: overall.overallWinRate,
    },
    mostPlayedHero,
    bestHero,
    nemesis,
    rival,
    longestWinStreak: overall.streaks.longestWinStreak,
    longestLossStreak: overall.streaks.longestLossStreak,
    formatBreakdown,
    favoriteFormat,
    homeVenue,
    eventTypeBreakdown,
    monthlyData,
    bestMonth,
    playoffAppearances: { top8, top4, finals },
  };
}
