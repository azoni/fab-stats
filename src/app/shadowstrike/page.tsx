"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { GameNav } from "@/components/games/GameNav";
import { ShadowStrikeBoard } from "@/components/shadowstrike/ShadowStrikeBoard";
import { ShadowStrikeResult } from "@/components/shadowstrike/ShadowStrikeResult";
import { ShadowStrikeShareCard } from "@/components/shadowstrike/ShadowStrikeShareCard";
import { generateDailyPuzzle, TOTAL_PAIRS, HINT_FAIL_THRESHOLD } from "@/lib/shadowstrike/puzzle-generator";
import { createFreshGameState, loadGameState, saveGameState, cleanupOldStates } from "@/lib/shadowstrike/game-state";
import { saveResult, loadStats, markShared } from "@/lib/shadowstrike/firestore";
import { createShadowStrikeFeedEvent } from "@/lib/feed";
import { logActivity } from "@/lib/activity-log";
import { detectTierUp, type BadgeTierInfo } from "@/lib/badge-tiers";
import { BadgeTierUpPopup } from "@/components/profile/BadgeTierUpPopup";
import type { ShadowStrikeGameState, ShadowStrikeStats } from "@/lib/shadowstrike/types";

function getTodayDateStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export default function ShadowStrikePage() {
  const { user, profile } = useAuth();
  const dateStr = getTodayDateStr();
  const puzzle = generateDailyPuzzle(dateStr);

  const [gameState, setGameState] = useState<ShadowStrikeGameState>(() => {
    if (typeof window === "undefined") return createFreshGameState(dateStr);
    return loadGameState(dateStr) || createFreshGameState(dateStr);
  });
  const [stats, setStats] = useState<ShadowStrikeStats | null>(null);
  const [showResult, setShowResult] = useState(gameState.completed);
  const [showShare, setShowShare] = useState(false);
  const [badgeTierUp, setBadgeTierUp] = useState<{ tier: BadgeTierInfo; count: number } | null>(null);
  const completionSaved = useRef(false);
  const sharedDatesRef = useRef(new Set<string>());
  const flipLockRef = useRef(false);

  useEffect(() => { cleanupOldStates(); }, []);

  useEffect(() => {
    if (user) loadStats(user.uid).then(setStats);
  }, [user]);

  const handleFlip = useCallback((position: number) => {
    if (gameState.completed || flipLockRef.current) return;
    if (gameState.revealedPositions.includes(position)) return;
    if (gameState.matchedCardIds.includes(puzzle.grid[position])) return;

    const now = Date.now();

    // Start timer on first flip
    const startedAt = gameState.startedAt ?? now;
    const currentElapsed = gameState.startedAt
      ? gameState.elapsedMs + (now - gameState.startedAt)
      : 0;

    const newRevealed = [...gameState.revealedPositions, position];

    if (newRevealed.length === 1) {
      // First card of a pair — just reveal it
      const newState: ShadowStrikeGameState = {
        ...gameState,
        revealedPositions: newRevealed,
        startedAt,
      };
      setGameState(newState);
      saveGameState(newState);
      return;
    }

    if (newRevealed.length === 2) {
      const [pos1, pos2] = newRevealed;
      const card1 = puzzle.grid[pos1];
      const card2 = puzzle.grid[pos2];
      const newFlips = gameState.flips + 1;

      if (card1 === card2) {
        // Match found!
        const newMatchedCardIds = [...gameState.matchedCardIds, card1];
        const completed = newMatchedCardIds.length >= TOTAL_PAIRS;
        const finalElapsed = completed ? currentElapsed : undefined;

        const newState: ShadowStrikeGameState = {
          ...gameState,
          flips: newFlips,
          matchedCardIds: newMatchedCardIds,
          revealedPositions: [],
          completed,
          won: completed && (gameState.hintsUsed ?? 0) < HINT_FAIL_THRESHOLD,
          elapsedMs: finalElapsed ?? gameState.elapsedMs,
          startedAt: completed ? null : startedAt,
        };

        setGameState(newState);
        saveGameState(newState);

        if (completed) {
          setTimeout(() => setShowResult(true), 500);

          if (user && !completionSaved.current) {
            completionSaved.current = true;
            const didWin = (gameState.hintsUsed ?? 0) < HINT_FAIL_THRESHOLD;
            const result = {
              date: dateStr,
              won: didWin,
              flips: newFlips,
              elapsedMs: currentElapsed,
              pairsFound: TOTAL_PAIRS,
              hintsUsed: gameState.hintsUsed ?? 0,
              timestamp: Date.now(),
              uid: user.uid,
            };
            const oldGamesPlayed = stats?.gamesPlayed ?? 0;
            saveResult(user.uid, result)
              .then(() => loadStats(user.uid))
              .then((s) => {
                if (s) {
                  setStats(s);
                  const tierUp = detectTierUp("shadowstrike-player", oldGamesPlayed, s.gamesPlayed);
                  if (tierUp) setBadgeTierUp({ tier: tierUp, count: s.gamesPlayed });
                }
              })
              .catch(console.error);

            if (profile) {
              createShadowStrikeFeedEvent(profile, "completed", dateStr, didWin, newFlips, currentElapsed, TOTAL_PAIRS).catch(() => {});
            }
          }
        }
      } else {
        // No match — show both briefly, then flip back
        const tempState: ShadowStrikeGameState = {
          ...gameState,
          flips: newFlips,
          revealedPositions: newRevealed,
          startedAt,
        };
        setGameState(tempState);
        flipLockRef.current = true;

        setTimeout(() => {
          const resetState: ShadowStrikeGameState = {
            ...tempState,
            revealedPositions: [],
          };
          setGameState(resetState);
          saveGameState(resetState);
          flipLockRef.current = false;
        }, 800);
      }
    }
  }, [gameState, puzzle, dateStr, user, profile]);

  const handleHint = useCallback(() => {
    if (gameState.completed || flipLockRef.current) return;

    // Find the first unmatched card ID
    const unmatchedCardId = puzzle.cards.find((c) => !gameState.matchedCardIds.includes(c.id))?.id;
    if (unmatchedCardId === undefined) return;

    const now = Date.now();
    const startedAt = gameState.startedAt ?? now;
    const currentElapsed = gameState.startedAt
      ? gameState.elapsedMs + (now - gameState.startedAt)
      : 0;

    const newMatchedCardIds = [...gameState.matchedCardIds, unmatchedCardId];
    const newHintsUsed = (gameState.hintsUsed ?? 0) + 1;
    const completed = newMatchedCardIds.length >= TOTAL_PAIRS;

    const newState: ShadowStrikeGameState = {
      ...gameState,
      matchedCardIds: newMatchedCardIds,
      revealedPositions: [],
      hintsUsed: newHintsUsed,
      completed,
      won: completed && newHintsUsed < HINT_FAIL_THRESHOLD,
      elapsedMs: completed ? currentElapsed : gameState.elapsedMs,
      startedAt: completed ? null : startedAt,
    };

    setGameState(newState);
    saveGameState(newState);

    if (completed) {
      setTimeout(() => setShowResult(true), 500);

      if (user && !completionSaved.current) {
        completionSaved.current = true;
        const didWin = newHintsUsed < HINT_FAIL_THRESHOLD;
        const result = {
          date: dateStr,
          won: didWin,
          flips: gameState.flips,
          elapsedMs: currentElapsed,
          pairsFound: TOTAL_PAIRS,
          hintsUsed: newHintsUsed,
          timestamp: Date.now(),
          uid: user.uid,
        };
        const oldGamesPlayed = stats?.gamesPlayed ?? 0;
        saveResult(user.uid, result)
          .then(() => loadStats(user.uid))
          .then((s) => {
            if (s) {
              setStats(s);
              const tierUp = detectTierUp("shadowstrike-player", oldGamesPlayed, s.gamesPlayed);
              if (tierUp) setBadgeTierUp({ tier: tierUp, count: s.gamesPlayed });
            }
          })
          .catch(console.error);

        if (profile) {
          createShadowStrikeFeedEvent(profile, "completed", dateStr, didWin, gameState.flips, currentElapsed, TOTAL_PAIRS).catch(() => {});
        }
      }
    }
  }, [gameState, puzzle, dateStr, user, profile]);

  function triggerShared() {
    if (sharedDatesRef.current.has(dateStr)) return;
    sharedDatesRef.current.add(dateStr);
    if (user) {
      markShared(user.uid).catch(() => {});
      logActivity("shadowstrike_share", dateStr);
      if (profile) {
        createShadowStrikeFeedEvent(profile, "shared", dateStr, gameState.won, gameState.flips, gameState.elapsedMs, gameState.matchedCardIds.length).catch(() => {});
      }
    }
  }

  return (
    <div className="max-w-lg mx-auto py-4 px-4">
      <GameNav current="shadowstrike" />

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-fab-text">Shadow Strike</h1>
          <p className="text-[10px] text-fab-dim">Find all {TOTAL_PAIRS} matching pairs</p>
        </div>
        <p className="text-[10px] text-fab-dim">{dateStr}</p>
      </div>

      <ShadowStrikeBoard
        puzzle={puzzle}
        gameState={gameState}
        onFlip={handleFlip}
        onHint={handleHint}
      />

      {showResult && (
        <div className="mt-4">
          <ShadowStrikeResult
            won={gameState.won}
            flips={gameState.flips}
            elapsedMs={gameState.elapsedMs}
            hintsUsed={gameState.hintsUsed}
            stats={stats}
            onShare={() => setShowShare(true)}
          />
        </div>
      )}

      {badgeTierUp && (
        <BadgeTierUpPopup badgeId="shadowstrike-player" badgeName="Shadow Striker" tier={badgeTierUp.tier} count={badgeTierUp.count} onClose={() => setBadgeTierUp(null)} />
      )}

      {showShare && (
        <ShadowStrikeShareCard
          dateStr={dateStr}
          won={gameState.won}
          flips={gameState.flips}
          elapsedMs={gameState.elapsedMs}
          hintsUsed={gameState.hintsUsed}
          onClose={() => setShowShare(false)}
          onShared={triggerShared}
        />
      )}
    </div>
  );
}
