"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { GameNav } from "@/components/games/GameNav";
import { KnockoutBoard } from "@/components/kayosknockout/KnockoutBoard";
import { KnockoutResult } from "@/components/kayosknockout/KnockoutResult";
import { KnockoutShareCard } from "@/components/kayosknockout/KnockoutShareCard";
import { createFreshGameState, loadGameState, saveGameState, cleanupOldStates } from "@/lib/kayosknockout/game-state";
import { saveResult, loadStats, markShared } from "@/lib/kayosknockout/firestore";
import { detectTierUp } from "@/lib/badge-tiers";
import { BadgeTierUpPopup } from "@/components/profile/BadgeTierUpPopup";
import { createKnockoutFeedEvent } from "@/lib/feed";
import { logActivity } from "@/lib/activity-log";
import { allHeroes } from "@/lib/heroes";
import type { KnockoutGameState, KnockoutStats } from "@/lib/kayosknockout/types";

function getTodayDateStr(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
}

function getKayoImage(): string {
  const kayo = allHeroes.find((h) => h.name.startsWith("Kayo") && !h.young);
  return kayo?.imageUrl || allHeroes.find((h) => h.name.startsWith("Kayo"))?.imageUrl || "";
}

export default function KayosKnockoutPage() {
  const { user, profile } = useAuth();
  const dateStr = getTodayDateStr();
  const heroImageUrl = getKayoImage();

  const [gameState, setGameState] = useState<KnockoutGameState>(() => {
    if (typeof window === "undefined") return createFreshGameState(dateStr);
    return loadGameState(dateStr) || createFreshGameState(dateStr);
  });
  const [stats, setStats] = useState<KnockoutStats | null>(null);
  const [showResult, setShowResult] = useState(gameState.completed);
  const [showShare, setShowShare] = useState(false);
  const [badgeTierUp, setBadgeTierUp] = useState<{ tier: import("@/lib/badge-tiers").BadgeTierInfo; count: number } | null>(null);
  const completionSaved = useRef(false);
  const sharedDatesRef = useRef(new Set<string>());

  useEffect(() => { cleanupOldStates(); }, []);

  useEffect(() => {
    if (user) loadStats(user.uid).then(setStats);
  }, [user]);

  const handleUpdate = useCallback((newState: KnockoutGameState) => {
    setGameState(newState);
    saveGameState(newState);

    if (newState.completed) {
      setShowResult(true);

      if (user && !completionSaved.current) {
        completionSaved.current = true;
        const combos = newState.roundHistory.map((r) => r.combo);
        const result = {
          date: dateStr,
          won: newState.won,
          score: newState.score,
          targetHP: newState.targetHP,
          rounds: newState.roundHistory.length,
          combos,
          timestamp: Date.now(),
          uid: user.uid,
        };
        const oldGamesPlayed = stats?.gamesPlayed ?? 0;
        saveResult(user.uid, result)
          .then(() => loadStats(user.uid))
          .then((s) => {
            if (s) {
              setStats(s);
              const tierUp = detectTierUp("brute-brawler", oldGamesPlayed, s.gamesPlayed);
              if (tierUp) setBadgeTierUp({ tier: tierUp, count: s.gamesPlayed });
            }
          })
          .catch(console.error);

        if (profile) {
          createKnockoutFeedEvent(profile, "completed", dateStr, newState.won, newState.score, newState.targetHP).catch(() => {});
        }
      }
    }
  }, [dateStr, user, profile, stats]);

  function triggerShared() {
    if (sharedDatesRef.current.has(dateStr)) return;
    sharedDatesRef.current.add(dateStr);
    if (user) {
      markShared(user.uid).catch(() => {});
      logActivity("kayosknockout_share", dateStr);
      if (profile) {
        createKnockoutFeedEvent(profile, "shared", dateStr, gameState.won, gameState.score, gameState.targetHP).catch(() => {});
      }
    }
  }

  return (
    <div className="max-w-lg mx-auto py-4 px-4">
      <GameNav current="kayosknockout" />

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-red-100">Kayo's Knockout</h1>
          <p className="text-[10px] text-red-400/60">Yahtzee-style dice combos to KO Kayo! · 3 rounds</p>
        </div>
        <p className="text-[10px] text-red-400/40">{dateStr}</p>
      </div>

      {!showResult && (
        <KnockoutBoard
          gameState={gameState}
          onUpdate={handleUpdate}
          heroImageUrl={heroImageUrl}
          dateStr={dateStr}
        />
      )}

      {showResult && (
        <div className="mt-4">
          <KnockoutResult
            gameState={gameState}
            stats={stats}
            dateStr={dateStr}
            heroImageUrl={heroImageUrl}
            onShare={() => { setShowShare(true); triggerShared(); }}
          />
        </div>
      )}

      {showShare && (
        <KnockoutShareCard
          gameState={gameState}
          dateStr={dateStr}
          onClose={() => setShowShare(false)}
        />
      )}

      {badgeTierUp && (
        <BadgeTierUpPopup
          badgeId="brute-brawler"
          badgeName="Brute Brawler"
          tier={badgeTierUp.tier}
          count={badgeTierUp.count}
          onClose={() => setBadgeTierUp(null)}
        />
      )}
    </div>
  );
}
