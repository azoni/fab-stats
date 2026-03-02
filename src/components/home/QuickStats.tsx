"use client";
import { MatchResult } from "@/types";
import type { OverallStats, MatchRecord } from "@/types";
import type { PlayoffFinish } from "@/lib/stats";

const TIER_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  Worlds: { text: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/25" },
  "Pro Tour": { text: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/25" },
  Nationals: { text: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/25" },
  "The Calling": { text: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/25" },
  "Battle Hardened": { text: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/25" },
};

const PLACEMENT_LABELS: Record<string, string> = {
  champion: "Champion",
  finalist: "Finalist",
  top4: "Top 4",
  top8: "Top 8",
};

interface QuickStatsProps {
  overall: OverallStats;
  playoffFinishes: PlayoffFinish[];
  last30: MatchRecord[];
}

export function QuickStats({ overall, playoffFinishes, last30 }: QuickStatsProps) {
  const { streaks } = overall;
  // Last 15 non-bye matches for form dots
  const formMatches = last30.filter((m) => m.result !== MatchResult.Bye).slice(-15);

  return (
    <div className="bg-fab-surface border border-fab-border rounded-lg p-4 overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-fab-gold/10 flex items-center justify-center ring-1 ring-inset ring-fab-gold/20">
          <svg className="w-4 h-4 text-fab-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
        </div>
        <h2 className="text-sm font-semibold text-fab-text leading-tight">Quick Stats</h2>
      </div>

      {/* Record + Streak */}
      <div className="flex items-center gap-4 mb-4">
        <div>
          <p className={`text-2xl font-black tabular-nums leading-none ${overall.overallWinRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
            {overall.overallWinRate.toFixed(1)}%
          </p>
          <p className="text-[10px] text-fab-dim mt-0.5">Win Rate</p>
        </div>
        <div className="h-8 w-px bg-fab-border" />
        <div className="flex items-center gap-3 text-[11px] tabular-nums">
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
        <div className="h-8 w-px bg-fab-border" />
        <div className="flex flex-col gap-0.5">
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

      {/* Recent Form */}
      {formMatches.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] text-fab-dim mb-1.5">Recent Form</p>
          <div className="flex items-center gap-1">
            {formMatches.map((m, i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full ${
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

      {/* Best Finishes */}
      {playoffFinishes.length > 0 && (
        <div>
          <p className="text-[10px] text-fab-dim mb-1.5">Best Finishes</p>
          <div className="space-y-1">
            {playoffFinishes.slice(0, 3).map((f) => {
              const colors = TIER_COLORS[f.eventType] || { text: "text-fab-muted", bg: "bg-fab-bg", border: "border-fab-border" };
              return (
                <div key={`${f.eventName}-${f.eventDate}`} className="flex items-center gap-2">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${colors.text} ${colors.bg} ${colors.border}`}>
                    {PLACEMENT_LABELS[f.type] || f.type}
                  </span>
                  <span className="text-[11px] text-fab-muted truncate">{f.eventName}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
