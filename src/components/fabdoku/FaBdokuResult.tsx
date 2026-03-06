"use client";

import { useRef, useState, useEffect } from "react";
import { copyCardImage } from "@/lib/share-image";
import type { GameState, FaBdokuStats, UniquenessData } from "@/lib/fabdoku/types";

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-2.77.704 6.023 6.023 0 01-2.77-.704" />
    </svg>
  );
}

function FlameIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
    </svg>
  );
}

function XCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
    </svg>
  );
}

interface FaBdokuResultProps {
  gameState: GameState;
  stats: FaBdokuStats | null;
  uniqueness: UniquenessData | null;
  onShared?: () => void;
}

export function FaBdokuResult({ gameState, stats, uniqueness, onShared }: FaBdokuResultProps) {
  const [shareStatus, setShareStatus] = useState<"idle" | "sharing" | "shared">("idle");
  const [countdown, setCountdown] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);

  const correctCount = gameState.cells.flat().filter((c) => c.correct).length;
  const totalCells = 9;

  // Countdown to next puzzle (UTC midnight, matching puzzle reset)
  useEffect(() => {
    function updateCountdown() {
      const now = new Date();
      const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
      const diff = tomorrow.getTime() - now.getTime();

      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      );
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  function generateShareText() {
    const grid = gameState.cells
      .map((row) =>
        row.map((c) => (c.correct ? "\u{1F7E9}" : c.locked ? "\u{1F7E5}" : "\u2B1C")).join("")
      )
      .join("\n");

    const timeStr = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    const uniquenessLine = uniqueness
      ? `\nScore: ${uniqueness.score} (${uniqueness.totalPlayers} player${uniqueness.totalPlayers !== 1 ? "s" : ""} as of ${timeStr})`
      : "";
    return `FaBdoku ${gameState.date}\n${correctCount}/${totalCells}${uniquenessLine}\n\n${grid}\n\nfabstats.net/fabdoku`;
  }

  async function handleShare() {
    setShareStatus("sharing");
    const uniqueLine = uniqueness ? ` \u00B7 Score: ${uniqueness.score} (${uniqueness.totalPlayers} players)` : "";
    const result = await copyCardImage(cardRef.current, {
      backgroundColor: "#0e0c08",
      fileName: `fabdoku-${gameState.date}.png`,
      shareTitle: `FaBdoku ${gameState.date}`,
      shareText: `FaBdoku ${gameState.date} \u2014 ${correctCount}/9${uniqueLine}`,
      fallbackText: generateShareText(),
    });
    if (result !== "failed") {
      setShareStatus("shared");
      onShared?.();
      setTimeout(() => setShareStatus("idle"), 2000);
    } else {
      setShareStatus("idle");
    }
  }

  return (
    <div className="bg-fab-surface border border-fab-border rounded-xl p-5 mt-4 max-w-[400px] mx-auto">
      {/* Header */}
      <div className="text-center mb-4">
        {gameState.won ? (
          <>
            <div className="w-12 h-12 rounded-full bg-fab-gold/20 flex items-center justify-center mx-auto mb-2">
              <TrophyIcon className="w-6 h-6 text-fab-gold" />
            </div>
            <h3 className="text-lg font-bold text-fab-text">Puzzle Complete!</h3>
            <p className="text-sm text-fab-muted mt-0.5">
              {correctCount}/{totalCells} correct in{" "}
              {gameState.guessesUsed} guesses
            </p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-fab-loss/20 flex items-center justify-center mx-auto mb-2">
              <XCircleIcon className="w-6 h-6 text-fab-loss" />
            </div>
            <h3 className="text-lg font-bold text-fab-text">Out of Guesses</h3>
            <p className="text-sm text-fab-muted mt-0.5">
              {correctCount}/{totalCells} correct — better luck tomorrow!
            </p>
          </>
        )}
      </div>

      {/* Uniqueness score */}
      {uniqueness ? (
        <div className="bg-fab-bg/50 rounded-lg border border-fab-border p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-fab-dim uppercase tracking-wider">
              Uniqueness
            </p>
            <p className="text-[10px] text-fab-dim">
              {uniqueness.totalPlayers} player{uniqueness.totalPlayers !== 1 ? "s" : ""} today
            </p>
          </div>
          <div className="flex items-baseline gap-2 justify-center">
            <span className="text-2xl font-bold text-fab-gold font-mono">
              {uniqueness.score}
            </span>
            {uniqueness.bestPossible > 0 && (
              <span className="text-xs text-fab-dim">
                / {uniqueness.bestPossible} best
              </span>
            )}
          </div>
          <p className="text-[10px] text-fab-dim text-center mt-1">
            Lower is better — sum of % who picked same hero per cell
          </p>
          <p className="text-[10px] text-fab-gold/70 text-center mt-1.5">
            Live score — changes as more players complete the puzzle
          </p>
        </div>
      ) : (
        <div className="bg-fab-bg/50 rounded-lg border border-fab-border p-3 mb-4 text-center">
          <p className="text-[10px] text-fab-dim uppercase tracking-wider mb-1">
            Uniqueness
          </p>
          <p className="text-xs text-fab-muted">
            Loading scores...
          </p>
        </div>
      )}

      {/* Mini grid preview */}
      <div className="grid grid-cols-3 gap-1 w-20 mx-auto mb-4">
        {gameState.cells.flat().map((cell, i) => (
          <div
            key={i}
            className={`w-6 h-6 rounded-sm ${
              cell.correct
                ? "bg-fab-win"
                : cell.locked
                ? "bg-fab-loss"
                : "bg-fab-border"
            }`}
          />
        ))}
      </div>

      {/* Streak info */}
      {stats && (
        <div className="flex items-center justify-center gap-6 mb-4">
          <div className="text-center">
            <div className="flex items-center gap-1 justify-center">
              <FlameIcon className="w-3.5 h-3.5 text-fab-gold" />
              <span className="text-lg font-bold text-fab-text">
                {stats.currentStreak}
              </span>
            </div>
            <p className="text-[10px] text-fab-dim">Streak</p>
          </div>
          <div className="text-center">
            <span className="text-lg font-bold text-fab-text">
              {stats.maxStreak}
            </span>
            <p className="text-[10px] text-fab-dim">Best</p>
          </div>
          <div className="text-center">
            <span className="text-lg font-bold text-fab-text">
              {stats.gamesPlayed}
            </span>
            <p className="text-[10px] text-fab-dim">Played</p>
          </div>
          <div className="text-center">
            <span className="text-lg font-bold text-fab-text">
              {stats.gamesPlayed > 0
                ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
                : 0}
              %
            </span>
            <p className="text-[10px] text-fab-dim">Win %</p>
          </div>
        </div>
      )}

      {/* Share card preview */}
      <div className="flex justify-center">
        <div ref={cardRef} className="bg-[#0e0c08] rounded-lg p-5 border border-fab-border" style={{ width: '320px' }}>
          <div className="text-center mb-3">
            <h4 className="text-lg font-bold text-fab-gold">FaBdoku</h4>
            <p className="text-xs text-fab-muted">{gameState.date}</p>
          </div>
          <div className="grid grid-cols-3 gap-1.5 w-24 mx-auto mb-3">
            {gameState.cells.flat().map((cell, i) => (
              <div key={i} className={`w-7 h-7 rounded-sm ${cell.correct ? "bg-fab-win" : cell.locked ? "bg-fab-loss" : "bg-fab-border"}`} />
            ))}
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-fab-text">{correctCount}/9 correct</p>
            {uniqueness && (
              <>
                <p className="text-lg text-fab-gold font-bold mt-1 font-mono">{uniqueness.score}</p>
                <p className="text-[10px] text-fab-dim">uniqueness score &middot; {uniqueness.totalPlayers} player{uniqueness.totalPlayers !== 1 ? "s" : ""}</p>
              </>
            )}
          </div>
          <p className="text-[9px] text-fab-dim text-center mt-3">fabstats.net/fabdoku</p>
        </div>
      </div>

      {/* Actions */}
      <button
        onClick={handleShare}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-fab-gold text-fab-bg rounded-lg text-sm font-semibold hover:brightness-110 transition-all"
      >
        {shareStatus === "shared" ? (
          <>
            <CheckIcon className="w-3.5 h-3.5" />
            Shared!
          </>
        ) : (
          <>
            <ShareIcon className="w-3.5 h-3.5" />
            Share
          </>
        )}
      </button>

      {/* Next puzzle countdown */}
      <div className="mt-4 pt-3 border-t border-fab-border text-center">
        <p className="text-[10px] text-fab-dim uppercase tracking-wider mb-0.5">
          Next puzzle in
        </p>
        <p className="text-lg font-bold text-fab-text font-mono">
          {countdown}
        </p>
      </div>
    </div>
  );
}
