"use client";
import { useState, useMemo, useEffect, Fragment } from "react";
import Link from "next/link";
import { ChevronDownIcon, ChevronUpIcon } from "@/components/icons/NavIcons";
import { HeroSelect } from "@/components/heroes/HeroSelect";
import { getHeroByName } from "@/lib/heroes";
import { HeroImg } from "@/components/heroes/HeroImg";
import { MatchResult, GameFormat } from "@/types";
import { localDate } from "@/lib/constants";
import type { EventStats, MatchRecord } from "@/types";
import { EventShareModal } from "@/components/events/EventShareCard";
import { BracketView } from "@/components/events/BracketView";
import { getAllowedEventTypes, getOriginalEventType } from "@/lib/event-types";
import { getRoundNumber, computeDay2Boundary, suggestedManualDay2Round, isDay2Match } from "@/lib/stats";
import { slugifyStoreName } from "@/lib/store-directory";
import { toast } from "sonner";

interface EventCardProps {
  event: EventStats;
  playerName?: string;
  obfuscateOpponents?: boolean;
  visibleOpponents?: Set<string>;
  editable?: boolean;
  onBatchUpdateHero?: (matchIds: string[], hero: string) => Promise<void>;
  onBatchUpdateFormat?: (matchIds: string[], format: GameFormat) => Promise<void>;
  onBatchUpdateEventType?: (matchIds: string[], eventTypeOverride: string) => Promise<void>;
  onBatchUpdateDay2?: (matchIds: string[], day2: boolean) => Promise<void>;
  onDeleteEvent?: (matchIds: string[], eventName: string, eventDate: string) => Promise<void>;
  onUpdateMatch?: (id: string, updates: Partial<Omit<MatchRecord, "id" | "createdAt">>) => Promise<void>;
  onDeleteMatch?: (id: string) => Promise<void>;
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

/** Win/loss/draw tally for a slice of matches. Byes are excluded, matching the
 *  overall event record (event.wins/losses/draws). */
function sliceRecord(matches: MatchRecord[]): { w: number; l: number; d: number } {
  let w = 0, l = 0, d = 0;
  for (const m of matches) {
    if (m.result === MatchResult.Win) w++;
    else if (m.result === MatchResult.Loss) l++;
    else if (m.result === MatchResult.Draw) d++;
  }
  return { w, l, d };
}

/** "3-2" or, when there are draws, "3-2-1". */
function fmtRecord(r: { w: number; l: number; d: number }): string {
  return r.d > 0 ? `${r.w}-${r.l}-${r.d}` : `${r.w}-${r.l}`;
}

/** Tailwind text colour for a record, mirroring the event header's coloring. */
function recordColor(r: { w: number; l: number }): string {
  return r.w > r.l ? "text-fab-win" : r.w < r.l ? "text-fab-loss" : "text-fab-draw";
}

/** Build the initial hero/format segments from the event's ACTUAL per-round
 *  data, grouping consecutive rounds that share a hero + format. This makes the
 *  "Set hero & format for rounds" editor reflect what's really saved (so it
 *  never looks like edits were lost) and surfaces the played hero. Unknown
 *  heroes become an empty field. */
function deriveSegments(matches: MatchRecord[]): HeroSegment[] {
  if (matches.length === 0) return [{ hero: "", format: "", fromRound: "1", toRound: "1" }];
  const heroOf = (m: MatchRecord) => (m.heroPlayed && m.heroPlayed !== "Unknown" ? m.heroPlayed : "");
  const keyOf = (m: MatchRecord) => `${heroOf(m)}|${m.format || ""}`;
  const segs: HeroSegment[] = [];
  let start = 0;
  for (let i = 1; i <= matches.length; i++) {
    if (i === matches.length || keyOf(matches[i]) !== keyOf(matches[start])) {
      segs.push({
        hero: heroOf(matches[start]),
        format: matches[start].format || "",
        fromRound: String(start + 1),
        toRound: String(i),
      });
      start = i;
    }
  }
  return segs;
}

interface HeroSegment {
  hero: string;
  format: string;
  fromRound: string;
  toRound: string;
}

export function EventCard({ event, playerName, obfuscateOpponents = false, visibleOpponents, editable = false, onBatchUpdateHero, onBatchUpdateFormat, onBatchUpdateEventType, onBatchUpdateDay2, onDeleteEvent, onUpdateMatch, onDeleteMatch, missingGemId }: EventCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [editingEventType, setEditingEventType] = useState(false);
  const [savingEventType, setSavingEventType] = useState(false);
  const [segments, setSegments] = useState<HeroSegment[]>(() => deriveSegments(event.matches));
  // Keep the editor matching the real saved data: re-derive whenever the actual
  // per-round hero/format changes (e.g. after an Apply). In-progress typing never
  // changes event.matches, so it's never clobbered.
  const matchSignature = event.matches.map((m) => `${m.heroPlayed || ""}|${m.format || ""}`).join(",");
  useEffect(() => {
    setSegments(deriveSegments(event.matches));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchSignature]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showGemNudge, setShowGemNudge] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingOppHeroId, setEditingOppHeroId] = useState<string | null>(null);
  const [savingOppHeroId, setSavingOppHeroId] = useState<string | null>(null);
  const [savingDay2, setSavingDay2] = useState(false);
  // Effective day-2 start round, always derived fresh from the current matches:
  // the round of the first existing day-2 match, else the auto heuristic, else
  // a sensible manual suggestion. Deriving (not storing) avoids a stale input
  // after Apply changes the underlying matches.
  const day2CurrentRound = useMemo(() => {
    const existing = event.matches.find((m) => m.day2);
    if (existing) return getRoundNumber(existing);
    return computeDay2Boundary(event.matches) ?? suggestedManualDay2Round(event.matches);
  }, [event.matches]);
  // The user's in-progress edit. null = not editing → show the derived value.
  const [day2RoundEdit, setDay2RoundEdit] = useState<string | null>(null);
  const day2RoundInput = day2RoundEdit ?? String(day2CurrentRound);
  const [showBracket, setShowBracket] = useState(false);

