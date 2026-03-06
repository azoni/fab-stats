"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { GameNav } from "@/components/games/GameNav";
import { TimelineBoard } from "@/components/timeline/TimelineBoard";
import { TimelineResult } from "@/components/timeline/TimelineResult";
import { TimelineShareCard } from "@/components/timeline/TimelineShareCard";
import { generateDailyTimeline, ITEMS_PER_GAME, STARTING_LIVES } from "@/lib/timeline/puzzle-generator";
import { createFreshGameState, loadGameState, saveGameState, cleanupOldStates } from "@/lib/timeline/game-state";
import { saveResult, loadStats, markShared } from "@/lib/timeline/firestore";
import { createTimelineFeedEvent } from "@/lib/feed";
import { logActivity } from "@/lib/activity-log";
import { detectTierUp } from "@/lib/badge-tiers";
import { BadgeTierUpPopup } from "@/components/profile/BadgeTierUpPopup";
import { syncAchievementsAfterGame } from "@/lib/achievement-tracking";
import type { TimelineGameState, TimelineStats, TimelinePlacement } from "@/lib/timeline/types";
import type { TimelineItem } from "@/lib/timeline/types";

function getTodayDateStr(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
}

export default function TimelinePage() {
  const { user, profile } = useAuth();
  const dateStr = getTodayDateStr();
  const items = generateDailyTimeline(dateStr);

  const [gameState, setGameState] = useState<TimelineGameState>(() => {
    if (typeof window === "undefined") return createFreshGameState(dateStr);
    return loadGameState(dateStr) || createFreshGameState(dateStr);
  });
  const [stats, setStats] = useState<TimelineStats | null>(null);
  const [showResult, setShowResult] = useState(gameState.completed);
  const [showShare, setShowShare] = useState(false);
  const [badgeTierUp, setBadgeTierUp] = useState<{ tier: import("@/lib/badge-tiers").BadgeTierInfo; count: number } | null>(null);
  const completionSaved = useRef(false);
  const sharedDatesRef = useRef(new Set<string>());

  useEffect(() => { cleanupOldStates(); }, []);

  useEffect(() => {
    if (user) loadStats(user.uid).then(setStats);
  }, [user]);

  const handlePlace = useCallback((position: number) => {
    if (gameState.completed) return;

    const currentItemData = items[gameState.currentItem];
    if (!currentItemData) return;

    // Build the placed items sorted by date to determine correct position
    const placedItems = gameState.placements.map((p) => {
      const item = items.find((it) => it.id === p.itemId)!;
      return { ...item, correct: p.correct };
    });
    placedItems.sort((a, b) => a.date.localeCompare(b.date));

    const placedDates = placedItems.map((it) => it.date);
    const newDate = currentItemData.date;

    // Find where this date should go in the sorted placed dates
    let correctPosition = 0;
    for (let i = 0; i < placedDates.length; i++) {
      if (newDate > placedDates[i]) {
        correctPosition = i + 1;
      }
    }

    const isCorrect = position === correctPosition;
    const placement: TimelinePlacement = {
      itemId: currentItemData.id,
      position,
      correct: isCorrect,
    };

    const newPlacements = [...gameState.placements, placement];
    const newLives = isCorrect ? gameState.lives : gameState.lives - 1;
    const nextItem = gameState.currentItem + 1;
    const allPlaced = nextItem >= ITEMS_PER_GAME;
    const noLives = newLives <= 0;
    const completed = allPlaced || noLives;
    const won = allPlaced && !noLives;

    const newState: TimelineGameState = {
      ...gameState,
      placements: newPlacements,
      currentItem: nextItem,
      completed,
      won,
      lives: newLives,
    };

    setGameState(newState);
    saveGameState(newState);

    if (completed) {
      setShowResult(true);

      const correctCount = newPlacements.filter((p) => p.correct).length;

      if (user && !completionSaved.current) {
        completionSaved.current = true;
        const result = {
          date: dateStr,
          won,
          livesRemaining: newLives,
          correctPlacements: correctCount,
          timestamp: Date.now(),
          uid: user.uid,
        };
        const oldGamesPlayed = stats?.gamesPlayed ?? 0;
        saveResult(user.uid, result)
          .then(() => loadStats(user.uid))
          .then((s) => {
            if (s) {
              setStats(s);
              const tierUp = detectTierUp("timeline-player", oldGamesPlayed, s.gamesPlayed);
              if (tierUp) setBadgeTierUp({ tier: tierUp, count: s.gamesPlayed });
              syncAchievementsAfterGame(user.uid).catch(() => {});
            }
          })
          .catch(console.error);

        if (profile) {
          createTimelineFeedEvent(profile, "completed", dateStr, won, newLives, ITEMS_PER_GAME).catch(() => {});
        }
      }
    }
  }, [gameState, items, dateStr, user, profile]);

  function triggerShared() {
    if (sharedDatesRef.current.has(dateStr)) return;
    sharedDatesRef.current.add(dateStr);
    if (user) {
      markShared(user.uid).catch(() => {});
      logActivity("timeline_share", dateStr);
      if (profile) {
        createTimelineFeedEvent(profile, "shared", dateStr, gameState.won, gameState.lives, ITEMS_PER_GAME).catch(() => {});
      }
    }
  }

  const correctCount = gameState.placements.filter((p) => p.correct).length;

  return (
    <div className="max-w-lg mx-auto py-4 px-4">
      <GameNav current="timeline" />

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-fab-text">FaB Timeline</h1>
          <p className="text-[10px] text-fab-dim">{ITEMS_PER_GAME} events · {STARTING_LIVES} lives</p>
        </div>
        <p className="text-[10px] text-fab-dim">{dateStr}</p>
      </div>

      <TimelineBoard
        items={items}
        placements={gameState.placements}
        currentItem={gameState.currentItem}
        lives={gameState.lives}
        completed={gameState.completed}
        onPlace={handlePlace}
      />

      {showResult && (
        <div className="mt-4">
          <TimelineResult
            won={gameState.won}
            correctPlacements={correctCount}
            livesRemaining={gameState.lives}
            stats={stats}
            dateStr={dateStr}
            onShare={() => setShowShare(true)}
          />
        </div>
      )}

      {showShare && (
        <TimelineShareCard
          dateStr={dateStr}
          won={gameState.won}
          placements={gameState.placements}
          livesRemaining={gameState.lives}
          onClose={() => setShowShare(false)}
          onShared={triggerShared}
        />
      )}
      {badgeTierUp && (
        <BadgeTierUpPopup badgeId="timeline-player" badgeName="Historian" tier={badgeTierUp.tier} count={badgeTierUp.count} onClose={() => setBadgeTierUp(null)} />
      )}
    </div>
  );
}
