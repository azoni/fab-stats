"use client";
import { MatchResult } from "@/types";
import type { OverallStats, MatchRecord } from "@/types";
import { WinRateRing } from "@/components/charts/WinRateRing";
import { MiniDonut } from "@/components/charts/MiniDonut";
import { SegmentedBar } from "@/components/charts/SegmentedBar";
import { SparkLine } from "@/components/charts/SparkLine";
import { BarChart3 } from "lucide-react";

interface QuickStatsProps {
  overall: OverallStats;
  last30: MatchRecord[];
}

export function QuickStats({ overall, last30 }: QuickStatsProps) {
  const { streaks } = overall;
  const formMatches = last30.filter((m) => m.result !== MatchResult.Bye).slice(-15);

  // Build rolling win rate for sparkline
  const sparkData: number[] = [];
  let runWins = 0;
  formMatches.forEach((m, i) => {
    if (m.result === MatchResult.Win) runWins++;
    sparkData.push(Math.round((runWins / (i + 1)) * 100));
  });

  const total = overall.totalWins + overall.totalLosses + overall.totalDraws;

  return (
    <div className="bg-fab-surface border border-fab-border rounded-lg p-4 overflow-hidden relative" style={{ backgroundImage: "url(/quick-stats-bg.jpg)", backgroundSize: "cover", backgroundPosition: "center" }}>
      <div className="absolute inset-0 bg-fab-surface/80" />
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-fab-gold/10 flex items-center justify-center ring-1 ring-inset ring-fab-gold/20">
            <BarChart3 className="w-4 h-4 text-fab-gold" />
          </div>
          <h2 className="text-sm font-semibold text-fab-text leading-tight">Quick Stats</h2>
        </div>

        {/* Win Rate Ring + W/L/D Donut + Record */}
        <div className="flex items-center gap-4 mb-4">
          <WinRateRing value={overall.overallWinRate} size={56} strokeWidth={5} />
          <div className="h-10 w-px bg-fab-border" />
          <div className="flex items-center gap-3">
            <MiniDonut
              segments={[
                { value: overall.totalWins, color: "var(--color-fab-win)", label: "W" },
                { value: overall.totalLosses, color: "var(--color-fab-loss)", label: "L" },
                ...(overall.totalDraws > 0 ? [{ value: overall.totalDraws, color: "var(--color-fab-draw)", label: "D" }] : []),
              ]}
              size={44}
              strokeWidth={6}
              centerLabel={<span className="text-[9px] font-bold text-fab-dim">{total}</span>}
            />
            <div className="flex items-center gap-2.5 text-[11px] tabular-nums">
              <div className="text-center">
                <p className="font-bold text-fab-win">{overall.totalWins}</p>
                <p className="text-[9px] text-fab-dim">W</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-fab-loss">{overall.totalLosses}</p>
                <p className="text-[9px] text-fab-dim">L</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-fab-draw">{overall.totalDraws}</p>
                <p className="text-[9px] text-fab-dim">D</p>
              </div>
            </div>
          </div>
          <div className="h-10 w-px bg-fab-border hidden sm:block" />
          <div className="hidden sm:flex flex-col gap-0.5">
            {streaks.currentStreak && streaks.currentStreak.count > 0 && (
              <span className={`text-[11px] font-bold ${streaks.currentStreak.type === MatchResult.Win ? "text-fab-win" : "text-fab-loss"}`}>
                {streaks.currentStreak.type === MatchResult.Win ? "W" : "L"}{streaks.currentStreak.count}
                <span className="text-[9px] font-normal text-fab-dim ml-1">streak</span>
              </span>
            )}
            {streaks.longestWinStreak > 0 && (
              <span className="text-[10px] text-fab-dim">
                Best: <span className="text-fab-win font-semibold">W{streaks.longestWinStreak}</span>
              </span>
            )}
          </div>
        </div>

        {/* W/L/D Segmented Bar */}
        <SegmentedBar
          segments={[
            { value: overall.totalWins, color: "var(--color-fab-win)", label: `${overall.totalWins}W` },
            { value: overall.totalLosses, color: "var(--color-fab-loss)", label: `${overall.totalLosses}L` },
            ...(overall.totalDraws > 0 ? [{ value: overall.totalDraws, color: "var(--color-fab-draw)", label: `${overall.totalDraws}D` }] : []),
          ]}
          height="md"
          showLabels
          className="mb-3"
        />

        {/* Recent Form: Sparkline + Dots */}
        {formMatches.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] text-fab-dim">Recent Form</p>
              {sparkData.length >= 2 && (
                <SparkLine data={sparkData} width={80} height={20} showDot />
              )}
            </div>
            <div className="flex items-center gap-1">
              {formMatches.map((m, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full ${
                    m.result === MatchResult.Win
                      ? "bg-fab-win"
                      : m.result === MatchResult.Loss
                      ? "bg-fab-loss"
                      : "bg-fab-draw"
                  }`}
                  title={`${m.result}${m.opponentName ? ` vs ${m.opponentName}` : ""}`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Streaks on mobile (hidden on sm+) */}
        {(streaks.currentStreak?.count ?? 0) > 0 && (
          <div className="flex sm:hidden items-center gap-3 mt-3 pt-3 border-t border-fab-border/50">
            {streaks.currentStreak && streaks.currentStreak.count > 0 && (
              <span className={`text-[11px] font-bold ${streaks.currentStreak.type === MatchResult.Win ? "text-fab-win" : "text-fab-loss"}`}>
                {streaks.currentStreak.type === MatchResult.Win ? "W" : "L"}{streaks.currentStreak.count} streak
              </span>
            )}
            {streaks.longestWinStreak > 0 && (
              <span className="text-[10px] text-fab-dim">
                Best: <span className="text-fab-win font-semibold">W{streaks.longestWinStreak}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
