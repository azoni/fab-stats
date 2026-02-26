"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronDownIcon, ChevronUpIcon } from "@/components/icons/NavIcons";
import { MatchResult } from "@/types";
import type { EventStats } from "@/types";

interface EventCardProps {
  event: EventStats;
  obfuscateOpponents?: boolean;
  visibleOpponents?: Set<string>;
}

const resultColors = {
  [MatchResult.Win]: "text-fab-win",
  [MatchResult.Loss]: "text-fab-loss",
  [MatchResult.Draw]: "text-fab-draw",
};

const resultLabels = {
  [MatchResult.Win]: "W",
  [MatchResult.Loss]: "L",
  [MatchResult.Draw]: "D",
};

const playoffRank: Record<string, number> = { "Finals": 4, "Top 4": 3, "Top 8": 2, "Playoff": 2, "Skirmish": 1 };

export function EventCard({ event, obfuscateOpponents = false, visibleOpponents }: EventCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Determine best playoff placement from match rounds
  let bestPlayoff: string | null = null;
  let bestRank = 0;
  for (const match of event.matches) {
    const roundInfo = match.notes?.split(" | ")[1];
    if (roundInfo && playoffRank[roundInfo] && playoffRank[roundInfo] > bestRank) {
      bestRank = playoffRank[roundInfo];
      bestPlayoff = roundInfo === "Playoff" ? "Top 8" : roundInfo;
    }
  }

  return (
    <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left hover:bg-fab-surface-hover transition-colors"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-fab-text">{event.eventName}</span>
              {event.rated && (
                <span className="px-1.5 py-0.5 rounded bg-fab-gold/15 text-fab-gold text-xs">Rated</span>
              )}
              {bestPlayoff && (
                <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                  bestPlayoff === "Finals" ? "bg-yellow-500/20 text-yellow-400" :
                  bestPlayoff === "Top 4" ? "bg-amber-500/15 text-amber-400" :
                  bestPlayoff === "Top 8" ? "bg-orange-500/15 text-orange-400" :
                  "bg-blue-500/15 text-blue-400"
                }`}>{bestPlayoff}</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-fab-dim">
              <span>{new Date(event.eventDate).toLocaleDateString()}</span>
              {event.venue && event.venue !== "Unknown" && <span>at {event.venue}</span>}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="px-2 py-0.5 rounded bg-fab-bg text-fab-dim text-xs">{event.format}</span>
            {event.eventType && event.eventType !== "Other" && (
              <span className="px-2 py-0.5 rounded bg-fab-bg text-fab-dim text-xs">{event.eventType}</span>
            )}
            <span className={`text-sm font-bold ${event.wins > event.losses ? "text-fab-win" : event.wins < event.losses ? "text-fab-loss" : "text-fab-draw"}`}>
              {event.wins}-{event.losses}{event.draws > 0 ? `-${event.draws}` : ""}
            </span>
            {expanded ? (
              <ChevronUpIcon className="w-4 h-4 text-fab-dim" />
            ) : (
              <ChevronDownIcon className="w-4 h-4 text-fab-dim" />
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-fab-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-fab-muted">
                <th className="text-left px-4 py-2 font-medium w-16">Round</th>
                <th className="text-left px-4 py-2 font-medium">Opponent</th>
                <th className="text-right px-4 py-2 font-medium w-16">Result</th>
              </tr>
            </thead>
            <tbody>
              {event.matches.map((match, i) => {
                const roundInfo = match.notes?.split(" | ")[1];
                const roundMatch = roundInfo?.match(/Round\s+(\d+)/i);
                const round = roundMatch ? roundMatch[1] : `${i + 1}`;
                const isPlayoff = roundInfo && /^(Top 8|Top 4|Finals|Playoff|Skirmish)$/.test(roundInfo);

                return (
                  <tr key={match.id} className="border-t border-fab-border/50">
                    <td className="px-4 py-2.5">
                      {isPlayoff ? (
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                          roundInfo === "Finals" ? "bg-yellow-500/20 text-yellow-400" :
                          roundInfo === "Top 4" ? "bg-amber-500/15 text-amber-400" :
                          roundInfo === "Top 8" ? "bg-orange-500/15 text-orange-400" :
                          roundInfo === "Skirmish" ? "bg-blue-500/15 text-blue-400" :
                          "bg-fab-gold/10 text-fab-gold"
                        }`}>{roundInfo}</span>
                      ) : (
                        <span className="text-fab-dim">{round}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {obfuscateOpponents && !(match.opponentName && visibleOpponents?.has(match.opponentName)) ? (
                        <span className="text-fab-dim">Opponent</span>
                      ) : match.opponentName ? (
                        <Link
                          href={`/search?q=${encodeURIComponent(match.opponentName)}`}
                          className="text-fab-text hover:text-fab-gold transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {match.opponentName}
                        </Link>
                      ) : (
                        <span className="text-fab-dim">Unknown</span>
                      )}
                    </td>
                    <td className={`px-4 py-2.5 text-right font-bold ${resultColors[match.result]}`}>
                      {resultLabels[match.result]}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
