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
