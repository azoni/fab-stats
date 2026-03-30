"use client";
import { useMemo } from "react";
import type { LeaderboardEntry, MatchRecord } from "@/types";
import { Swords, Target, Star, Trophy, TrendingUp, Flame } from "lucide-react";

interface TeamAggregateStatsProps {
  entries: LeaderboardEntry[];
  accentColor?: string;
  /** When provided, stats are computed from these matches instead of leaderboard entries */
  filteredMatches?: Map<string, MatchRecord[]>;
  /** Active filters — used to filter top 8 data from leaderboard entries when filteredMatches is active */
  filterFormat?: string;
  filterEventType?: string;
  filterHero?: string;
}

function computeFromMatches(matchMap: Map<string, MatchRecord[]>) {
  let totalMatches = 0, totalWins = 0, totalLosses = 0, totalDraws = 0, totalByes = 0;
  let bestStreak = 0;
  const heroMap = new Map<string, { matches: number; wins: number }>();
  // Track events by grouping matches by event name+date per member
  const eventKeys = new Set<string>();

  for (const [, matches] of matchMap) {
    let streak = 0;
    for (const m of matches) {
      totalMatches++;
      if (m.result === "win") { totalWins++; streak++; if (streak > bestStreak) bestStreak = streak; }
      else if (m.result === "loss") { totalLosses++; streak = 0; }
      else if (m.result === "draw") { totalDraws++; streak = 0; }
      else if (m.result === "bye") { totalByes++; }

      if (m.heroPlayed && m.heroPlayed !== "Unknown") {
        const existing = heroMap.get(m.heroPlayed);
        const isWin = m.result === "win" ? 1 : 0;
        if (existing) { existing.matches++; existing.wins += isWin; }
        else heroMap.set(m.heroPlayed, { matches: 1, wins: isWin });
      }

      // Approximate event grouping from notes field
      const eventKey = m.notes?.split(" | ")[0]?.trim();
      if (eventKey && m.date) eventKeys.add(`${eventKey}|${m.date}`);
    }
  }

  const totalEvents = eventKeys.size;
  const denominator = totalMatches - totalByes;
  const winRate = denominator > 0 ? Math.round((totalWins / denominator) * 100) : 0;
  const topHeroes = [...heroMap.entries()]
    .sort((a, b) => b[1].matches - a[1].matches)
    .slice(0, 6)
    .map(([hero, { matches, wins }]) => ({
      hero: hero.split(",")[0],
      matches,
      winRate: matches > 0 ? Math.round((wins / matches) * 100) : 0,
    }));

  return { totalMatches, totalWins, totalLosses, totalDraws, winRate, totalEvents, totalTop8s: 0, top8Conversion: 0, topHeroes, bestStreak };
}

function computeFromLeaderboard(entries: LeaderboardEntry[]) {
  let totalMatches = 0, totalWins = 0, totalLosses = 0, totalDraws = 0, totalByes = 0;
  let totalEvents = 0, totalTop8s = 0, bestStreak = 0;
  const heroMap = new Map<string, { matches: number; wins: number }>();

  for (const e of entries) {
    totalMatches += e.totalMatches;
    totalWins += e.totalWins;
    totalLosses += e.totalLosses;
    totalDraws += e.totalDraws;
    totalByes += e.totalByes;
    totalEvents += e.eventsPlayed ?? 0;
    totalTop8s += e.totalTop8s ?? 0;
    if (e.longestWinStreak > bestStreak) bestStreak = e.longestWinStreak;

    if (e.heroBreakdown) {
      for (const h of e.heroBreakdown) {
        const existing = heroMap.get(h.hero);
        if (existing) { existing.matches += h.matches; existing.wins += h.wins; }
        else heroMap.set(h.hero, { matches: h.matches, wins: h.wins });
      }
    }
  }

  const denominator = totalMatches - totalByes;
  const winRate = denominator > 0 ? Math.round((totalWins / denominator) * 100) : 0;
  const topHeroes = [...heroMap.entries()]
    .sort((a, b) => b[1].matches - a[1].matches)
    .slice(0, 6)
    .map(([hero, { matches, wins }]) => ({
      hero: hero.split(",")[0],
      matches,
      winRate: matches > 0 ? Math.round((wins / matches) * 100) : 0,
    }));
  const top8Conversion = totalEvents > 0 ? Math.round((totalTop8s / totalEvents) * 100) : 0;

  return { totalMatches, totalWins, totalLosses, totalDraws, winRate, totalEvents, totalTop8s, top8Conversion, topHeroes, bestStreak };
}

