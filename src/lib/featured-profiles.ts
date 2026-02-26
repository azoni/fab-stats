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
  const publicEntries = entries.filter((e) => e.isPublic && e.username);
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
      reason: "Win Rate King",
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
