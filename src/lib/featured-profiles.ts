import type { LeaderboardEntry } from "@/types";

export interface FeaturedProfile {
  entry: LeaderboardEntry;
  reason: string;
  stat: string;
}

interface CandidatePool {
  reason: string;
  candidates: LeaderboardEntry[];
  stat: (e: LeaderboardEntry) => string;
}

export function selectFeaturedProfiles(entries: LeaderboardEntry[]): FeaturedProfile[] {
  const publicEntries = entries.filter((e) => e.isPublic && e.username && !e.hideFromSpotlight);
  if (publicEntries.length === 0) return [];

  const pools: CandidatePool[] = [
    {
      reason: "Weekly Grinder",
      candidates: publicEntries
        .filter((e) => e.weeklyMatches > 0)
        .sort((a, b) => b.weeklyMatches - a.weeklyMatches)
        .slice(0, 3),
      stat: (e) => `${e.weeklyMatches} matches this week`,
    },
    {
      reason: "Hot Streak",
      candidates: publicEntries
        .filter((e) => e.currentStreakType === "win" && e.currentStreakCount >= 3)
        .sort((a, b) => b.currentStreakCount - a.currentStreakCount)
        .slice(0, 3),
      stat: (e) => `${e.currentStreakCount}W streak`,
    },
    {
      reason: "Top Win Rate",
      candidates: publicEntries
        .filter((e) => e.totalMatches >= 100)
        .sort((a, b) => b.winRate - a.winRate)
        .slice(0, 3),
      stat: (e) => `${e.winRate.toFixed(1)}% win rate`,
    },
    {
      reason: "Event Warrior",
      candidates: publicEntries
        .filter((e) => e.eventsPlayed > 0)
        .sort((a, b) => b.eventsPlayed - a.eventsPlayed)
        .slice(0, 3),
      stat: (e) => `${e.eventsPlayed} events played`,
    },
    {
      reason: "Most Active",
      candidates: publicEntries
        .sort((a, b) => b.totalMatches - a.totalMatches)
        .slice(0, 3),
      stat: (e) => `${e.totalMatches.toLocaleString()} matches`,
    },
    {
      reason: "Rising Star",
      candidates: publicEntries
        .filter((e) => e.totalMatches >= 20 && e.createdAt)
        .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
        .slice(0, 3),
      stat: (e) => `${e.totalMatches} matches`,
    },
    {
      reason: "Streak Legend",
      candidates: publicEntries
        .filter((e) => e.longestWinStreak >= 5)
        .sort((a, b) => b.longestWinStreak - a.longestWinStreak)
        .slice(0, 3),
      stat: (e) => `${e.longestWinStreak}W best streak`,
    },
    {
      reason: "Armory King",
      candidates: publicEntries
        .filter((e) => e.armoryEvents >= 5)
        .sort((a, b) => b.armoryWinRate - a.armoryWinRate)
        .slice(0, 3),
      stat: (e) => `${e.armoryWinRate.toFixed(0)}% across ${e.armoryEvents} armories`,
    },
    {
      reason: "Hero Specialist",
      candidates: publicEntries
        .filter((e) => e.topHeroMatches >= 30 && e.topHero)
        .sort((a, b) => b.topHeroMatches - a.topHeroMatches)
        .slice(0, 3),
      stat: (e) => `${e.topHeroMatches} matches on ${e.topHero}`,
    },
    {
      reason: "Versatile",
      candidates: publicEntries
        .filter((e) => e.uniqueHeroes >= 4 && e.totalMatches >= 50)
        .sort((a, b) => b.uniqueHeroes - a.uniqueHeroes)
        .slice(0, 3),
      stat: (e) => `${e.uniqueHeroes} different heroes`,
    },
    {
      reason: "Monthly MVP",
      candidates: publicEntries
        .filter((e) => e.monthlyMatches >= 10 && e.monthlyWinRate >= 55)
        .sort((a, b) => (b.monthlyWinRate * b.monthlyMatches) - (a.monthlyWinRate * a.monthlyMatches))
        .slice(0, 3),
      stat: (e) => `${e.monthlyWinRate.toFixed(0)}% over ${e.monthlyMatches} this month`,
    },
    {
      reason: "Rated Ace",
      candidates: publicEntries
        .filter((e) => e.ratedMatches >= 30 && e.ratedWinRate >= 55)
        .sort((a, b) => b.ratedWinRate - a.ratedWinRate)
        .slice(0, 3),
      stat: (e) => `${e.ratedWinRate.toFixed(1)}% rated win rate`,
    },
    {
      reason: "Trophy Hunter",
      candidates: publicEntries
        .filter((e) => (e.totalTop8s ?? 0) >= 2)
        .sort((a, b) => (b.totalTop8s ?? 0) - (a.totalTop8s ?? 0))
        .slice(0, 3),
      stat: (e) => `${e.totalTop8s} top 8 finishes`,
    },
    {
      reason: "Champion",
      candidates: publicEntries
        .filter((e) => e.eventWins >= 1)
        .sort((a, b) => b.eventWins - a.eventWins)
        .slice(0, 3),
      stat: (e) => `${e.eventWins} event win${e.eventWins !== 1 ? "s" : ""}`,
    },
  ];

  const selected: FeaturedProfile[] = [];
  const usedIds = new Set<string>();

  // Shuffle pools for variety across page loads
  const shuffled = [...pools].sort(() => Math.random() - 0.5);

  for (const pool of shuffled) {
    if (selected.length >= 4) break;
    const available = pool.candidates.filter((c) => !usedIds.has(c.userId));
    if (available.length === 0) continue;

    // Pick randomly from top candidates
    const pick = available[Math.floor(Math.random() * available.length)];
    usedIds.add(pick.userId);
    selected.push({
      entry: pick,
      reason: pool.reason,
      stat: pool.stat(pick),
    });
  }

  return selected;
}
