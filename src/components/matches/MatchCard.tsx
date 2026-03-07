"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { HeroSelect } from "@/components/heroes/HeroSelect";
import { getHeroByName } from "@/lib/heroes";
import { HeroAvatar } from "@/components/heroes/HeroAvatar";
import { MatchResult, type MatchRecord } from "@/types";
import { localDate } from "@/lib/constants";
import { lookupGemId, sendHeroCorrectionNotification, getMatchesByUserId } from "@/lib/firestore-storage";

interface MatchCardProps {
  match: MatchRecord;
  matchOwnerUid?: string;
  enableComments?: boolean;
  obfuscateOpponents?: boolean;
  visibleOpponents?: Set<string>;
  editable?: boolean;
  onUpdateMatch?: (id: string, updates: Partial<Omit<MatchRecord, "id" | "createdAt">>) => Promise<void>;
  missingGemId?: boolean;
}

const resultStyles: Record<string, { bg: string; border: string; text: string; label: string; pill: string }> = {
  [MatchResult.Win]:  { bg: "bg-fab-win/[0.03]",  border: "border-l-fab-win",  text: "text-fab-win",  label: "WIN",  pill: "bg-fab-win/15 text-fab-win" },
  [MatchResult.Loss]: { bg: "bg-fab-loss/[0.03]", border: "border-l-fab-loss", text: "text-fab-loss", label: "LOSS", pill: "bg-fab-loss/15 text-fab-loss" },
  [MatchResult.Draw]: { bg: "bg-fab-draw/[0.03]", border: "border-l-fab-draw", text: "text-fab-draw", label: "DRAW", pill: "bg-fab-draw/15 text-fab-draw" },
  [MatchResult.Bye]:  { bg: "bg-fab-muted/[0.02]", border: "border-l-fab-dim",  text: "text-fab-dim",  label: "BYE",  pill: "bg-fab-muted/10 text-fab-dim" },
};

const playoffBadgeStyles: Record<string, { bg: string; text: string }> = {
  "Finals": { bg: "bg-yellow-500/20", text: "text-yellow-400" },
  "Top 4": { bg: "bg-amber-500/15", text: "text-amber-400" },
  "Top 8": { bg: "bg-orange-500/15", text: "text-orange-400" },
  "Playoff": { bg: "bg-fab-gold/10", text: "text-fab-gold" },
  "Skirmish": { bg: "bg-blue-500/15", text: "text-blue-400" },
};

function getPlayoffBadge(roundInfo: string | undefined): { label: string; bg: string; text: string } | null {
  if (!roundInfo) return null;
  for (const [label, style] of Object.entries(playoffBadgeStyles)) {
    if (roundInfo === label) return { label, ...style };
  }
  return null;
}

