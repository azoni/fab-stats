"use client";
import { useState } from "react";
import Link from "next/link";
import { CommentSection } from "@/components/comments/CommentSection";
import { MatchResult, type MatchRecord } from "@/types";

interface MatchCardProps {
  match: MatchRecord;
  matchOwnerUid?: string;
  enableComments?: boolean;
  obfuscateOpponents?: boolean;
  visibleOpponents?: Set<string>;
}

const resultStyles = {
  [MatchResult.Win]: { bg: "bg-fab-win/10", border: "border-fab-win/30", text: "text-fab-win", label: "WIN" },
  [MatchResult.Loss]: { bg: "bg-fab-loss/10", border: "border-fab-loss/30", text: "text-fab-loss", label: "LOSS" },
  [MatchResult.Draw]: { bg: "bg-fab-draw/10", border: "border-fab-draw/30", text: "text-fab-draw", label: "DRAW" },
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

export function MatchCard({ match, matchOwnerUid, enableComments = false, obfuscateOpponents = false, visibleOpponents }: MatchCardProps) {
  const [showComments, setShowComments] = useState(false);
  const style = resultStyles[match.result];
  const eventName = match.notes?.split(" | ")[0];
  const roundInfo = match.notes?.split(" | ")[1];
  const playoffBadge = getPlayoffBadge(roundInfo);
  const commentCount = match.commentCount || 0;

  const roundBadge = playoffBadge ? (
    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${playoffBadge.bg} ${playoffBadge.text}`}>
      {playoffBadge.label}
    </span>
  ) : roundInfo ? (
    <span className="text-xs text-fab-dim">({roundInfo})</span>
  ) : null;

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
