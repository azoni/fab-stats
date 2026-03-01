import { getWeekStart, getMonthStart } from "./leaderboard";
import type { LeaderboardEntry } from "@/types";

export interface LeaderboardRank {
  tab: string;
  tabLabel: string;
  rank: 1 | 2 | 3 | 4 | 5;
}

type RankTab = { id: string; label: string; filter: (e: LeaderboardEntry) => boolean; sort: (a: LeaderboardEntry, b: LeaderboardEntry) => number };

const currentWeekStart = getWeekStart();
const currentMonthStart = getMonthStart();

const RANK_TABS: RankTab[] = [
  {
    id: "winrate",
    label: "Win Rate",
    filter: (e) => e.totalMatches >= 100,
    sort: (a, b) => b.winRate - a.winRate || b.totalMatches - a.totalMatches,
  },
  {
    id: "volume",
    label: "Most Matches",
    filter: () => true,
    sort: (a, b) => b.totalMatches - a.totalMatches,
  },
  {
    id: "mostwins",
    label: "Most Wins",
    filter: (e) => e.totalWins > 0,
    sort: (a, b) => b.totalWins - a.totalWins || b.winRate - a.winRate,
  },
  {
    id: "weeklymatches",
    label: "Weekly Matches",
    filter: (e) => e.weekStart === currentWeekStart && e.weeklyMatches > 0,
    sort: (a, b) => b.weeklyMatches - a.weeklyMatches || b.weeklyWins - a.weeklyWins,
  },
  {
    id: "weeklywins",
    label: "Weekly Wins",
    filter: (e) => e.weekStart === currentWeekStart && e.weeklyWins > 0,
    sort: (a, b) => b.weeklyWins - a.weeklyWins || b.weeklyMatches - a.weeklyMatches,
  },
  {
    id: "monthlymatches",
    label: "Monthly Matches",
    filter: (e) => e.monthStart === currentMonthStart && (e.monthlyMatches ?? 0) > 0,
    sort: (a, b) => (b.monthlyMatches ?? 0) - (a.monthlyMatches ?? 0) || (b.monthlyWins ?? 0) - (a.monthlyWins ?? 0),
  },
  {
    id: "monthlywins",
    label: "Monthly Wins",
    filter: (e) => e.monthStart === currentMonthStart && (e.monthlyWins ?? 0) > 0,
    sort: (a, b) => (b.monthlyWins ?? 0) - (a.monthlyWins ?? 0) || (b.monthlyMatches ?? 0) - (a.monthlyMatches ?? 0),
  },
  {
    id: "monthlywinrate",
    label: "Monthly Win Rate",
    filter: (e) => e.monthStart === currentMonthStart && (e.monthlyMatches ?? 0) >= 5,
    sort: (a, b) => (b.monthlyWinRate ?? 0) - (a.monthlyWinRate ?? 0) || (b.monthlyMatches ?? 0) - (a.monthlyMatches ?? 0),
  },
  {
    id: "mostlosses",
    label: "Most Losses",
    filter: (e) => e.totalLosses > 0,
    sort: (a, b) => b.totalLosses - a.totalLosses || b.totalMatches - a.totalMatches,
  },
  {
    id: "streaks",
    label: "Streaks",
    filter: (e) => e.longestWinStreak > 0,
    sort: (a, b) => b.longestWinStreak - a.longestWinStreak || b.totalMatches - a.totalMatches,
  },
  {
    id: "draws",
    label: "Draws",
    filter: (e) => e.totalDraws > 0,
    sort: (a, b) => b.totalDraws - a.totalDraws || b.totalMatches - a.totalMatches,
  },
  {
    id: "drawrate",
    label: "Draw %",
    filter: (e) => e.totalDraws > 0 && e.totalMatches >= 10,
    sort: (a, b) => {
      const aRate = (a.totalDraws / a.totalMatches) * 100;
      const bRate = (b.totalDraws / b.totalMatches) * 100;
      return bRate - aRate || b.totalDraws - a.totalDraws;
    },
  },
  {
    id: "events",
    label: "Events",
    filter: (e) => e.eventsPlayed > 0,
    sort: (a, b) => b.eventWins - a.eventWins || b.eventsPlayed - a.eventsPlayed,
  },
  {
    id: "rated",
    label: "Rated",
    filter: (e) => e.ratedMatches >= 5,
    sort: (a, b) => b.ratedWinRate - a.ratedWinRate || b.ratedMatches - a.ratedMatches,
  },
  {
    id: "ratedstreak",
    label: "Rated Streak",
    filter: (e) => e.ratedWinStreak > 0,
    sort: (a, b) => b.ratedWinStreak - a.ratedWinStreak || b.ratedWinRate - a.ratedWinRate,
  },
  {
    id: "heroes",
    label: "Hero Variety",
    filter: (e) => e.uniqueHeroes > 0,
    sort: (a, b) => b.uniqueHeroes - a.uniqueHeroes || b.totalMatches - a.totalMatches,
  },
  {
    id: "dedication",
    label: "Hero Loyalty",
    filter: (e) => e.topHeroMatches > 0,
    sort: (a, b) => b.topHeroMatches - a.topHeroMatches || b.totalMatches - a.totalMatches,
  },
  {
    id: "hotstreak",
    label: "Hot Streak",
    filter: (e) => e.currentStreakType === "win" && e.currentStreakCount >= 2,
    sort: (a, b) => b.currentStreakCount - a.currentStreakCount || b.winRate - a.winRate,
  },
  {
    id: "coldstreak",
    label: "Cold Streak",
    filter: (e) => e.currentStreakType === "loss" && e.currentStreakCount >= 2,
    sort: (a, b) => b.currentStreakCount - a.currentStreakCount || a.winRate - b.winRate,
  },
  {
    id: "eventgrinder",
    label: "Event Grinder",
    filter: (e) => e.eventsPlayed > 0,
    sort: (a, b) => b.eventsPlayed - a.eventsPlayed || b.eventWins - a.eventWins,
  },
  {
    id: "earnings",
    label: "Earnings",
    filter: (e) => (e.earnings ?? 0) > 0,
    sort: (a, b) => (b.earnings ?? 0) - (a.earnings ?? 0),
  },
  {
    id: "armorywinrate",
    label: "Armory Win %",
    filter: (e) => e.armoryMatches >= 5,
    sort: (a, b) => b.armoryWinRate - a.armoryWinRate || b.armoryMatches - a.armoryMatches,
  },
  {
    id: "armoryattendance",
    label: "Armory Attendance",
    filter: (e) => (e.armoryEvents ?? 0) > 0,
    sort: (a, b) => (b.armoryEvents ?? 0) - (a.armoryEvents ?? 0) || b.armoryMatches - a.armoryMatches,
  },
  {
    id: "armorymatches",
    label: "Armory Matches",
    filter: (e) => e.armoryMatches > 0,
    sort: (a, b) => b.armoryMatches - a.armoryMatches || b.armoryWins - a.armoryWins,
  },
  {
    id: "byes",
    label: "Byes",
    filter: (e) => (e.totalByes ?? 0) > 0,
    sort: (a, b) => (b.totalByes ?? 0) - (a.totalByes ?? 0) || b.totalMatches - a.totalMatches,
  },
  {
    id: "byerate",
    label: "Bye %",
    filter: (e) => (e.totalByes ?? 0) > 0 && e.totalMatches >= 10,
    sort: (a, b) => {
      const aRate = ((a.totalByes ?? 0) / a.totalMatches) * 100;
      const bRate = ((b.totalByes ?? 0) / b.totalMatches) * 100;
      return bRate - aRate || (b.totalByes ?? 0) - (a.totalByes ?? 0);
    },
  },
  {
    id: "lowdrawrate",
    label: "Low Draw %",
    filter: (e) => e.totalMatches >= 50,
    sort: (a, b) => {
      const aRate = a.totalDraws / a.totalMatches;
      const bRate = b.totalDraws / b.totalMatches;
      return aRate - bRate || b.totalMatches - a.totalMatches;
    },
  },
  {
    id: "fewestdraws",
    label: "Fewest Draws",
    filter: (e) => e.totalMatches >= 50,
    sort: (a, b) => a.totalDraws - b.totalDraws || b.totalMatches - a.totalMatches,
  },
  {
    id: "balanced",
    label: "Perfectly Balanced",
    filter: (e) => e.totalMatches >= 20,
    sort: (a, b) => Math.abs(a.winRate - 50) - Math.abs(b.winRate - 50) || b.totalMatches - a.totalMatches,
  },
  {
    id: "uniqueopponents",
    label: "Unique Opponents",
    filter: (e) => (e.uniqueOpponents ?? 0) >= 5,
    sort: (a, b) => (b.uniqueOpponents ?? 0) - (a.uniqueOpponents ?? 0) || b.totalMatches - a.totalMatches,
  },
  {
    id: "silvermedals",
    label: "Silver Collector",
    filter: (e) => (e.totalFinalists ?? 0) > 0,
    sort: (a, b) => (b.totalFinalists ?? 0) - (a.totalFinalists ?? 0) || (b.totalTop8s ?? 0) - (a.totalTop8s ?? 0),
  },
  {
    id: "lossstreak",
    label: "Loss Streak",
    filter: (e) => (e.longestLossStreak ?? 0) >= 2,
    sort: (a, b) => (b.longestLossStreak ?? 0) - (a.longestLossStreak ?? 0) || b.totalMatches - a.totalMatches,
  },
  {
    id: "globetrotter",
    label: "Globe Trotter",
    filter: (e) => (e.uniqueVenues ?? 0) >= 2,
    sort: (a, b) => (b.uniqueVenues ?? 0) - (a.uniqueVenues ?? 0) || b.eventsPlayed - a.eventsPlayed,
  },
  {
    id: "top8s",
    label: "Top 8s",
    filter: (e) => (e.totalTop8s ?? 0) > 0,
    sort: (a, b) => (b.totalTop8s ?? 0) - (a.totalTop8s ?? 0) || b.eventWins - a.eventWins,
  },
  {
    id: "top8s_armory",
    label: "Armory Top 8s",
    filter: (e) => (e.top8sByEventType?.["Armory"] ?? 0) > 0,
    sort: (a, b) => (b.top8sByEventType?.["Armory"] ?? 0) - (a.top8sByEventType?.["Armory"] ?? 0) || (b.totalTop8s ?? 0) - (a.totalTop8s ?? 0),
  },
  {
    id: "top8s_skirmish",
    label: "Skirmish Top 8s",
    filter: (e) => (e.top8sByEventType?.["Skirmish"] ?? 0) > 0,
    sort: (a, b) => (b.top8sByEventType?.["Skirmish"] ?? 0) - (a.top8sByEventType?.["Skirmish"] ?? 0) || (b.totalTop8s ?? 0) - (a.totalTop8s ?? 0),
  },
  {
    id: "top8s_pq",
    label: "PQ Top 8s",
    filter: (e) => (e.top8sByEventType?.["ProQuest"] ?? 0) > 0,
    sort: (a, b) => (b.top8sByEventType?.["ProQuest"] ?? 0) - (a.top8sByEventType?.["ProQuest"] ?? 0) || (b.totalTop8s ?? 0) - (a.totalTop8s ?? 0),
  },
  {
    id: "top8s_bh",
    label: "BH Top 8s",
    filter: (e) => (e.top8sByEventType?.["Battle Hardened"] ?? 0) > 0,
    sort: (a, b) => (b.top8sByEventType?.["Battle Hardened"] ?? 0) - (a.top8sByEventType?.["Battle Hardened"] ?? 0) || (b.totalTop8s ?? 0) - (a.totalTop8s ?? 0),
  },
  {
    id: "top8s_rtn",
    label: "RTN Top 8s",
    filter: (e) => (e.top8sByEventType?.["Road to Nationals"] ?? 0) > 0,
    sort: (a, b) => (b.top8sByEventType?.["Road to Nationals"] ?? 0) - (a.top8sByEventType?.["Road to Nationals"] ?? 0) || (b.totalTop8s ?? 0) - (a.totalTop8s ?? 0),
  },
  {
    id: "top8s_calling",
    label: "Calling Top 8s",
    filter: (e) => (e.top8sByEventType?.["The Calling"] ?? 0) > 0,
    sort: (a, b) => (b.top8sByEventType?.["The Calling"] ?? 0) - (a.top8sByEventType?.["The Calling"] ?? 0) || (b.totalTop8s ?? 0) - (a.totalTop8s ?? 0),
  },
  {
    id: "top8s_nationals",
    label: "Nationals Top 8s",
    filter: (e) => (e.top8sByEventType?.["Nationals"] ?? 0) > 0,
    sort: (a, b) => (b.top8sByEventType?.["Nationals"] ?? 0) - (a.top8sByEventType?.["Nationals"] ?? 0) || (b.totalTop8s ?? 0) - (a.totalTop8s ?? 0),
  },
];

