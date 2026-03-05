"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { GameNav } from "@/components/games/GameNav";
import { ConnectionsBoard } from "@/components/connections/ConnectionsBoard";
import { ConnectionsResult } from "@/components/connections/ConnectionsResult";
import { ConnectionsShareCard } from "@/components/connections/ConnectionsShareCard";
import { generateDailyPuzzle, getShuffledWords, MAX_MISTAKES } from "@/lib/connections/puzzle-generator";
import { createFreshGameState, loadGameState, saveGameState, cleanupOldStates } from "@/lib/connections/game-state";
import { saveResult, loadStats, markShared } from "@/lib/connections/firestore";
import { createConnectionsFeedEvent } from "@/lib/feed";
import { logActivity } from "@/lib/activity-log";
import { detectTierUp } from "@/lib/badge-tiers";
import { BadgeTierUpPopup } from "@/components/profile/BadgeTierUpPopup";
import type { ConnectionsGameState, ConnectionsStats, ConnectionsGuess } from "@/lib/connections/types";

function getTodayDateStr(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
}

export default function ConnectionsPage() {
  const { user, profile } = useAuth();
  const dateStr = getTodayDateStr();
  const puzzle = generateDailyPuzzle(dateStr);
  const shuffledWords = getShuffledWords(puzzle, dateStr);

  const [gameState, setGameState] = useState<ConnectionsGameState>(() => {
    if (typeof window === "undefined") return createFreshGameState(dateStr);
    return loadGameState(dateStr) || createFreshGameState(dateStr);
  });
  const [stats, setStats] = useState<ConnectionsStats | null>(null);
  const [showResult, setShowResult] = useState(gameState.completed);
  const [showShare, setShowShare] = useState(false);
  const [badgeTierUp, setBadgeTierUp] = useState<{ tier: import("@/lib/badge-tiers").BadgeTierInfo; count: number } | null>(null);
  const completionSaved = useRef(false);
  const sharedDatesRef = useRef(new Set<string>());

  useEffect(() => { cleanupOldStates(); }, []);

  useEffect(() => {
    if (user) loadStats(user.uid).then(setStats);
  }, [user]);

  const handleGuess = useCallback((words: string[]) => {
    if (gameState.completed) return;

    // Check if the 4 selected words match any unsolved group exactly
    let matchedGroupIndex = -1;
    for (let gi = 0; gi < 4; gi++) {
      if (gameState.solvedGroups.includes(gi)) continue;
      const groupWords = puzzle.groups[gi].words;
      if (words.length === 4 && words.every((w) => groupWords.includes(w))) {
        matchedGroupIndex = gi;
        break;
      }
    }

    const correct = matchedGroupIndex >= 0;
    const guess: ConnectionsGuess = {
      words,
      correct,
      groupIndex: matchedGroupIndex,
    };

    const newGuesses = [...gameState.guesses, guess];
    const newSolvedGroups = correct
      ? [...gameState.solvedGroups, matchedGroupIndex]
      : gameState.solvedGroups;
    const newMistakes = correct ? gameState.mistakes : gameState.mistakes + 1;

    // Check completion conditions
    const allGroupsSolved = newSolvedGroups.length === 4;
    const tooManyMistakes = newMistakes >= MAX_MISTAKES;
    const completed = allGroupsSolved || tooManyMistakes;
    const won = allGroupsSolved;

    const newState: ConnectionsGameState = {
      ...gameState,
      guesses: newGuesses,
      solvedGroups: newSolvedGroups,
      mistakes: newMistakes,
      completed,
      won,
    };

    setGameState(newState);
    saveGameState(newState);

    if (completed) {
      setShowResult(true);

      // Build solve order (difficulty of each solved group in order)
      const solveOrder = newSolvedGroups.map((gi) => puzzle.groups[gi].difficulty);

      if (user && !completionSaved.current) {
        completionSaved.current = true;
        const result = {
          date: dateStr,
          won,
          mistakes: newMistakes,
          solveOrder,
          timestamp: Date.now(),
          uid: user.uid,
        };
        const oldGamesPlayed = stats?.gamesPlayed ?? 0;
        saveResult(user.uid, result)
          .then(() => loadStats(user.uid))
          .then((s) => {
            if (s) {
              setStats(s);
              const tierUp = detectTierUp("connections-player", oldGamesPlayed, s.gamesPlayed);
              if (tierUp) setBadgeTierUp({ tier: tierUp, count: s.gamesPlayed });
            }
          })
          .catch(console.error);

        if (profile) {
          createConnectionsFeedEvent(
            profile,
            "completed",
            dateStr,
            won,
            newSolvedGroups.length,
            newMistakes,
          ).catch(() => {});
        }
      }
    }
  }, [gameState, puzzle, dateStr, user, profile]);

  function triggerShared() {
    if (sharedDatesRef.current.has(dateStr)) return;
    sharedDatesRef.current.add(dateStr);
    if (user) {
      markShared(user.uid).catch(() => {});
      logActivity("connections_share", dateStr);
      if (profile) {
        createConnectionsFeedEvent(
          profile,
          "shared",
          dateStr,
          gameState.won,
          gameState.solvedGroups.length,
          gameState.mistakes,
        ).catch(() => {});
      }
    }
  }

  const solveOrder = gameState.solvedGroups.map((gi) => puzzle.groups[gi].difficulty);

  return (
    <div className="max-w-lg mx-auto py-4 px-4">
      <GameNav current="connections" />

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-fab-text">FaB Connections</h1>
          <p className="text-[10px] text-fab-dim">Find four groups of four</p>
        </div>
        <p className="text-[10px] text-fab-dim">{dateStr}</p>
      </div>

      <ConnectionsBoard
        puzzle={puzzle}
        shuffledWords={shuffledWords}
        guesses={gameState.guesses}
        solvedGroups={gameState.solvedGroups}
        mistakes={gameState.mistakes}
        completed={gameState.completed}
        onGuess={handleGuess}
      />

      {showResult && (
        <div className="mt-4">
          <ConnectionsResult
            won={gameState.won}
            mistakes={gameState.mistakes}
            solveOrder={solveOrder}
            stats={stats}
            dateStr={dateStr}
            onShare={() => setShowShare(true)}
          />
        </div>
      )}

      {showShare && (
        <ConnectionsShareCard
          dateStr={dateStr}
          won={gameState.won}
          guesses={gameState.guesses}
          solveOrder={solveOrder}
          puzzle={puzzle}
          onClose={() => setShowShare(false)}
          onShared={triggerShared}
        />
      )}
      {badgeTierUp && (
        <BadgeTierUpPopup badgeId="connections-player" badgeName="Connector" tier={badgeTierUp.tier} count={badgeTierUp.count} onClose={() => setBadgeTierUp(null)} />
      )}
    </div>
  );
}
