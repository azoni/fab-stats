"use client";

import { useState, useEffect } from "react";
import { countCrosswordSolvedWords } from "@/lib/crossword/solved-words";
import type { CrosswordGameState, CrosswordPuzzle, CrosswordStats } from "@/lib/crossword/types";

interface CrosswordResultProps {
  gameState: CrosswordGameState;
  puzzle: CrosswordPuzzle;
  stats: CrosswordStats | null;
  onShare: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function CrosswordResult({ gameState, puzzle, stats, onShare }: CrosswordResultProps) {
  const [countdown, setCountdown] = useState("");

  const totalWords = puzzle.words.length;
  const wordsFound = countCrosswordSolvedWords(gameState.solvedWords, puzzle);

  useEffect(() => {
    function updateCountdown() {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const diff = tomorrow.getTime() - now.getTime();
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdown(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    }
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-fab-surface border border-fab-border rounded-xl p-5 mt-4 max-w-[400px] mx-auto">
      <div className="text-center mb-4">
        {gameState.won ? (
          <>
            <div className="w-12 h-12 rounded-full bg-fab-gold/20 flex items-center justify-center mx-auto mb-2">
              <svg className="w-6 h-6 text-fab-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-2.77.704 6.023 6.023 0 01-2.77-.704" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-fab-text">Crossword Complete!</h3>
            <p className="text-sm text-fab-muted mt-0.5">
              Solved in {formatTime(gameState.elapsedSeconds)}
            </p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-fab-surface-hover flex items-center justify-center mx-auto mb-2">
              <svg className="w-6 h-6 text-fab-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-fab-text">Puzzle Incomplete</h3>
            <p className="text-sm text-fab-muted mt-0.5">
              {wordsFound}/{totalWords} words found
            </p>
          </>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <div className="text-center">
          <span className="text-lg font-bold text-fab-text font-mono">
            {formatTime(gameState.elapsedSeconds)}
          </span>
          <p className="text-[10px] text-fab-dim">Time</p>
        </div>
        <div className="text-center">
          <span className="text-lg font-bold text-fab-text">
            {wordsFound}/{totalWords}
          </span>
          <p className="text-[10px] text-fab-dim">Words</p>
        </div>
        {gameState.checksUsed + gameState.revealsUsed > 0 && (
          <div className="text-center">
            <span className="text-lg font-bold text-fab-text">
              {gameState.checksUsed + gameState.revealsUsed}
            </span>
            <p className="text-[10px] text-fab-dim">Hints</p>
          </div>
        )}
      </div>

      {/* Streak info */}
      {stats && (
        <div className="flex items-center justify-center gap-6 mb-4 border-t border-fab-border pt-3">
          <div className="text-center">
            <span className="text-lg font-bold text-fab-text">{stats.currentStreak}</span>
            <p className="text-[10px] text-fab-dim">Streak</p>
          </div>
          <div className="text-center">
            <span className="text-lg font-bold text-fab-text">{stats.maxStreak}</span>
            <p className="text-[10px] text-fab-dim">Best</p>
          </div>
          <div className="text-center">
            <span className="text-lg font-bold text-fab-text">{stats.gamesPlayed}</span>
            <p className="text-[10px] text-fab-dim">Played</p>
          </div>
          {stats.bestSolveTime && (
            <div className="text-center">
              <span className="text-lg font-bold text-fab-text font-mono">{formatTime(stats.bestSolveTime)}</span>
              <p className="text-[10px] text-fab-dim">Best</p>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onShare}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-fab-gold text-fab-bg rounded-lg text-sm font-semibold hover:brightness-110 transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
          </svg>
          Share
        </button>
      </div>

      {/* Countdown */}
      <div className="mt-4 pt-3 border-t border-fab-border text-center">
        <p className="text-[10px] text-fab-dim uppercase tracking-wider mb-0.5">Next puzzle in</p>
        <p className="text-lg font-bold text-fab-text font-mono">{countdown}</p>
      </div>
    </div>
  );
}
