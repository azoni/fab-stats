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
  /** % of all community events that featured this hero */
  metaShare: number;
  /** Rank by usage (1 = most played) */
  popularityRank: number;
  /** Number of unique event dates this hero was played on */
  uniqueEvents: number;
}

export interface CommunityOverview {
  totalPlayers: number;
  totalMatches: number;
  totalHeroes: number;
  totalEvents: number;
  avgWinRate: number;
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
  const isDateRange = !!sinceDateStr;
  const usePeriodBreakdown = period !== "all";
  const heroAgg = new Map<string, { players: Set<string>; matches: number; wins: number; playerDates: Set<string> }>();

  let totalMatches = 0;
  let totalWins = 0;
  const playersWithData = new Set<string>();
  const communityEventKeys = new Set<string>(); // unique events across all players

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
        const cur = heroAgg.get(hb.hero) || { players: new Set<string>(), matches: 0, wins: 0, playerDates: new Set<string>() };
        cur.players.add(entry.userId);
        cur.matches += hb.matches;
        cur.wins += hb.wins;
        heroAgg.set(hb.hero, cur);

        totalMatches += hb.matches;
        totalWins += hb.wins;
      }
      if (hasMatchingData) playersWithData.add(entry.userId);
    } else if ((isFiltered || isDateRange) && entry.heroBreakdownDetailed) {
      // When filtering by format/eventType/date range, use heroBreakdownDetailed
      let hasMatchingData = false;
      for (const hb of entry.heroBreakdownDetailed) {
        if (!validHeroNames.has(hb.hero)) continue;
        if (filterFormat && hb.format !== filterFormat) continue;
        if (filterEventType && hb.eventType !== filterEventType) continue;
        // Date range filtering: skip entries without dates, proportionally scale matches
        let effectiveMatches = hb.matches;
        let effectiveWins = hb.wins;
        if (isDateRange) {
          if (!hb.dates || hb.dates.length === 0) continue; // Can't verify dates — skip
          const datesInRange = hb.dates.filter(d => d >= sinceDateStr! && (!untilDateStr || d <= untilDateStr));
          if (datesInRange.length === 0) continue;
          // dates is unique dates (Set), so use proportional scaling for match/win counts
          const fraction = datesInRange.length / hb.dates.length;
          effectiveMatches = Math.round(hb.matches * fraction);
          effectiveWins = Math.round(hb.wins * fraction);
        }

        hasMatchingData = true;
        const cur = heroAgg.get(hb.hero) || { players: new Set<string>(), matches: 0, wins: 0, playerDates: new Set<string>() };
        cur.players.add(entry.userId);
        cur.matches += effectiveMatches;
        cur.wins += effectiveWins;
        // Track unique player-date pairs for this hero (each player's date = 1 event)
        if (hb.dates) {
          const datesToAdd = isDateRange
            ? hb.dates.filter(d => d >= sinceDateStr! && (!untilDateStr || d <= untilDateStr))
            : hb.dates;
          for (const d of datesToAdd) cur.playerDates.add(`${entry.userId}|${d}`);
        }
        // Track unique events by event name + date for community total
        if (hb.eventKeys) {
          for (const ek of hb.eventKeys) {
            const ekDate = ek.split("|").pop() || "";
            if (!isDateRange || (ekDate >= sinceDateStr! && (!untilDateStr || ekDate <= untilDateStr))) {
              communityEventKeys.add(ek);
            }
          }
        } else if (hb.dates) {
          // Fallback for old data without eventKeys: use player-date pairs
          const datesToAdd = isDateRange
            ? hb.dates.filter(d => d >= sinceDateStr! && (!untilDateStr || d <= untilDateStr))
            : hb.dates;
          for (const d of datesToAdd) communityEventKeys.add(`${entry.userId}|${d}`);
        }
        heroAgg.set(hb.hero, cur);

        totalMatches += effectiveMatches;
        totalWins += effectiveWins;
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
        const heroTotals = new Map<string, { matches: number; wins: number; dates: Set<string> }>();
        for (const hb of entry.heroBreakdownDetailed) {
          if (!validHeroNames.has(hb.hero)) continue;
          const cur = heroTotals.get(hb.hero) || { matches: 0, wins: 0, dates: new Set<string>() };
          cur.matches += hb.matches;
          cur.wins += hb.wins;
          if (hb.dates) for (const d of hb.dates) cur.dates.add(d);
          // Collect event keys for community total
          if (hb.eventKeys) {
            for (const ek of hb.eventKeys) communityEventKeys.add(ek);
          } else if (hb.dates) {
            for (const d of hb.dates) communityEventKeys.add(`${entry.userId}|${d}`);
          }
          heroTotals.set(hb.hero, cur);
        }
        for (const [hero, data] of heroTotals) {
          const cur = heroAgg.get(hero) || { players: new Set<string>(), matches: 0, wins: 0, playerDates: new Set<string>() };
          cur.players.add(entry.userId);
          cur.matches += data.matches;
          cur.wins += data.wins;
          for (const d of data.dates) cur.playerDates.add(`${entry.userId}|${d}`);
          heroAgg.set(hero, cur);
        }
      } else if (entry.heroBreakdown) {
        for (const hb of entry.heroBreakdown) {
          if (!validHeroNames.has(hb.hero)) continue;
          const cur = heroAgg.get(hb.hero) || { players: new Set<string>(), matches: 0, wins: 0, playerDates: new Set<string>() };
          cur.players.add(entry.userId);
          cur.matches += hb.matches;
          cur.wins += hb.wins;
          heroAgg.set(hb.hero, cur);
        }
      }
      // Legacy entries with only topHero (no hero breakdown) are skipped for
      // hero aggregation — using overall winRate as a proxy would systematically
      // bias the hero's community win rate.
    }
  }

  const totalEventParticipations = [...heroAgg.values()].reduce((sum, d) => sum + d.playerDates.size, 0);
  const heroStatsList: HeroMetaStats[] = [...heroAgg.entries()]
    .map(([hero, data]) => ({
      hero,
      playerCount: data.players.size,
      totalMatches: data.matches,
      totalWins: data.wins,
      avgWinRate: data.matches > 0 ? (data.wins / data.matches) * 100 : 0,
      metaShare: totalEventParticipations > 0 ? (data.playerDates.size / totalEventParticipations) * 100 : 0,
      popularityRank: 0,
      uniqueEvents: data.playerDates.size,
    }))
    .sort((a, b) => b.uniqueEvents - a.uniqueEvents || b.totalMatches - a.totalMatches);

  // Assign popularity ranks
  heroStatsList.forEach((h, i) => { h.popularityRank = i + 1; });


  return {
    overview: {
      totalPlayers: playersWithData.size,
      totalMatches,
      totalHeroes: heroAgg.size,
      totalEvents: communityEventKeys.size,
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
  /** Number of event entries where this hero was played */
  totalPlayers: number;
}

/** Aggregate top 8 hero data across all leaderboard entries */
export function computeTop8HeroMeta(
  entries: LeaderboardEntry[],
  filterEventType?: string,
  filterFormat?: string,
  sinceDateStr?: string,
  untilDateStr?: string,
): Top8HeroMeta[] {
  const heroAgg = new Map<string, { count: number; champions: number; finalists: number; top4: number; top8: number }>();
  const isDateRange = !!sinceDateStr && !!untilDateStr;

  // Count event entries per hero (for the "Played" column)
  const heroEventCount = new Map<string, number>();
  if (!isDateRange) {
    // Use weekly breakdown for conversion rate (rolling-window mode)
    for (const entry of entries) {
      if (!entry.weeklyHeroBreakdown) continue;
      for (const hb of entry.weeklyHeroBreakdown) {
        if (!validHeroNames.has(hb.hero)) continue;
        if (filterEventType && hb.eventType !== filterEventType) continue;
        if (filterFormat && hb.format !== filterFormat) continue;
        heroEventCount.set(hb.hero, (heroEventCount.get(hb.hero) || 0) + 1);
      }
    }
  } else {
    // Date-range mode: count event entries whose dates overlap the range
    for (const entry of entries) {
      if (!entry.heroBreakdownDetailed) continue;
      for (const hb of entry.heroBreakdownDetailed) {
        if (!validHeroNames.has(hb.hero)) continue;
        if (filterEventType && hb.eventType !== filterEventType) continue;
        if (filterFormat && hb.format !== filterFormat) continue;
        // Count dates that fall within the range; if no dates backfilled, count as 1 entry
        if (hb.dates && hb.dates.length > 0) {
          const datesInRange = hb.dates.filter(d => d >= sinceDateStr! && d <= untilDateStr!).length;
          if (datesInRange > 0) {
            heroEventCount.set(hb.hero, (heroEventCount.get(hb.hero) || 0) + datesInRange);
          }
        } else {
          heroEventCount.set(hb.hero, (heroEventCount.get(hb.hero) || 0) + 1);
        }
      }
    }
  }

  for (const entry of entries) {
    if (!entry.top8Heroes) continue;
    for (const t8 of entry.top8Heroes) {
      if (!validHeroNames.has(t8.hero)) continue;
      if (filterEventType && t8.eventType !== filterEventType) continue;
      if (filterFormat && t8.format !== filterFormat) continue;
      if (sinceDateStr && t8.eventDate < sinceDateStr) continue;
      if (untilDateStr && t8.eventDate > untilDateStr) continue;

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
    .map(([hero, data]) => ({
      hero,
      ...data,
      // Played = max(event entries from breakdown, top8 count) so Played >= Top 8
      totalPlayers: Math.max(heroEventCount.get(hero) ?? 0, data.count),
    }))
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
  untilDateStr?: string,
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
      if (untilDateStr && t8.eventDate > untilDateStr) continue;

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
