"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";

function GridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function HelpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
    </svg>
  );
}
import { FaBdokuBoard } from "@/components/fabdoku/FaBdokuBoard";
import { HeroSearchModal } from "@/components/fabdoku/HeroSearchModal";
import { FaBdokuResult } from "@/components/fabdoku/FaBdokuResult";
import { FaBdokuShareCard } from "@/components/fabdoku/FaBdokuShareCard";
import {
  generateDailyPuzzle,
  getTodayDateStr,
} from "@/lib/fabdoku/puzzle-generator";
import {
  loadGameState,
  saveGameState,
  createFreshGameState,
  cleanupOldStates,
} from "@/lib/fabdoku/game-state";
import {
  buildResult,
  saveResult,
  loadStats,
  savePicks,
  loadPicks,
  computeUniqueness,
  buildLocalPicks,
} from "@/lib/fabdoku/firestore";
import { createFaBdokuFeedEvent } from "@/lib/feed";
import type { GameState, FaBdokuStats, UniquenessData } from "@/lib/fabdoku/types";

function getYesterdayDateStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function buildGrid(state: GameState): ("correct" | "wrong" | "empty")[][] {
  return state.cells.map((row) =>
    row.map((c) => (c.correct ? "correct" : c.locked ? "wrong" : "empty"))
  );
}

