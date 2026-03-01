import type { LeaderboardEntry } from "@/types";
import { allHeroes } from "@/lib/heroes";
import { getWeekStart } from "@/lib/leaderboard";

const validHeroNames = new Set(allHeroes.map((h) => h.name));

export interface HeroMetaStats {
  hero: string;
  /** Number of players who have played this hero */
  playerCount: number;
  /** Total matches across all players */
  totalMatches: number;
  /** Total wins across all players */
  totalWins: number;
  /** Community win rate (totalWins / totalMatches) */
  avgWinRate: number;
  /** % of all community matches that are this hero */
  metaShare: number;
  /** Rank by usage (1 = most played) */
  popularityRank: number;
}

export interface CommunityOverview {
  totalPlayers: number;
  totalMatches: number;
  totalHeroes: number;
  avgWinRate: number;
}

export type MetaPeriod = "all" | "weekly" | "monthly";

export function computeMetaStats(
  entries: LeaderboardEntry[],
  filterFormat?: string,
  filterEventType?: string,
  period: MetaPeriod = "all",
): {
  overview: CommunityOverview;
  heroStats: HeroMetaStats[];
} {
  const isFiltered = !!filterFormat || !!filterEventType;
  const usePeriodBreakdown = period !== "all";
  const heroAgg = new Map<string, { players: Set<string>; matches: number; wins: number }>();

  let totalMatches = 0;
  let totalWins = 0;
  const playersWithData = new Set<string>();

  for (const entry of entries) {
    // When using weekly/monthly period, use the period-specific breakdown
    if (usePeriodBreakdown) {
      const breakdown = period === "weekly" ? entry.weeklyHeroBreakdown : entry.monthlyHeroBreakdown;
      if (!breakdown || breakdown.length === 0) continue;

      let hasMatchingData = false;
      for (const hb of breakdown) {
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
    } else if (isFiltered && entry.heroBreakdownDetailed) {
      // When filtering by format/eventType, use heroBreakdownDetailed
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
      // Unfiltered: use overall totals for overview stats
      totalMatches += entry.totalMatches;
      totalWins += entry.totalWins;
      playersWithData.add(entry.userId);

      // Prefer heroBreakdownDetailed for hero data (heroBreakdown is top-5 only)
      if (entry.heroBreakdownDetailed && entry.heroBreakdownDetailed.length > 0) {
        // Aggregate across all formats/eventTypes per hero
        const heroTotals = new Map<string, { matches: number; wins: number }>();
        for (const hb of entry.heroBreakdownDetailed) {
          if (!validHeroNames.has(hb.hero)) continue;
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
      metaShare: totalMatches > 0 ? (data.matches / totalMatches) * 100 : 0,
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

// ── Top 8 Hero Meta ──

export interface Top8HeroMeta {
  hero: string;
  count: number;
  champions: number;
  finalists: number;
  top4: number;
  top8: number;
  /** Number of tracked players who played this hero at the event type this week */
  totalPlayers: number;
}

/** Aggregate top 8 hero data across all leaderboard entries */
export function computeTop8HeroMeta(
  entries: LeaderboardEntry[],
  filterEventType?: string,
  filterFormat?: string,
  sinceDateStr?: string,
): Top8HeroMeta[] {
  const heroAgg = new Map<string, { count: number; champions: number; finalists: number; top4: number; top8: number }>();

  // Count unique players per hero from weekly breakdowns (for conversion rate)
  const heroPlayers = new Map<string, Set<string>>();
  for (const entry of entries) {
    if (!entry.weeklyHeroBreakdown) continue;
    for (const hb of entry.weeklyHeroBreakdown) {
      if (!validHeroNames.has(hb.hero)) continue;
      if (filterEventType && hb.eventType !== filterEventType) continue;
      if (filterFormat && hb.format !== filterFormat) continue;
      const players = heroPlayers.get(hb.hero) || new Set<string>();
      players.add(entry.userId);
      heroPlayers.set(hb.hero, players);
    }
  }

  for (const entry of entries) {
    if (!entry.top8Heroes) continue;
    for (const t8 of entry.top8Heroes) {
      if (!validHeroNames.has(t8.hero)) continue;
      if (filterEventType && t8.eventType !== filterEventType) continue;
      if (filterFormat && t8.format !== filterFormat) continue;
      if (sinceDateStr && t8.eventDate < sinceDateStr) continue;

      const cur = heroAgg.get(t8.hero) || { count: 0, champions: 0, finalists: 0, top4: 0, top8: 0 };
      cur.count++;
      if (t8.placementType === "champion") cur.champions++;
      else if (t8.placementType === "finalist") cur.finalists++;
      else if (t8.placementType === "top4") cur.top4++;
      else cur.top8++;
      heroAgg.set(t8.hero, cur);
    }
  }

  return [...heroAgg.entries()]
    .map(([hero, data]) => ({ hero, ...data, totalPlayers: heroPlayers.get(hero)?.size ?? 0 }))
    .sort((a, b) => b.count - a.count);
}

// ── Top 8 by Event ──

export interface EventTop8 {
  eventName: string;
  eventType: string;
  eventDate: string;
  format: string;
  heroes: { hero: string; placementType: string }[];
}

/** Group top 8 data by individual event across all leaderboard entries */
export function computeTop8ByEvent(
  entries: LeaderboardEntry[],
  filterEventType?: string,
  filterFormat?: string,
  sinceDateStr?: string,
): EventTop8[] {
  // Key = eventName|eventDate to group by unique event
  const eventMap = new Map<string, {
    eventName: string;
    eventType: string;
    eventDate: string;
    format: string;
    heroes: Map<string, string>; // hero → best placementType
  }>();

  const placementRank: Record<string, number> = { champion: 0, finalist: 1, top4: 2, top8: 3 };

  for (const entry of entries) {
    if (!entry.top8Heroes) continue;
    for (const t8 of entry.top8Heroes) {
      if (!validHeroNames.has(t8.hero)) continue;
      if (filterEventType && t8.eventType !== filterEventType) continue;
      if (filterFormat && t8.format !== filterFormat) continue;
      if (sinceDateStr && t8.eventDate < sinceDateStr) continue;

      const name = (t8 as { eventName?: string }).eventName || t8.eventType;
      const key = `${name}|${t8.eventDate}`;
      let ev = eventMap.get(key);
      if (!ev) {
        ev = {
          eventName: name,
          eventType: t8.eventType,
          eventDate: t8.eventDate,
          format: t8.format,
          heroes: new Map(),
        };
        eventMap.set(key, ev);
      }
      // Keep the best placement for each hero at this event
      const existing = ev.heroes.get(t8.hero);
      if (!existing || (placementRank[t8.placementType] ?? 9) < (placementRank[existing] ?? 9)) {
        ev.heroes.set(t8.hero, t8.placementType);
      }
    }
  }

  return [...eventMap.values()]
    .map((ev) => ({
      eventName: ev.eventName,
      eventType: ev.eventType,
      eventDate: ev.eventDate,
      format: ev.format,
      heroes: [...ev.heroes.entries()]
        .map(([hero, placementType]) => ({ hero, placementType }))
        .sort((a, b) => (placementRank[a.placementType] ?? 9) - (placementRank[b.placementType] ?? 9)),
    }))
    .sort((a, b) => b.eventDate.localeCompare(a.eventDate));
}

// ── Event Weekend Detection ──

const COMPETITIVE_EVENT_TYPES = new Set([
  "Skirmish", "ProQuest", "Battle Hardened", "Road to Nationals",
  "The Calling", "Nationals", "Pro Tour", "Worlds",
]);

/** Auto-detect the most active competitive event type this week from top 8 data */
export function detectActiveEventType(entries: LeaderboardEntry[]): string | null {
  const weekStart = getWeekStart();
  const counts = new Map<string, number>();

  for (const entry of entries) {
    if (!entry.top8Heroes) continue;
    for (const t8 of entry.top8Heroes) {
      if (t8.eventDate < weekStart) continue;
      if (!COMPETITIVE_EVENT_TYPES.has(t8.eventType)) continue;
      counts.set(t8.eventType, (counts.get(t8.eventType) || 0) + 1);
    }
  }

  if (counts.size === 0) return null;

  // Need at least 2 top 8 entries to consider it an active event weekend
  let best: string | null = null;
  let bestCount = 0;
  for (const [eventType, count] of counts) {
    if (count > bestCount) {
      best = eventType;
      bestCount = count;
    }
  }

  return bestCount >= 2 ? best : null;
}
