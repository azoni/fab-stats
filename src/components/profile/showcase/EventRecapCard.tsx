"use client";
import { localDate } from "@/lib/constants";
import type { EventStats } from "@/types";
import { MatchResult } from "@/types";

interface EventRecapCardProps {
  event: EventStats;
  placementType?: "champion" | "finalist" | "top4" | "top8";
}

const PLACEMENT_CFG: Record<string, { text: string; color: string }> = {
  champion: { text: "Champion", color: "text-yellow-400" },
  finalist: { text: "Finalist", color: "text-gray-300" },
  top4: { text: "Top 4", color: "text-amber-500" },
  top8: { text: "Top 8", color: "text-blue-400" },
};

export function EventRecapCard({ event, placementType }: EventRecapCardProps) {
  const placement = placementType ? PLACEMENT_CFG[placementType] : null;

  return (
    <div className="spotlight-card spotlight-active bg-fab-surface border border-fab-border rounded-lg px-3 py-2 relative overflow-hidden h-full min-h-[88px]">
      <div className="flex items-center gap-2 mb-1">
        <p className="text-[8px] text-blue-400/70 uppercase tracking-wider font-medium">Event</p>
        {placement && <span className={`text-[9px] font-bold ${placement.color}`}>{placement.text}</span>}
      </div>
      <p className="text-xs font-semibold text-fab-text truncate">{event.eventName}</p>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-sm font-black text-fab-text leading-none">
          {event.wins}-{event.losses}{event.draws > 0 && <span className="text-fab-dim">-{event.draws}</span>}
        </span>
        <span className={`text-[10px] font-semibold ${event.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
          {event.winRate.toFixed(0)}%
        </span>
        <div className="flex items-center gap-0.5 ml-auto">
          {event.matches.map((m, i) => (
            <div key={i} className={`w-1.5 h-1.5 rounded-full ${m.result === MatchResult.Win ? "bg-fab-win" : m.result === MatchResult.Loss ? "bg-fab-loss" : m.result === MatchResult.Bye ? "bg-fab-muted" : "bg-fab-draw"}`} />
          ))}
        </div>
      </div>
      <p className="text-[9px] text-fab-dim truncate mt-0.5">
        {event.eventType && <>{event.eventType} · </>}{event.format} · {localDate(event.eventDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
      </p>
    </div>
  );
}