export default function FaBdokuPage() {
  const { user, profile, isAdmin } = useAuth();
  const dateStr = useMemo(() => getTodayDateStr(), []);
  const yesterdayStr = useMemo(() => getYesterdayDateStr(), []);
  const puzzle = useMemo(() => generateDailyPuzzle(dateStr), [dateStr]);

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(
    null
  );
  const [showResult, setShowResult] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [stats, setStats] = useState<FaBdokuStats | null>(null);
  const [uniqueness, setUniqueness] = useState<UniquenessData | null>(null);
  const [yesterdayScore, setYesterdayScore] = useState<UniquenessData | null>(null);
  const [showYesterday, setShowYesterday] = useState(true);

  // Track which hero names have already been guessed (no reuse).
  // Excludes the hero in the currently selected cell so it can be replaced.
  const usedHeroes = useMemo(() => {
    if (!gameState) return new Set<string>();
    const set = new Set<string>();
    for (let r = 0; r < gameState.cells.length; r++) {
      for (let c = 0; c < gameState.cells[r].length; c++) {
        if (selectedCell && selectedCell[0] === r && selectedCell[1] === c) continue;
        const cell = gameState.cells[r][c];
        if (cell.heroName) set.add(cell.heroName);
      }
    }
    return set;
  }, [gameState, selectedCell]);

  // Load uniqueness data for a completed game
  const refreshUniqueness = useCallback(
    async (state: GameState): Promise<UniquenessData | null> => {
      try {
        const pickData = await loadPicks(state.date);
        if (pickData) {
          const data = computeUniqueness(state, pickData);
          setUniqueness(data);
          return data;
        }
      } catch {
        // Firestore read failed — fall through to local fallback
      }
      // Fallback: compute from local state only (single-player baseline)
      try {
        const data = computeUniqueness(state, buildLocalPicks(state));
        setUniqueness(data);
        return data;
      } catch {
        // Truly failed
      }
      return null;
    },
    []
  );

  // Load game state from localStorage
  useEffect(() => {
    const saved = loadGameState(dateStr);
    const state = saved ?? createFreshGameState(dateStr);
    setGameState(state);
    if (state.completed) {
      setShowResult(true);
      refreshUniqueness(state);
    }
    cleanupOldStates();
  }, [dateStr, refreshUniqueness]);

  // Load stats from Firestore
  useEffect(() => {
    if (user?.uid) {
      loadStats(user.uid).then(setStats).catch(() => {});
    }
  }, [user?.uid]);

  // Load yesterday's final score
  useEffect(() => {
    const yesterdayState = loadGameState(yesterdayStr);
    if (!yesterdayState?.completed) return;

    loadPicks(yesterdayStr)
      .then((pickData) => {
        if (pickData) {
          setYesterdayScore(computeUniqueness(yesterdayState, pickData));
        }
      })
      .catch(() => {});
  }, [yesterdayStr]);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (!gameState || gameState.completed) return;
      setSelectedCell([row, col]);
    },
    [gameState]
  );

  const handleHeroSelect = useCallback(
    async (heroName: string) => {
      if (!gameState || !selectedCell) return;
      const [row, col] = selectedCell;

      // Check if the hero is a valid answer for this cell
      const isCorrect = puzzle.validAnswers[row][col].includes(heroName);

      // Update cell
      const newCells = gameState.cells.map((r) => r.map((c) => ({ ...c })));
      newCells[row][col] = {
        heroName,
        correct: isCorrect,
        locked: true,
      };

      const newGuessesUsed = gameState.guessesUsed + 1;
      const allLocked = newCells.flat().every((c) => c.locked);
      const correctCount = newCells.flat().filter((c) => c.correct).length;
      const outOfGuesses = newGuessesUsed >= gameState.maxGuesses;
      const allCorrect = correctCount === 9;
      const isCompleted = allLocked || outOfGuesses || allCorrect;
      const isWon = allCorrect;

      const newState: GameState = {
        ...gameState,
        cells: newCells,
        guessesUsed: newGuessesUsed,
        completed: isCompleted,
        won: isWon,
      };

      setGameState(newState);
      saveGameState(newState);
      setSelectedCell(null);

      // Save to Firestore on completion
      if (isCompleted) {
        if (user?.uid) {
          try {
            const result = buildResult(newState);
            await saveResult(user.uid, result);
            await savePicks(newState);
            const updatedStats = await loadStats(user.uid);
            if (updatedStats) setStats(updatedStats);
          } catch {
            // Silently fail — game state is saved locally
          }
        }
        setShowResult(true);

        // Load uniqueness then post to activity feed
        const uData = await refreshUniqueness(newState);
        if (profile) {
          const cc = newCells.flat().filter((c) => c.correct).length;
          createFaBdokuFeedEvent(
            profile, "completed", dateStr, isWon, cc,
            newGuessesUsed, buildGrid(newState),
            uData?.score,
          ).catch((err) => console.error("FaBdoku feed event failed:", err));
        }
      }
    },
    [gameState, selectedCell, puzzle, user?.uid, profile, dateStr, refreshUniqueness]
  );

  if (!gameState) {
    return (
      <div className="max-w-lg mx-auto py-8">
        <div className="bg-fab-surface border border-fab-border rounded-lg p-4 h-80 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-3 sm:px-4 py-4 sm:py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-fab-gold/10 flex items-center justify-center ring-1 ring-inset ring-fab-gold/20">
            <GridIcon className="w-4 h-4 text-fab-gold" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-fab-text leading-tight">
              FaBdoku
            </h1>
            <p className="text-xs text-fab-muted leading-tight">
              Daily hero puzzle
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowHelp((v) => !v)}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-fab-muted hover:text-fab-text bg-fab-surface border border-fab-border hover:border-fab-gold/40 transition-colors text-xs font-medium"
        >
          <HelpIcon className="w-4 h-4" />
          How to Play
        </button>
      </div>

      {/* How to play */}
      {showHelp && (
        <div className="bg-fab-surface border border-fab-border rounded-lg p-4 mb-4 text-sm text-fab-muted space-y-3">
          <p className="font-semibold text-fab-text">How to Play</p>
          <ul className="list-disc list-inside space-y-1.5 text-xs">
            <li>Fill each cell with a Flesh and Blood hero that matches <strong className="text-fab-text">both</strong> the row and column categories.</li>
            <li>You have <strong className="text-fab-text">12 guesses</strong> to fill all 9 cells. That gives you <strong className="text-fab-text">3 extra</strong> to change your mind.</li>
            <li>Tap a filled cell to <strong className="text-fab-text">replace</strong> your pick &mdash; this uses another guess.</li>
            <li>Each hero can only be used <strong className="text-fab-text">once</strong> across the entire grid.</li>
            <li>A new puzzle appears every day at midnight.</li>
          </ul>

          <div className="border-t border-fab-border pt-3">
            <p className="font-semibold text-fab-gold text-xs mb-1.5">Uniqueness Scoring</p>
            <ul className="list-disc list-inside space-y-1.5 text-xs">
              <li>After you finish, each cell shows what <strong className="text-fab-text">% of players</strong> picked the same hero as you.</li>
              <li>Your <strong className="text-fab-gold">uniqueness score</strong> is the sum of all 9 cell percentages. <strong className="text-fab-text">Lower is better</strong> &mdash; like golf.</li>
              <li>Picking obscure heroes that fewer players choose gives a better score.</li>
              <li>Scores are <strong className="text-fab-text">live</strong> and update as more players finish. Come back tomorrow to see your final score.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Guesses remaining */}
      <div className="flex items-center justify-between mb-3 px-1">
        <p className="text-xs text-fab-muted">
          {gameState.date}
        </p>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {Array.from({ length: gameState.maxGuesses }, (_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i < gameState.guessesUsed
                    ? "bg-fab-gold"
                    : "bg-fab-border"
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-fab-muted">
            {gameState.maxGuesses - gameState.guessesUsed} left
          </span>
        </div>
      </div>

      {/* Yesterday's final score */}
      {showYesterday && yesterdayScore && (
        <div className="bg-fab-surface border border-fab-border rounded-lg p-3 mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 text-center">
              <p className="text-lg font-bold text-fab-gold font-mono leading-tight">
                {yesterdayScore.score}
              </p>
              <p className="text-[9px] text-fab-dim">score</p>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-fab-text">
                Yesterday&apos;s Final Score
              </p>
              <p className="text-[10px] text-fab-dim">
                {yesterdayStr} &middot; {yesterdayScore.totalPlayers} player{yesterdayScore.totalPlayers !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowYesterday(false)}
            className="shrink-0 text-fab-dim hover:text-fab-muted transition-colors ml-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Game board */}
      <FaBdokuBoard
        rows={puzzle.rows}
        cols={puzzle.cols}
        cells={gameState.cells}
        disabled={gameState.completed}
        onCellClick={handleCellClick}
        cellPcts={gameState.completed ? uniqueness?.cellPcts : undefined}
      />

      {/* Result panel (shown when game is over) */}
      {showResult && gameState.completed && (
        <FaBdokuResult
          gameState={gameState}
          stats={stats}
          uniqueness={uniqueness}
          onShare={() => {
            setShowShare(true);
            if (profile) {
              const cc = gameState.cells.flat().filter((c) => c.correct).length;
              createFaBdokuFeedEvent(
                profile, "shared", dateStr, gameState.won, cc,
                gameState.guessesUsed, buildGrid(gameState),
                uniqueness?.score,
              ).catch((err) => console.error("FaBdoku feed event failed:", err));
            }
          }}
        />
      )}

      {/* Admin replay button */}
      {isAdmin && gameState.guessesUsed > 0 && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                localStorage.removeItem(`fabdoku-${dateStr}`);
              }
              setGameState(createFreshGameState(dateStr));
              setShowResult(false);
              setShowShare(false);
              setUniqueness(null);
            }}
            className="px-4 py-2 text-xs font-medium rounded-lg bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text hover:border-fab-gold/50 transition-colors"
          >
            Reset Puzzle (Admin)
          </button>
        </div>
      )}

      {/* Hero search modal */}
      {selectedCell && (
        <HeroSearchModal
          usedHeroes={usedHeroes}
          onSelect={handleHeroSelect}
          onClose={() => setSelectedCell(null)}
        />
      )}

      {/* Share card modal */}
      {showShare && (
        <FaBdokuShareCard
          gameState={gameState}
          uniqueness={uniqueness}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}
