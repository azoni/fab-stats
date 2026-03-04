"use client";

import type { CrosswordPuzzle, Direction } from "@/lib/crossword/types";

interface CrosswordCluesProps {
  puzzle: CrosswordPuzzle;
  solvedWords: number[];
  activeClueNumber: number | null;
  activeDirection: Direction;
  onClueClick: (number: number, direction: Direction) => void;
}

export function CrosswordClues({
  puzzle,
  solvedWords,
  activeClueNumber,
  activeDirection,
  onClueClick,
}: CrosswordCluesProps) {
  const across = puzzle.words
    .filter((w) => w.direction === "across")
    .sort((a, b) => a.number - b.number);
  const down = puzzle.words
    .filter((w) => w.direction === "down")
    .sort((a, b) => a.number - b.number);

  return (
    <div className="grid grid-cols-2 gap-3 mt-3 text-[11px] sm:text-xs">
      <div>
        <h4 className="text-[10px] uppercase tracking-wider font-semibold text-fab-gold mb-1.5">
          Across
        </h4>
        <div className="space-y-1">
          {across.map((w) => {
            const solved = solvedWords.includes(w.number);
            const isActive = activeClueNumber === w.number && activeDirection === "across";
            return (
              <button
                key={`a-${w.number}`}
                onClick={() => onClueClick(w.number, "across")}
                className={`w-full text-left px-1.5 py-1 rounded transition-colors ${
                  isActive
                    ? "bg-fab-gold/15 text-fab-text"
                    : solved
                    ? "text-fab-dim line-through"
                    : "text-fab-muted hover:text-fab-text"
                }`}
              >
                <span className="font-bold text-fab-dim mr-1">{w.number}.</span>
                {w.clue}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <h4 className="text-[10px] uppercase tracking-wider font-semibold text-fab-gold mb-1.5">
          Down
        </h4>
        <div className="space-y-1">
          {down.map((w) => {
            const solved = solvedWords.includes(w.number);
            const isActive = activeClueNumber === w.number && activeDirection === "down";
            return (
              <button
                key={`d-${w.number}`}
                onClick={() => onClueClick(w.number, "down")}
                className={`w-full text-left px-1.5 py-1 rounded transition-colors ${
                  isActive
                    ? "bg-fab-gold/15 text-fab-text"
                    : solved
                    ? "text-fab-dim line-through"
                    : "text-fab-muted hover:text-fab-text"
                }`}
              >
                <span className="font-bold text-fab-dim mr-1">{w.number}.</span>
                {w.clue}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
