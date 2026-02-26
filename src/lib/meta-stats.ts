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

export function computeMetaStats(entries: LeaderboardEntry[]): {
  overview: CommunityOverview;
  heroStats: HeroMetaStats[];
} {
  const heroAgg = new Map<string, { players: number; matches: number; wins: number }>();

  let totalMatches = 0;
  let totalWins = 0;

  for (const entry of entries) {
    totalMatches += entry.totalMatches;
    totalWins += entry.totalWins;

    if (entry.heroBreakdown) {
      for (const hb of entry.heroBreakdown) {
        if (!validHeroNames.has(hb.hero)) continue;
        const cur = heroAgg.get(hb.hero) || { players: 0, matches: 0, wins: 0 };
        cur.players++;
        cur.matches += hb.matches;
        cur.wins += hb.wins;
        heroAgg.set(hb.hero, cur);
      }
    } else if (entry.topHero && entry.topHero !== "Unknown" && validHeroNames.has(entry.topHero)) {
      // Fallback for entries without heroBreakdown — use topHero with estimated stats
      const cur = heroAgg.get(entry.topHero) || { players: 0, matches: 0, wins: 0 };
      cur.players++;
      cur.matches += entry.topHeroMatches;
      cur.wins += Math.round(entry.topHeroMatches * (entry.winRate / 100));
      heroAgg.set(entry.topHero, cur);
    }
  }

  const heroStatsList: HeroMetaStats[] = [...heroAgg.entries()]
    .map(([hero, data]) => ({
      hero,
      playerCount: data.players,
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
      totalPlayers: entries.length,
      totalMatches,
      totalHeroes: heroAgg.size,
      avgWinRate: totalMatches > 0 ? (totalWins / totalMatches) * 100 : 0,
    },
    heroStats: heroStatsList,
  };
}
