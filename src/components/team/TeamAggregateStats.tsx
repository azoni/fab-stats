"use client";
import { useMemo } from "react";
import type { LeaderboardEntry } from "@/types";
import { StatCard } from "@/components/ui/StatCard";
import { Trophy, Target, Swords, Star } from "lucide-react";

interface TeamAggregateStatsProps {
  entries: LeaderboardEntry[];
}

export function TeamAggregateStats({ entries }: TeamAggregateStatsProps) {
  const stats = useMemo(() => {
    let totalMatches = 0;
    let totalWins = 0;
    let totalLosses = 0;
    let totalDraws = 0;
    let totalEvents = 0;
    let totalTop8s = 0;
    const heroMap = new Map<string, { matches: number; wins: number }>();

    for (const e of entries) {
      totalMatches += e.totalMatches;
      totalWins += e.totalWins;
      totalLosses += e.totalLosses;
      totalDraws += e.totalDraws;
      totalEvents += e.eventsPlayed ?? 0;
      totalTop8s += e.totalTop8s ?? 0;

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

    const winRate = totalMatches > 0 ? Math.round((totalWins / (totalMatches - (entries.reduce((s, e) => s + e.totalByes, 0)))) * 100) : 0;
    const topHeroes = [...heroMap.entries()]
      .sort((a, b) => b[1].matches - a[1].matches)
      .slice(0, 5)
      .map(([hero, { matches, wins }]) => ({
        hero,
        matches,
        winRate: matches > 0 ? Math.round((wins / matches) * 100) : 0,
      }));

    const top8Conversion = totalEvents > 0 ? Math.round((totalTop8s / totalEvents) * 100) : 0;

    return { totalMatches, totalWins, totalLosses, totalDraws, winRate, totalEvents, totalTop8s, top8Conversion, topHeroes };
  }, [entries]);

  if (entries.length === 0) return null;

  return (
    <div>
      <h2 className="text-sm font-semibold text-fab-text mb-3">Team Stats</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
        <StatCard
          label="Total Matches"
          value={stats.totalMatches.toLocaleString()}
          icon={<Swords className="w-3.5 h-3.5" />}
        />
        <StatCard
          label="Win Rate"
          value={`${stats.winRate}%`}
          sub={`${stats.totalWins}W ${stats.totalLosses}L ${stats.totalDraws}D`}
          icon={<Target className="w-3.5 h-3.5" />}
          color={stats.winRate >= 50 ? "var(--color-fab-win)" : "var(--color-fab-loss)"}
        />
        <StatCard
          label="Events Played"
          value={stats.totalEvents.toLocaleString()}
          icon={<Star className="w-3.5 h-3.5" />}
        />
        <StatCard
          label="Top 8 Finishes"
          value={stats.totalTop8s.toLocaleString()}
          icon={<Trophy className="w-3.5 h-3.5" />}
        />
        <StatCard
          label="Top 8 Conversion"
          value={`${stats.top8Conversion}%`}
          sub={`${stats.totalTop8s} / ${stats.totalEvents} events`}
          icon={<Trophy className="w-3.5 h-3.5" />}
          color={stats.top8Conversion >= 20 ? "var(--color-fab-win)" : undefined}
        />
      </div>

      {stats.topHeroes.length > 0 && (
        <div>
          <h3 className="text-xs text-fab-muted mb-2">Most Played Heroes</h3>
          <div className="flex flex-wrap gap-2">
            {stats.topHeroes.map((h) => (
              <div key={h.hero} className="bg-fab-surface border border-fab-border rounded-lg px-3 py-1.5 text-xs">
                <span className="font-medium text-fab-text">{h.hero.split(",")[0]}</span>
                <span className="text-fab-dim ml-1.5">{h.matches} matches</span>
                <span className={`ml-1.5 ${h.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>{h.winRate}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
