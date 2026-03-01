"use client";
import { useState, useMemo } from "react";
import type { MatchRecord } from "@/types";
import { computePeriodStats, type PeriodType } from "@/lib/period-stats";

export function WeeklyDigest({ matches }: { matches: MatchRecord[] }) {
  const [period, setPeriod] = useState<PeriodType>("week");

  const stats = useMemo(() => computePeriodStats(matches, period), [matches, period]);

  // Don't render if no matches in current period and no matches in previous period
  if (stats.matches === 0 && stats.previousMatches === 0) return null;

  return (
    <div className="bg-fab-surface border border-fab-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-fab-dim uppercase tracking-wider">
          {period === "week" ? "Last 7 Days" : "Last 30 Days"}
        </h2>
        <div className="flex rounded-md overflow-hidden border border-fab-border">
          <button
            onClick={() => setPeriod("week")}
            className={`px-2.5 py-1 text-xs font-medium transition-colors ${
              period === "week" ? "bg-fab-gold/15 text-fab-gold" : "text-fab-muted hover:text-fab-text"
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setPeriod("month")}
            className={`px-2.5 py-1 text-xs font-medium transition-colors ${
              period === "month" ? "bg-fab-gold/15 text-fab-gold" : "text-fab-muted hover:text-fab-text"
            }`}
          >
            Month
          </button>
        </div>
      </div>

      {stats.matches === 0 ? (
        <p className="text-sm text-fab-dim">
          No matches in the last {period === "week" ? "7" : "30"} days yet.
          {stats.previousMatches > 0 && ` Previously: ${stats.previousMatches} matches.`}
        </p>
      ) : (
        <div className="flex items-center gap-4">
          {/* Win Rate */}
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-bold ${stats.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
              {stats.winRate.toFixed(0)}%
            </span>
            {stats.winRateDelta !== null && (
              <span className={`text-xs font-semibold ${stats.winRateDelta >= 0 ? "text-fab-win" : "text-fab-loss"}`}>
                {stats.winRateDelta >= 0 ? "+" : ""}{stats.winRateDelta.toFixed(0)}%
              </span>
            )}
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-fab-border" />

          {/* Record + Details */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-fab-text font-medium">
              {stats.wins}W - {stats.losses}L{stats.draws > 0 ? ` - ${stats.draws}D` : ""}
              <span className="text-fab-dim ml-1.5">({stats.matches} games)</span>
            </p>
            {stats.topHero && (
              <p className="text-xs text-fab-muted truncate">
                Most played: <span className="text-fab-text">{stats.topHero}</span>
                {stats.topHeroRecord && <span className="text-fab-dim"> ({stats.topHeroRecord})</span>}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
