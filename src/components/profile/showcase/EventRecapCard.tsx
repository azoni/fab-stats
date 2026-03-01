"use client";
import { localDate } from "@/lib/constants";
import type { EventStats } from "@/types";
import { MatchResult } from "@/types";

interface EventRecapCardProps {
  event: EventStats;
  placementType?: "champion" | "finalist" | "top4" | "top8";
}

const PLACEMENT_LABEL: Record<string, { text: string; color: string }> = {
  champion: { text: "Champion", color: "text-yellow-400" },
  finalist: { text: "Finalist", color: "text-gray-300" },
  top4: { text: "Top 4", color: "text-amber-500" },
  top8: { text: "Top 8", color: "text-blue-400" },
};

export function EventRecapCard({ event, placementType }: EventRecapCardProps) {
  const placement = placementType ? PLACEMENT_LABEL[placementType] : null;

  return (
    <div className="spotlight-card spotlight-active bg-fab-surface border border-fab-border rounded-lg px-4 py-3 relative overflow-hidden">
      <div className="flex items-center gap-3">
        {/* Record */}
        <div className="shrink-0 text-center">
          <p className="text-lg font-black text-fab-text leading-none">
            {event.wins}-{event.losses}
            {event.draws > 0 && <span className="text-fab-dim">-{event.draws}</span>}
          </p>
          <p className={`text-[10px] font-semibold mt-0.5 ${event.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
            {event.winRate.toFixed(0)}%
          </p>
        </div>

        {/* Event info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-fab-text truncate">{event.eventName}</span>
            {placement && (
              <span className={`text-[9px] font-bold ${placement.color}`}>{placement.text}</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {event.eventType && (
              <span className="text-[9px] text-fab-dim bg-fab-bg px-1.5 py-0.5 rounded">{event.eventType}</span>
            )}
            <span className="text-[10px] text-fab-dim">{event.format}</span>
            <span className="text-[10px] text-fab-dim">
              {localDate(event.eventDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
        </div>

        {/* Match result dots */}
        <div className="shrink-0 flex flex-wrap gap-0.5 max-w-[60px]">
          {event.matches.map((m, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${
                m.result === MatchResult.Win ? "bg-fab-win"
                : m.result === MatchResult.Loss ? "bg-fab-loss"
                : m.result === MatchResult.Bye ? "bg-fab-muted"
                : "bg-fab-draw"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
