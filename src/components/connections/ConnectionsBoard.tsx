"use client";
import { useState, useCallback, useMemo } from "react";
import type { ConnectionsPuzzle, ConnectionsGuess } from "@/lib/connections/types";
import { MAX_MISTAKES } from "@/lib/connections/puzzle-generator";

const DIFFICULTY_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/30" },
  2: { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/30" },
  3: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30" },
  4: { bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/30" },
};

function MistakeDots({ mistakes }: { mistakes: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5 mb-3">
      <span className="text-[10px] text-fab-dim mr-1">Mistakes remaining:</span>
      {Array.from({ length: MAX_MISTAKES }).map((_, i) => (
        <div
          key={i}
          className={`w-3 h-3 rounded-full transition-colors ${
            i < MAX_MISTAKES - mistakes ? "bg-fab-gold" : "bg-fab-border"
          }`}
        />
      ))}
    </div>
  );
}

function SolvedGroup({ name, words, difficulty }: { name: string; words: string[]; difficulty: number }) {
  const colors = DIFFICULTY_COLORS[difficulty] || DIFFICULTY_COLORS[1];
  return (
    <div className={`${colors.bg} border ${colors.border} rounded-lg p-3 mb-2 animate-fade-in`}>
      <p className={`text-xs font-bold ${colors.text} text-center uppercase tracking-wider mb-1`}>{name}</p>
      <p className="text-xs text-fab-text text-center">{words.join(", ")}</p>
    </div>
  );
}

function OneAwayToast({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-fab-surface border border-fab-border rounded-lg px-4 py-2 shadow-lg z-10 animate-fade-in">
      <p className="text-sm font-medium text-fab-text">One away!</p>
    </div>
  );
}

export function ConnectionsBoard({
  puzzle,
  shuffledWords,
  guesses,
  solvedGroups,
  mistakes,
  completed,
  onGuess,
}: {
  puzzle: ConnectionsPuzzle;
  shuffledWords: string[];
  guesses: ConnectionsGuess[];
  solvedGroups: number[];
  mistakes: number;
  completed: boolean;
  onGuess: (words: string[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showOneAway, setShowOneAway] = useState(false);
  const [shakeWords, setShakeWords] = useState<Set<string>>(new Set());

  // Words still in the grid (not part of solved groups)
  const remainingWords = useMemo(() => {
    const solvedWords = new Set<string>();
    for (const gi of solvedGroups) {
      for (const w of puzzle.groups[gi].words) {
        solvedWords.add(w);
      }
    }
    return shuffledWords.filter((w) => !solvedWords.has(w));
  }, [shuffledWords, solvedGroups, puzzle]);

  // Local shuffle of remaining words
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);
  const displayWords = localOrder
    ? localOrder.filter((w) => remainingWords.includes(w))
    : remainingWords;

  // If localOrder has stale words, reset
  if (localOrder && displayWords.length !== remainingWords.length) {
    setLocalOrder(null);
  }

  const toggleWord = useCallback(
    (word: string) => {
      if (completed) return;
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(word)) {
          next.delete(word);
        } else if (next.size < 4) {
          next.add(word);
        }
        return next;
      });
    },
    [completed],
  );

  const handleSubmit = useCallback(() => {
    if (selected.size !== 4 || completed) return;
    const words = [...selected];

    // Check if 3 of 4 match any unsolved group (one away)
    let isOneAway = false;
    for (let gi = 0; gi < 4; gi++) {
      if (solvedGroups.includes(gi)) continue;
      const groupWords = new Set(puzzle.groups[gi].words);
      const overlap = words.filter((w) => groupWords.has(w)).length;
      if (overlap === 3) {
        isOneAway = true;
        break;
      }
    }

    if (isOneAway) {
      setShowOneAway(true);
      setTimeout(() => setShowOneAway(false), 1500);
    }

    // Shake animation for wrong guesses
    const isCorrect = puzzle.groups.some(
      (g, gi) => !solvedGroups.includes(gi) && words.length === 4 && words.every((w) => g.words.includes(w)),
    );

    if (!isCorrect) {
      setShakeWords(new Set(words));
      setTimeout(() => setShakeWords(new Set()), 500);
    }

    onGuess(words);
    setSelected(new Set());
  }, [selected, completed, solvedGroups, puzzle, onGuess]);

  const handleDeselectAll = useCallback(() => {
    setSelected(new Set());
  }, []);

  const handleShuffle = useCallback(() => {
    const arr = [...remainingWords];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setLocalOrder(arr);
  }, [remainingWords]);

  // Sort solved groups by the order they were solved
  const solvedGroupsSorted = solvedGroups.map((gi) => puzzle.groups[gi]);

  return (
    <div className="relative">
      <OneAwayToast show={showOneAway} />

      {/* Solved groups */}
      {solvedGroupsSorted.map((group, i) => (
        <SolvedGroup key={i} name={group.name} words={[...group.words]} difficulty={group.difficulty} />
      ))}

      {/* Word grid */}
      {!completed && displayWords.length > 0 && (
        <>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {displayWords.map((word) => {
              const isSelected = selected.has(word);
              const isShaking = shakeWords.has(word);
              return (
                <button
                  key={word}
                  onClick={() => toggleWord(word)}
                  className={`
                    px-1 py-3 rounded-lg border text-xs font-medium text-center transition-all
                    min-h-[3rem] flex items-center justify-center leading-tight
                    ${isShaking ? "animate-shake" : ""}
                    ${
                      isSelected
                        ? "bg-fab-gold/20 border-fab-gold/50 text-fab-gold"
                        : "bg-fab-surface border-fab-border text-fab-text hover:border-fab-gold/30 hover:bg-fab-gold/5"
                    }
                  `}
                >
                  {word}
                </button>
              );
            })}
          </div>

          <MistakeDots mistakes={mistakes} />

          <div className="flex gap-2 justify-center">
            <button
              onClick={handleShuffle}
              className="px-4 py-2 bg-fab-surface border border-fab-border text-fab-dim text-xs font-medium rounded-lg hover:text-fab-text transition-colors"
            >
              Shuffle
            </button>
            <button
              onClick={handleDeselectAll}
              disabled={selected.size === 0}
              className="px-4 py-2 bg-fab-surface border border-fab-border text-fab-dim text-xs font-medium rounded-lg hover:text-fab-text transition-colors disabled:opacity-30"
            >
              Deselect All
            </button>
            <button
              onClick={handleSubmit}
              disabled={selected.size !== 4}
              className="px-4 py-2 bg-fab-gold/15 text-fab-gold text-xs font-medium rounded-lg hover:bg-fab-gold/25 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Submit
            </button>
          </div>
        </>
      )}

      {/* Show all groups when completed (fill in any that weren't solved) */}
      {completed && solvedGroups.length < 4 && (
        <>
          {puzzle.groups.map((group, gi) => {
            if (solvedGroups.includes(gi)) return null;
            return (
              <SolvedGroup
                key={gi}
                name={group.name}
                words={[...group.words]}
                difficulty={group.difficulty}
              />
            );
          })}
        </>
      )}
    </div>
  );
}
