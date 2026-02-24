"use client";
import { MatchResult, type MatchRecord } from "@/types";

interface MatchCardProps {
  match: MatchRecord;
  onDelete?: (id: string) => void;
}

const resultStyles = {
  [MatchResult.Win]: { bg: "bg-fab-win/10", border: "border-fab-win/30", text: "text-fab-win", label: "WIN" },
  [MatchResult.Loss]: { bg: "bg-fab-loss/10", border: "border-fab-loss/30", text: "text-fab-loss", label: "LOSS" },
  [MatchResult.Draw]: { bg: "bg-fab-draw/10", border: "border-fab-draw/30", text: "text-fab-draw", label: "DRAW" },
};

export function MatchCard({ match, onDelete }: MatchCardProps) {
  const style = resultStyles[match.result];
  const hasRealHeroes = match.heroPlayed !== "Unknown" || match.opponentHero !== "Unknown";
  const eventName = match.notes?.split(" | ")[0];
  const roundInfo = match.notes?.split(" | ")[1];

  return (
    <div className={`${style.bg} border ${style.border} rounded-lg p-4`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          {hasRealHeroes ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-fab-text">{match.heroPlayed}</span>
              <span className="text-fab-dim">vs</span>
              <span className="font-semibold text-fab-text">{match.opponentHero}</span>
            </div>
          ) : match.opponentName ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-fab-dim">vs</span>
              <span className="font-semibold text-fab-text">{match.opponentName}</span>
              {roundInfo && <span className="text-xs text-fab-dim">({roundInfo})</span>}
            </div>
          ) : (
            <span className="text-fab-dim text-sm">Match</span>
          )}
          <div className="flex items-center gap-3 mt-1 text-xs text-fab-muted flex-wrap">
            <span>{new Date(match.date).toLocaleDateString()}</span>
            <span className="px-2 py-0.5 rounded bg-fab-surface text-fab-muted">
              {match.format}
            </span>
            {hasRealHeroes && match.opponentName && (
              <span>vs {match.opponentName}</span>
            )}
            {eventName && (
              <span className="truncate">{eventName}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-bold ${style.text}`}>
            {style.label}
          </span>
          {onDelete && (
            <button
              onClick={() => onDelete(match.id)}
              className="text-fab-dim hover:text-fab-loss text-xs transition-colors"
              title="Delete match"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
