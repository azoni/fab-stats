"use client";
import { MatchResult } from "@/types";
import type { OverallStats } from "@/types";
import { WinRateRing } from "@/components/charts/WinRateRing";

interface StatCardsProps {
  overall: OverallStats;
  eventCount: number;
  bestFinishLabel: string | null;
}

export function StatCards({ overall, eventCount, bestFinishLabel }: StatCardsProps) {
  const { streaks } = overall;
  const cs = streaks.currentStreak;
  const isWinStreak = cs?.type === MatchResult.Win;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* Win Rate */}
      <div className="bg-fab-surface border border-fab-border rounded-lg p-3 flex items-center gap-3">
        <WinRateRing value={overall.overallWinRate} size={44} strokeWidth={4} />
        <div>
          <p className="text-[10px] text-fab-dim uppercase tracking-wider">Win Rate</p>
          <p className={`text-lg font-bold tabular-nums ${overall.overallWinRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
            {overall.overallWinRate.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Record */}
      <div className="bg-fab-surface border border-fab-border rounded-lg p-3">
        <p className="text-[10px] text-fab-dim uppercase tracking-wider mb-1">Record</p>
        <div className="flex items-baseline gap-1.5 tabular-nums">
          <span className="text-lg font-bold text-fab-win">{overall.totalWins}</span>
          <span className="text-fab-dim text-xs">-</span>
          <span className="text-lg font-bold text-fab-loss">{overall.totalLosses}</span>
          {overall.totalDraws > 0 && (
            <>
              <span className="text-fab-dim text-xs">-</span>
              <span className="text-lg font-bold text-fab-draw">{overall.totalDraws}</span>
            </>
          )}
        </div>
        <p className="text-[10px] text-fab-dim mt-0.5">{overall.totalMatches + overall.totalByes} total</p>
      </div>

      {/* Streak */}
      <div className="bg-fab-surface border border-fab-border rounded-lg p-3">
        <p className="text-[10px] text-fab-dim uppercase tracking-wider mb-1">Streak</p>
        {cs && cs.count > 0 ? (
          <p className={`text-lg font-bold ${isWinStreak ? "text-fab-win" : "text-fab-loss"}`}>
            {isWinStreak ? "W" : "L"}{cs.count}
          </p>
        ) : (
          <p className="text-lg font-bold text-fab-muted">--</p>
        )}
        {streaks.longestWinStreak > 0 && (
          <p className="text-[10px] text-fab-dim mt-0.5">
            Best: <span className="text-fab-win font-semibold">W{streaks.longestWinStreak}</span>
          </p>
        )}
      </div>

      {/* Events */}
      <div className="bg-fab-surface border border-fab-border rounded-lg p-3">
        <p className="text-[10px] text-fab-dim uppercase tracking-wider mb-1">Events</p>
        <p className="text-lg font-bold text-fab-text">{eventCount}</p>
        {bestFinishLabel && (
          <p className="text-[10px] text-fab-gold mt-0.5 font-medium truncate">{bestFinishLabel}</p>
        )}
      </div>
    </div>
  );
}
