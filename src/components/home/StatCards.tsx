"use client";
import Link from "next/link";
import { MatchResult } from "@/types";
import type { OverallStats, MatchRecord } from "@/types";
import { WinRateRing } from "@/components/charts/WinRateRing";
import { SparkLine } from "@/components/charts/SparkLine";

interface StatCardsProps {
  overall: OverallStats;
  eventCount: number;
  bestFinishLabel: string | null;
  recentMatches: MatchRecord[];
}

export function StatCards({ overall, eventCount, bestFinishLabel, recentMatches }: StatCardsProps) {
  // Recent form data
  const formMatches = recentMatches
    .filter((m) => m.result !== MatchResult.Bye)
    .slice(-20);
  const sparkData: number[] = [];
  let runWins = 0;
  formMatches.forEach((m, i) => {
    if (m.result === MatchResult.Win) runWins++;
    sparkData.push(Math.round((runWins / (i + 1)) * 100));
  });
  const recentWins = formMatches.filter((m) => m.result === MatchResult.Win).length;
  const recentLosses = formMatches.filter((m) => m.result === MatchResult.Loss).length;
  const recentDraws = formMatches.filter((m) => m.result === MatchResult.Draw).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {/* Win Rate + Events */}
      <Link href="/trends" className="bg-fab-surface border border-fab-border rounded-lg p-3 flex items-center gap-3 hover:border-fab-gold/30 transition-colors card-shimmer">
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none rounded-lg" />
        <WinRateRing value={overall.overallWinRate} size={48} strokeWidth={4} />
        <div className="min-w-0 relative">
          <p className={`text-xl font-bold tabular-nums leading-tight ${overall.overallWinRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
            {overall.overallWinRate.toFixed(1)}%
          </p>
          <div className="flex items-center gap-1.5 text-xs text-fab-dim mt-0.5">
            <span>{overall.totalMatches + overall.totalByes} matches</span>
            {eventCount > 0 && (
              <>
                <span>·</span>
                <span>{eventCount} events</span>
              </>
            )}
          </div>
          {bestFinishLabel && (
            <p className="text-xs text-fab-gold mt-0.5 font-medium truncate">{bestFinishLabel}</p>
          )}
        </div>
      </Link>

      {/* Record */}
      <Link href="/matches" className="bg-fab-surface border border-fab-border rounded-lg p-3 hover:border-fab-gold/30 transition-colors card-shimmer">
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none rounded-lg" />
        <p className="text-xs text-fab-dim uppercase tracking-wider mb-1 relative">Record</p>
        <div className="flex items-baseline gap-1.5 tabular-nums">
          <span className="text-xl font-bold text-fab-win">{overall.totalWins}</span>
          <span className="text-fab-dim text-sm">-</span>
          <span className="text-xl font-bold text-fab-loss">{overall.totalLosses}</span>
          {overall.totalDraws > 0 && (
            <>
              <span className="text-fab-dim text-sm">-</span>
              <span className="text-xl font-bold text-fab-draw">{overall.totalDraws}</span>
            </>
          )}
        </div>
        <p className="text-xs text-fab-dim mt-0.5">{overall.totalMatches + overall.totalByes} total</p>
      </Link>

      {/* Recent Form (mini) */}
      <Link href="/matches" className="bg-fab-surface border border-fab-border rounded-lg p-3 col-span-2 md:col-span-1 hover:border-fab-gold/30 transition-colors card-shimmer">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs text-fab-dim uppercase tracking-wider">Recent Form</p>
          {formMatches.length > 0 && (
            <span className="text-xs tabular-nums">
              <span className="font-semibold text-fab-win">{recentWins}W</span>
              <span className="text-fab-dim">-</span>
              <span className="font-semibold text-fab-loss">{recentLosses}L</span>
              {recentDraws > 0 && (
                <>
                  <span className="text-fab-dim">-</span>
                  <span className="font-semibold text-fab-draw">{recentDraws}D</span>
                </>
              )}
            </span>
          )}
        </div>
        {sparkData.length >= 2 ? (
          <SparkLine data={sparkData} width={140} height={28} showDot />
        ) : (
          <p className="text-sm text-fab-muted">--</p>
        )}
        {formMatches.length > 0 && (
          <div className="flex items-center gap-0.5 mt-1.5">
            {formMatches.slice(-15).map((m, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full shrink-0 ${
                  m.result === MatchResult.Win
                    ? "bg-fab-win"
                    : m.result === MatchResult.Loss
                    ? "bg-fab-loss"
                    : "bg-fab-draw"
                }`}
              />
            ))}
          </div>
        )}
      </Link>
    </div>
  );
}
