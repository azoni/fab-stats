"use client";
import { MatchResult } from "@/types";
import type { MatchRecord } from "@/types";
import { SparkLine } from "@/components/charts/SparkLine";

interface RecentFormProps {
  recentMatches: MatchRecord[];
  overallWinRate: number;
}

export function RecentForm({ recentMatches, overallWinRate }: RecentFormProps) {
  const formMatches = recentMatches
    .filter((m) => m.result !== MatchResult.Bye)
    .slice(-20);

  if (formMatches.length === 0) return null;

  // Build rolling win rate for sparkline
  const sparkData: number[] = [];
  let runWins = 0;
  formMatches.forEach((m, i) => {
    if (m.result === MatchResult.Win) runWins++;
    sparkData.push(Math.round((runWins / (i + 1)) * 100));
  });

  // W/L/D counts
  const wins = formMatches.filter((m) => m.result === MatchResult.Win).length;
  const losses = formMatches.filter((m) => m.result === MatchResult.Loss).length;
  const draws = formMatches.filter((m) => m.result === MatchResult.Draw).length;

  return (
    <div className="bg-fab-surface border border-fab-border rounded-lg px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium text-fab-muted">Recent Form</p>
          <span className="text-[10px] tabular-nums">
            <span className="font-semibold text-fab-win">{wins}W</span>
            <span className="text-fab-dim">-</span>
            <span className="font-semibold text-fab-loss">{losses}L</span>
            {draws > 0 && (
              <>
                <span className="text-fab-dim">-</span>
                <span className="font-semibold text-fab-draw">{draws}D</span>
              </>
            )}
          </span>
        </div>
        {sparkData.length >= 2 && (
          <SparkLine data={sparkData} width={100} height={24} showDot />
        )}
      </div>
      <div className="flex items-center gap-1">
        {formMatches.map((m, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full shrink-0 ${
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
  );
}
