"use client";

import { notifyGameSaveFailure } from "@/lib/games/save-notify";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { GameNav } from "@/components/games/GameNav";
import { CrosswordGrid } from "@/components/crossword/CrosswordGrid";
import { CrosswordClues } from "@/components/crossword/CrosswordClues";
import { CrosswordResult } from "@/components/crossword/CrosswordResult";
import { CrosswordShareCard } from "@/components/crossword/CrosswordShareCard";
import { generateDailyPuzzle, getTodayDateStr } from "@/lib/crossword/puzzle-generator";
import {
  createFreshGameState,
  loadGameState,
  saveGameState,
  cleanupOldStates,
} from "@/lib/crossword/game-state";
import { countCrosswordSolvedWords, crosswordWordKey, isCrosswordWordSolved } from "@/lib/crossword/solved-words";
import { saveResult, loadStats, markShared } from "@/lib/crossword/firestore";
import { useGameFx } from "@/components/games/fx";
import { createCrosswordFeedEvent } from "@/lib/feed";
import { logActivity } from "@/lib/activity-log";
import { detectTierUp } from "@/lib/badge-tiers";
import { BadgeTierUpPopup } from "@/components/profile/BadgeTierUpPopup";
import { syncAchievementsAfterGame } from "@/lib/achievement-tracking";
import type { CrosswordGameState, CrosswordStats, Direction, CrosswordPuzzle, SolvedWordId } from "@/lib/crossword/types";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Find which word the cell belongs to in the given direction. */
function findWordAt(puzzle: CrosswordPuzzle, row: number, col: number, dir: Direction) {
  for (const w of puzzle.words) {
    if (w.direction !== dir) continue;
    const dr = dir === "down" ? 1 : 0;
    const dc = dir === "across" ? 1 : 0;
    for (let i = 0; i < w.word.length; i++) {
      if (w.row + dr * i === row && w.col + dc * i === col) return w;
    }
  }
  return null;
}

/** Check which words are fully and correctly solved. */
function checkSolvedWords(puzzle: CrosswordPuzzle, cells: CrosswordGameState["cells"]): SolvedWordId[] {
  const solved: SolvedWordId[] = [];
  for (const w of puzzle.words) {
    const dr = w.direction === "down" ? 1 : 0;
    const dc = w.direction === "across" ? 1 : 0;
    let allCorrect = true;
    for (let i = 0; i < w.word.length; i++) {
      const r = w.row + dr * i;
      const c = w.col + dc * i;
      if (cells[r]?.[c]?.letter !== w.word[i]) {
        allCorrect = false;
        break;
      }
    }
    if (allCorrect) solved.push(crosswordWordKey(w));
  }
  return solved;
}