export function computeUserRanks(entries: LeaderboardEntry[], userId: string): LeaderboardRank[] {
  const ranks: LeaderboardRank[] = [];

  for (const tab of RANK_TABS) {
    const sorted = entries.filter(tab.filter).sort(tab.sort);
    const idx = sorted.findIndex((e) => e.userId === userId);
    if (idx >= 0 && idx < 5) {
      ranks.push({ tab: tab.id, tabLabel: tab.label, rank: (idx + 1) as 1 | 2 | 3 | 4 | 5 });
    }
  }

  return ranks;
}

export function getBestRank(ranks: LeaderboardRank[]): 1 | 2 | 3 | 4 | 5 | null {
  if (ranks.length === 0) return null;
  return Math.min(...ranks.map((r) => r.rank)) as 1 | 2 | 3 | 4 | 5;
}

/** Bulk-compute the best rank (1-5) for every user that appears in any top-5 across all tabs. */
export function computeRankMap(entries: LeaderboardEntry[]): Map<string, 1 | 2 | 3 | 4 | 5> {
  const map = new Map<string, 1 | 2 | 3 | 4 | 5>();

  for (const tab of RANK_TABS) {
    const sorted = entries.filter(tab.filter).sort(tab.sort);
    for (let i = 0; i < Math.min(5, sorted.length); i++) {
      const userId = sorted[i].userId;
      const rank = (i + 1) as 1 | 2 | 3 | 4 | 5;
      const existing = map.get(userId);
      if (!existing || rank < existing) {
        map.set(userId, rank);
      }
    }
  }

  return map;
}

export function rankBorderClass(rank: 1 | 2 | 3 | 4 | 5 | null | undefined): string {
  if (!rank) return "";
  return rank === 1 ? "rank-border-grandmaster"
    : rank === 2 ? "rank-border-diamond"
    : rank === 3 ? "rank-border-gold"
    : rank === 4 ? "rank-border-silver"
    : "rank-border-bronze";
}

/** Count how many RANK_TABS a single entry qualifies for. */
export function countQualifyingTabs(entry: LeaderboardEntry): number {
  return RANK_TABS.filter((tab) => tab.filter(entry)).length;
}

/** Returns a CSS border-color value matching the rank's avatar glow color. */
export function rankBorderColor(rank: 1 | 2 | 3 | 4 | 5 | null | undefined): string | undefined {
  if (!rank) return undefined;
  return rank === 1 ? "rgba(255, 50, 150, 0.5)"
    : rank === 2 ? "rgba(56, 189, 248, 0.45)"
    : rank === 3 ? "rgba(250, 204, 21, 0.45)"
    : rank === 4 ? "rgba(192, 192, 210, 0.35)"
    : "rgba(205, 127, 50, 0.4)";
}
