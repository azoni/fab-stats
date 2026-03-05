"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { GameNav } from "@/components/games/GameNav";
import { HeroGuesserBoard } from "@/components/heroguesser/HeroGuesserBoard";
import { HeroGuesserResult } from "@/components/heroguesser/HeroGuesserResult";
import { HeroGuesserShareCard } from "@/components/heroguesser/HeroGuesserShareCard";
import { generateDailyHero, compareHeroes, getHeroPool } from "@/lib/heroguesser/puzzle-generator";
import { createFreshGameState, loadGameState, saveGameState, cleanupOldStates } from "@/lib/heroguesser/game-state";
import { saveResult, loadStats, markShared } from "@/lib/heroguesser/firestore";
import { createHeroGuesserFeedEvent } from "@/lib/feed";
import { logActivity } from "@/lib/activity-log";
import { getHeroByName } from "@/lib/heroes";
import type { HeroGuesserGameState, HeroGuesserStats } from "@/lib/heroguesser/types";

function getTodayDateStr(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
}

export default function HeroGuesserPage() {
  const { user, profile } = useAuth();
  const dateStr = getTodayDateStr();
  const answer = generateDailyHero(dateStr);
  const heroPool = getHeroPool();

  const [gameState, setGameState] = useState<HeroGuesserGameState>(() => {
    if (typeof window === "undefined") return createFreshGameState(dateStr);
    return loadGameState(dateStr) || createFreshGameState(dateStr);
  });
  const [stats, setStats] = useState<HeroGuesserStats | null>(null);
  const [showResult, setShowResult] = useState(gameState.completed);
  const [showShare, setShowShare] = useState(false);
  const completionSaved = useRef(false);
  const sharedDatesRef = useRef(new Set<string>());

  // Cleanup old states on mount
  useEffect(() => { cleanupOldStates(); }, []);

  // Load stats
  useEffect(() => {
    if (user) loadStats(user.uid).then(setStats);
  }, [user]);

  const handleGuess = useCallback((heroName: string) => {
    if (gameState.completed || gameState.guesses.length >= gameState.maxGuesses) return;

    const guessHero = getHeroByName(heroName);
    if (!guessHero) return;

    const clues = compareHeroes(guessHero, answer);
    const won = guessHero.name === answer.name;
    const isLast = gameState.guesses.length + 1 >= gameState.maxGuesses;
    const completed = won || isLast;

    const newState: HeroGuesserGameState = {
      ...gameState,
      guesses: [...gameState.guesses, { heroName, clues }],
      completed,
      won,
    };

    setGameState(newState);
    saveGameState(newState);

    if (completed) {
      setShowResult(true);
      // Save to Firestore
      if (user && !completionSaved.current) {
        completionSaved.current = true;
        const result = {
          date: dateStr,
          won,
          guessCount: newState.guesses.length,
          timestamp: Date.now(),
          uid: user.uid,
        };
        saveResult(user.uid, result)
          .then(() => loadStats(user.uid))
          .then((s) => { if (s) setStats(s); })
          .catch(console.error);

        // Post feed event
        if (profile) {
          createHeroGuesserFeedEvent(profile, "completed", dateStr, won, newState.guesses.length, gameState.maxGuesses).catch(() => {});
        }
      }
    }
  }, [gameState, answer, dateStr, user, profile]);

  function triggerShared() {
    if (sharedDatesRef.current.has(dateStr)) return;
    sharedDatesRef.current.add(dateStr);
    if (user) {
      markShared(user.uid).catch(() => {});
      logActivity("heroguesser_share", dateStr);
      if (profile) {
        createHeroGuesserFeedEvent(profile, "shared", dateStr, gameState.won, gameState.guesses.length, gameState.maxGuesses).catch(() => {});
      }
    }
  }

  return (
    <div className="max-w-lg mx-auto py-4 px-4">
      <GameNav current="heroguesser" />

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-fab-text">Hero Guesser</h1>
          <p className="text-[10px] text-fab-dim">Guess the hero in {gameState.maxGuesses} tries</p>
        </div>
        <p className="text-[10px] text-fab-dim">{dateStr}</p>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mb-4 text-[9px] text-fab-dim">
        <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-fab-win/40" /> Correct</div>
        <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-yellow-500/30" /> Close</div>
        <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-fab-loss/30" /> Wrong</div>
      </div>

      <HeroGuesserBoard
        guesses={gameState.guesses}
        maxGuesses={gameState.maxGuesses}
        heroPool={heroPool}
        completed={gameState.completed}
        onGuess={handleGuess}
      />

      {showResult && (
        <div className="mt-4">
          <HeroGuesserResult
            won={gameState.won}
            guessCount={gameState.guesses.length}
            maxGuesses={gameState.maxGuesses}
            answer={answer}
            stats={stats}
            dateStr={dateStr}
            onShare={() => setShowShare(true)}
          />
        </div>
      )}

      {showShare && (
        <HeroGuesserShareCard
          dateStr={dateStr}
          won={gameState.won}
          guesses={gameState.guesses}
          maxGuesses={gameState.maxGuesses}
          onClose={() => setShowShare(false)}
          onShared={triggerShared}
        />
      )}
    </div>
  );
}
