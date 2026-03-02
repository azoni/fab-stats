"use client";
import type { MatchRecord, OverallStats } from "@/types";
import { MatchResult } from "@/types";

interface StreakShowcaseCardProps {
  overall: OverallStats;
  matches: MatchRecord[];
}

export function StreakShowcaseCard({ overall, matches }: StreakShowcaseCardProps) {
  const { streaks } = overall;
  const last10 = [...matches]
    .filter((m) => m.result !== MatchResult.Bye)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10)
    .reverse();

  const current = streaks.currentStreak;
  const isHot = current && current.type === MatchResult.Win && current.count >= 3;
  const isCold = current && current.type === MatchResult.Loss && current.count >= 3;

  return (
    <div className="spotlight-card spotlight-streak bg-fab-surface border border-fab-border rounded-lg px-3 py-2 relative overflow-hidden h-full min-h-[88px]">
      <img src="/assets/cards/bg-streak.png" alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.15] pointer-events-none" />
      <div className="relative">
      <p className="text-[10px] text-orange-400/70 uppercase tracking-wider font-medium mb-1">Streaks</p>
      <div className="flex items-baseline gap-3">
        {current ? (
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-black leading-tight ${current.type === MatchResult.Win ? "text-fab-win" : "text-fab-loss"}`}>
              {current.count}
            </span>
            <span className={`text-xs font-semibold ${current.type === MatchResult.Win ? "text-fab-win/70" : "text-fab-loss/70"}`}>
              {current.type === MatchResult.Win ? "W" : "L"} streak
            </span>
            {isHot && <span className="text-[11px] text-orange-400 font-bold ml-0.5">HOT</span>}
            {isCold && <span className="text-[11px] text-blue-400 font-bold ml-0.5">COLD</span>}
          </div>
        ) : (
          <span className="text-xs text-fab-dim">No active streak</span>
        )}
      </div>
      <div className="flex items-center gap-2 mt-1.5">
        <div className="flex items-center gap-0.5">
          {last10.map((m, i) => (
            <div key={i} className={`w-2 h-2 rounded-full ${m.result === MatchResult.Win ? "bg-fab-win" : m.result === MatchResult.Loss ? "bg-fab-loss" : "bg-fab-draw"}`} />
          ))}
        </div>
        <span className="text-[11px] text-fab-dim ml-auto">Best: {streaks.longestWinStreak}W</span>
      </div>
      </div>
    </div>
  );
}
