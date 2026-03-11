"use client";
import { useMemo } from "react";
import { computeEventTypeStats } from "@/lib/stats";
import type { MatchRecord } from "@/types";

interface EventTypeBreakdownProps {
  matches: MatchRecord[];
}

export function EventTypeBreakdown({ matches }: EventTypeBreakdownProps) {
  const stats = useMemo(() => {
    const all = computeEventTypeStats(matches);
    return all
      .filter((s) => s.eventType !== "Unknown" && s.totalMatches >= 1)
      .sort((a, b) => b.totalMatches - a.totalMatches)
      .slice(0, 5);
  }, [matches]);

  if (stats.length === 0) return null;

  return (
    <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 border-b border-fab-border/50">
        <p className="text-xs font-medium text-fab-muted">By Event Type</p>
      </div>
      <div className="p-3 space-y-2.5">
        {stats.map((s) => (
          <div key={s.eventType} className="flex items-center gap-3">
            <span className="text-sm font-medium text-fab-text truncate min-w-0 flex-1">
              {s.eventType}
            </span>
            <span className="text-[10px] text-fab-dim tabular-nums shrink-0">
              {s.wins}W-{s.losses}L
            </span>
            <div className="w-16 h-1.5 rounded-full bg-fab-border overflow-hidden shrink-0">
              <div
                className={`h-full rounded-full ${s.winRate >= 50 ? "bg-fab-win" : "bg-fab-loss"}`}
                style={{ width: `${Math.min(100, s.winRate)}%` }}
              />
            </div>
            <span className={`text-xs font-bold tabular-nums shrink-0 w-10 text-right ${s.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
              {s.winRate.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
