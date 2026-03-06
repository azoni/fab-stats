"use client";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { GameNav } from "@/components/games/GameNav";
import { RampageBoard } from "@/components/rhinarsrampage/RampageBoard";
import { RampageResult } from "@/components/rhinarsrampage/RampageResult";
import { RampageShareCard } from "@/components/rhinarsrampage/RampageShareCard";
import { generateDailyRampage } from "@/lib/rhinarsrampage/puzzle-generator";
import { createFreshGameState, loadGameState, saveGameState, cleanupOldStates } from "@/lib/rhinarsrampage/game-state";
import { saveResult, loadStats, markShared } from "@/lib/rhinarsrampage/firestore";
import { createRampageFeedEvent } from "@/lib/feed";
import { logActivity } from "@/lib/activity-log";
import { allHeroes } from "@/lib/heroes";
import { HowToPlay } from "@/components/dice/HowToPlay";
import { detectTierUp, type BadgeTierInfo } from "@/lib/badge-tiers";
import { BadgeTierUpPopup } from "@/components/profile/BadgeTierUpPopup";
import { syncAchievementsAfterGame } from "@/lib/achievement-tracking";
import type { RampageGameState, RampageStats } from "@/lib/rhinarsrampage/types";

function getTodayDateStr(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
}

// Find Rhinar hero image
const rhinarHero = allHeroes.find((h) => h.name.startsWith("Rhinar") && !h.young);
const heroImageUrl = rhinarHero?.imageUrl ?? "";

export default function RhinarsRampagePage() {
  const { user, profile } = useAuth();
  const dateStr = getTodayDateStr();
  const puzzle = generateDailyRampage(dateStr);

  const [gameState, setGameState] = useState<RampageGameState>(() => {
    if (typeof window === "undefined") return createFreshGameState(dateStr, puzzle.targetHP);
    return loadGameState(dateStr) || createFreshGameState(dateStr, puzzle.targetHP);
  });
  const [stats, setStats] = useState<RampageStats | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [badgeTierUp, setBadgeTierUp] = useState<{ tier: BadgeTierInfo; count: number } | null>(null);
  const completionSaved = useRef(false);
  const sharedDatesRef = useRef(new Set<string>());

  useEffect(() => { cleanupOldStates(); }, []);

  useEffect(() => {
    if (user) loadStats(user.uid).then(setStats);
  }, [user]);

  function handleStateChange(newState: RampageGameState) {
    setGameState(newState);
    saveGameState(newState);

    if (newState.completed && user && !completionSaved.current) {
      completionSaved.current = true;
      const result = {
        date: dateStr,
        won: newState.won,
        score: newState.score,
        targetHP: newState.currentTargetHP,
        rounds: newState.roundHistory.length,
        busts: newState.roundHistory.filter((r) => !r.banked).length,
        intimidateUsed: newState.intimidateUsed,
        intimidateValue: newState.intimidateValue,
        timestamp: Date.now(),
        uid: user.uid,
      };
      const oldGamesPlayed = stats?.gamesPlayed ?? 0;
      saveResult(user.uid, result)
        .then(() => loadStats(user.uid))
        .then((s) => {
          if (s) {
            setStats(s);
            const tierUp = detectTierUp("rhinarsrampage-player", oldGamesPlayed, s.gamesPlayed);
            if (tierUp) setBadgeTierUp({ tier: tierUp, count: s.gamesPlayed });
            syncAchievementsAfterGame(user.uid).catch(() => {});
          }
        })
        .catch(console.error);

      if (profile) {
        createRampageFeedEvent(profile, "completed", dateStr, newState.won, newState.score, newState.currentTargetHP).catch(() => {});
      }
    }
  }

  function triggerShared() {
    if (sharedDatesRef.current.has(dateStr)) return;
    sharedDatesRef.current.add(dateStr);
    if (user) {
      markShared(user.uid).catch(() => {});
      logActivity("rhinarsrampage_share", dateStr);
      if (profile) {
        createRampageFeedEvent(profile, "shared", dateStr, gameState.won, gameState.score, gameState.currentTargetHP).catch(() => {});
      }
    }
  }

  return (
    <div className="max-w-lg mx-auto py-4 px-4">
      <GameNav current="rhinarsrampage" />

      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-lg font-bold text-red-100">Rhinar's Rampage</h1>
          <p className="text-xs text-red-400/60">Push your luck · 5 rounds · Beat the target</p>
        </div>
        <p className="text-xs text-red-400/60">{dateStr}</p>
      </div>

      <HowToPlay rules={[
        "Roll a die each turn to build unbanked damage.",
        "Bank to lock in your damage, or keep rolling for more.",
        "If your unbanked total exceeds 21, you BUST and lose it all!",
        "You have 5 rounds to deal enough damage to beat Rhinar's HP.",
        "Use Intimidate once per game to roll a die and reduce Rhinar's HP.",
      ]} />

      {!gameState.completed ? (
        <RampageBoard
          gameState={gameState}
          puzzle={puzzle}
          heroImageUrl={heroImageUrl}
          onStateChange={handleStateChange}
        />
      ) : (
        <RampageResult
          gameState={gameState}
          stats={stats}
          puzzle={puzzle}
          heroImageUrl={heroImageUrl}
          dateStr={dateStr}
          onShare={() => setShowShare(true)}
        />
      )}

      {showShare && (
        <RampageShareCard
          gameState={gameState}
          dateStr={dateStr}
          onClose={() => {
            setShowShare(false);
            triggerShared();
          }}
        />
      )}

      {badgeTierUp && (
        <BadgeTierUpPopup badgeId="rhinarsrampage-player" badgeName="Rampager" tier={badgeTierUp.tier} count={badgeTierUp.count} onClose={() => setBadgeTierUp(null)} />
      )}
    </div>
  );
}
