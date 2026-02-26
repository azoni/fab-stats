"use client";
import { useState, Fragment } from "react";
import Link from "next/link";
import { ChevronDownIcon, ChevronUpIcon } from "@/components/icons/NavIcons";
import { HeroSelect } from "@/components/heroes/HeroSelect";
import { getHeroByName } from "@/lib/heroes";
import { HeroClassIcon } from "@/components/heroes/HeroClassIcon";
import { MatchResult, GameFormat } from "@/types";
import { localDate } from "@/lib/constants";
import type { EventStats } from "@/types";

interface EventCardProps {
  event: EventStats;
  obfuscateOpponents?: boolean;
  visibleOpponents?: Set<string>;
  editable?: boolean;
  onBatchUpdateHero?: (matchIds: string[], hero: string) => Promise<void>;
  onBatchUpdateFormat?: (matchIds: string[], format: GameFormat) => Promise<void>;
  missingGemId?: boolean;
}

const resultColors: Record<string, string> = {
  [MatchResult.Win]: "text-fab-win",
  [MatchResult.Loss]: "text-fab-loss",
  [MatchResult.Draw]: "text-fab-draw",
  [MatchResult.Bye]: "text-fab-dim",
};

const resultLabels: Record<string, string> = {
  [MatchResult.Win]: "W",
  [MatchResult.Loss]: "L",
  [MatchResult.Draw]: "D",
  [MatchResult.Bye]: "B",
};

const playoffRank: Record<string, number> = { "Finals": 4, "Top 4": 3, "Top 8": 2, "Playoff": 2, "Skirmish": 1 };