  // Determine best playoff placement from match rounds
  let bestPlayoff: string | null = null;
  let bestRank = 0;
  for (const match of event.matches) {
    const roundInfo = match.notes?.split(" | ")[1];
    if (!roundInfo) continue;
    const rank = playoffRank[roundInfo] ?? (/^Round P/i.test(roundInfo) ? 2 : 0);
    if (rank > bestRank) {
      bestRank = rank;
      bestPlayoff = roundInfo === "Playoff" || /^Round P/i.test(roundInfo) ? "Top 8" : roundInfo;
    }
  }

  // Check if all matches in event share the same hero (not "Unknown")
  const heroes = new Set(event.matches.map((m) => m.heroPlayed).filter((h) => h && h !== "Unknown"));
  const sharedHero = heroes.size === 1 ? [...heroes][0]! : null;
  const sharedHeroInfo = sharedHero ? getHeroByName(sharedHero) : null;

  const hasDay2 = event.matches.some((m) => m.day2);

  // Only show hero column when matches have different heroes (otherwise it's in the header)
  const showHeroColumn = heroes.size > 1;

  function clampRound(val: string): string {
    const n = parseInt(val, 10);
    if (isNaN(n) || n < 1) return "1";
    if (n > event.matches.length) return String(event.matches.length);
    return String(n);
  }

  function updateSegment(index: number, updates: Partial<HeroSegment>) {
    setSegments((prev) => prev.map((s, i) => (i === index ? { ...s, ...updates } : s)));
  }

  function removeSegment(index: number) {
    setSegments((prev) => prev.filter((_, i) => i !== index));
  }

  function addSegment() {
    // Default the new segment's start to one after the last segment's end
    const lastTo = parseInt(segments[segments.length - 1]?.toRound || "0", 10);
    const nextFrom = lastTo < event.matches.length ? lastTo + 1 : 1;
    setSegments((prev) => [
      ...prev,
      { hero: "", format: "", fromRound: String(nextFrom), toRound: String(event.matches.length) },
    ]);
  }

