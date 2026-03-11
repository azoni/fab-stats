"use client";
import { useState } from "react";
import Link from "next/link";
import { MatchResult, type EventStats } from "@/types";
import { computePlayoffFinishes } from "@/lib/stats";
import { EventShareModal } from "@/components/events/EventShareCard";

const EVENT_TYPE_COLORS: Record<string, string> = {
  Armory: "text-amber-400/70 bg-amber-400/10 border-amber-400/20",
  Skirmish: "text-teal-400/70 bg-teal-400/10 border-teal-400/20",
  "Battle Hardened": "text-orange-400/70 bg-orange-400/10 border-orange-400/20",
  "The Calling": "text-blue-400/70 bg-blue-400/10 border-blue-400/20",
  Nationals: "text-red-400/70 bg-red-400/10 border-red-400/20",
  "Pro Tour": "text-purple-400/70 bg-purple-400/10 border-purple-400/20",
  Worlds: "text-yellow-400/70 bg-yellow-400/10 border-yellow-400/20",
};

const RESULT_COLORS: Record<string, string> = {
  [MatchResult.Win]: "text-fab-win",
  [MatchResult.Loss]: "text-fab-loss",
  [MatchResult.Draw]: "text-fab-draw",
  [MatchResult.Bye]: "text-fab-dim",
};

const RESULT_LABELS: Record<string, string> = {
  [MatchResult.Win]: "W",
  [MatchResult.Loss]: "L",
  [MatchResult.Draw]: "D",
  [MatchResult.Bye]: "B",
};

const PLACEMENT_BADGE: Record<string, { text: string; color: string }> = {
  champion: { text: "Champion", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
  finalist: { text: "Finalist", color: "text-gray-300 bg-gray-300/10 border-gray-400/20" },
  top4: { text: "Top 4", color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  top8: { text: "Top 8", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function RecentEvents({ eventStats, playerName }: { eventStats: EventStats[]; playerName?: string }) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [shareEvent, setShareEvent] = useState<EventStats | null>(null);

  // Build placement lookup: "eventName::eventDate" → finish type
  const finishes = computePlayoffFinishes(eventStats);
  const placementMap = new Map<string, string>();
  for (const f of finishes) {
    placementMap.set(`${f.eventName}::${f.eventDate}`, f.type);
  }

  const recent = [...eventStats]
    .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())
    .slice(0, 5);

  if (recent.length === 0) return null;

  return (
    <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-fab-border/50">
        <p className="text-xs font-medium text-fab-muted">Recent Events</p>
        <Link href="/events" className="text-xs font-semibold text-fab-gold border border-fab-gold/30 hover:bg-fab-gold/10 hover:border-fab-gold/50 px-2.5 py-1 rounded-md transition-colors">
          View all events &rarr;
        </Link>
      </div>

      {/* Event rows */}
      <div className="space-y-1 p-3">
        {recent.map((ev) => {
          const key = `${ev.eventName}-${ev.eventDate}`;
          const isExpanded = expandedKey === key;
          const typeColor = EVENT_TYPE_COLORS[ev.eventType || ""] || "text-fab-dim bg-fab-bg border-fab-border";
          return (
            <div key={key}>
              <button
                onClick={() => setExpandedKey(isExpanded ? null : key)}
                className="w-full flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-fab-bg/50 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[11px] font-semibold text-fab-text truncate">{ev.eventName}</p>
                    {(() => {
                      const badge = PLACEMENT_BADGE[placementMap.get(`${ev.eventName}::${ev.eventDate}`) || ""];
                      return badge ? (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${badge.color}`}>
                          {badge.text}
                        </span>
                      ) : null;
                    })()}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {ev.eventType && (
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${typeColor}`}>
                        {ev.eventType}
                      </span>
                    )}
                    <span className="text-[10px] text-fab-dim">{formatDate(ev.eventDate)}</span>
                  </div>
                </div>
                <div className="text-right shrink-0 flex items-center gap-2">
                  <div>
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
                  <svg className={`w-3.5 h-3.5 text-fab-dim transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Expanded match details */}
              {isExpanded && (
                <div className="mt-1 mb-2 mx-1 rounded-md border border-fab-border/50 bg-fab-bg/30 overflow-hidden">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="text-fab-dim border-b border-fab-border/30">
                        <th className="text-left px-2.5 py-1.5 font-medium w-10">Rd</th>
                        <th className="text-left px-2.5 py-1.5 font-medium">Opponent</th>
                        <th className="text-right px-2.5 py-1.5 font-medium w-10">Res</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ev.matches.map((match, i) => {
                        const roundInfo = match.notes?.split(" | ")[1];
                        const roundMatch = roundInfo?.match(/Round\s+P?(\d+)/i);
                        const round = roundMatch ? roundMatch[1] : `${i + 1}`;
                        const isPlayoff = roundInfo && (/^(Top 8|Top 4|Finals|Playoff|Skirmish)$/.test(roundInfo) || /^Round P/i.test(roundInfo));
                        return (
                          <tr key={match.id} className="border-t border-fab-border/20">
                            <td className="px-2.5 py-1.5">
                              {isPlayoff ? (
                                <span className={`text-[10px] font-bold px-1 py-0.5 rounded ${
                                  roundInfo === "Finals" ? "bg-yellow-500/20 text-yellow-400" :
                                  roundInfo === "Top 4" ? "bg-amber-500/15 text-amber-400" :
                                  roundInfo === "Top 8" ? "bg-orange-500/15 text-orange-400" :
                                  "bg-orange-500/15 text-orange-400"
                                }`}>{/^Round P/i.test(roundInfo!) ? `P${round}` : roundInfo}</span>
                              ) : (
                                <span className="text-fab-dim">{round}</span>
                              )}
                            </td>
                            <td className="px-2.5 py-1.5 text-fab-text truncate max-w-0">
                              {match.opponentName || <span className="text-fab-dim">Unknown</span>}
                            </td>
                            <td className={`px-2.5 py-1.5 text-right font-bold ${RESULT_COLORS[match.result]}`}>
                              {RESULT_LABELS[match.result]}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {/* Share button */}
                  {playerName && (
                    <div className="px-2.5 py-2 border-t border-fab-border/30 flex justify-end">
                      <button
                        onClick={() => setShareEvent(ev)}
                        className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-fab-dim hover:text-fab-gold hover:bg-fab-gold/5 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Share
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Share modal */}
      {shareEvent && playerName && (
        <EventShareModal
          event={shareEvent}
          playerName={playerName}
          onClose={() => setShareEvent(null)}
        />
      )}
    </div>
  );
}