export function EventCard({ event, obfuscateOpponents = false, visibleOpponents, editable = false, onBatchUpdateHero, onBatchUpdateFormat, missingGemId }: EventCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [batchHero, setBatchHero] = useState("");
  const [heroFrom, setHeroFrom] = useState("1");
  const [heroTo, setHeroTo] = useState(String(event.matches.length));
  const [saving, setSaving] = useState(false);
  const [heroSaved, setHeroSaved] = useState(false);
  const [showGemNudge, setShowGemNudge] = useState(false);
  const [batchFormat, setBatchFormat] = useState("");
  const [formatFrom, setFormatFrom] = useState("1");
  const [formatTo, setFormatTo] = useState(String(event.matches.length));
  const [savingFormat, setSavingFormat] = useState(false);
  const [formatSaved, setFormatSaved] = useState(false);
  const [error, setError] = useState("");

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

  // Only show hero column when matches have different heroes (otherwise it's in the header)
  const showHeroColumn = heroes.size > 1;

  // The hero that would be saved: user's pick or fallback to the shared hero
  const effectiveHero = batchHero || sharedHero || "";

  function clampRound(val: string): string {
    const n = parseInt(val, 10);
    if (isNaN(n) || n < 1) return "1";
    if (n > event.matches.length) return String(event.matches.length);
    return String(n);
  }

  async function handleBatchSave() {
    if (!onBatchUpdateHero || !effectiveHero) return;
    setError("");
    setSaving(true);
    try {
      const from = parseInt(heroFrom, 10) || 1;
      const to = parseInt(heroTo, 10) || event.matches.length;
      const ids = event.matches.slice(from - 1, to).map((m) => m.id);
      await onBatchUpdateHero(ids, effectiveHero);
      // Advance range to remaining rounds so user can apply a different hero next
      const nextFrom = to + 1;
      if (nextFrom <= event.matches.length) {
        setHeroFrom(String(nextFrom));
        setHeroTo(String(event.matches.length));
      }
      setBatchHero("");
      setHeroSaved(true);
      setTimeout(() => setHeroSaved(false), 2000);
      if (missingGemId) setShowGemNudge(true);
    } catch {
      setError("Failed to save hero. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleBatchFormatSave() {
    if (!onBatchUpdateFormat || !batchFormat) return;
    setError("");
    setSavingFormat(true);
    try {
      const from = parseInt(formatFrom, 10) || 1;
      const to = parseInt(formatTo, 10) || event.matches.length;
      const ids = event.matches.slice(from - 1, to).map((m) => m.id);
      await onBatchUpdateFormat(ids, batchFormat as GameFormat);
      // Advance range to remaining rounds so user can apply a different format next
      const nextFrom = to + 1;
      if (nextFrom <= event.matches.length) {
        setFormatFrom(String(nextFrom));
        setFormatTo(String(event.matches.length));
      }
      setBatchFormat("");
      setFormatSaved(true);
      setTimeout(() => setFormatSaved(false), 2000);
    } catch {
      setError("Failed to save format. Please try again.");
    } finally {
      setSavingFormat(false);
    }
  }

  // Compute format segments for divider rows (groups of consecutive matches with same format)
  const isMultiFormat = event.formats.length > 1;
  const formatSegments: { format: string; startIdx: number; endIdx: number }[] = [];
  if (isMultiFormat) {
    let segStart = 0;
    for (let i = 1; i <= event.matches.length; i++) {
      if (i === event.matches.length || event.matches[i].format !== event.matches[segStart].format) {
        formatSegments.push({ format: event.matches[segStart].format, startIdx: segStart, endIdx: i - 1 });
        segStart = i;
      }
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
              <span>{localDate(event.eventDate).toLocaleDateString()}</span>
              {event.venue && event.venue !== "Unknown" && <span>at {event.venue}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {event.formats.map((f) => (
              <span key={f} className="hidden sm:inline px-2 py-0.5 rounded bg-fab-bg text-fab-dim text-xs">{f}</span>
            ))}
            {event.eventType && event.eventType !== "Other" && (
              <span className="hidden sm:inline px-2 py-0.5 rounded bg-fab-bg text-fab-dim text-xs">{event.eventType}</span>
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
              <label className="block text-xs font-medium text-fab-muted mb-1.5">Set hero for rounds</label>
              <div className="flex items-end gap-2 flex-wrap">
                <div className="w-48">
                  <HeroSelect
                    value={batchHero || sharedHero || ""}
                    onChange={setBatchHero}
                    label="Hero played"
                    format={event.format}
                  />
                </div>
                <div className="flex items-center gap-1 text-xs text-fab-muted">
                  <span>from</span>
                  <input
                    type="number"
                    min={1}
                    max={event.matches.length}
                    value={heroFrom}
                    onChange={(e) => setHeroFrom(e.target.value)}
                    onBlur={() => setHeroFrom(clampRound(heroFrom))}
                    className="w-12 bg-fab-surface border border-fab-border rounded-md px-1.5 py-1.5 text-fab-text text-xs text-center outline-none focus:border-fab-gold/50"
                  />
                  <span>to</span>
                  <input
                    type="number"
                    min={1}
                    max={event.matches.length}
                    value={heroTo}
                    onChange={(e) => setHeroTo(e.target.value)}
                    onBlur={() => setHeroTo(clampRound(heroTo))}
                    className="w-12 bg-fab-surface border border-fab-border rounded-md px-1.5 py-1.5 text-fab-text text-xs text-center outline-none focus:border-fab-gold/50"
                  />
                </div>
                {heroSaved ? (
                  <span className="px-3 py-1.5 rounded text-xs font-medium bg-green-500/20 text-green-400 shrink-0">Saved!</span>
                ) : effectiveHero ? (
                  <button
                    onClick={handleBatchSave}
                    disabled={saving}
                    className="px-3 py-1.5 rounded text-xs font-medium bg-fab-gold text-fab-bg hover:bg-fab-gold-light disabled:opacity-50 transition-colors shrink-0"
                  >
                    {saving ? "Saving..." : "Apply"}
                  </button>
                ) : null}
              </div>
              {showGemNudge && (
                <p className="text-xs text-fab-muted mt-2">
                  Hero saved! <Link href="/settings" className="text-fab-gold hover:underline">Add your GEM ID in Settings</Link> to share hero data with opponents automatically.
                </p>
              )}
            </div>
          )}

          {/* Batch format edit */}
          {editable && onBatchUpdateFormat && (
            <div className="px-4 py-3 bg-fab-bg/50 border-b border-fab-border/50">
              <label className="block text-xs font-medium text-fab-muted mb-1.5">Set format for rounds</label>
              <div className="flex items-end gap-2 flex-wrap">
                <select
                  value={batchFormat}
                  onChange={(e) => setBatchFormat(e.target.value)}
                  className="bg-fab-surface border border-fab-border rounded-md px-2 py-1.5 text-fab-text text-xs outline-none focus:border-fab-gold/50"
                >
                  <option value="">Select format</option>
                  {Object.values(GameFormat).map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
                <div className="flex items-center gap-1 text-xs text-fab-muted">
                  <span>from</span>
                  <input
                    type="number"
                    min={1}
                    max={event.matches.length}
                    value={formatFrom}
                    onChange={(e) => setFormatFrom(e.target.value)}
                    onBlur={() => setFormatFrom(clampRound(formatFrom))}
                    className="w-12 bg-fab-surface border border-fab-border rounded-md px-1.5 py-1.5 text-fab-text text-xs text-center outline-none focus:border-fab-gold/50"
                  />
                  <span>to</span>
                  <input
                    type="number"
                    min={1}
                    max={event.matches.length}
                    value={formatTo}
                    onChange={(e) => setFormatTo(e.target.value)}
                    onBlur={() => setFormatTo(clampRound(formatTo))}
                    className="w-12 bg-fab-surface border border-fab-border rounded-md px-1.5 py-1.5 text-fab-text text-xs text-center outline-none focus:border-fab-gold/50"
                  />
                </div>
                {formatSaved ? (
                  <span className="px-3 py-1.5 rounded text-xs font-medium bg-green-500/20 text-green-400 shrink-0">Saved!</span>
                ) : batchFormat ? (
                  <button
                    onClick={handleBatchFormatSave}
                    disabled={savingFormat}
                    className="px-3 py-1.5 rounded text-xs font-medium bg-fab-gold text-fab-bg hover:bg-fab-gold-light disabled:opacity-50 transition-colors shrink-0"
                  >
                    {savingFormat ? "Saving..." : "Apply"}
                  </button>
                ) : null}
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="px-4 py-2 bg-red-500/10 border-b border-fab-border/50">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-fab-muted">
                <th className="text-left px-4 py-2 font-medium w-16">Round</th>
                <th className="text-left px-4 py-2 font-medium">Opponent</th>
                {showHeroColumn && (
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

                // Format divider: show when this match starts a new format segment
                const segment = isMultiFormat ? formatSegments.find((s) => s.startIdx === i) : null;
                const colSpan = 2 + (showHeroColumn ? 1 : 0) + 1;

                return (
                  <Fragment key={match.id}>{segment && (
                    <tr key={`seg-${i}`} className="border-t border-fab-border/50">
                      <td colSpan={colSpan} className="px-4 py-1.5 text-center">
                        <span className="text-xs font-medium text-fab-muted">
                          {segment.format} (Rounds {segment.startIdx + 1}–{segment.endIdx + 1})
                        </span>
                      </td>
                    </tr>
                  )}
                  <tr className="border-t border-fab-border/50">
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
                    {showHeroColumn && (
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
                  </tr></Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
