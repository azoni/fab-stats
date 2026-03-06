"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { GameNav } from "@/components/games/GameNav";
import { ComboBoard } from "@/components/ninjacombo/ComboBoard";
import { ComboResult } from "@/components/ninjacombo/ComboResult";
import { ComboShareCard } from "@/components/ninjacombo/ComboShareCard";
import { generateDailyCombo } from "@/lib/ninjacombo/puzzle-generator";
import { createFreshGameState, loadGameState, saveGameState, cleanupOldStates } from "@/lib/ninjacombo/game-state";
import { saveResult, loadStats, markShared } from "@/lib/ninjacombo/firestore";
import { createNinjaComboFeedEvent } from "@/lib/feed";
import { logActivity } from "@/lib/activity-log";
import { HowToPlay } from "@/components/dice/HowToPlay";
import type { NinjaComboGameState, NinjaComboStats } from "@/lib/ninjacombo/types";

function getTodayDateStr(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
}

export default function NinjaComboPage() {
  const { user, profile } = useAuth();
  const dateStr = getTodayDateStr();
  const puzzle = generateDailyCombo(dateStr);

  const [gameState, setGameState] = useState<NinjaComboGameState>(() => {
    if (typeof window === "undefined") return createFreshGameState(dateStr, puzzle);
    return loadGameState(dateStr) || createFreshGameState(dateStr, puzzle);
  });
  const [stats, setStats] = useState<NinjaComboStats | null>(null);
  const [showResult, setShowResult] = useState(gameState.completed);
  const [showShare, setShowShare] = useState(false);
  const completionSaved = useRef(false);
  const sharedDatesRef = useRef(new Set<string>());

  useEffect(() => { cleanupOldStates(); }, []);

  useEffect(() => {
    if (user) loadStats(user.uid).then(setStats);
  }, [user]);

  const handleStateChange = useCallback((newState: NinjaComboGameState) => {
    setGameState(newState);
    saveGameState(newState);

    if (newState.completed) {
      setShowResult(true);

      if (user && !completionSaved.current) {
        completionSaved.current = true;
        const comboCount = newState.chain.filter((s) => s.comboed).length;
        const maxStreak = Math.max(0, ...newState.chain.map((s) => s.consecutiveCombo));
        const result = {
          date: dateStr,
          won: newState.won,
          totalDamage: newState.totalDamage,
          targetDamage: newState.targetDamage,
          chainLength: newState.chain.length,
          comboCount,
          maxStreak,
          timestamp: Date.now(),
          uid: user.uid,
        };
        saveResult(user.uid, result)
          .then(() => loadStats(user.uid))
          .then((s) => { if (s) setStats(s); })
          .catch(console.error);

        if (profile) {
          createNinjaComboFeedEvent(
            profile,
            "completed",
            dateStr,
            newState.won,
            newState.totalDamage,
            newState.targetDamage,
            comboCount,
            maxStreak,
          ).catch(() => {});
        }
      }
    }
  }, [dateStr, user, profile]);

  function triggerShared() {
    if (sharedDatesRef.current.has(dateStr)) return;
    sharedDatesRef.current.add(dateStr);
    if (user) {
      markShared(user.uid).catch(() => {});
      logActivity("ninjacombo_share", dateStr);
      if (profile) {
        const comboCount = gameState.chain.filter((s) => s.comboed).length;
        const maxStreak = Math.max(0, ...gameState.chain.map((s) => s.consecutiveCombo));
        createNinjaComboFeedEvent(
          profile,
          "shared",
          dateStr,
          gameState.won,
          gameState.totalDamage,
          gameState.targetDamage,
          comboCount,
          maxStreak,
        ).catch(() => {});
      }
    }
  }

  return (
    <div className="max-w-lg mx-auto py-4 px-4">
      <GameNav current="ninjacombo" />

      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-lg font-bold text-cyan-100">Katsu&apos;s Combo</h1>
          <p className="text-xs text-cyan-400/60">Build the perfect attack chain</p>
        </div>
        <p className="text-xs text-cyan-400/40">{dateStr}</p>
      </div>

      <HowToPlay rules={[
        "You have 8 attack cards. Choose 5 to build your combo chain.",
        "Kicks combo after Punches. Punches combo after Kicks.",
        "Kunai always combos if it's not the first card played.",
        "Special cards combo after 2+ consecutive combos — big bonus!",
        "Combo bonuses escalate: +2, +3, +4... for each consecutive combo.",
        "Breaking the combo chain resets the bonus counter.",
        "Hit the target damage to win! Use Undo to rethink your sequence.",
      ]} />

      {!showResult && (
        <ComboBoard
          gameState={gameState}
          puzzle={puzzle}
          onStateChange={handleStateChange}
        />
      )}

      {showResult && (
        <div className="mt-4">
          <ComboResult
            gameState={gameState}
            stats={stats}
            puzzle={puzzle}
            dateStr={dateStr}
            onShare={() => { setShowShare(true); triggerShared(); }}
          />
        </div>
      )}

      {showShare && (
        <ComboShareCard
          gameState={gameState}
          dateStr={dateStr}
          optimalScore={puzzle.optimalScore}
          onClose={() => setShowShare(false)}
          onShared={triggerShared}
        />
      )}
    </div>
  );
}