  async function handleApplyAll() {
    // Check that at least one segment has something to save
    const hasWork = segments.some((s) => s.hero || s.format);
    if (!hasWork) return;
    setError("");
    setSaving(true);
    try {
      for (const seg of segments) {
        const heroToSave = seg.hero;
        const formatToSave = seg.format;
        if (!heroToSave && !formatToSave) continue;

        const from = parseInt(seg.fromRound, 10) || 1;
        const to = parseInt(seg.toRound, 10) || event.matches.length;
        const ids = event.matches.slice(from - 1, to).map((m) => m.id);
        if (ids.length === 0) continue;

        if (heroToSave && onBatchUpdateHero) {
          await onBatchUpdateHero(ids, heroToSave);
        }
        if (formatToSave && onBatchUpdateFormat) {
          await onBatchUpdateFormat(ids, formatToSave as GameFormat);
        }
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      if (missingGemId && segments.some((s) => s.hero && s.hero !== "Unknown")) setShowGemNudge(true);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // Compute format segments for divider rows (groups of consecutive matches with same format)
  const isMultiFormat = event.formats.length > 1;
  const formatSegments: { format: string; startIdx: number; endIdx: number; record: { w: number; l: number; d: number } }[] = [];
  if (isMultiFormat) {
    let segStart = 0;
    for (let i = 1; i <= event.matches.length; i++) {
      if (i === event.matches.length || event.matches[i].format !== event.matches[segStart].format) {
        formatSegments.push({
          format: event.matches[segStart].format,
          startIdx: segStart,
          endIdx: i - 1,
          record: sliceRecord(event.matches.slice(segStart, i)),
        });
        segStart = i;
      }
    }
  }

  // Per-format record (aggregated across all rounds of each format), in the same
  // first-appearance order as event.formats. Drives the per-format header badges.
  const formatRecords = useMemo(() => {
    if (!isMultiFormat) return [];
    return event.formats.map((f) => ({ format: f, ...sliceRecord(event.matches.filter((m) => m.format === f)) }));
  }, [isMultiFormat, event.formats, event.matches]);

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
              {hasDay2 && (
                <span className="px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 text-xs font-bold">Day 2</span>
              )}
              {sharedHeroInfo && (
                <div className="flex items-center gap-1">
                  <HeroImg name={sharedHero!} size="sm" />
                  <span className="text-xs text-fab-muted">{sharedHero}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-fab-dim">
              <span>{localDate(event.eventDate).toLocaleDateString()}</span>
              {event.venue && event.venue !== "Unknown" && (
                <Link
                  href={`/stores/${slugifyStoreName(event.venue)}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 hover:text-fab-gold hover:underline transition-colors"
                  title={`View the ${event.venue} store page`}
                >
                  at {event.venue}
                  <svg className="h-2.5 w-2.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {event.formats.map((f) => {
              const rec = isMultiFormat ? formatRecords.find((r) => r.format === f) : null;
              return (
                <span key={f} className="hidden sm:inline px-2 py-0.5 rounded bg-fab-bg text-fab-dim text-xs">
                  {f}
                  {rec && (
                    <span className={`ml-1 font-semibold ${recordColor(rec)}`}>{fmtRecord(rec)}</span>
                  )}
                </span>
              );
            })}
            {editable && onBatchUpdateEventType && editingEventType ? (
              <select
                value={event.matches[0]?.eventTypeOverride || getOriginalEventType(event.matches[0])}
                onChange={async (e) => {
                  e.stopPropagation();
                  if (!onBatchUpdateEventType) return;
                  const newType = e.target.value;
                  setSavingEventType(true);
                  setEditingEventType(false);
                  try {
                    const matchIds = event.matches.map((m) => m.id);
                    const originalType = getOriginalEventType(event.matches[0]);
                    // Empty string clears the override (reverts to auto)
                    await onBatchUpdateEventType(matchIds, newType === originalType ? "" : newType);
                  } catch {
                    toast.error("Failed to update event type.");
                  }
                  setSavingEventType(false);
                }}
                onClick={(e) => e.stopPropagation()}
                onBlur={() => setEditingEventType(false)}
                className="hidden sm:inline bg-fab-surface border border-fab-border rounded px-1.5 py-0.5 text-fab-text text-xs outline-none focus:border-fab-gold/50"
                autoFocus
              >
                {(() => {
                  const originalType = getOriginalEventType(event.matches[0]);
                  const allowed = getAllowedEventTypes(originalType);
                  return (
                    <>
                      <option value={originalType}>Auto ({originalType})</option>
                      {allowed.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </>
                  );
                })()}
              </select>
            ) : savingEventType ? (
              <span className="hidden sm:inline px-2 py-0.5 rounded bg-fab-bg text-fab-dim text-xs">Saving...</span>
            ) : event.eventType && event.eventType !== "Other" ? (
              <span
                className={`hidden sm:inline px-2 py-0.5 rounded bg-fab-bg text-fab-dim text-xs ${editable && onBatchUpdateEventType ? "group/et cursor-pointer hover:text-fab-muted" : ""}`}
                onClick={editable && onBatchUpdateEventType ? (e) => { e.stopPropagation(); setEditingEventType(true); } : undefined}
              >
                {event.eventType}
                {editable && onBatchUpdateEventType && (
                  <svg className="w-2.5 h-2.5 inline ml-1 opacity-0 group-hover/et:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                )}
              </span>
            ) : editable && onBatchUpdateEventType ? (
              <button
                onClick={(e) => { e.stopPropagation(); setEditingEventType(true); }}
                className="hidden sm:inline px-2 py-0.5 rounded bg-fab-bg text-fab-dim text-xs hover:text-fab-muted transition-colors"
                title="Set event type"
              >
                + type
              </button>
            ) : null}
            {bestPlayoff && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowBracket(!showBracket); }}
                className={`p-1 rounded transition-colors ${showBracket ? "text-fab-gold" : "text-fab-dim hover:text-fab-gold"}`}
                title="View bracket"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6h16.5M3.75 12h16.5m-16.5 5.25H12" />
                </svg>
              </button>
            )}
            {playerName && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowShareModal(true); }}
                className="p-1 rounded text-fab-dim hover:text-fab-gold transition-colors"
                title="Share event result"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </button>
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
          {/* Batch hero + format edit */}
          {editable && (onBatchUpdateHero || onBatchUpdateFormat) && (
            <div className="px-4 py-3 bg-fab-bg/50 border-b border-fab-border/50">
              <label className="block text-xs font-medium text-fab-muted mb-2">Set hero &amp; format for rounds</label>
              <div className="space-y-2">
                {segments.map((seg, idx) => (
                  <div key={idx} className="flex items-end gap-2 flex-wrap">
                    {onBatchUpdateHero && (
                      <div className="w-48">
                        <HeroSelect
                          value={seg.hero}
                          onChange={(v) => updateSegment(idx, { hero: v })}
                          label="Hero played"
                          format={seg.format || event.format}
                          allowClear
                        />
                      </div>
                    )}
                    {onBatchUpdateFormat && (
                      <select
                        value={seg.format}
                        onChange={(e) => updateSegment(idx, { format: e.target.value })}
                        className="bg-fab-surface border border-fab-border rounded-md px-2 py-1.5 text-fab-text text-xs outline-none focus:border-fab-gold/50"
                      >
                        <option value="">Format</option>
                        {Object.values(GameFormat).map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    )}
                    <div className="flex items-center gap-1 text-xs text-fab-muted">
                      <span>rounds</span>
                      <input
                        type="number"
                        min={1}
                        max={event.matches.length}
                        value={seg.fromRound}
                        onChange={(e) => updateSegment(idx, { fromRound: e.target.value })}
                        onBlur={() => updateSegment(idx, { fromRound: clampRound(seg.fromRound) })}
                        className="w-12 bg-fab-surface border border-fab-border rounded-md px-1.5 py-1.5 text-fab-text text-xs text-center outline-none focus:border-fab-gold/50"
                      />
                      <span>–</span>
                      <input
                        type="number"
                        min={1}
                        max={event.matches.length}
                        value={seg.toRound}
                        onChange={(e) => updateSegment(idx, { toRound: e.target.value })}
                        onBlur={() => updateSegment(idx, { toRound: clampRound(seg.toRound) })}
                        className="w-12 bg-fab-surface border border-fab-border rounded-md px-1.5 py-1.5 text-fab-text text-xs text-center outline-none focus:border-fab-gold/50"
                      />
                    </div>
                    {segments.length > 1 && (
                      <button
                        onClick={() => removeSegment(idx)}
                        className="px-1.5 py-1.5 rounded text-fab-dim hover:text-red-400 transition-colors"
                        title="Remove"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={addSegment}
                  className="text-xs text-fab-gold hover:text-fab-gold-light transition-colors"
                >
                  + Add another hero/format
                </button>
                <div className="flex-1" />
                {saved ? (
                  <span className="px-3 py-1.5 rounded text-xs font-medium bg-green-500/20 text-green-400 shrink-0">Saved!</span>
                ) : segments.some((s) => s.hero || s.format) ? (
                  <button
                    onClick={handleApplyAll}
                    disabled={saving}
                    className="px-3 py-1.5 rounded text-xs font-medium bg-fab-gold text-fab-bg hover:bg-fab-gold-light disabled:opacity-50 transition-colors shrink-0"
                  >
                    {saving ? "Saving..." : "Apply"}
                  </button>
                ) : null}
              </div>
              {showGemNudge && (
                <p className="text-xs text-fab-muted mt-2">
                  Saved! <Link href="/settings" className="text-fab-gold hover:underline">Add your GEM ID in Settings</Link> to share hero data with opponents automatically.
                </p>
              )}
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
                <th className="text-left px-4 py-2 font-medium hidden sm:table-cell">Vs Hero</th>
                <th className="text-right px-4 py-2 font-medium w-16">Result</th>
              </tr>
            </thead>
            <tbody>
              {event.matches.map((match, i) => {
                const roundInfo = match.notes?.split(" | ")[1];
                const roundMatch = roundInfo?.match(/Round\s+P?(\d+)/i);
                const round = roundMatch ? roundMatch[1] : `${i + 1}`;
                const isPlayoff = roundInfo && (/^(Top 8|Top 4|Finals|Playoff|Skirmish)$/.test(roundInfo) || /^Round P/i.test(roundInfo));
                const matchHero = match.heroPlayed && match.heroPlayed !== "Unknown" ? match.heroPlayed : null;
                const matchHeroInfo = matchHero ? getHeroByName(matchHero) : null;

                // Format divider: show when this match starts a new format segment
                const segment = isMultiFormat ? formatSegments.find((s) => s.startIdx === i) : null;
                const colSpan = 2 + (showHeroColumn ? 1 : 0) + 1 + 1;
                // Day 2 divider: show before the first day-2 match
                const isDay2Start = match.day2 && (i === 0 || !event.matches[i - 1].day2);

                return (
                  <Fragment key={match.id}>{segment && (
                    <tr key={`seg-${i}`} className="border-t border-fab-border/50">
                      <td colSpan={colSpan} className="px-4 py-1.5 text-center">
                        <span className="text-xs font-medium text-fab-muted">
                          {segment.format} (Rounds {segment.startIdx + 1}–{segment.endIdx + 1})
                          <span className="text-fab-dim"> · </span>
                          <span className={`font-semibold ${recordColor(segment.record)}`}>{fmtRecord(segment.record)}</span>
                        </span>
                      </td>
                    </tr>
                  )}
                  {isDay2Start && (
                    <tr key={`day2-${i}`} className="border-t border-indigo-500/30 bg-indigo-500/[0.06]">
                      <td colSpan={colSpan} className="px-4 py-1.5 text-center">
                        <span className="text-xs font-bold uppercase tracking-wide text-indigo-300">— Day 2 —</span>
                      </td>
                    </tr>
                  )}
                  <tr
                    className={`border-t border-fab-border/50 ${match.opponentName && !obfuscateOpponents ? "cursor-pointer hover:bg-fab-bg/50 transition-colors" : ""}`}
                    onClick={() => { if (match.opponentName && !obfuscateOpponents) window.location.href = `/opponents?q=${encodeURIComponent(match.opponentName)}`; }}
                  >
                    <td className="px-4 py-2.5">
                      {isPlayoff ? (
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                          roundInfo === "Finals" ? "bg-yellow-500/20 text-yellow-400" :
                          roundInfo === "Top 4" ? "bg-amber-500/15 text-amber-400" :
                          roundInfo === "Top 8" ? "bg-orange-500/15 text-orange-400" :
                          roundInfo === "Skirmish" ? "bg-blue-500/15 text-blue-400" :
                          "bg-orange-500/15 text-orange-400"
                        }`}>{/^Round P/i.test(roundInfo!) ? `P${round}` : roundInfo}</span>
                      ) : (
                        <span className="text-fab-dim">{round}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {obfuscateOpponents && !(match.opponentName && visibleOpponents?.has(match.opponentName)) ? (
                        <span className="text-fab-dim">Opponent</span>
                      ) : (
                        <span className="text-fab-text">{match.opponentName || <span className="text-fab-dim">Unknown</span>}</span>
                      )}
                      {/* Mobile-only opponent hero */}
                      {(() => {
                        const oppHero = match.opponentHero && match.opponentHero !== "Unknown" ? match.opponentHero : null;
                        const oppHeroInfo = oppHero ? getHeroByName(oppHero) : null;
                        const isEditable = editable && onUpdateMatch;
                        return (
                          <div className="sm:hidden mt-0.5" onClick={isEditable ? (e) => e.stopPropagation() : undefined}>
                            {editingOppHeroId === match.id ? (
                              <div className="w-full">
                                <HeroSelect
                                  value={match.opponentHero || ""}
                                  onChange={async (hero) => {
                                    setEditingOppHeroId(null);
                                    if (!onUpdateMatch) return;
                                    setSavingOppHeroId(match.id);
                                    try {
                                      await onUpdateMatch(match.id, { opponentHero: hero || undefined });
                                    } catch { /* ignore */ }
                                    setSavingOppHeroId(null);
                                  }}
                                  label="Opponent hero"
                                  format={match.format}
                                  allowClear
                                />
                              </div>
                            ) : savingOppHeroId === match.id ? (
                              <span className="text-fab-dim text-xs">Saving...</span>
                            ) : oppHeroInfo ? (
                              <div
                                className={`flex items-center gap-1 ${isEditable ? "cursor-pointer" : ""}`}
                                onClick={isEditable ? () => setEditingOppHeroId(match.id) : undefined}
                              >
                                <span className="text-fab-dim text-xs">vs</span>
                                <HeroImg name={oppHero!} size="sm" />
                                <span className="text-xs text-fab-muted">{oppHero}</span>
                              </div>
                            ) : isEditable ? (
                              <span
                                className="text-fab-dim text-xs cursor-pointer py-1"
                                onClick={() => setEditingOppHeroId(match.id)}
                              >
                                + vs hero
                              </span>
                            ) : null}
                          </div>
                        );
                      })()}
                    </td>
                    {showHeroColumn && (
                      <td className="px-4 py-2.5 hidden sm:table-cell">
                        {matchHeroInfo ? (
                          <div className="flex items-center gap-1">
                            <HeroImg name={matchHero!} size="sm" />
                            <span className="text-xs text-fab-muted">{matchHero}</span>
                          </div>
                        ) : (
                          <span className="text-fab-dim text-xs">—</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-2.5 hidden sm:table-cell" onClick={(e) => { if (editable && onUpdateMatch) e.stopPropagation(); }}>
                      {editingOppHeroId === match.id ? (
                        <div className="w-40">
                          <HeroSelect
                            value={match.opponentHero || ""}
                            onChange={async (hero) => {
                              setEditingOppHeroId(null);
                              if (!onUpdateMatch) return;
                              setSavingOppHeroId(match.id);
                              try {
                                await onUpdateMatch(match.id, { opponentHero: hero || undefined });
                              } catch { /* ignore */ }
                              setSavingOppHeroId(null);
                            }}
                            label="Opponent hero"
                            format={match.format}
                            allowClear
                          />
                        </div>
                      ) : (() => {
                        const oppHero = match.opponentHero && match.opponentHero !== "Unknown" ? match.opponentHero : null;
                        const oppHeroInfo = oppHero ? getHeroByName(oppHero) : null;
                        const isEditable = editable && onUpdateMatch;
                        return (
                          <div
                            className={`flex items-center gap-1 ${isEditable ? "cursor-pointer group" : ""}`}
                            onClick={isEditable ? () => setEditingOppHeroId(match.id) : undefined}
                          >
                            {savingOppHeroId === match.id ? (
                              <span className="text-fab-dim text-xs">Saving...</span>
                            ) : oppHeroInfo ? (
                              <>
                                <HeroImg name={oppHero!} size="sm" />
                                <span className="text-xs text-fab-muted">{oppHero}</span>
                                {isEditable && (
                                  <svg className="w-3 h-3 text-fab-dim opacity-0 group-hover:opacity-100 transition-opacity ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                )}
                              </>
                            ) : isEditable ? (
                              <span className="text-fab-dim text-xs group-hover:text-fab-muted transition-colors">+ add</span>
                            ) : (
                              <span className="text-fab-dim text-xs">—</span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className={`px-4 py-2.5 text-right font-bold ${resultColors[match.result]}`}>
                      <div className="inline-flex items-center gap-1.5">
                        {match.editedAt && (
                          <span
                            className="text-fab-dim/60"
                            title={`Edited ${new Date(match.editedAt).toLocaleString()}`}
                            aria-label="This match was edited"
                          >
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </span>
                        )}
                        <span>{resultLabels[match.result]}</span>
                        {editable && onDeleteMatch && (
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              const desc = match.opponentName ? `your ${match.result} vs ${match.opponentName}` : `this ${match.result}`;
                              if (!confirm(`Delete ${desc}? This can't be undone.`)) return;
                              try {
                                await onDeleteMatch(match.id);
                              } catch {
                                toast.error("Failed to delete match.");
                              }
                            }}
                            className="text-fab-dim/50 hover:text-fab-loss transition-colors ml-0.5"
                            title="Delete this match"
                            aria-label="Delete this match"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr></Fragment>
                );
              })}
            </tbody>
          </table>

          {/* Bracket view */}
          {showBracket && bestPlayoff && (
            <div className="px-4 py-3 border-t border-fab-border/50 bg-fab-bg/30">
              <h4 className="text-xs font-bold text-fab-text mb-2">Playoff Bracket</h4>
              <BracketView matches={event.matches} playerName={playerName} hideOpponentNames={obfuscateOpponents} />
            </div>
          )}

          {/* Edit event type */}
          {editable && onBatchUpdateEventType && (
            <div className="px-4 py-3 border-t border-fab-border/50">
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-fab-muted whitespace-nowrap">Event Type</label>
                <select
                  value={event.matches[0]?.eventTypeOverride || getOriginalEventType(event.matches[0])}
                  onChange={async (e) => {
                    const newType = e.target.value;
                    setSavingEventType(true);
                    try {
                      const matchIds = event.matches.map((m) => m.id);
                      const originalType = getOriginalEventType(event.matches[0]);
                      await onBatchUpdateEventType(matchIds, newType === originalType ? "" : newType);
                    } catch {
                      toast.error("Failed to update event type.");
                    }
                    setSavingEventType(false);
                  }}
                  disabled={savingEventType}
                  className="flex-1 bg-fab-surface border border-fab-border rounded-md px-2 py-1.5 text-fab-text text-xs outline-none focus:border-fab-gold/50 disabled:opacity-50"
                >
                  {(() => {
                    const originalType = getOriginalEventType(event.matches[0]);
                    const allowed = getAllowedEventTypes(originalType);
                    return (
                      <>
                        <option value={originalType}>Auto ({originalType})</option>
                        {allowed.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </>
                    );
                  })()}
                </select>
                {savingEventType && <span className="text-xs text-fab-dim">Saving...</span>}
              </div>
            </div>
          )}

          {/* Edit Day 2 — mark or clear which rounds belong to day two. Available
              for every event so users can correct any tournament (the import
              heuristic only auto-detects >10-round events). */}
          {editable && onBatchUpdateDay2 && (
            <div className="px-4 py-3 border-t border-fab-border/50">
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs font-medium text-fab-muted whitespace-nowrap">Day 2 starts at round</label>
                <input
                  type="number"
                  min={2}
                  value={day2RoundInput}
                  onChange={(e) => setDay2RoundEdit(e.target.value)}
                  disabled={savingDay2}
                  className="w-16 bg-fab-surface border border-fab-border rounded-md px-2 py-1.5 text-fab-text text-xs outline-none focus:border-fab-gold/50 disabled:opacity-50"
                />
                <button
                  type="button"
                  disabled={savingDay2}
                  onClick={async () => {
                    const n = parseInt(day2RoundInput, 10);
                    if (!Number.isFinite(n) || n < 2) { toast.error("Enter a round number (2+)."); return; }
                    const day2Ids = event.matches.filter((m) => isDay2Match(m, n)).map((m) => m.id);
                    if (day2Ids.length === 0) {
                      toast.error(`No rounds at or past round ${n} in this event.`);
                      return;
                    }
                    setSavingDay2(true);
                    try {
                      const dayOneIds = event.matches.filter((m) => !isDay2Match(m, n)).map((m) => m.id);
                      await onBatchUpdateDay2(day2Ids, true);
                      if (dayOneIds.length > 0) await onBatchUpdateDay2(dayOneIds, false);
                      setDay2RoundEdit(null); // snap back to the derived value
                      toast.success(`Day 2 set — ${day2Ids.length} match${day2Ids.length === 1 ? "" : "es"} from round ${n} on.`);
                    } catch {
                      toast.error("Failed to update Day 2.");
                    }
                    setSavingDay2(false);
                  }}
                  className="px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25 disabled:opacity-50"
                >
                  {savingDay2 ? "Saving…" : "Apply"}
                </button>
                {event.matches.some((m) => m.day2) && (
                  <button
                    type="button"
                    disabled={savingDay2}
                    onClick={async () => {
                      setSavingDay2(true);
                      try {
                        await onBatchUpdateDay2(event.matches.map((m) => m.id), false);
                        setDay2RoundEdit(null);
                        toast.success("Day 2 cleared.");
                      } catch {
                        toast.error("Failed to clear Day 2.");
                      }
                      setSavingDay2(false);
                    }}
                    className="px-2.5 py-1 rounded-md text-xs font-semibold text-fab-dim hover:text-fab-loss disabled:opacity-50"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Delete event */}
          {editable && onDeleteEvent && (
            <div className="px-4 py-3 border-t border-fab-border/50 flex items-center justify-end gap-2">
              {confirmDelete ? (
                <>
                  <span className="text-xs text-red-400 mr-auto">Delete {event.matches.length} match{event.matches.length !== 1 ? "es" : ""} from this event?</span>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    disabled={deleting}
                    className="px-3 py-1.5 rounded text-xs font-medium bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      setDeleting(true);
                      try {
                        await onDeleteEvent(event.matches.map((m) => m.id), event.eventName, event.eventDate);
                      } catch {
                        setError("Failed to delete event. Please try again.");
                      }
                      setDeleting(false);
                      setConfirmDelete(false);
                    }}
                    disabled={deleting}
                    className="px-3 py-1.5 rounded text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:opacity-50 transition-colors"
                  >
                    {deleting ? "Deleting..." : "Confirm Delete"}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium text-fab-dim hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete Event
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {showShareModal && playerName && (
        <EventShareModal
          event={event}
          playerName={playerName}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}
