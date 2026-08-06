"use client";

import { useRef, useEffect, useCallback } from "react";
import { isCrosswordWordSolved } from "@/lib/crossword/solved-words";
import type { CrosswordPuzzle, CrosswordGameState, Direction } from "@/lib/crossword/types";

interface CrosswordGridProps {
  puzzle: CrosswordPuzzle;
  gameState: CrosswordGameState;
  activeCell: [number, number] | null;
  activeDirection: Direction;
  onCellClick: (row: number, col: number) => void;
  onLetterInput: (letter: string) => void;
  onBackspace: () => void;
  onArrowKey: (dir: "up" | "down" | "left" | "right") => void;
  onTab: (shift: boolean) => void;
  showErrors?: boolean;
  checkedCells?: Set<string>;
  /** Cells of words solved by the latest keystroke — gold pulse. */
  justSolvedCells?: Set<string>;
  /** Cells just filled by Reveal Word, keyed to their letter index — flip cascade. */
  revealCells?: Map<string, number> | null;
  /** Bumped per Check press so repeat checks retrigger the wrong-cell shake. */
  checkSeq?: number;
  /** Puzzle just completed this session — a diagonal gold wave sweeps the grid. */
  celebrateWave?: boolean;
  /** "r,c" of the cell the player just typed into — only its letter springs in
   *  (letters remount on reload and on checkedCells clears; those must stay still). */
  lastTypedKey?: string | null;
}

export function CrosswordGrid({
  puzzle,
  gameState,
  activeCell,
  activeDirection,
  onCellClick,
  onLetterInput,
  onBackspace,
  onArrowKey,
  onTab,
  showErrors,
  checkedCells,
  justSolvedCells,
  revealCells,
  checkSeq = 0,
  celebrateWave = false,
  lastTypedKey = null,
}: CrosswordGridProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus hidden input when active cell changes
  useEffect(() => {
    if (activeCell && inputRef.current) {
      inputRef.current.focus();
    }
  }, [activeCell]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (gameState.completed) return;

      if (e.key === "Backspace") {
        e.preventDefault();
        onBackspace();
      } else if (e.key === "Tab") {
        e.preventDefault();
        onTab(e.shiftKey);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        onArrowKey("up");
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        onArrowKey("down");
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        onArrowKey("left");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        onArrowKey("right");
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        onLetterInput(e.key.toUpperCase());
      }
    },
    [gameState.completed, onBackspace, onTab, onArrowKey, onLetterInput]
  );

  // Determine which cells are part of the active word
  const activeWordCells = new Set<string>();
  if (activeCell) {
    const [ar, ac] = activeCell;
    // Find the word at this cell in the active direction
    for (const w of puzzle.words) {
      if (w.direction !== activeDirection) continue;
      const dr = w.direction === "down" ? 1 : 0;
      const dc = w.direction === "across" ? 1 : 0;
      for (let i = 0; i < w.word.length; i++) {
        const wr = w.row + dr * i;
        const wc = w.col + dc * i;
        if (wr === ar && wc === ac) {
          // This word contains our active cell — highlight all its cells
          for (let j = 0; j < w.word.length; j++) {
            activeWordCells.add(`${w.row + dr * j},${w.col + dc * j}`);
          }
          break;
        }
      }
    }
  }

  const cellSize = `minmax(0, 1fr)`;

  return (
    <div className="relative" onKeyDown={handleKeyDown} tabIndex={0}>
      {/* Hidden input for mobile keyboard */}
      <input
        ref={inputRef}
        className="absolute opacity-0 w-0 h-0"
        type="text"
        autoComplete="off"
        autoCapitalize="characters"
        inputMode="text"
        onKeyDown={handleKeyDown}
        onChange={() => {}}
        value=""
      />

      <div
        className="grid gap-[1px] bg-fab-border mx-auto"
        style={{
          gridTemplateColumns: `repeat(${puzzle.width}, ${cellSize})`,
          gridTemplateRows: `repeat(${puzzle.height}, ${cellSize})`,
          maxWidth: puzzle.width * 48,
        }}
      >
        {Array.from({ length: puzzle.height }, (_, r) =>
          Array.from({ length: puzzle.width }, (_, c) => {
            const solution = puzzle.solution[r][c];
            const isBlack = solution === null;
            const cellState = gameState.cells[r]?.[c];
            const letter = cellState?.letter ?? null;
            const revealed = cellState?.revealed ?? false;
            const number = puzzle.numbers[r][c];
            const isActive = activeCell?.[0] === r && activeCell?.[1] === c;
            const isWordHighlight = activeWordCells.has(`${r},${c}`);
            const key = `${r},${c}`;
            const isCheckedWrong = checkedCells?.has(key);

            // Post-game coloring
            let bgClass = "bg-fab-surface";
            if (isBlack) {
              bgClass = "bg-fab-bg";
            } else if (showErrors && letter && solution) {
              bgClass = letter === solution ? "bg-fab-win/15" : "bg-fab-loss/15";
            } else if (isCheckedWrong) {
              bgClass = "bg-fab-loss/20";
            } else if (isActive) {
              bgClass = "bg-fab-gold/25";
            } else if (isWordHighlight) {
              bgClass = "bg-fab-gold/10";
            }

            const isSolved = puzzle.words.some((w) => {
              if (!isCrosswordWordSolved(gameState.solvedWords, w)) return false;
              const dr = w.direction === "down" ? 1 : 0;
              const dc = w.direction === "across" ? 1 : 0;
              for (let i = 0; i < w.word.length; i++) {
                if (w.row + dr * i === r && w.col + dc * i === c) return true;
              }
              return false;
            });

            const isJustSolved = justSolvedCells?.has(key);
            const revealIdx = revealCells?.get(key);
            // The wave sweeps diagonally from the top-left on completion.
            const waveDelay = celebrateWave && !isBlack ? (r + c) * 35 : undefined;

            return (
              <div
                // checkSeq in the key remounts wrongly-checked cells so the shake
                // retriggers on repeat Check presses.
                key={`${key}:${isCheckedWrong ? checkSeq : 0}`}
                onClick={() => !isBlack && onCellClick(r, c)}
                className={`relative aspect-square flex items-center justify-center cursor-pointer select-none ${bgClass} ${
                  isActive ? "ring-2 ring-fab-gold ring-inset z-10" : ""
                } ${isBlack ? "cursor-default" : ""} ${isJustSolved ? "game-match-pop" : ""} ${
                  isCheckedWrong ? "game-shake" : ""
                } ${waveDelay !== undefined ? "game-flip-in" : ""}`}
                style={waveDelay !== undefined ? { animationDelay: `${waveDelay}ms` } : undefined}
              >
                {/* Clue number */}
                {number !== null && (
                  <span className="absolute top-[1px] left-[2px] text-[8px] leading-none font-semibold text-fab-dim">
                    {number}
                  </span>
                )}
                {/* Letter — only the JUST-typed letter springs in (reload/remounted
                    letters stay still); revealed words flip in one by one, and get
                    no fallback animation when the reveal window expires. */}
                {!isBlack && letter && (
                  <span
                    key={letter}
                    className={`text-sm sm:text-base font-bold leading-none ${
                      revealed ? "text-fab-muted italic" : isSolved ? "text-fab-win" : "text-fab-text"
                    } ${
                      revealIdx !== undefined ? "game-flip-in" : !revealed && key === lastTypedKey ? "game-pop" : ""
                    }`}
                    style={revealIdx !== undefined ? { animationDelay: `${revealIdx * 45}ms` } : undefined}
                  >
                    {letter}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
