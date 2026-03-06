"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { GameNav } from "@/components/games/GameNav";
import { BladeDashBoard } from "@/components/bladedash/BladeDashBoard";
import { BladeDashResult } from "@/components/bladedash/BladeDashResult";

import { generateDailyWords, WORDS_PER_GAME, HINT_FAIL_THRESHOLD } from "@/lib/bladedash/puzzle-generator";
import { createFreshGameState, loadGameState, saveGameState, cleanupOldStates } from "@/lib/bladedash/game-state";
import { saveResult, loadStats, markShared } from "@/lib/bladedash/firestore";
import { createBladeDashFeedEvent } from "@/lib/feed";
import { logActivity } from "@/lib/activity-log";
import { detectTierUp, type BadgeTierInfo } from "@/lib/badge-tiers";
import { BadgeTierUpPopup } from "@/components/profile/BadgeTierUpPopup";
import type { BladeDashGameState, BladeDashStats } from "@/lib/bladedash/types";

function getTodayDateStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export default function BladeDashPage() {
  const { user, profile } = useAuth();
  const dateStr = getTodayDateStr();
  const daily = generateDailyWords(dateStr);

  const [gameState, setGameState] = useState<BladeDashGameState>(() => {
    if (typeof window === "undefined") {
      return createFreshGameState(dateStr, daily.scrambled, daily.words.map((w) => w.id));
    }
    return loadGameState(dateStr) || createFreshGameState(dateStr, daily.scrambled, daily.words.map((w) => w.id));
  });
  const [stats, setStats] = useState<BladeDashStats | null>(null);
  const [showResult, setShowResult] = useState(gameState.completed);

  const [badgeTierUp, setBadgeTierUp] = useState<{ tier: BadgeTierInfo; count: number } | null>(null);
  const completionSaved = useRef(false);
  const sharedDatesRef = useRef(new Set<string>());

  useEffect(() => { cleanupOldStates(); }, []);

  useEffect(() => {
    if (user) loadStats(user.uid).then(setStats);
  }, [user]);

  const handleGuess = useCallback((guess: string): boolean => {
    if (gameState.completed) return false;

    const currentWord = daily.words[gameState.currentWord];
    if (!currentWord) return false;

    const now = Date.now();
    const startedAt = gameState.startedAt ?? now;

    if (guess !== currentWord.word) return false;

    // Correct!
    const newWords = [...gameState.words];
    newWords[gameState.currentWord] = { ...newWords[gameState.currentWord], solved: true };
    const nextWord = gameState.currentWord + 1;
    const completed = nextWord >= WORDS_PER_GAME;
    const currentElapsed = gameState.elapsedMs + (now - startedAt);

    const newState: BladeDashGameState = {
      ...gameState,
      words: newWords,
      currentWord: nextWord,
      completed,
      won: completed && gameState.totalHintsUsed < HINT_FAIL_THRESHOLD,
      elapsedMs: completed ? currentElapsed : gameState.elapsedMs,
      startedAt: completed ? null : startedAt,
    };

    setGameState(newState);
    saveGameState(newState);

    if (completed) {
      setTimeout(() => setShowResult(true), 500);

      if (user && !completionSaved.current) {
        completionSaved.current = true;
        const didWin = gameState.totalHintsUsed < HINT_FAIL_THRESHOLD;
        const result = {
          date: dateStr,
          won: didWin,
          elapsedMs: currentElapsed,
          hintsUsed: gameState.totalHintsUsed,
          wordsSolved: WORDS_PER_GAME,
          timestamp: Date.now(),
          uid: user.uid,
        };
        const oldGamesPlayed = stats?.gamesPlayed ?? 0;
        saveResult(user.uid, result)
          .then(() => loadStats(user.uid))
          .then((s) => {
            if (s) {
              setStats(s);
              const tierUp = detectTierUp("bladedash-player", oldGamesPlayed, s.gamesPlayed);
              if (tierUp) setBadgeTierUp({ tier: tierUp, count: s.gamesPlayed });
            }
          })
          .catch(console.error);

        if (profile) {
          createBladeDashFeedEvent(profile, "completed", dateStr, didWin, currentElapsed, gameState.totalHintsUsed, WORDS_PER_GAME).catch(() => {});
        }
      }
    }

    return true;
  }, [gameState, daily, dateStr, user, profile]);

  const handleHint = useCallback(() => {
    if (gameState.completed) return;

    const currentWord = daily.words[gameState.currentWord];
    if (!currentWord) return;

    const now = Date.now();
    const startedAt = gameState.startedAt ?? now;

    const wordState = gameState.words[gameState.currentWord];
    // Find next unrevealed index
    const unrevealed = currentWord.word
      .split("")
      .map((_, i) => i)
      .filter((i) => !wordState.revealedIndices.includes(i));

    if (unrevealed.length === 0) return;

    const revealIdx = unrevealed[0];
    const newWords = [...gameState.words];
    newWords[gameState.currentWord] = {
      ...wordState,
      hintsUsed: wordState.hintsUsed + 1,
      revealedIndices: [...wordState.revealedIndices, revealIdx],
    };

    const newState: BladeDashGameState = {
      ...gameState,
      words: newWords,
      totalHintsUsed: gameState.totalHintsUsed + 1,
      startedAt,
    };

    setGameState(newState);
    saveGameState(newState);
  }, [gameState, daily]);

  function triggerShared() {
    if (sharedDatesRef.current.has(dateStr)) return;
    sharedDatesRef.current.add(dateStr);
    if (user) {
      markShared(user.uid).catch(() => {});
      logActivity("bladedash_share", dateStr);
      if (profile) {
        const wordsSolved = gameState.words.filter((w) => w.solved).length;
        createBladeDashFeedEvent(profile, "shared", dateStr, gameState.won, gameState.elapsedMs, gameState.totalHintsUsed, wordsSolved).catch(() => {});
      }
    }
  }

  const wordsSolved = gameState.words.filter((w) => w.solved).length;

  return (
    <div className="max-w-lg mx-auto py-4 px-4">
      <GameNav current="bladedash" />

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-fab-text">Blade Dash</h1>
          <p className="text-[10px] text-fab-dim">Unscramble {WORDS_PER_GAME} ninja words · {HINT_FAIL_THRESHOLD}+ hints = fail</p>
        </div>
        <p className="text-[10px] text-fab-dim">{dateStr}</p>
      </div>

      <BladeDashBoard
        words={daily.words}
        gameState={gameState}
        onGuess={handleGuess}
        onHint={handleHint}
      />

      {showResult && (
        <div className="mt-4">
          <BladeDashResult
            won={gameState.won}
            elapsedMs={gameState.elapsedMs}
            hintsUsed={gameState.totalHintsUsed}
            wordsSolved={wordsSolved}
            stats={stats}
            onShared={triggerShared}
            dateStr={dateStr}
          />
        </div>
      )}

      {badgeTierUp && (
        <BadgeTierUpPopup badgeId="bladedash-player" badgeName="Blade Dasher" tier={badgeTierUp.tier} count={badgeTierUp.count} onClose={() => setBadgeTierUp(null)} />
      )}


    </div>
  );
}
