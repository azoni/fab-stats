"use client";
import Link from "next/link";
import type { LeaderboardEntry } from "@/types";
import { rankBorderClass } from "@/lib/leaderboard-ranks";

interface LeaderboardPreviewProps {
  entries: LeaderboardEntry[];
  rankMap?: Map<string, 1 | 2 | 3 | 4 | 5>;
}

export function LeaderboardPreview({ entries, rankMap }: LeaderboardPreviewProps) {
  if (entries.length === 0) return null;

  const top5 = [...entries]
    .filter((e) => e.totalMatches >= 10)
    .sort((a, b) => b.winRate - a.winRate)
    .slice(0, 5);

  if (top5.length === 0) return null;

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="section-header flex-1">
          <h2 className="text-lg font-semibold text-fab-text">Top Players</h2>
        </div>
        <Link href="/leaderboard" className="text-sm text-fab-gold hover:text-fab-gold-light transition-colors ml-3">
          View Leaderboard
        </Link>
      </div>
      <div className="bg-fab-surface border border-fab-border rounded-lg divide-y divide-fab-border flex-1">
        {top5.map((entry, i) => (
          <Link
            key={entry.userId}
            href={`/player/${entry.username}`}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-fab-surface-hover transition-colors"
          >
            <span className="text-sm font-bold w-5 text-center text-fab-dim">{i + 1}</span>
            {entry.photoUrl ? (
              <img src={entry.photoUrl} alt="" className={`w-7 h-7 rounded-full shrink-0 ${rankBorderClass(rankMap?.get(entry.userId))}`} />
            ) : (
              <div className={`w-7 h-7 rounded-full bg-fab-gold/20 flex items-center justify-center text-fab-gold text-xs font-bold shrink-0 ${rankBorderClass(rankMap?.get(entry.userId))}`}>
                {entry.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-fab-text text-sm truncate">{entry.displayName}</p>
              <p className="text-[10px] text-fab-dim">{entry.totalMatches} matches</p>
            </div>
            <span className={`text-xs font-semibold shrink-0 ${entry.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
              {entry.winRate.toFixed(1)}%
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
