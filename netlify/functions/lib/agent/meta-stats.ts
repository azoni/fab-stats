/**
 * Meta statistics computation — ported from fab-stats/src/lib/meta-stats.ts
 * Aggregates hero usage and top-8 data from leaderboard entries.
 */

import type { LeaderboardEntry, Season } from "./fab-types";

export interface HeroMetaStats {
  hero: string;
  playerCount: number;
  totalMatches: number;
  totalWins: number;
  avgWinRate: number;
  metaShare: number;
  popularityRank: number;
}

export interface CommunityOverview {
  totalPlayers: number;
  totalMatches: number;
  totalHeroes: number;
  avgWinRate: number;
}

export interface Top8HeroMeta {
  hero: string;
  count: number;
  champions: number;
  finalists: number;
  top4: number;
  top8: number;
}

export type MetaPeriod = "all" | "weekly" | "monthly";

export function computeMetaStats(
  entries: LeaderboardEntry[],
  filterFormat?: string,
  filterEventType?: string,
  period: MetaPeriod = "all",
  sinceDateStr?: string,
  untilDateStr?: string,
): {
  overview: CommunityOverview;
  heroStats: HeroMetaStats[];
} {
  const isFiltered = !!filterFormat || !!filterEventType;
  const isDateRange = !!sinceDateStr && !!untilDateStr;
  const usePeriodBreakdown = period !== "all";
  const heroAgg = new Map<string, { players: Set<string>; matches: number; wins: number }>();

  let totalMatches = 0;
  let totalWins = 0;
  const playersWithData = new Set<string>();

  for (const entry of entries) {
    if (usePeriodBreakdown) {
      const breakdown = period === "weekly" ? entry.weeklyHeroBreakdown : entry.monthlyHeroBreakdown;
      if (!breakdown || breakdown.length === 0) continue;

      let hasMatchingData = false;
      for (const hb of breakdown) {
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
    } else if ((isFiltered || isDateRange) && entry.heroBreakdownDetailed) {
      let hasMatchingData = false;
      for (const hb of entry.heroBreakdownDetailed) {
        if (filterFormat && hb.format !== filterFormat) continue;
        if (filterEventType && hb.eventType !== filterEventType) continue;

        // Date range filtering (for season mode)
        if (isDateRange) {
          const hasDateInRange = !hb.dates || hb.dates.length === 0
            || hb.dates.some(d => d >= sinceDateStr! && d <= untilDateStr!);
          if (!hasDateInRange) continue;
        }

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
      totalMatches += entry.totalMatches;
      totalWins += entry.totalWins;
      playersWithData.add(entry.userId);

      if (entry.heroBreakdownDetailed && entry.heroBreakdownDetailed.length > 0) {
        const heroTotals = new Map<string, { matches: number; wins: number }>();
        for (const hb of entry.heroBreakdownDetailed) {
          const cur = heroTotals.get(hb.hero) || { matches: 0, wins: 0 };
          cur.matches += hb.matches;
          cur.wins += hb.wins;
          heroTotals.set(hb.hero, cur);
        }
        for (const [hero, data] of heroTotals) {
          const cur = heroAgg.get(hero) || { players: new Set<string>(), matches: 0, wins: 0 };
          cur.players.add(entry.userId);
          cur.matches += data.matches;
          cur.wins += data.wins;
          heroAgg.set(hero, cur);
        }
      } else if (entry.heroBreakdown) {
        for (const hb of entry.heroBreakdown) {
          const cur = heroAgg.get(hb.hero) || { players: new Set<string>(), matches: 0, wins: 0 };
          cur.players.add(entry.userId);
          cur.matches += hb.matches;
          cur.wins += hb.wins;
          heroAgg.set(hb.hero, cur);
        }
      } else if (entry.topHero && entry.topHero !== "Unknown") {
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
      metaShare: totalMatches > 0 ? (data.matches / totalMatches) * 100 : 0,
      popularityRank: 0,
    }))
    .sort((a, b) => b.totalMatches - a.totalMatches);

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

export function computeTop8HeroMeta(
  entries: LeaderboardEntry[],
  filterEventType?: string,
  filterFormat?: string,
  sinceDateStr?: string,
  untilDateStr?: string,
): { heroStats: Top8HeroMeta[]; uniquePlayers: number } {
  const heroAgg = new Map<string, { count: number; champions: number; finalists: number; top4: number; top8: number }>();
  const players = new Set<string>();

  for (const entry of entries) {
    if (!entry.top8Heroes) continue;
    let counted = false;
    for (const t8 of entry.top8Heroes) {
      if (filterEventType && t8.eventType !== filterEventType) continue;
      if (filterFormat && t8.format !== filterFormat) continue;
      if (sinceDateStr && t8.eventDate < sinceDateStr) continue;
      if (untilDateStr && t8.eventDate > untilDateStr) continue;

      if (!counted) { players.add(entry.userId); counted = true; }

      const cur = heroAgg.get(t8.hero) || { count: 0, champions: 0, finalists: 0, top4: 0, top8: 0 };
      cur.count++;
      if (t8.placementType === "champion") cur.champions++;
      else if (t8.placementType === "finalist") cur.finalists++;
      else if (t8.placementType === "top4") cur.top4++;
      else cur.top8++;
      heroAgg.set(t8.hero, cur);
    }
  }

  return {
    heroStats: [...heroAgg.entries()]
      .map(([hero, data]) => ({ hero, ...data }))
      .sort((a, b) => b.count - a.count),
    uniquePlayers: players.size,
  };
}

/** Build filter params from a season */
export function seasonToFilters(season: Season): {
  filterFormat: string;
  filterEventType: string;
  sinceDateStr: string;
  untilDateStr: string;
} {
  return {
    filterFormat: season.format,
    filterEventType: season.eventType,
    sinceDateStr: season.startDate,
    untilDateStr: season.endDate,
  };
}
