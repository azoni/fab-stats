"use client";
import { useState, useEffect } from "react";
import type { ShadowStrikeGameState } from "@/lib/shadowstrike/types";
import type { DailyPuzzle } from "@/lib/shadowstrike/puzzle-generator";
import { CARD_BANK } from "@/lib/shadowstrike/card-bank";
import { TOTAL_PAIRS, HINT_FAIL_THRESHOLD } from "@/lib/shadowstrike/puzzle-generator";

function formatTime(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Isolated timer component — only this re-renders every 100ms, not the entire board. */
function GameTimer({ elapsedMs, startedAt, completed }: {
  elapsedMs: number; startedAt: number | null; completed: boolean;
}) {
  const [displayTime, setDisplayTime] = useState(elapsedMs);
  useEffect(() => {
    if (completed) { setDisplayTime(elapsedMs); return; }
    if (!startedAt) { setDisplayTime(elapsedMs); return; }
    const id = setInterval(() => setDisplayTime(elapsedMs + (Date.now() - startedAt)), 100);
    return () => clearInterval(id);
  }, [startedAt, elapsedMs, completed]);
  return <span className="font-mono text-fab-text">{formatTime(displayTime)}</span>;
}

const cardMap = new Map(CARD_BANK.map((c) => [c.id, c]));

export function ShadowStrikeBoard({
  puzzle,
  gameState,
  onFlip,
  onHint,
}: {
  puzzle: DailyPuzzle;
  gameState: ShadowStrikeGameState;
  onFlip: (position: number) => void;
  onHint: () => void;
}) {

  return (
    <div>
      {/* Stats bar */}
      <div className="flex items-center justify-between mb-3 text-xs text-fab-muted">
        <span>Flips: <span className="font-bold text-fab-text">{gameState.flips}</span></span>
        <GameTimer elapsedMs={gameState.elapsedMs} startedAt={gameState.startedAt} completed={gameState.completed} />
        <span>Pairs: <span className="font-bold text-fab-text">{gameState.matchedCardIds.length}/{TOTAL_PAIRS}</span></span>
      </div>

      {/* 4x4 Grid */}
      <div className="grid grid-cols-4 gap-2">
        {puzzle.grid.map((cardId, pos) => {
          const card = cardMap.get(cardId);
          const isRevealed = gameState.revealedPositions.includes(pos);
          const isMatched = gameState.matchedCardIds.includes(cardId) && !isRevealed;
          // Count how many of this cardId are matched — need both positions matched
          const matchedPositions = puzzle.grid
            .map((id, i) => ({ id, i }))
            .filter((x) => x.id === cardId && gameState.matchedCardIds.includes(x.id));
          const isPairMatched = gameState.matchedCardIds.includes(cardId);
          const isFaceUp = isRevealed || isPairMatched;

          return (
            <button
              key={pos}
              onClick={() => onFlip(pos)}
              disabled={isFaceUp || gameState.completed}
              className={`aspect-square rounded-lg border-2 transition-all duration-200 flex flex-col items-center justify-center gap-0.5 ${
                isPairMatched
                  ? "border-fab-win/50 bg-fab-win/10 opacity-70"
                  : isRevealed
                    ? "border-indigo-400/50 bg-indigo-900/30"
                    : "border-fab-border bg-indigo-900/20 hover:border-indigo-400/30 hover:bg-indigo-900/30 cursor-pointer"
              }`}
            >
              {isFaceUp && card ? (
                <>
                  <span className="text-2xl leading-none">{card.emoji}</span>
                  <span className="text-[8px] text-fab-muted leading-tight text-center px-1 truncate w-full">{card.label}</span>
                </>
              ) : (
                /* Shuriken icon for face-down */
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-indigo-400/40" fill="currentColor">
                  <circle cx="12" cy="12" r="2" />
                  <path d="M12 2c0 4-2 6.5-2 8.5L12 12l2-1.5C14 8.5 12 6 12 2z" />
                  <path d="M22 12c-4 0-6.5 2-8.5 2L12 12l1.5-2C15.5 10 18 12 22 12z" />
                  <path d="M12 22c0-4 2-6.5 2-8.5L12 12l-2 1.5C10 15.5 12 18 12 22z" />
                  <path d="M2 12c4 0 6.5-2 8.5-2L12 12l-1.5 2C8.5 14 6 12 2 12z" />
                </svg>
              )}
            </button>
          );
        })}
      </div>

      {/* Hint button */}
      {!gameState.completed && (
        <div className="flex items-center justify-between mt-3">
          <span className={`text-xs ${gameState.hintsUsed >= HINT_FAIL_THRESHOLD ? "text-red-400" : "text-fab-muted"}`}>
            Hints: {gameState.hintsUsed}{gameState.hintsUsed >= HINT_FAIL_THRESHOLD && " (fail)"}
          </span>
          <button
            onClick={onHint}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              gameState.hintsUsed >= HINT_FAIL_THRESHOLD
                ? "bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-800/40"
                : "bg-indigo-900/30 text-indigo-300 hover:bg-indigo-900/50 border border-indigo-700/40"
            }`}
          >
            Hint ({gameState.hintsUsed})
          </button>
        </div>
      )}
    </div>
  );
}
