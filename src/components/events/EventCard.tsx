"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronDownIcon, ChevronUpIcon } from "@/components/icons/NavIcons";
import { HeroSelect } from "@/components/heroes/HeroSelect";
import { getHeroByName } from "@/lib/heroes";
import { HeroClassIcon } from "@/components/heroes/HeroClassIcon";
import { MatchResult } from "@/types";
import type { EventStats } from "@/types";

interface EventCardProps {
  event: EventStats;
  obfuscateOpponents?: boolean;
  visibleOpponents?: Set<string>;
  editable?: boolean;
  onBatchUpdateHero?: (matchIds: string[], hero: string) => Promise<void>;
  missingGemId?: boolean;
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

export function EventCard({ event, obfuscateOpponents = false, visibleOpponents, editable = false, onBatchUpdateHero, missingGemId }: EventCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [batchHero, setBatchHero] = useState("");
  const [saving, setSaving] = useState(false);
  const [showGemNudge, setShowGemNudge] = useState(false);

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

  // Check if all matches in event share the same hero (not "Unknown")
  const heroes = new Set(event.matches.map((m) => m.heroPlayed).filter((h) => h && h !== "Unknown"));
  const sharedHero = heroes.size === 1 ? [...heroes][0]! : null;
  const sharedHeroInfo = sharedHero ? getHeroByName(sharedHero) : null;

  // Check if any match has a known hero (for showing hero column in expanded table)
  const anyHeroKnown = event.matches.some((m) => m.heroPlayed && m.heroPlayed !== "Unknown");

  async function handleBatchSave() {
    if (!onBatchUpdateHero || !batchHero) return;
    setSaving(true);
    try {
      const ids = event.matches.map((m) => m.id);
      await onBatchUpdateHero(ids, batchHero);
      setBatchHero("");
      if (missingGemId) setShowGemNudge(true);
    } finally {
      setSaving(false);
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
              {sharedHeroInfo && (
                <div className="flex items-center gap-1">
                  <HeroClassIcon heroClass={sharedHeroInfo.classes[0]} size="sm" />
                  <span className="text-xs text-fab-muted">{sharedHero}</span>
                </div>
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
          {/* Batch hero edit */}
          {editable && onBatchUpdateHero && (
            <div className="px-4 py-3 bg-fab-bg/50 border-b border-fab-border/50">
              <div className="flex items-end gap-2">
                <div className="flex-1 max-w-xs">
                  <HeroSelect
                    value={batchHero || sharedHero || ""}
                    onChange={setBatchHero}
                    label="Hero played this event"
                  />
                </div>
                {batchHero && batchHero !== sharedHero && (
                  <button
                    onClick={handleBatchSave}
                    disabled={saving}
                    className="px-3 py-2 rounded text-xs font-medium bg-fab-gold text-fab-bg hover:bg-fab-gold-light disabled:opacity-50 transition-colors shrink-0"
                  >
                    {saving ? "Saving..." : `Set for all ${event.matches.length} matches`}
                  </button>
                )}
              </div>
              {showGemNudge && (
                <p className="text-xs text-fab-muted mt-2">
                  Hero saved! <Link href="/settings" className="text-fab-gold hover:underline">Add your GEM ID in Settings</Link> to share hero data with opponents automatically.
                </p>
              )}
            </div>
          )}

          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-fab-muted">
                <th className="text-left px-4 py-2 font-medium w-16">Round</th>
                <th className="text-left px-4 py-2 font-medium">Opponent</th>
                {anyHeroKnown && (
                  <th className="text-left px-4 py-2 font-medium hidden sm:table-cell">Hero</th>
                )}
                <th className="text-right px-4 py-2 font-medium w-16">Result</th>
              </tr>
            </thead>
            <tbody>
              {event.matches.map((match, i) => {
                const roundInfo = match.notes?.split(" | ")[1];
                const roundMatch = roundInfo?.match(/Round\s+(\d+)/i);
                const round = roundMatch ? roundMatch[1] : `${i + 1}`;
                const isPlayoff = roundInfo && /^(Top 8|Top 4|Finals|Playoff|Skirmish)$/.test(roundInfo);
                const matchHero = match.heroPlayed && match.heroPlayed !== "Unknown" ? match.heroPlayed : null;
                const matchHeroInfo = matchHero ? getHeroByName(matchHero) : null;

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
                    {anyHeroKnown && (
                      <td className="px-4 py-2.5 hidden sm:table-cell">
                        {matchHeroInfo ? (
                          <div className="flex items-center gap-1">
                            <HeroClassIcon heroClass={matchHeroInfo.classes[0]} size="sm" />
                            <span className="text-xs text-fab-muted">{matchHero}</span>
                          </div>
                        ) : (
                          <span className="text-fab-dim text-xs">—</span>
                        )}
                      </td>
                    )}
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
