"use client";
import { useState, useEffect } from "react";
import type { ShadowStrikeGameState } from "@/lib/shadowstrike/types";
import type { DailyPuzzle } from "@/lib/shadowstrike/puzzle-generator";
import { CARD_BANK, type ShadowStrikeCard } from "@/lib/shadowstrike/card-bank";
import { TOTAL_PAIRS, HINT_FAIL_THRESHOLD } from "@/lib/shadowstrike/puzzle-generator";
import { getHeroByName, getHeroPortraitUrl } from "@/lib/heroes";
import { allCards } from "@/lib/cards";

// Real FaB art for the tiles. Heroes → portrait art; other cards → art only on an
// EXACT name match (so we never show the wrong card); anything unresolved keeps its
// emoji. Built once at module load.
const cardArtByName = new Map<string, string>();
for (const c of allCards) {
  const k = c.name.toLowerCase();
  if (c.imageUrl && !cardArtByName.has(k)) cardArtByName.set(k, c.imageUrl);
}
function artFor(card: ShadowStrikeCard): { url?: string; portrait: boolean } {
  if (card.category === "hero") {
    return { url: getHeroPortraitUrl(card.label) || getHeroByName(card.label)?.imageUrl || undefined, portrait: true };
  }
  return { url: cardArtByName.get(card.label.toLowerCase()), portrait: false };
}

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
          const isPairMatched = gameState.matchedCardIds.includes(cardId);
          const isFaceUp = isRevealed || isPairMatched;
          const art = card ? artFor(card) : { url: undefined, portrait: false };

          return (
            <button
              key={pos}
              onClick={() => onFlip(pos)}
              disabled={isFaceUp || gameState.completed}
              aria-label={isFaceUp && card ? card.label : "Hidden card"}
              className={`relative aspect-square overflow-hidden rounded-lg border-2 transition-colors ${
                isPairMatched
                  ? "border-fab-win/70 opacity-80 game-match-pop"
                  : isRevealed
                    ? "border-indigo-400/60"
                    : "border-fab-border cursor-pointer transition-transform hover:border-indigo-400/40 active:scale-95"
              }`}
            >
              {isFaceUp && card ? (
                /* Face-up — real FaB art (emoji base as fallback), flips in on reveal */
                <div className="game-flip-in absolute inset-0 bg-indigo-950/70">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl leading-none">{card.emoji}</span>
                  </div>
                  {art.url && (
                    <img
                      src={art.url}
                      alt={card.label}
                      className="absolute inset-0 h-full w-full object-cover"
                      style={{ objectPosition: art.portrait ? "center top" : "center 20%" }}
                      loading="lazy"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                  )}
                  <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/85 to-transparent px-1 pb-0.5 pt-2 text-center text-[8px] font-semibold leading-tight text-white">
                    {card.label}
                  </span>
                  {isPairMatched && (
                    <span className="absolute right-0.5 top-0.5 rounded-full bg-fab-win/90 p-0.5">
                      <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 text-black" fill="none" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </span>
                  )}
                </div>
              ) : (
                /* Face-down — a stylized shuriken sigil */
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-800/40 via-indigo-900/40 to-indigo-950/70">
                  <svg viewBox="0 0 24 24" className="w-7 h-7 text-indigo-300/40" fill="currentColor">
                    <circle cx="12" cy="12" r="2" />
                    <path d="M12 2c0 4-2 6.5-2 8.5L12 12l2-1.5C14 8.5 12 6 12 2z" />
                    <path d="M22 12c-4 0-6.5 2-8.5 2L12 12l1.5-2C15.5 10 18 12 22 12z" />
                    <path d="M12 22c0-4 2-6.5 2-8.5L12 12l-2 1.5C10 15.5 12 18 12 22z" />
                    <path d="M2 12c4 0 6.5-2 8.5-2L12 12l-1.5 2C8.5 14 6 12 2 12z" />
                  </svg>
                </div>
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
