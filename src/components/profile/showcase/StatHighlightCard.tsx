"use client";
import type { OverallStats, HeroStats, EventStats } from "@/types";

export type StatType = "winRate" | "totalMatches" | "longestWinStreak" | "uniqueHeroes" | "uniqueOpponents" | "eventsPlayed";

interface StatDataProps {
  overall: OverallStats;
  heroStats: HeroStats[];
  eventStats: EventStats[];
  opponentCount: number;
}

interface StatHighlightCardProps extends StatDataProps {
  stat: StatType;
  stats?: StatType[];
  filter?: string;
}

function getStatValue(stat: StatType, data: StatDataProps, filter?: string): { value: string; label: string; sub?: string } {
  const { overall, heroStats, eventStats, opponentCount } = data;
  switch (stat) {
    case "winRate": {
      if (filter) {
        const filtered = eventStats.filter((e) => e.eventType === filter);
        const w = filtered.reduce((s, e) => s + e.wins, 0);
        const total = filtered.reduce((s, e) => s + e.totalMatches, 0);
        const wr = total > 0 ? (w / total) * 100 : 0;
        return { value: `${wr.toFixed(1)}%`, label: "Win Rate", sub: filter };
      }
      return { value: `${overall.overallWinRate.toFixed(1)}%`, label: "Win Rate" };
    }
    case "totalMatches":
      return { value: `${overall.totalMatches}`, label: "Total Matches" };
    case "longestWinStreak":
      return { value: `${overall.streaks.longestWinStreak}`, label: "Best Win Streak" };
    case "uniqueHeroes":
      return { value: `${heroStats.length}`, label: "Unique Heroes" };
    case "uniqueOpponents":
      return { value: `${opponentCount}`, label: "Unique Opponents" };
    case "eventsPlayed":
      return { value: `${eventStats.length}`, label: "Events Played" };
    default:
      return { value: "—", label: "Stat" };
  }
}

export function StatHighlightCard(props: StatHighlightCardProps) {
  const { stat, stats, filter, ...data } = props;
  // Use stats array if provided, otherwise fall back to single stat
  const statList: StatType[] = stats && stats.length > 0 ? stats : [stat];

  if (statList.length === 1) {
    const { value, label, sub } = getStatValue(statList[0], data, filter);
    return (
      <div className="spotlight-card spotlight-winrate bg-fab-surface border border-fab-border rounded-lg px-3 py-2 relative overflow-hidden h-full min-h-[88px]">
        <p className="text-[10px] text-cyan-400/70 uppercase tracking-wider font-medium mb-1">Stat</p>
        <p className="text-2xl font-black text-fab-text leading-tight">{value}</p>
        <p className="text-xs text-fab-muted font-medium mt-0.5">{label}</p>
        {sub && <p className="text-[11px] text-fab-dim">{sub}</p>}
      </div>
    );
  }

  return (
    <div className="spotlight-card spotlight-winrate bg-fab-surface border border-fab-border rounded-lg px-3 py-2 relative overflow-hidden h-full min-h-[88px]">
      <p className="text-[10px] text-cyan-400/70 uppercase tracking-wider font-medium mb-1.5">Stats</p>
      <div className="space-y-1.5">
        {statList.map((s) => {
          const { value, label } = getStatValue(s, data, filter);
          return (
            <div key={s} className="flex items-baseline justify-between gap-2">
              <p className="text-xs text-fab-muted font-medium truncate">{label}</p>
              <p className="text-base font-black text-fab-text leading-tight shrink-0">{value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