export function TeamAggregateStats({ entries, accentColor = "#d4a843", filteredMatches, filterFormat, filterEventType, filterHero }: TeamAggregateStatsProps) {
  const stats = useMemo(() => {
    if (filteredMatches) return computeFromMatches(filteredMatches);
    return computeFromLeaderboard(entries);
  }, [entries, filteredMatches]);

  // Event types that have top 8 playoffs (tier 2+)
  const TOP8_EVENT_TYPES = new Set(["Skirmish", "ProQuest", "Battlegrounds", "Road to Nationals", "Showdown", "Battle Hardened", "The Calling", "Nationals", "Pro Tour", "Worlds"]);

  // Always compute top 8s from leaderboard entries (top8Heroes has event metadata for filtering)
  const top8Stats = useMemo(() => {
    let totalTop8s = 0;
    // Count unique competitive events across all members for conversion denominator
    const competitiveEventKeys = new Set<string>();
    for (const e of entries) {
      // Count top 8 finishes
      if (e.top8Heroes) {
        for (const t8 of e.top8Heroes) {
          if (filterEventType && filterEventType !== "all" && t8.eventType !== filterEventType) continue;
          if (filterFormat && filterFormat !== "all" && t8.format !== filterFormat) continue;
          if (filterHero && filterHero !== "all" && t8.hero !== filterHero) continue;
          totalTop8s++;
        }
      }
      // Count competitive events from heroBreakdownDetailed (unique event keys with tier 2+ types)
      if (e.heroBreakdownDetailed) {
        for (const hb of e.heroBreakdownDetailed) {
          if (!TOP8_EVENT_TYPES.has(hb.eventType)) continue;
          if (filterEventType && filterEventType !== "all" && hb.eventType !== filterEventType) continue;
          if (filterFormat && filterFormat !== "all" && hb.format !== filterFormat) continue;
          if (filterHero && filterHero !== "all" && hb.hero !== filterHero) continue;
          if (hb.eventKeys) {
            for (const ek of hb.eventKeys) competitiveEventKeys.add(ek);
          }
        }
      }
    }
    const competitiveEvents = competitiveEventKeys.size;
    const top8Conversion = competitiveEvents > 0 ? Math.round((totalTop8s / competitiveEvents) * 100) : 0;
    return { totalTop8s, top8Conversion, competitiveEvents };
  }, [entries, filterEventType, filterFormat, filterHero]);

  if (stats.totalMatches === 0) return null;

  const statItems = [
    { label: "Matches", value: stats.totalMatches.toLocaleString(), icon: Swords },
    { label: "Win Rate", value: `${stats.winRate}%`, sub: `${stats.totalWins}W ${stats.totalLosses}L ${stats.totalDraws}D`, icon: Target, color: stats.winRate >= 50 ? "var(--color-fab-win)" : "var(--color-fab-loss)" },
    { label: "Events", value: stats.totalEvents.toLocaleString(), icon: Star },
    { label: "Top 8s", value: top8Stats.totalTop8s.toLocaleString(), icon: Trophy, color: top8Stats.totalTop8s > 0 ? accentColor : undefined },
    { label: "Conversion", value: `${top8Stats.top8Conversion}%`, sub: `${top8Stats.totalTop8s}/${top8Stats.competitiveEvents}`, icon: TrendingUp },
    { label: "Best Streak", value: `${stats.bestStreak}W`, icon: Flame, color: stats.bestStreak >= 5 ? "var(--color-fab-win)" : undefined },
  ];

  return (
    <div>
      <h2 className="text-sm font-bold text-fab-text uppercase tracking-wider mb-4">Team Stats</h2>

      {/* Stat grid */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
        {statItems.map((s) => (
          <div key={s.label} className="bg-fab-surface border border-fab-border rounded-xl px-3 py-3 text-center">
            <s.icon className="w-3.5 h-3.5 mx-auto mb-1 text-fab-dim" />
            <p className="text-lg font-black tabular-nums leading-none" style={s.color ? { color: s.color } : undefined}>
              {s.value}
            </p>
            <p className="text-[10px] text-fab-muted mt-1">{s.label}</p>
            {s.sub && <p className="text-[9px] text-fab-dim mt-0.5">{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* Hero breakdown */}
      {stats.topHeroes.length > 0 && (
        <div className="bg-fab-surface border border-fab-border rounded-xl p-4">
          <h3 className="text-[10px] text-fab-muted uppercase tracking-wider font-semibold mb-3">Hero Breakdown</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {stats.topHeroes.map((h) => (
              <div key={h.hero} className="flex items-center gap-2.5 bg-fab-bg rounded-lg px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-fab-text truncate">{h.hero}</p>
                  <p className="text-[10px] text-fab-dim">{h.matches} matches</p>
                </div>
                <span className={`text-xs font-bold tabular-nums ${h.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
                  {h.winRate}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
