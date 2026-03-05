"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { CardFaBdokuBoard } from "./CardFaBdokuBoard";
import { CardSearchModal } from "./CardSearchModal";
import { FaBdokuResult } from "./FaBdokuResult";
import { FaBdokuShareCard } from "./FaBdokuShareCard";
import { FaBdokuRecap } from "./FaBdokuRecap";
import { AdminPicksViewer } from "./AdminPicksViewer";
import { getCardById } from "@/lib/cards";
import {
  generateDailyCardPuzzle,
  type CardDailyPuzzle,
} from "@/lib/fabdoku/card-puzzle-generator";
import { getTodayDateStr } from "@/lib/fabdoku/puzzle-generator";
import {
  loadCardGameState,
  saveCardGameState,
  createFreshCardGameState,
  cleanupOldCardStates,
  hasCardPicksSaved,
  markCardPicksSaved,
  type CardGameState,
} from "@/lib/fabdoku/card-game-state";
import {
  buildCardResult,
  saveCardResult,
  loadCardStats,
  saveCardPicks,
  loadCardPicks,
  computeCardUniqueness,
  buildLocalCardPicks,
  markCardShared,
} from "@/lib/fabdoku/card-firestore";
import { logActivity } from "@/lib/activity-log";
import type { FaBdokuStats, UniquenessData, PickData, GameState, CellState } from "@/lib/fabdoku/types";

function getYesterdayDateStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function buildGrid(state: CardGameState): ("correct" | "wrong" | "empty")[][] {
  return state.cells.map((row) =>
    row.map((c) => (c.correct ? "correct" : c.locked ? "wrong" : "empty"))
  );
}

/** Convert CardGameState to GameState shape for shared components (Result, ShareCard, Recap). */
function toHeroGameState(state: CardGameState): GameState {
  return {
    ...state,
    cells: state.cells.map((row) =>
      row.map((c): CellState => ({
        heroName: c.cardId,
        correct: c.correct,
        locked: c.locked,
      }))
    ),
  };
}

