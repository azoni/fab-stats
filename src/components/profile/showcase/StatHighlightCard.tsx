"use client";
import type { OverallStats, HeroStats, EventStats } from "@/types";

type StatType =
  | "winRate"
  | "totalMatches"
  | "longestWinStreak"
  | "uniqueHeroes"
  | "uniqueOpponents"
  | "eventsPlayed";

interface StatHighlightCardProps {
  stat: StatType;
  filter?: string;
  overall: OverallStats;
  heroStats: HeroStats[];
  eventStats: EventStats[];
  opponentCount: number;
}

function getStatValue(props: StatHighlightCardProps): { value: string; label: string; sub?: string } {
  const { stat, filter, overall, heroStats, eventStats, opponentCount } = props;

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
  const { value, label, sub } = getStatValue(props);

  return (
    <div className="spotlight-card spotlight-winrate bg-fab-surface border border-fab-border rounded-lg px-4 py-3 relative overflow-hidden">
      <div className="flex items-center gap-4">
        <div className="shrink-0">
          <p className="text-2xl font-black text-fab-text leading-none">{value}</p>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-fab-muted">{label}</p>
          {sub && <p className="text-[10px] text-fab-dim mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  );
}
