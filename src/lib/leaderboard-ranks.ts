import type { LeaderboardEntry } from "@/types";

export interface LeaderboardRank {
  tab: string;
  tabLabel: string;
  rank: 1 | 2 | 3;
}

type RankTab = { id: string; label: string; filter: (e: LeaderboardEntry) => boolean; sort: (a: LeaderboardEntry, b: LeaderboardEntry) => number };

const RANK_TABS: RankTab[] = [
  {
    id: "winrate",
    label: "Win Rate",
    filter: (e) => e.totalMatches >= 10,
    sort: (a, b) => b.winRate - a.winRate || b.totalMatches - a.totalMatches,
  },
  {
    id: "volume",
    label: "Most Matches",
    filter: () => true,
    sort: (a, b) => b.totalMatches - a.totalMatches,
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
];

export function computeUserRanks(entries: LeaderboardEntry[], userId: string): LeaderboardRank[] {
  const ranks: LeaderboardRank[] = [];

  for (const tab of RANK_TABS) {
    const sorted = entries.filter(tab.filter).sort(tab.sort);
    const idx = sorted.findIndex((e) => e.userId === userId);
    if (idx >= 0 && idx < 3) {
      ranks.push({ tab: tab.id, tabLabel: tab.label, rank: (idx + 1) as 1 | 2 | 3 });
    }
  }

  return ranks;
}

export function getBestRank(ranks: LeaderboardRank[]): 1 | 2 | 3 | null {
  if (ranks.length === 0) return null;
  return Math.min(...ranks.map((r) => r.rank)) as 1 | 2 | 3;
}
