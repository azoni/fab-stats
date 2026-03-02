"use client";
import type { MatchRecord } from "@/types";
import { MatchResult } from "@/types";
import { getRoundNumber } from "@/lib/stats";

interface RecentFormCardProps {
  matches: MatchRecord[];
}

export function RecentFormCard({ matches }: RecentFormCardProps) {
  const recent = [...matches]
    .filter((m) => m.result !== MatchResult.Bye)
    .sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return getRoundNumber(b) - getRoundNumber(a);
    })
    .slice(0, 20);

  if (recent.length === 0) return null;

  const wins = recent.filter((m) => m.result === MatchResult.Win).length;
  const winRate = (wins / recent.length) * 100;

  // Compare recent form to overall: first half vs second half of the 20
  const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
  const secondHalf = recent.slice(Math.floor(recent.length / 2));
  const firstWR = firstHalf.length > 0 ? firstHalf.filter((m) => m.result === MatchResult.Win).length / firstHalf.length * 100 : 0;
  const secondWR = secondHalf.length > 0 ? secondHalf.filter((m) => m.result === MatchResult.Win).length / secondHalf.length * 100 : 0;
  const trending = firstWR > secondWR + 10 ? "up" : secondWR > firstWR + 10 ? "down" : "stable";

  return (
    <div className="spotlight-card spotlight-winrate bg-fab-surface border border-fab-border rounded-lg px-3 py-2 relative overflow-hidden h-full min-h-[88px]">
      <img src="/assets/cards/bg-stats.png" alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.08] pointer-events-none" />
      <div className="relative">
      <div className="flex items-center gap-1.5 mb-1">
        <p className="text-[10px] text-cyan-400/70 uppercase tracking-wider font-medium">Recent Form</p>
        {trending === "up" && (
          <svg className="w-3 h-3 text-fab-win" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        )}
        {trending === "down" && (
          <svg className="w-3 h-3 text-fab-loss" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-black leading-tight ${winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
          {winRate.toFixed(0)}%
        </span>
        <span className="text-xs text-fab-muted">
          {wins}W-{recent.length - wins}L last {recent.length}
        </span>
      </div>
      <div className="flex items-center gap-0.5 mt-1.5">
        {[...recent].reverse().map((m, i) => (
          <div key={i} className={`flex-1 h-1.5 rounded-full ${m.result === MatchResult.Win ? "bg-fab-win/60" : m.result === MatchResult.Loss ? "bg-fab-loss/60" : "bg-fab-draw/60"}`} />
        ))}
      </div>
      </div>
    </div>
  );
}
