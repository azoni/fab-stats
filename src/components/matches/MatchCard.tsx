"use client";
import { useState } from "react";
import Link from "next/link";
import { CommentSection } from "@/components/comments/CommentSection";
import { HeroSelect } from "@/components/heroes/HeroSelect";
import { getHeroByName } from "@/lib/heroes";
import { HeroClassIcon } from "@/components/heroes/HeroClassIcon";
import { MatchResult, type MatchRecord } from "@/types";

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

const resultStyles: Record<string, { bg: string; border: string; text: string; label: string }> = {
  [MatchResult.Win]: { bg: "bg-fab-win/10", border: "border-fab-win/30", text: "text-fab-win", label: "WIN" },
  [MatchResult.Loss]: { bg: "bg-fab-loss/10", border: "border-fab-loss/30", text: "text-fab-loss", label: "LOSS" },
  [MatchResult.Draw]: { bg: "bg-fab-draw/10", border: "border-fab-draw/30", text: "text-fab-draw", label: "DRAW" },
  [MatchResult.Bye]: { bg: "bg-fab-muted/10", border: "border-fab-muted/30", text: "text-fab-dim", label: "BYE" },
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
  const [showComments, setShowComments] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editHero, setEditHero] = useState(match.heroPlayed || "");
  const [editOppHero, setEditOppHero] = useState(match.opponentHero || "");
  const [saving, setSaving] = useState(false);
  const [showGemNudge, setShowGemNudge] = useState(false);

  const style = resultStyles[match.result];
  const eventName = match.notes?.split(" | ")[0];
  const roundInfo = match.notes?.split(" | ")[1];
  const playoffBadge = getPlayoffBadge(roundInfo);
  const commentCount = match.commentCount || 0;

  const hasHero = match.heroPlayed && match.heroPlayed !== "Unknown";
  const hasOppHero = match.opponentHero && match.opponentHero !== "Unknown";
  const heroInfo = hasHero ? getHeroByName(match.heroPlayed!) : null;
  const oppHeroInfo = hasOppHero ? getHeroByName(match.opponentHero!) : null;

  const roundBadge = playoffBadge ? (
    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${playoffBadge.bg} ${playoffBadge.text}`}>
      {playoffBadge.label}
    </span>
  ) : roundInfo ? (
    <span className="text-xs text-fab-dim">({roundInfo})</span>
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

  return (
    <div className={`${style.bg} border ${style.border} rounded-lg`}>
      <div className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            {match.opponentName ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-fab-dim">vs</span>
                {obfuscateOpponents && !(visibleOpponents?.has(match.opponentName!)) ? (
                  <span className="font-semibold text-fab-dim">Opponent</span>
                ) : (
                  <Link
                    href={`/search?q=${encodeURIComponent(match.opponentName)}`}
                    className="font-semibold text-fab-text hover:text-fab-gold transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {match.opponentName}
                  </Link>
                )}
                {roundBadge}
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-fab-dim text-sm">Match</span>
                {roundBadge}
              </div>
            )}

            {/* Hero info row */}
            {(hasHero || hasOppHero) && !editing && (
              <div className="flex items-center gap-1.5 mt-1">
                {hasHero && heroInfo && (
                  <div className="flex items-center gap-1">
                    <HeroClassIcon heroClass={heroInfo.classes[0]} size="sm" />
                    <span className="text-xs text-fab-muted">{match.heroPlayed}</span>
                  </div>
                )}
                {hasHero && hasOppHero && (
                  <span className="text-xs text-fab-dim">vs</span>
                )}
                {hasOppHero && oppHeroInfo && (
                  <div className="flex items-center gap-1">
                    <HeroClassIcon heroClass={oppHeroInfo.classes[0]} size="sm" />
                    <span className="text-xs text-fab-muted">{match.opponentHero}</span>
                  </div>
                )}
                {editable && onUpdateMatch && (
                  <button
                    onClick={() => {
                      setEditHero(match.heroPlayed || "");
                      setEditOppHero(match.opponentHero || "");
                      setEditing(true);
                    }}
                    className="ml-1 text-fab-dim hover:text-fab-gold transition-colors"
                    title="Edit heroes"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {/* Editable: show edit button when no hero set */}
            {!hasHero && !hasOppHero && !editing && editable && onUpdateMatch && (
              <button
                onClick={() => {
                  setEditHero("");
                  setEditOppHero("");
                  setEditing(true);
                }}
                className="flex items-center gap-1 mt-1 text-xs text-fab-dim hover:text-fab-gold transition-colors"
              >
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

            <div className="flex items-center gap-3 mt-1 text-xs text-fab-muted flex-wrap">
              <span>{new Date(match.date).toLocaleDateString()}</span>
              <span className="px-2 py-0.5 rounded bg-fab-surface text-fab-muted">
                {match.format}
              </span>
              {eventName && (
                <span className="truncate">{eventName}</span>
              )}
              {match.venue && match.venue !== "Unknown" && (
                <span className="text-fab-dim">{match.venue}</span>
              )}
            </div>
          </div>
          <span className={`text-sm font-bold ${style.text}`}>
            {style.label}
          </span>
        </div>

        {/* Inline hero edit */}
        {editing && (
          <div className="mt-3 pt-3 border-t border-fab-border/30 space-y-2">
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

        {/* Comment toggle */}
        {enableComments && matchOwnerUid && (
          <div className="flex items-center mt-2 pt-2 border-t border-fab-border/30">
            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-1.5 text-xs text-fab-dim hover:text-fab-gold transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {commentCount > 0 ? (
                <span>{commentCount} comment{commentCount !== 1 ? "s" : ""}</span>
              ) : (
                <span>Comment</span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Comment section */}
      {showComments && enableComments && matchOwnerUid && (
        <div className="px-4 pb-4">
          <CommentSection match={match} matchOwnerUid={matchOwnerUid} />
        </div>
      )}
    </div>
  );
}
