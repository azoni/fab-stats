"use client";
import { useState, useEffect, useRef } from "react";
import type { BladeDashGameState } from "@/lib/bladedash/types";
import type { BladeDashWord } from "@/lib/bladedash/word-bank";
import { WORDS_PER_GAME, MAX_HINTS } from "@/lib/bladedash/puzzle-generator";

function formatTime(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const CATEGORY_COLORS: Record<string, string> = {
  hero: "bg-indigo-500/20 text-indigo-400",
  weapon: "bg-red-500/20 text-red-400",
  attack: "bg-orange-500/20 text-orange-400",
  mechanic: "bg-cyan-500/20 text-cyan-400",
  equipment: "bg-green-500/20 text-green-400",
  region: "bg-purple-500/20 text-purple-400",
};

export function BladeDashBoard({
  words,
  gameState,
  onGuess,
  onHint,
}: {
  words: BladeDashWord[];
  gameState: BladeDashGameState;
  onGuess: (guess: string) => boolean;
  onHint: () => void;
}) {
  const [input, setInput] = useState("");
  const [shake, setShake] = useState(false);
  const [solved, setSolved] = useState(false);
  const [displayTime, setDisplayTime] = useState(gameState.elapsedMs);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Live timer
  useEffect(() => {
    if (gameState.completed) {
      setDisplayTime(gameState.elapsedMs);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    if (gameState.startedAt) {
      timerRef.current = setInterval(() => {
        setDisplayTime(gameState.elapsedMs + (Date.now() - gameState.startedAt!));
      }, 100);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
    setDisplayTime(gameState.elapsedMs);
  }, [gameState.startedAt, gameState.elapsedMs, gameState.completed]);

  // Focus input when current word changes
  useEffect(() => {
    if (!gameState.completed) {
      inputRef.current?.focus();
      setInput("");
      setSolved(false);
    }
  }, [gameState.currentWord, gameState.completed]);

  const currentWordState = gameState.words[gameState.currentWord];
  const currentWord = words[gameState.currentWord];

  if (!currentWordState || !currentWord || gameState.completed) {
    return (
      <div>
        <ProgressDots gameState={gameState} />
        <div className="text-center">
          <p className="font-mono text-fab-text">{formatTime(displayTime)}</p>
        </div>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    const correct = onGuess(input.trim().toUpperCase());
    if (correct) {
      setSolved(true);
      setInput("");
      setTimeout(() => setSolved(false), 500);
    } else {
      setShake(true);
      setInput("");
      setTimeout(() => setShake(false), 500);
    }
  }

  // Build display letters: show revealed hints in correct position, scrambled for the rest
  const displayLetters = currentWordState.scrambled.split("").map((letter, i) => {
    const isRevealed = currentWordState.revealedIndices.includes(i);
    return {
      letter: isRevealed ? currentWord.word[i] : letter,
      isHint: isRevealed,
    };
  });

  return (
    <div>
      <ProgressDots gameState={gameState} />

      {/* Timer */}
      <div className="text-center mb-3">
        <span className="font-mono text-sm text-fab-text">{formatTime(displayTime)}</span>
        <span className="ml-3 text-[10px] text-fab-dim">
          Hints: {gameState.totalHintsUsed}/{MAX_HINTS}
        </span>
      </div>

      {/* Word number + category */}
      <div className="text-center mb-2">
        <p className="text-[10px] text-fab-dim">Word {gameState.currentWord + 1}/{WORDS_PER_GAME}</p>
        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider mt-1 ${CATEGORY_COLORS[currentWord.category] || "bg-fab-border text-fab-dim"}`}>
          {currentWord.category}
        </span>
      </div>

      {/* Scrambled letters */}
      <div className={`flex justify-center gap-1.5 mb-4 ${solved ? "animate-pulse" : ""}`}>
        {displayLetters.map((l, i) => (
          <div
            key={i}
            className={`w-9 h-11 sm:w-10 sm:h-12 rounded-lg border-2 flex items-center justify-center text-lg font-bold transition-all ${
              l.isHint
                ? "border-pink-400/50 bg-pink-900/20 text-pink-400"
                : "border-fab-border bg-fab-surface text-fab-text"
            }`}
          >
            {l.letter}
          </div>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          placeholder="Type your answer..."
          maxLength={currentWord.word.length + 2}
          autoComplete="off"
          autoCapitalize="characters"
          className={`w-full px-4 py-3 bg-fab-surface border-2 rounded-lg text-center text-sm font-bold text-fab-text placeholder:text-fab-dim/50 focus:outline-none focus:border-pink-400/50 transition-all ${
            shake ? "animate-[shake_0.3s_ease-in-out] border-fab-loss/50" : "border-fab-border"
          }`}
        />
        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 px-3 py-2 bg-pink-500/15 text-pink-400 text-xs font-medium rounded-lg hover:bg-pink-500/25 transition-colors"
          >
            Submit
          </button>
          <button
            type="button"
            onClick={onHint}
            disabled={gameState.totalHintsUsed >= MAX_HINTS}
            className="px-3 py-2 bg-fab-surface border border-fab-border text-fab-muted text-xs font-medium rounded-lg hover:text-fab-text transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Hint ({MAX_HINTS - gameState.totalHintsUsed})
          </button>
        </div>
      </form>

      {/* Previously solved words */}
      {gameState.currentWord > 0 && (
        <div className="mt-4 space-y-1">
          {gameState.words.slice(0, gameState.currentWord).map((ws, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="text-fab-win">✓</span>
              <span className="text-fab-muted line-through decoration-pink-400/50">{words[i].word}</span>
              <span className={`px-1.5 py-0 rounded text-[9px] ${CATEGORY_COLORS[words[i].category] || ""}`}>{words[i].category}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProgressDots({ gameState }: { gameState: BladeDashGameState }) {
  return (
    <div className="flex gap-1.5 justify-center mb-4">
      {Array.from({ length: WORDS_PER_GAME }).map((_, i) => {
        const ws = gameState.words[i];
        let color = "bg-fab-border";
        if (ws?.solved) color = "bg-fab-win";
        else if (i === gameState.currentWord) color = "bg-pink-400";
        return <div key={i} className={`w-6 h-2 rounded-full ${color} transition-colors`} />;
      })}
    </div>
  );
}