export default function CrosswordPage() {
  const { user, profile, isAdmin } = useAuth();
  const dateStr = useMemo(() => getTodayDateStr(), []);
  const puzzle = useMemo(() => generateDailyPuzzle(dateStr), [dateStr]);

  const [gameState, setGameState] = useState<CrosswordGameState | null>(null);
  const [activeCell, setActiveCell] = useState<[number, number] | null>(null);
  const [activeDirection, setActiveDirection] = useState<Direction>("across");
  const [showResult, setShowResult] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [stats, setStats] = useState<CrosswordStats | null>(null);
  const [badgeTierUp, setBadgeTierUp] = useState<{ tier: import("@/lib/badge-tiers").BadgeTierInfo; count: number } | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [checkedCells, setCheckedCells] = useState<Set<string>>(new Set());
  // Celebrate only a completion earned this session (the load effect never sets it).
  const [celebrate, setCelebrate] = useState(false);
  const { play, haptic } = useGameFx();
  // Transient FX state: cells of words solved by the latest keystroke (gold pulse),
  // cells just filled by Reveal Word (flip cascade), and a counter that retriggers
  // the check-shake when Check is pressed again.
  const [justSolvedCells, setJustSolvedCells] = useState<Set<string>>(new Set());
  const [revealCells, setRevealCells] = useState<Map<string, number> | null>(null);
  const [checkSeq, setCheckSeq] = useState(0);
  // Only the just-typed cell's letter springs in (reload/remounted letters stay still).
  const [lastTypedKey, setLastTypedKey] = useState<string | null>(null);
  // Sequence tokens so overlapping solve/reveal FX windows don't truncate each other.
  const solvedFxSeq = useRef(0);
  const revealFxSeq = useRef(0);
  const completionSaved = useRef(false);
  const sharedDatesRef = useRef(new Set<string>());

  const triggerShared = useCallback(
    (gs: CrosswordGameState) => {
      if (sharedDatesRef.current.has(gs.date)) return;
      sharedDatesRef.current.add(gs.date);

      logActivity("crossword_share", gs.date);

      if (user?.uid) {
        markShared(user.uid).catch(() => {});
      }

      if (profile) {
        createCrosswordFeedEvent(
          profile,
          "shared",
          gs.date,
          gs.won,
          countCrosswordSolvedWords(gs.solvedWords, puzzle),
          puzzle.words.length,
          gs.elapsedSeconds,
          gs.checksUsed,
          gs.revealsUsed,
        ).catch(() => {});
      }
    },
    [user?.uid, profile, puzzle]
  );

  // Timer
  useEffect(() => {
    if (!gameState || gameState.completed || isPaused) return;
    const interval = setInterval(() => {
      setGameState((prev) => {
        if (!prev || prev.completed) return prev;
        const updated = { ...prev, elapsedSeconds: prev.elapsedSeconds + 1 };
        saveGameState(updated);
        return updated;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState?.completed, isPaused]);

  // Pause on tab hidden
  useEffect(() => {
    const handler = () => setIsPaused(document.hidden);
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  // Load state
  useEffect(() => {
    const saved = loadGameState(dateStr);
    const state = saved ?? createFreshGameState(dateStr, puzzle);
    setGameState(state);
    if (state.completed) setShowResult(true);
    cleanupOldStates();
  }, [dateStr, puzzle]);

  // Load stats
  useEffect(() => {
    if (!user?.uid) return;
    loadStats(user.uid).then(setStats).catch(() => {});
  }, [user?.uid]);

  // Active clue number
  const activeClueNumber = useMemo(() => {
    if (!activeCell) return null;
    const w = findWordAt(puzzle, activeCell[0], activeCell[1], activeDirection);
    return w?.number ?? null;
  }, [activeCell, activeDirection, puzzle]);

  // Active clue text (shown above grid)
  const activeClueText = useMemo(() => {
    if (!activeCell) return null;
    const w = findWordAt(puzzle, activeCell[0], activeCell[1], activeDirection);
    if (!w) return null;
    return `${w.number} ${w.direction === "across" ? "Across" : "Down"}: ${w.clue}`;
  }, [activeCell, activeDirection, puzzle]);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (!gameState || gameState.completed) return;
      if (activeCell && activeCell[0] === row && activeCell[1] === col) {
        // Toggle direction
        const newDir = activeDirection === "across" ? "down" : "across";
        // Only toggle if there's a word in this cell for the new direction
        const w = findWordAt(puzzle, row, col, newDir);
        if (w) setActiveDirection(newDir);
      } else {
        setActiveCell([row, col]);
        // If no word in current direction for this cell, switch direction
        const w = findWordAt(puzzle, row, col, activeDirection);
        if (!w) {
          const alt = activeDirection === "across" ? "down" : "across";
          if (findWordAt(puzzle, row, col, alt)) setActiveDirection(alt);
        }
      }
    },
    [gameState, activeCell, activeDirection, puzzle]
  );

  const completeGame = useCallback(
    (gs: CrosswordGameState) => {
      if (completionSaved.current) return;
      completionSaved.current = true;
      setShowResult(true);
      // Fresh completion only — the load effect shows a saved result silently.
      if (gs.won) {
        setCelebrate(true);
        play("win");
        haptic("success");
      }

      if (user?.uid) {
        const result = {
          date: gs.date,
          won: gs.won,
          elapsedSeconds: gs.elapsedSeconds,
          checksUsed: gs.checksUsed,
          revealsUsed: gs.revealsUsed,
          wordsFound: countCrosswordSolvedWords(gs.solvedWords, puzzle),
          totalWords: puzzle.words.length,
          timestamp: Date.now(),
        };
        const oldGamesPlayed = stats?.gamesPlayed ?? 0;
        saveResult(user.uid, result)
          .then(() => loadStats(user.uid))
          .then((s) => {
            if (s) {
              setStats(s);
              const tierUp = detectTierUp("crossword-player", oldGamesPlayed, s.gamesPlayed);
              if (tierUp) setBadgeTierUp({ tier: tierUp, count: s.gamesPlayed });
              syncAchievementsAfterGame(user.uid).catch(() => {});
            }
          })
          .catch(notifyGameSaveFailure);
      }

      if (profile) {
        createCrosswordFeedEvent(
          profile,
          "completed",
          gs.date,
          gs.won,
          countCrosswordSolvedWords(gs.solvedWords, puzzle),
          puzzle.words.length,
          gs.elapsedSeconds,
          gs.checksUsed,
          gs.revealsUsed,
        ).catch((err) => console.error("Crossword feed event failed:", err));
      }
    },
    [user?.uid, profile, puzzle, stats?.gamesPlayed, play, haptic]
  );

  const handleLetterInput = useCallback(
    (letter: string) => {
      if (!gameState || gameState.completed || !activeCell) return;
      const [r, c] = activeCell;
      if (puzzle.solution[r][c] === null) return;

      const newCells = gameState.cells.map((row) => row.map((cell) => ({ ...cell })));
      newCells[r][c] = { letter, revealed: false };

      const newSolved = checkSolvedWords(puzzle, newCells);

      // Check if all letter cells are correctly filled
      let allCorrect = true;
      for (let row = 0; row < puzzle.height; row++) {
        for (let col = 0; col < puzzle.width; col++) {
          if (puzzle.solution[row][col] !== null && newCells[row][col].letter !== puzzle.solution[row][col]) {
            allCorrect = false;
          }
        }
      }

      const newState: CrosswordGameState = {
        ...gameState,
        cells: newCells,
        solvedWords: newSolved,
        completed: allCorrect,
        won: allCorrect,
      };

      setGameState(newState);
      saveGameState(newState);
      setCheckedCells(new Set()); // Clear checks on new input
      setLastTypedKey(`${r},${c}`);

      // Word-solve moment: diff via isCrosswordWordSolved (handles legacy numeric
      // IDs in old saves). On full completion completeGame owns the win chord.
      const newlySolved = puzzle.words.filter(
        (w) => isCrosswordWordSolved(newSolved, w) && !isCrosswordWordSolved(gameState.solvedWords, w)
      );
      if (!allCorrect) {
        if (newlySolved.length > 0) {
          play("correct");
          haptic("success");
          const keys = new Set<string>();
          for (const w of newlySolved) {
            const wdr = w.direction === "down" ? 1 : 0;
            const wdc = w.direction === "across" ? 1 : 0;
            for (let i = 0; i < w.word.length; i++) keys.add(`${w.row + wdr * i},${w.col + wdc * i}`);
          }
          setJustSolvedCells(keys);
          // Token guard: a second word solved inside the window must not have its
          // pulse truncated by the first word's clear timer.
          const token = ++solvedFxSeq.current;
          setTimeout(() => {
            if (solvedFxSeq.current === token) setJustSolvedCells(new Set());
          }, 700);
        } else {
          play("click");
        }
      }

      if (allCorrect) {
        completeGame(newState);
      } else {
        // Advance to next cell in word
        const dr = activeDirection === "down" ? 1 : 0;
        const dc = activeDirection === "across" ? 1 : 0;
        const nr = r + dr;
        const nc = c + dc;
        if (nr < puzzle.height && nc < puzzle.width && puzzle.solution[nr][nc] !== null) {
          setActiveCell([nr, nc]);
        }
      }
    },
    [gameState, activeCell, activeDirection, puzzle, completeGame, play, haptic]
  );

  const handleBackspace = useCallback(() => {
    if (!gameState || gameState.completed || !activeCell) return;
    const [r, c] = activeCell;
    const cell = gameState.cells[r]?.[c];

    if (cell?.letter) {
      // Clear current cell
      const newCells = gameState.cells.map((row) => row.map((cl) => ({ ...cl })));
      newCells[r][c] = { letter: null, revealed: false };
      const newState = { ...gameState, cells: newCells, solvedWords: checkSolvedWords(puzzle, newCells) };
      setGameState(newState);
      saveGameState(newState);
    } else {
      // Move back to previous cell
      const dr = activeDirection === "down" ? -1 : 0;
      const dc = activeDirection === "across" ? -1 : 0;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nc >= 0 && puzzle.solution[nr]?.[nc] !== null) {
        setActiveCell([nr, nc]);
      }
    }
  }, [gameState, activeCell, activeDirection, puzzle]);

  const handleArrowKey = useCallback(
    (dir: "up" | "down" | "left" | "right") => {
      if (!activeCell) return;
      const [r, c] = activeCell;
      const dr = dir === "up" ? -1 : dir === "down" ? 1 : 0;
      const dc = dir === "left" ? -1 : dir === "right" ? 1 : 0;

      // Find next non-black cell
      let nr = r + dr;
      let nc = c + dc;
      while (nr >= 0 && nr < puzzle.height && nc >= 0 && nc < puzzle.width) {
        if (puzzle.solution[nr][nc] !== null) {
          setActiveCell([nr, nc]);
          // Also update direction to match movement
          if (dr !== 0) setActiveDirection("down");
          if (dc !== 0) setActiveDirection("across");
          return;
        }
        nr += dr;
        nc += dc;
      }
    },
    [activeCell, puzzle]
  );

  const handleTab = useCallback(
    (shift: boolean) => {
      const words = puzzle.words
        .filter((w) => w.direction === activeDirection)
        .sort((a, b) => a.number - b.number);
      if (words.length === 0) return;

      const currentIdx = words.findIndex((w) => w.number === activeClueNumber);
      const nextIdx = shift
        ? (currentIdx - 1 + words.length) % words.length
        : (currentIdx + 1) % words.length;

      // If we wrap around direction, switch
      if (nextIdx === 0 && !shift) {
        const altDir = activeDirection === "across" ? "down" : "across";
        const altWords = puzzle.words.filter((w) => w.direction === altDir).sort((a, b) => a.number - b.number);
        if (altWords.length > 0) {
          setActiveDirection(altDir);
          setActiveCell([altWords[0].row, altWords[0].col]);
          return;
        }
      }

      const nextWord = words[nextIdx];
      setActiveCell([nextWord.row, nextWord.col]);
    },
    [puzzle, activeDirection, activeClueNumber]
  );

  const handleClueClick = useCallback(
    (number: number, direction: Direction) => {
      const w = puzzle.words.find((pw) => pw.number === number && pw.direction === direction);
      if (!w) return;
      setActiveCell([w.row, w.col]);
      setActiveDirection(direction);
    },
    [puzzle]
  );

  const handleCheck = useCallback(() => {
    if (!gameState || gameState.completed) return;
    const wrong = new Set<string>();
    for (let r = 0; r < puzzle.height; r++) {
      for (let c = 0; c < puzzle.width; c++) {
        const cell = gameState.cells[r]?.[c];
        const sol = puzzle.solution[r][c];
        if (sol !== null && cell?.letter && cell.letter !== sol) {
          wrong.add(`${r},${c}`);
        }
      }
    }
    setCheckedCells(wrong);
    if (wrong.size > 0) {
      play("wrong");
      haptic("error");
      setCheckSeq((s) => s + 1); // retriggers the shake on repeat Checks
    } else {
      play("correct"); // all clear so far
    }
    const newState = { ...gameState, checksUsed: gameState.checksUsed + 1 };
    setGameState(newState);
    saveGameState(newState);
  }, [gameState, puzzle, play, haptic]);

  const handleRevealWord = useCallback(() => {
    if (!gameState || gameState.completed || !activeCell) return;
    const w = findWordAt(puzzle, activeCell[0], activeCell[1], activeDirection);
    if (!w) return;

    const newCells = gameState.cells.map((row) => row.map((cl) => ({ ...cl })));
    const dr = w.direction === "down" ? 1 : 0;
    const dc = w.direction === "across" ? 1 : 0;
    for (let i = 0; i < w.word.length; i++) {
      const r = w.row + dr * i;
      const c = w.col + dc * i;
      newCells[r][c] = { letter: w.word[i], revealed: true };
    }

    const newSolved = checkSolvedWords(puzzle, newCells);

    let allCorrect = true;
    for (let r = 0; r < puzzle.height; r++) {
      for (let c = 0; c < puzzle.width; c++) {
        if (puzzle.solution[r][c] !== null && newCells[r][c].letter !== puzzle.solution[r][c]) {
          allCorrect = false;
        }
      }
    }

    const newState: CrosswordGameState = {
      ...gameState,
      cells: newCells,
      solvedWords: newSolved,
      revealsUsed: gameState.revealsUsed + 1,
      completed: allCorrect,
      won: allCorrect,
    };

    setGameState(newState);
    saveGameState(newState);
    // Reveal overwrites any letters Check flagged — clear the stale red marks.
    setCheckedCells(new Set());

    // Reveal cascade: the word's letters flip in one by one. When the reveal
    // finishes the puzzle, completeGame plays the win chord instead — don't stack.
    if (!allCorrect) {
      play("reveal");
      haptic("flip");
    }
    const flipMap = new Map<string, number>();
    for (let i = 0; i < w.word.length; i++) flipMap.set(`${w.row + dr * i},${w.col + dc * i}`, i);
    setRevealCells(flipMap);
    const token = ++revealFxSeq.current;
    setTimeout(() => {
      if (revealFxSeq.current === token) setRevealCells(null);
    }, 900);

    if (allCorrect) completeGame(newState);
  }, [gameState, activeCell, activeDirection, puzzle, completeGame, play, haptic]);

  if (!gameState) {
    return (
      <div className="max-w-lg mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="animate-pulse bg-fab-surface border border-fab-border rounded-lg h-80" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-3 sm:px-4 py-4 sm:py-6">
      <GameNav current="crossword" />

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-fab-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
          </svg>
          <h1 className="text-lg font-bold text-fab-text">FaB Crossword</h1>
          <span className="text-xs text-fab-dim">{dateStr}</span>
        </div>
        <div className="flex items-center gap-2">
          {!gameState.completed && (
            <span className="text-sm font-mono text-fab-muted tabular-nums">
              {formatTime(gameState.elapsedSeconds)}
            </span>
          )}
          <span className="text-[10px] text-fab-dim">
            {puzzle.words.length} words
          </span>
        </div>
      </div>

      {/* Active clue display */}
      <div className="bg-fab-surface border border-fab-border rounded-lg px-3 py-2 mb-3 min-h-[36px]">
        {activeClueText ? (
          <p className="text-xs text-fab-text">{activeClueText}</p>
        ) : (
          <p className="text-xs text-fab-dim">Tap a cell to begin</p>
        )}
      </div>

      {/* Grid */}
      <CrosswordGrid
        puzzle={puzzle}
        gameState={gameState}
        activeCell={activeCell}
        activeDirection={activeDirection}
        onCellClick={handleCellClick}
        onLetterInput={handleLetterInput}
        onBackspace={handleBackspace}
        onArrowKey={handleArrowKey}
        onTab={handleTab}
        showErrors={gameState.completed && !gameState.won}
        checkedCells={checkedCells}
        justSolvedCells={justSolvedCells}
        revealCells={revealCells}
        checkSeq={checkSeq}
        celebrateWave={celebrate}
        lastTypedKey={lastTypedKey}
      />

      {/* Action buttons */}
      {!gameState.completed && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleCheck}
            className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text hover:border-fab-gold/50 transition-colors"
          >
            Check
          </button>
          <button
            onClick={handleRevealWord}
            disabled={!activeCell}
            className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text hover:border-fab-gold/50 transition-colors disabled:opacity-30"
          >
            Reveal Word
          </button>
        </div>
      )}

      {/* Clues */}
      <CrosswordClues
        puzzle={puzzle}
        solvedWords={gameState.solvedWords}
        activeClueNumber={activeClueNumber}
        activeDirection={activeDirection}
        onClueClick={handleClueClick}
      />

      {/* Result */}
      {showResult && gameState.completed && (
        <CrosswordResult
          gameState={gameState}
          puzzle={puzzle}
          stats={stats}
          onShare={() => setShowShare(true)}
          celebrate={celebrate}
        />
      )}

      {/* Share modal */}
      {showShare && (
        <CrosswordShareCard
          gameState={gameState}
          puzzle={puzzle}
          onClose={() => setShowShare(false)}
          onShared={() => triggerShared(gameState)}
        />
      )}

      {badgeTierUp && (
        <BadgeTierUpPopup badgeId="crossword-player" badgeName="Wordsmith" tier={badgeTierUp.tier} count={badgeTierUp.count} onClose={() => setBadgeTierUp(null)} />
      )}

      {/* Admin reset */}
      {isAdmin && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                localStorage.removeItem(`crossword-${dateStr}`);
              }
              const fresh = createFreshGameState(dateStr, puzzle);
              setGameState(fresh);
              setShowResult(false);
              setShowShare(false);
              setActiveCell(null);
              setCheckedCells(new Set());
              setCelebrate(false);
              setJustSolvedCells(new Set());
              setRevealCells(null);
              setLastTypedKey(null);
              completionSaved.current = false;
            }}
            className="px-4 py-2 text-xs font-medium rounded-lg bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text hover:border-fab-gold/50 transition-colors"
          >
            Reset Puzzle
          </button>
        </div>
      )}
    </div>
  );
}