export function MatchCard({ match, matchOwnerUid, enableComments = false, obfuscateOpponents = false, visibleOpponents, editable = false, onUpdateMatch, missingGemId }: MatchCardProps) {
  const { user, profile } = useAuth();
  const [showNotes, setShowNotes] = useState(false);
  const [noteText, setNoteText] = useState(match.matchNotes || "");
  const [savingNote, setSavingNote] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const [editing, setEditing] = useState(false);
  const [editHero, setEditHero] = useState(match.heroPlayed || "");
  const [editOppHero, setEditOppHero] = useState(match.opponentHero || "");
  const [saving, setSaving] = useState(false);
  const [showGemNudge, setShowGemNudge] = useState(false);
  const [suggestingHero, setSuggestingHero] = useState(false);
  const [suggestedHeroValue, setSuggestedHeroValue] = useState("");
  const [sendingCorrection, setSendingCorrection] = useState(false);
  const [correctionSent, setCorrectionSent] = useState(false);

  const canSuggestCorrection = !!(match.opponentGemId && user && matchOwnerUid === user.uid);

  const style = resultStyles[match.result] || resultStyles[MatchResult.Bye];
  const eventName = match.notes?.split(" | ")[0];
  const roundInfo = match.notes?.split(" | ")[1];
  const playoffBadge = getPlayoffBadge(roundInfo);

  const hasHero = match.heroPlayed && match.heroPlayed !== "Unknown";
  const hasOppHero = match.opponentHero && match.opponentHero !== "Unknown";
  const heroInfo = hasHero ? getHeroByName(match.heroPlayed!) : null;
  const oppHeroInfo = hasOppHero ? getHeroByName(match.opponentHero!) : null;

  const dateStr = localDate(match.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const roundBadge = playoffBadge ? (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${playoffBadge.bg} ${playoffBadge.text} shrink-0`}>
      {playoffBadge.label}
    </span>
  ) : roundInfo ? (
    <span className="text-[10px] text-fab-dim shrink-0">({roundInfo})</span>
  ) : null;

  async function handleSaveHeroes() {
    if (!onUpdateMatch) return;
    setSaving(true);
    try {
      const updates: Partial<MatchRecord> = {};
      if (editHero !== (match.heroPlayed || "")) updates.heroPlayed = editHero || "Unknown";
      if (editOppHero !== (match.opponentHero || "")) updates.opponentHero = editOppHero || undefined;
      if (Object.keys(updates).length > 0) {
        await onUpdateMatch(match.id, updates);
        if (missingGemId) setShowGemNudge(true);
      }
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function startEditing() {
    setEditHero(match.heroPlayed || "");
    setEditOppHero(match.opponentHero || "");
    setEditing(true);
  }

  async function handleSendCorrection() {
    if (!user || !profile || !match.opponentGemId || !suggestedHeroValue) return;
    setSendingCorrection(true);
    try {
      const opponentUserId = await lookupGemId(match.opponentGemId);
      if (!opponentUserId) return;

      // Find the linked match on opponent's side
      const oppMatches = await getMatchesByUserId(opponentUserId);
      const myEvent = match.notes?.split(" | ")[0]?.toLowerCase() || "";
      const myRound = match.notes?.split(" | ")[1]?.toLowerCase() || "";
      const myKey = `${match.date}|${myEvent}|${myRound}`;
      const oppositeResult: Record<string, string> = {
        [MatchResult.Win]: MatchResult.Loss,
        [MatchResult.Loss]: MatchResult.Win,
        [MatchResult.Draw]: MatchResult.Draw,
      };
      const linked = oppMatches.find((om) => {
        const omEvent = om.notes?.split(" | ")[0]?.toLowerCase() || "";
        const omRound = om.notes?.split(" | ")[1]?.toLowerCase() || "";
        return `${om.date}|${omEvent}|${omRound}` === myKey && om.result === oppositeResult[match.result];
      });
      if (!linked) return;

      const summary = [eventName, roundInfo, dateStr].filter(Boolean).join(", ");
      await sendHeroCorrectionNotification(
        opponentUserId,
        user.uid,
        profile.displayName || "A player",
        linked.id,
        suggestedHeroValue,
        summary,
      );
      setCorrectionSent(true);
      setSuggestingHero(false);
      setSuggestedHeroValue("");
    } finally {
      setSendingCorrection(false);
    }
  }

  return (
    <div className={`rounded-lg border border-fab-border/20 border-l-[3px] ${style.border} ${style.bg}`}>
      <div className="px-3 py-2.5">
        {/* Row 1: Result pill + Opponent + Playoff badge + Hero icons (desktop) */}
        <div className="flex items-center gap-2">
          {/* Result pill */}
          <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${style.pill}`}>
            {style.label}
          </span>

          {/* Opponent */}
          <div className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
            {match.opponentName ? (
              <>
                <span className="text-fab-dim text-xs">vs</span>
                {obfuscateOpponents && !(visibleOpponents?.has(match.opponentName!)) ? (
                  <span className="font-semibold text-fab-dim text-sm">Opponent</span>
                ) : (
                  <Link
                    href={`/search?q=${encodeURIComponent(match.opponentName)}`}
                    className="font-semibold text-fab-text text-sm hover:text-fab-gold transition-colors truncate"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {match.opponentName}
                  </Link>
                )}
              </>
            ) : (
              <span className="text-fab-dim text-sm">Match</span>
            )}
            {roundBadge}
          </div>

          {/* Hero matchup — desktop */}
          {(hasHero || hasOppHero) && !editing && (
            <div className="hidden sm:flex items-center gap-1.5 shrink-0">
              {hasHero && heroInfo && (
                <HeroAvatar heroName={match.heroPlayed!} heroClass={heroInfo.classes[0]} size="sm" />
              )}
              {hasHero && hasOppHero && (
                <span className="text-[10px] text-fab-dim">vs</span>
              )}
              {hasOppHero && oppHeroInfo && (
                <HeroAvatar heroName={match.opponentHero!} heroClass={oppHeroInfo.classes[0]} size="sm" />
              )}
              {editable && onUpdateMatch && (
                <button onClick={startEditing} className="ml-0.5 text-fab-dim hover:text-fab-gold transition-colors" title="Edit heroes">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Row 2 (mobile only): Hero matchup with names */}
        {(hasHero || hasOppHero) && !editing && (
          <div className="flex sm:hidden items-center gap-1.5 mt-1">
            {hasHero && heroInfo && (
              <HeroAvatar heroName={match.heroPlayed!} heroClass={heroInfo.classes[0]} size="sm" />
            )}
            {hasHero && hasOppHero && (
              <span className="text-xs text-fab-dim">vs</span>
            )}
            {hasOppHero && oppHeroInfo && (
              <HeroAvatar heroName={match.opponentHero!} heroClass={oppHeroInfo.classes[0]} size="sm" />
            )}
            {editable && onUpdateMatch && (
              <button onClick={startEditing} className="ml-1 text-fab-dim hover:text-fab-gold transition-colors" title="Edit heroes">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* No hero set — edit prompt */}
        {!hasHero && !hasOppHero && !editing && editable && onUpdateMatch && (
          <button onClick={startEditing} className="flex items-center gap-1 mt-1 text-xs text-fab-dim hover:text-fab-gold transition-colors">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Set hero
          </button>
        )}

        {showGemNudge && !editing && (
          <p className="text-xs text-fab-muted mt-1">
            Hero saved! <Link href="/settings" className="text-fab-gold hover:underline">Add your GEM ID in Settings</Link> to share hero data with opponents automatically.
          </p>
        )}

        {/* Suggest hero correction for linked opponent */}
        {canSuggestCorrection && !editing && !suggestingHero && !correctionSent && (
          <button onClick={() => setSuggestingHero(true)} className="flex items-center gap-1 mt-1 text-xs text-fab-dim hover:text-fab-gold transition-colors">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            Suggest hero correction
          </button>
        )}
        {correctionSent && (
          <p className="text-xs text-fab-win mt-1">Correction suggestion sent to {match.opponentName || "opponent"}!</p>
        )}

        {/* Meta row: event, venue, date, format */}
        <div className="flex items-center gap-2 mt-1.5 text-xs flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-0 text-fab-muted">
            {eventName && <span className="truncate">{eventName}</span>}
            {match.venue && match.venue !== "Unknown" && (
              <span className="text-fab-dim truncate">{match.venue}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-fab-dim">{dateStr}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded border border-fab-border/50 text-fab-dim">{match.format}</span>
          </div>
        </div>

        {/* Notes toggle + inline preview */}
        {matchOwnerUid && (
          <div className="mt-1.5">
            {match.matchNotes && !showNotes && (
              <button
                onClick={() => setShowNotes(true)}
                className="text-xs text-fab-muted italic truncate max-w-full text-left hover:text-fab-text transition-colors"
              >
                {match.matchNotes.length > 80 ? match.matchNotes.slice(0, 80) + "..." : match.matchNotes}
              </button>
            )}
            {!match.matchNotes && !showNotes && onUpdateMatch && (
              <button
                onClick={() => setShowNotes(true)}
                className="flex items-center gap-1 text-xs text-fab-dim hover:text-fab-gold transition-colors"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Add note
              </button>
            )}
          </div>
        )}
      </div>

      {/* Inline hero edit */}
      {editing && (
        <div className="px-3 pb-3 pt-2 border-t border-fab-border/30 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <HeroSelect value={editHero} onChange={setEditHero} label="Your Hero" format={match.format} />
            <HeroSelect value={editOppHero} onChange={setEditOppHero} label="Opponent's Hero" format={match.format} />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveHeroes}
              disabled={saving}
              className="px-3 py-1 rounded text-xs font-medium bg-fab-gold text-fab-bg hover:bg-fab-gold-light disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => setEditing(false)}
              disabled={saving}
              className="px-3 py-1 rounded text-xs font-medium text-fab-muted hover:text-fab-text transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Inline hero correction suggestion */}
      {suggestingHero && (
        <div className="px-3 pb-3 pt-2 border-t border-fab-border/30 space-y-2">
          <p className="text-xs text-fab-muted">
            What hero did <span className="text-fab-text font-medium">{match.opponentName || "your opponent"}</span> play?
          </p>
          <HeroSelect value={suggestedHeroValue} onChange={setSuggestedHeroValue} label="Suggested hero" format={match.format} />
          <div className="flex items-center gap-2">
            <button
              onClick={handleSendCorrection}
              disabled={sendingCorrection || !suggestedHeroValue}
              className="px-3 py-1 rounded text-xs font-medium bg-fab-gold text-fab-bg hover:bg-fab-gold-light disabled:opacity-50 transition-colors"
            >
              {sendingCorrection ? "Sending..." : "Send suggestion"}
            </button>
            <button
              onClick={() => { setSuggestingHero(false); setSuggestedHeroValue(""); }}
              disabled={sendingCorrection}
              className="px-3 py-1 rounded text-xs font-medium text-fab-muted hover:text-fab-text transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Notes editor */}
      {showNotes && matchOwnerUid && (
        <div className="px-3 pb-3 pt-1 border-t border-fab-border/20">
          {onUpdateMatch ? (
            <div className="space-y-1.5">
              <textarea
                ref={noteRef}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add a note about this match..."
                rows={2}
                maxLength={2000}
                className="w-full bg-fab-bg border border-fab-border rounded-md px-2.5 py-1.5 text-xs text-fab-text placeholder:text-fab-dim focus:outline-none focus:border-fab-gold resize-none"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    const trimmed = noteText.trim();
                    if (trimmed === (match.matchNotes || "")) { setShowNotes(false); return; }
                    setSavingNote(true);
                    await onUpdateMatch(match.id, { matchNotes: trimmed || undefined });
                    setSavingNote(false);
                    setShowNotes(false);
                  }}
                  disabled={savingNote}
                  className="px-2.5 py-1 rounded text-[11px] font-medium bg-fab-gold text-fab-bg hover:bg-fab-gold-light disabled:opacity-50 transition-colors"
                >
                  {savingNote ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => { setNoteText(match.matchNotes || ""); setShowNotes(false); }}
                  disabled={savingNote}
                  className="px-2.5 py-1 rounded text-[11px] font-medium text-fab-muted hover:text-fab-text transition-colors"
                >
                  Cancel
                </button>
                {match.matchNotes && (
                  <button
                    onClick={async () => {
                      setSavingNote(true);
                      await onUpdateMatch(match.id, { matchNotes: undefined });
                      setNoteText("");
                      setSavingNote(false);
                      setShowNotes(false);
                    }}
                    disabled={savingNote}
                    className="ml-auto px-2.5 py-1 rounded text-[11px] font-medium text-fab-loss/70 hover:text-fab-loss transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-xs text-fab-muted italic">
              {match.matchNotes || "No notes"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