export function CardFaBdokuGame() {
  const { user, profile, isAdmin } = useAuth();
  const dateStr = useMemo(() => getTodayDateStr(), []);
  const yesterdayStr = useMemo(() => getYesterdayDateStr(), []);
  const puzzle = useMemo(() => generateDailyCardPuzzle(dateStr), [dateStr]);
  const yesterdayPuzzle = useMemo(() => generateDailyCardPuzzle(yesterdayStr), [yesterdayStr]);

  const [gameState, setGameState] = useState<CardGameState | null>(null);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [stats, setStats] = useState<FaBdokuStats | null>(null);
  const [uniqueness, setUniqueness] = useState<UniquenessData | null>(null);
  const [yesterdayScore, setYesterdayScore] = useState<UniquenessData | null>(null);
  const [yesterdayPickData, setYesterdayPickData] = useState<PickData | null>(null);
  const [yesterdayGameState, setYesterdayGameState] = useState<CardGameState | null>(null);
  const [showYesterday, setShowYesterday] = useState(true);
  const [showRecap, setShowRecap] = useState(false);
  const [showYesterdayShare, setShowYesterdayShare] = useState(false);
  const sharedDatesRef = useRef(new Set<string>());

  const triggerShared = useCallback((gs: CardGameState, date: string, uq: UniquenessData | null) => {
    if (sharedDatesRef.current.has(date)) return;
    sharedDatesRef.current.add(date);
    if (user?.uid) {
      markCardShared(user.uid).catch(() => {});
      logActivity("fabdoku_share", date);
    }
  }, [user?.uid]);

  const usedCards = useMemo(() => {
    if (!gameState) return new Set<string>();
    const set = new Set<string>();
    for (let r = 0; r < gameState.cells.length; r++) {
      for (let c = 0; c < gameState.cells[r].length; c++) {
        if (selectedCell && selectedCell[0] === r && selectedCell[1] === c) continue;
        const cell = gameState.cells[r][c];
        if (cell.cardId) set.add(cell.cardId);
      }
    }
    return set;
  }, [gameState, selectedCell]);

  const refreshUniqueness = useCallback(
    async (state: CardGameState): Promise<UniquenessData | null> => {
      try {
        const pickData = await loadCardPicks(state.date);
        if (pickData) {
          const data = computeCardUniqueness(state, pickData);
          setUniqueness(data);
          return data;
        }
      } catch {}
      try {
        const data = computeCardUniqueness(state, buildLocalCardPicks(state));
        setUniqueness(data);
        return data;
      } catch {}
      return null;
    },
    []
  );

  useEffect(() => {
    const saved = loadCardGameState(dateStr);
    const state = saved ?? createFreshCardGameState(dateStr);
    setGameState(state);
    if (state.completed) {
      setShowResult(true);
      refreshUniqueness(state);
    }
    cleanupOldCardStates();
  }, [dateStr, refreshUniqueness]);

  useEffect(() => {
    if (user?.uid) {
      loadCardStats(user.uid).then(setStats).catch(() => {});
    }
  }, [user?.uid]);

  useEffect(() => {
    const yState = loadCardGameState(yesterdayStr);
    if (!yState?.completed) return;
    setYesterdayGameState(yState);

    (async () => {
      try {
        const pd = await loadCardPicks(yesterdayStr);
        if (pd) {
          setYesterdayPickData(pd);
          setYesterdayScore(computeCardUniqueness(yState, pd));
        }
      } catch {}
    })();
  }, [yesterdayStr]);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (!gameState || gameState.completed) return;
      setSelectedCell([row, col]);
    },
    [gameState]
  );

  const handleCardSelect = useCallback(
    async (cardIdentifier: string) => {
      if (!gameState || !selectedCell) return;
      const [row, col] = selectedCell;

      const isCorrect = puzzle.validAnswers[row][col].includes(cardIdentifier);

      const newCells = gameState.cells.map((r) => r.map((c) => ({ ...c })));
      newCells[row][col] = {
        cardId: cardIdentifier,
        correct: isCorrect,
        locked: true,
      };

      const newGuessesUsed = gameState.guessesUsed + 1;
      const correctCount = newCells.flat().filter((c) => c.correct).length;
      const outOfGuesses = newGuessesUsed >= gameState.maxGuesses;
      const allCorrect = correctCount === 9;
      const isCompleted = outOfGuesses || allCorrect;
      const isWon = allCorrect;

      const newState: CardGameState = {
        ...gameState,
        cells: newCells,
        guessesUsed: newGuessesUsed,
        completed: isCompleted,
        won: isWon,
      };

      setGameState(newState);
      saveCardGameState(newState);
      setSelectedCell(null);

      if (isCompleted) {
        if (user?.uid) {
          try {
            const result = buildCardResult(newState);
            await saveCardResult(user.uid, result);
          } catch {}
          try {
            const updatedStats = await loadCardStats(user.uid);
            if (updatedStats) setStats(updatedStats);
          } catch {}
        }
        const shouldSavePicks = !hasCardPicksSaved(dateStr);
        if (shouldSavePicks) {
          try {
            await saveCardPicks(newState);
            markCardPicksSaved(dateStr);
          } catch {}
        }
        setShowResult(true);
        await refreshUniqueness(newState);
      }
    },
    [gameState, selectedCell, puzzle, user?.uid, dateStr, refreshUniqueness]
  );

  if (!gameState) {
    return (
      <div className="bg-fab-surface border border-fab-border rounded-lg p-4 h-80 animate-pulse" />
    );
  }

  // Convert for shared components
  const heroGameState = toHeroGameState(gameState);
  const yesterdayHeroGameState = yesterdayGameState ? toHeroGameState(yesterdayGameState) : null;

  return (
    <>
      {/* Guesses remaining */}
      <div className="flex items-center justify-between mb-3 px-1">
        <p className="text-xs text-fab-muted">{gameState.date}</p>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {Array.from({ length: gameState.maxGuesses }, (_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i < gameState.guessesUsed ? "bg-fab-gold" : "bg-fab-border"
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-fab-muted">
            {gameState.maxGuesses - gameState.guessesUsed} left
          </span>
        </div>
      </div>

      {/* Yesterday's recap */}
      {showYesterday && yesterdayScore && yesterdayHeroGameState && (
        showRecap && yesterdayPickData ? (
          <FaBdokuRecap
            dateStr={yesterdayStr}
            gameState={yesterdayHeroGameState}
            puzzle={yesterdayPuzzle as unknown as Parameters<typeof FaBdokuRecap>[0]["puzzle"]}
            uniqueness={yesterdayScore}
            pickData={yesterdayPickData}
            onCollapse={() => setShowRecap(false)}
            onShare={() => setShowYesterdayShare(true)}
          />
        ) : (
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
            <div className="flex items-center gap-2 shrink-0 ml-2">
              {yesterdayPickData && (
                <button
                  onClick={() => setShowRecap(true)}
                  className="text-xs font-medium text-fab-gold hover:text-fab-gold/80 transition-colors"
                >
                  View Recap
                </button>
              )}
              <button
                onClick={() => setShowYesterday(false)}
                className="text-fab-dim hover:text-fab-muted transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )
      )}

      {/* Game board */}
      <CardFaBdokuBoard
        rows={puzzle.rows}
        cols={puzzle.cols}
        cells={gameState.cells}
        disabled={gameState.completed}
        onCellClick={handleCellClick}
        cellPcts={gameState.completed && uniqueness ? uniqueness.cellPcts : undefined}
      />

      {/* Result panel */}
      {showResult && gameState.completed && (
        <FaBdokuResult
          gameState={heroGameState}
          stats={stats}
          uniqueness={uniqueness}
          onShare={() => {
            setShowShare(true);
            triggerShared(gameState, dateStr, uniqueness);
          }}
          onCopy={() => triggerShared(gameState, dateStr, uniqueness)}
        />
      )}

      {isAdmin && (
        <AdminPicksViewer
          dateStr={dateStr}
          loadPicks={loadCardPicks}
          cellLabels={puzzle.rows.map((r) => puzzle.cols.map((c) => `${r.label} × ${c.label}`))}
          mode="cards"
        />
      )}

      {/* Card search modal */}
      {selectedCell && (
        <CardSearchModal
          usedCards={usedCards}
          onSelect={handleCardSelect}
          onClose={() => setSelectedCell(null)}
        />
      )}

      {/* Share card modal */}
      {showShare && (
        <FaBdokuShareCard
          gameState={heroGameState}
          uniqueness={uniqueness}
          onClose={() => setShowShare(false)}
          onShared={() => triggerShared(gameState, dateStr, uniqueness)}
        />
      )}

      {showYesterdayShare && yesterdayHeroGameState && (
        <FaBdokuShareCard
          gameState={yesterdayHeroGameState}
          uniqueness={yesterdayScore}
          onClose={() => setShowYesterdayShare(false)}
          onShared={() => {
            if (yesterdayGameState) triggerShared(yesterdayGameState, yesterdayStr, yesterdayScore);
          }}
        />
      )}
    </>
  );
}
