"use client";
import { useMemo } from "react";
import type { LeaderboardEntry } from "@/types";
import { Swords, Target, Star, Trophy, TrendingUp, Flame } from "lucide-react";

interface TeamAggregateStatsProps {
  entries: LeaderboardEntry[];
  accentColor?: string;
}

export function TeamAggregateStats({ entries, accentColor = "#d4a843" }: TeamAggregateStatsProps) {
  const stats = useMemo(() => {
    let totalMatches = 0;
    let totalWins = 0;
    let totalLosses = 0;
    let totalDraws = 0;
    let totalByes = 0;
    let totalEvents = 0;
    let totalTop8s = 0;
    let bestStreak = 0;
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
          if (existing) {
            existing.matches += h.matches;
            existing.wins += h.wins;
          } else {
            heroMap.set(h.hero, { matches: h.matches, wins: h.wins });
          }
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
  }, [entries]);

  if (entries.length === 0) return null;

  const statItems = [
    { label: "Matches", value: stats.totalMatches.toLocaleString(), icon: Swords },
    { label: "Win Rate", value: `${stats.winRate}%`, sub: `${stats.totalWins}W ${stats.totalLosses}L ${stats.totalDraws}D`, icon: Target, color: stats.winRate >= 50 ? "var(--color-fab-win)" : "var(--color-fab-loss)" },
    { label: "Events", value: stats.totalEvents.toLocaleString(), icon: Star },
    { label: "Top 8s", value: stats.totalTop8s.toLocaleString(), icon: Trophy, color: stats.totalTop8s > 0 ? accentColor : undefined },
    { label: "Conversion", value: `${stats.top8Conversion}%`, sub: `${stats.totalTop8s}/${stats.totalEvents}`, icon: TrendingUp },
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
