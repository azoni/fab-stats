"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { GameNav } from "@/components/games/GameNav";
import { BrawlBoard } from "@/components/brutebrawl/BrawlBoard";
import { BrawlResult } from "@/components/brutebrawl/BrawlResult";
import { BrawlShareCard } from "@/components/brutebrawl/BrawlShareCard";
import { generateDailyBrawl } from "@/lib/brutebrawl/puzzle-generator";
import { createFreshGameState, loadGameState, saveGameState, cleanupOldStates } from "@/lib/brutebrawl/game-state";
import { saveResult, loadStats, markShared } from "@/lib/brutebrawl/firestore";
import { createBrawlFeedEvent } from "@/lib/feed";
import { logActivity } from "@/lib/activity-log";
import { HowToPlay } from "@/components/dice/HowToPlay";
import { detectTierUp, type BadgeTierInfo } from "@/lib/badge-tiers";
import { BadgeTierUpPopup } from "@/components/profile/BadgeTierUpPopup";
import { syncAchievementsAfterGame } from "@/lib/achievement-tracking";
import type { BrawlGameState, BrawlStats } from "@/lib/brutebrawl/types";

function getTodayDateStr(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
}

export default function BruteBrawlPage() {
  const { user, profile } = useAuth();
  const dateStr = getTodayDateStr();
  const puzzle = generateDailyBrawl(dateStr);

  const [gameState, setGameState] = useState<BrawlGameState>(() => {
    if (typeof window === "undefined") return createFreshGameState(dateStr, puzzle);
    return loadGameState(dateStr) || createFreshGameState(dateStr, puzzle);
  });
  const [stats, setStats] = useState<BrawlStats | null>(null);
  const [showResult, setShowResult] = useState(gameState.completed);
  const [showShare, setShowShare] = useState(false);
  const [badgeTierUp, setBadgeTierUp] = useState<{ tier: BadgeTierInfo; count: number } | null>(null);
  const completionSaved = useRef(false);
  const sharedDatesRef = useRef(new Set<string>());

  useEffect(() => { cleanupOldStates(); }, []);

  useEffect(() => {
    if (user) loadStats(user.uid).then(setStats);
  }, [user]);

  const handleStateChange = useCallback((newState: BrawlGameState) => {
    setGameState(newState);
    saveGameState(newState);

    if (newState.completed) {
      setShowResult(true);

      if (user && !completionSaved.current) {
        completionSaved.current = true;
        const smashes = newState.roundHistory.filter((r) => r.isSmash).length;
        const blocked = newState.roundHistory.filter((r) => r.isBlock).length;
        const result = {
          date: dateStr,
          won: newState.won,
          totalDamage: newState.totalDamage,
          targetDamage: newState.targetDamage,
          rounds: newState.roundHistory.length,
          smashes,
          blocked,
          defenderName: newState.defenderName,
          difficulty: newState.difficulty,
          timestamp: Date.now(),
          uid: user.uid,
        };
        const oldGamesPlayed = stats?.gamesPlayed ?? 0;
        saveResult(user.uid, result)
          .then(() => loadStats(user.uid))
          .then((s) => {
            if (s) {
              setStats(s);
              const tierUp = detectTierUp("brutebrawl-player", oldGamesPlayed, s.gamesPlayed);
              if (tierUp) setBadgeTierUp({ tier: tierUp, count: s.gamesPlayed });
              syncAchievementsAfterGame(user.uid).catch(() => {});
            }
          })
          .catch(console.error);

        if (profile) {
          createBrawlFeedEvent(
            profile,
            "completed",
            dateStr,
            newState.won,
            newState.totalDamage,
            newState.targetDamage,
            newState.defenderName,
            newState.difficulty,
          ).catch((e) => console.error("[BruteBrawl] feed event error:", e));
        }
      }
    }
  }, [dateStr, user, profile, stats]);

  function triggerShared() {
    if (sharedDatesRef.current.has(dateStr)) return;
    sharedDatesRef.current.add(dateStr);
    if (user) {
      markShared(user.uid).catch((e) => console.error("[BruteBrawl] feed event error:", e));
      logActivity("brutebrawl_share", dateStr);
      if (profile) {
        createBrawlFeedEvent(
          profile,
          "shared",
          dateStr,
          gameState.won,
          gameState.totalDamage,
          gameState.targetDamage,
          gameState.defenderName,
          gameState.difficulty,
        ).catch((e) => console.error("[BruteBrawl] feed event error:", e));
      }
    }
  }

  return (
    <div className="max-w-lg mx-auto py-4 px-4">
      <GameNav current="brutebrawl" />

      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-lg font-bold text-red-100">Brute Brawl</h1>
          <p className="text-xs text-red-400/60">Dice combat! Roll attack vs defense · 8 rounds</p>
        </div>
        <p className="text-xs text-red-400/40">{dateStr}</p>
      </div>

      <HowToPlay rules={[
        "Roll 3 attack dice vs the defender's 2 dice each round.",
        "Your total minus their total = damage dealt (minimum 0).",
        "Roll triples for SMASH! — your dice total is doubled before subtracting defense.",
        "If the defender rolls doubles, your attack is BLOCKED (no damage).",
        "At 5 damage: Bloodrush Bellow — roll 4 attack dice next round.",
        "At 12 damage: Barraging Beatdown — reroll one die (tap to use).",
        "Deal 20+ total damage across 8 rounds to win!",
      ]} />

      {!showResult && (
        <BrawlBoard
          gameState={gameState}
          puzzle={puzzle}
          onStateChange={handleStateChange}
        />
      )}

      {showResult && (
        <div className="mt-4">
          <BrawlResult
            gameState={gameState}
            stats={stats}
            puzzle={puzzle}
            dateStr={dateStr}
            onShare={() => { setShowShare(true); triggerShared(); }}
          />
        </div>
      )}

      {showShare && (
        <BrawlShareCard
          gameState={gameState}
          dateStr={dateStr}
          onClose={() => setShowShare(false)}
          onShared={triggerShared}
        />
      )}

      {badgeTierUp && (
        <BadgeTierUpPopup badgeId="brutebrawl-player" badgeName="Brawler" tier={badgeTierUp.tier} count={badgeTierUp.count} onClose={() => setBadgeTierUp(null)} />
      )}
    </div>
  );
}
