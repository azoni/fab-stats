"use client";
import { memo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MatchResult } from "@/types";
import type { OverallStats, MatchRecord } from "@/types";
import { WinRateRing } from "@/components/charts/WinRateRing";
import { SparkLine } from "@/components/charts/SparkLine";

interface StatCardsProps {
  overall: OverallStats;
  eventCount: number;
  bestFinishLabel: string | null;
  recentMatches: MatchRecord[];
  onShare?: () => void;
}

export const StatCards = memo(function StatCards({ overall, eventCount, bestFinishLabel, recentMatches, onShare }: StatCardsProps) {
  const router = useRouter();

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
    <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden cursor-pointer hover:border-fab-gold/20 transition-colors" onClick={() => router.push("/trends")}>
      <Link href="/trends" className="flex items-center justify-between px-4 py-2.5 border-b border-fab-border/50 hover:bg-fab-surface-hover transition-colors">
        <p className="text-sm font-semibold text-fab-text">My Stats</p>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {onShare && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onShare(); }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-fab-gold/15 text-fab-gold text-xs font-semibold hover:bg-fab-gold/25 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
              </svg>
              Share
            </button>
          )}
          <span className="text-xs font-semibold text-fab-gold border border-fab-gold/30 hover:bg-fab-gold/10 hover:border-fab-gold/50 px-2.5 py-1 rounded-md transition-colors">
            Full stats &rarr;
          </span>
        </div>
      </Link>
      <div className="p-4 flex flex-col sm:flex-row items-center gap-4 sm:gap-5">
        {/* Win Rate Ring */}
        <div className="shrink-0 text-center">
          <WinRateRing value={overall.overallWinRate} size={56} strokeWidth={5} label={`${overall.overallWinRate.toFixed(1)}%`} />
          <p className="text-[10px] text-fab-muted font-medium mt-1">Win Rate</p>
        </div>
        {/* Stats grid */}
        <div className="flex-1 w-full grid grid-cols-3 sm:grid-cols-4 gap-x-3 gap-y-2.5 text-center sm:text-left">
          <div title={`${overall.totalWins}W-${overall.totalLosses}L${overall.totalDraws > 0 ? `-${overall.totalDraws}D` : ""}`}>
            <p className="text-lg font-bold text-fab-text tabular-nums">{overall.totalMatches + overall.totalByes}</p>
            <p className="text-[10px] text-fab-muted">Matches</p>
          </div>
          {overall.totalByes > 0 && (
            <div title={`${overall.totalByes} bye${overall.totalByes !== 1 ? "s" : ""}`}>
              <p className="text-lg font-bold text-fab-text tabular-nums">{overall.totalByes}</p>
              <p className="text-[10px] text-fab-muted">Byes</p>
            </div>
          )}
          <div title="Total wins - losses - draws">
            <p className="text-lg font-bold tabular-nums">
              <span className="text-fab-win">{overall.totalWins}</span>
              <span className="text-fab-dim">-</span>
              <span className="text-fab-loss">{overall.totalLosses}</span>
            </p>
            <p className="text-[10px] text-fab-muted">Record</p>
          </div>
          <div title={`${eventCount} events played`}>
            <p className="text-lg font-bold text-fab-text tabular-nums">{eventCount}</p>
            <p className="text-[10px] text-fab-muted">Events</p>
          </div>
          {bestFinishLabel && (
            <div title="Best tournament finish">
              <p className="text-lg font-bold text-fab-gold truncate">{bestFinishLabel}</p>
              <p className="text-[10px] text-fab-muted">Best Finish</p>
            </div>
          )}
        </div>
      </div>
      {/* Recent form strip */}
      {formMatches.length > 0 && (
        <div className="px-4 pb-3 flex items-center gap-3">
          <div className="flex items-center gap-0.5">
            {formMatches.slice(-15).map((m, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full shrink-0 ${
                  m.result === MatchResult.Win ? "bg-fab-win" :
                  m.result === MatchResult.Loss ? "bg-fab-loss" : "bg-fab-draw"
                }`}
              />
            ))}
          </div>
          <span className="text-[10px] tabular-nums text-fab-dim">
            <span className="text-fab-win font-semibold">{recentWins}W</span>-<span className="text-fab-loss font-semibold">{recentLosses}L</span>
            {recentDraws > 0 && <><span>-</span><span className="text-fab-draw font-semibold">{recentDraws}D</span></>}
            {" "}recent
          </span>
          {sparkData.length >= 2 && (
            <div className="ml-auto">
              <SparkLine data={sparkData} width={80} height={20} showDot />
            </div>
          )}
        </div>
      )}
    </div>
  );
});
