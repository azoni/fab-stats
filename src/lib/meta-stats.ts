import type { LeaderboardEntry } from "@/types";
import { allHeroes } from "@/lib/heroes";

const validHeroNames = new Set(allHeroes.map((h) => h.name));

export interface HeroMetaStats {
  hero: string;
  /** Number of players who have played this hero */
  playerCount: number;
  /** Total matches across all players */
  totalMatches: number;
  /** Total wins across all players */
  totalWins: number;
  /** Average win rate across players (weighted by matches) */
  avgWinRate: number;
  /** Popularity rank (1 = most popular) */
  popularityRank: number;
}

export interface CommunityOverview {
  totalPlayers: number;
  totalMatches: number;
  totalHeroes: number;
  avgWinRate: number;
}

export function computeMetaStats(
  entries: LeaderboardEntry[],
  filterFormat?: string,
  filterEventType?: string,
): {
  overview: CommunityOverview;
  heroStats: HeroMetaStats[];
} {
  const isFiltered = !!filterFormat || !!filterEventType;
  const heroAgg = new Map<string, { players: Set<string>; matches: number; wins: number }>();

  let totalMatches = 0;
  let totalWins = 0;
  const playersWithData = new Set<string>();

  for (const entry of entries) {
    // When filtering, use heroBreakdownDetailed if available
    if (isFiltered && entry.heroBreakdownDetailed) {
      let hasMatchingData = false;
      for (const hb of entry.heroBreakdownDetailed) {
        if (!validHeroNames.has(hb.hero)) continue;
        if (filterFormat && hb.format !== filterFormat) continue;
        if (filterEventType && hb.eventType !== filterEventType) continue;

        hasMatchingData = true;
        const cur = heroAgg.get(hb.hero) || { players: new Set<string>(), matches: 0, wins: 0 };
        cur.players.add(entry.userId);
        cur.matches += hb.matches;
        cur.wins += hb.wins;
        heroAgg.set(hb.hero, cur);

        totalMatches += hb.matches;
        totalWins += hb.wins;
      }
      if (hasMatchingData) playersWithData.add(entry.userId);
    } else if (!isFiltered) {
      // Unfiltered: use existing heroBreakdown logic
      totalMatches += entry.totalMatches;
      totalWins += entry.totalWins;
      playersWithData.add(entry.userId);

      if (entry.heroBreakdown) {
        for (const hb of entry.heroBreakdown) {
          if (!validHeroNames.has(hb.hero)) continue;
          const cur = heroAgg.get(hb.hero) || { players: new Set<string>(), matches: 0, wins: 0 };
          cur.players.add(entry.userId);
          cur.matches += hb.matches;
          cur.wins += hb.wins;
          heroAgg.set(hb.hero, cur);
        }
      } else if (entry.topHero && entry.topHero !== "Unknown" && validHeroNames.has(entry.topHero)) {
        const cur = heroAgg.get(entry.topHero) || { players: new Set<string>(), matches: 0, wins: 0 };
        cur.players.add(entry.userId);
        cur.matches += entry.topHeroMatches;
        cur.wins += Math.round(entry.topHeroMatches * (entry.winRate / 100));
        heroAgg.set(entry.topHero, cur);
      }
    }
  }

  const heroStatsList: HeroMetaStats[] = [...heroAgg.entries()]
    .map(([hero, data]) => ({
      hero,
      playerCount: data.players.size,
      totalMatches: data.matches,
      totalWins: data.wins,
      avgWinRate: data.matches > 0 ? (data.wins / data.matches) * 100 : 0,
      popularityRank: 0,
    }))
    .sort((a, b) => b.totalMatches - a.totalMatches);

  // Assign popularity ranks
  heroStatsList.forEach((h, i) => { h.popularityRank = i + 1; });

  return {
    overview: {
      totalPlayers: playersWithData.size,
      totalMatches,
      totalHeroes: heroAgg.size,
      avgWinRate: totalMatches > 0 ? (totalWins / totalMatches) * 100 : 0,
    },
    heroStats: heroStatsList,
  };
}

/** Extract available formats from leaderboard entries' detailed breakdowns */
export function getAvailableFormats(entries: LeaderboardEntry[]): string[] {
  const formats = new Set<string>();
  for (const entry of entries) {
    for (const hb of entry.heroBreakdownDetailed || []) {
      formats.add(hb.format);
    }
  }
  return [...formats].sort();
}

/** Extract available event types from leaderboard entries' detailed breakdowns */
export function getAvailableEventTypes(entries: LeaderboardEntry[]): string[] {
  const types = new Set<string>();
  for (const entry of entries) {
    for (const hb of entry.heroBreakdownDetailed || []) {
      types.add(hb.eventType);
    }
  }
  return [...types].sort();
}
