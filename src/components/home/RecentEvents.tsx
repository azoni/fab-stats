"use client";
import Link from "next/link";
import type { EventStats } from "@/types";

const EVENT_TYPE_COLORS: Record<string, string> = {
  Armory: "text-amber-400/70 bg-amber-400/10 border-amber-400/20",
  Skirmish: "text-teal-400/70 bg-teal-400/10 border-teal-400/20",
  "Battle Hardened": "text-orange-400/70 bg-orange-400/10 border-orange-400/20",
  "The Calling": "text-blue-400/70 bg-blue-400/10 border-blue-400/20",
  Nationals: "text-red-400/70 bg-red-400/10 border-red-400/20",
  "Pro Tour": "text-purple-400/70 bg-purple-400/10 border-purple-400/20",
  Worlds: "text-yellow-400/70 bg-yellow-400/10 border-yellow-400/20",
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function RecentEvents({ eventStats }: { eventStats: EventStats[] }) {
  const recent = [...eventStats]
    .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())
    .slice(0, 5);

  if (recent.length === 0) return null;

  return (
    <div className="bg-fab-surface border border-fab-border rounded-lg p-4 overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center ring-1 ring-inset ring-blue-500/20">
          <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
        </div>
        <h2 className="text-sm font-semibold text-fab-text leading-tight">Recent Events</h2>
        <Link href="/events" className="ml-auto text-[10px] text-fab-dim hover:text-fab-gold transition-colors font-medium">
          View all
        </Link>
      </div>

      {/* Event rows */}
      <div className="space-y-1.5">
        {recent.map((ev) => {
          const typeColor = EVENT_TYPE_COLORS[ev.eventType || ""] || "text-fab-dim bg-fab-bg border-fab-border";
          return (
            <div key={`${ev.eventName}-${ev.eventDate}`} className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-fab-bg/50 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-fab-text truncate">{ev.eventName}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {ev.eventType && (
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${typeColor}`}>
                      {ev.eventType}
                    </span>
                  )}
                  <span className="text-[10px] text-fab-dim">{formatDate(ev.eventDate)}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[11px] font-bold tabular-nums">
                  <span className="text-fab-win">{ev.wins}</span>
                  <span className="text-fab-dim">-</span>
                  <span className="text-fab-loss">{ev.losses}</span>
                  {ev.draws > 0 && (
                    <>
                      <span className="text-fab-dim">-</span>
                      <span className="text-fab-draw">{ev.draws}</span>
                    </>
                  )}
                </p>
                <p className={`text-[10px] font-semibold ${ev.winRate >= 50 ? "text-fab-win/70" : "text-fab-loss/70"}`}>
                  {ev.winRate.toFixed(0)}%
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
