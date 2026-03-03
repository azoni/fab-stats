"use client";
import Link from "next/link";
import type { LeaderboardRank } from "@/lib/leaderboard-ranks";

const RANK_COLORS: Record<number, string> = {
  1: "text-fab-gold",
  2: "text-slate-300",
  3: "text-amber-600",
};

const RANK_LABELS: Record<number, string> = {
  1: "1st",
  2: "2nd",
  3: "3rd",
  4: "4th",
  5: "5th",
  6: "6th",
  7: "7th",
  8: "8th",
};

interface LeaderboardRankCardProps {
  ranks: LeaderboardRank[];
}

export function LeaderboardRankCard({ ranks }: LeaderboardRankCardProps) {
  if (ranks.length === 0) return null;

  // Sort by rank (best first)
  const sorted = [...ranks].sort((a, b) => a.rank - b.rank);
  const best = sorted[0];

  return (
    <div className="spotlight-card spotlight-leaderboard bg-fab-surface border border-fab-border rounded-lg px-3 py-2 relative overflow-hidden h-full min-h-[88px]">
      <div className="absolute inset-0 bg-gradient-to-br from-fab-gold/5 via-transparent to-transparent pointer-events-none" />
      <div className="relative">
        <p className="text-[10px] text-fab-gold/70 uppercase tracking-wider font-medium mb-1.5">Leaderboard</p>
        <div className="flex items-baseline gap-1.5 mb-1.5">
          <span className={`text-2xl font-black leading-tight ${RANK_COLORS[best.rank] || "text-fab-muted"}`}>
            #{best.rank}
          </span>
          <span className="text-xs text-fab-muted font-medium truncate">{best.tabLabel}</span>
        </div>
        {sorted.length > 1 && (
          <div className="flex flex-wrap gap-x-2 gap-y-0.5">
            {sorted.slice(1, 5).map((r) => (
              <Link
                key={r.tab}
                href={`/leaderboard?tab=${r.tab}`}
                className="flex items-center gap-0.5 group"
              >
                <span className={`text-[10px] font-bold tabular-nums ${RANK_COLORS[r.rank] || "text-fab-dim"}`}>
                  {RANK_LABELS[r.rank]}
                </span>
                <span className="text-[9px] text-fab-dim group-hover:text-fab-muted transition-colors truncate">
                  {r.tabLabel}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
