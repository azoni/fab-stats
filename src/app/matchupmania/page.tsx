"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { GameNav } from "@/components/games/GameNav";
import { MatchupCard, RoundProgress } from "@/components/matchupmania/MatchupCard";
import { MatchupManiaResult } from "@/components/matchupmania/MatchupManiaResult";
import { generateDailyMatchups, TOTAL_ROUNDS, WIN_THRESHOLD } from "@/lib/matchupmania/puzzle-generator";
import { createFreshGameState, loadGameState, saveGameState, cleanupOldStates } from "@/lib/matchupmania/game-state";
import { saveResult, loadStats, markShared } from "@/lib/matchupmania/firestore";
import { createMatchupManiaFeedEvent } from "@/lib/feed";
import { logActivity } from "@/lib/activity-log";
import { detectTierUp } from "@/lib/badge-tiers";
import { BadgeTierUpPopup } from "@/components/profile/BadgeTierUpPopup";
import { syncAchievementsAfterGame } from "@/lib/achievement-tracking";
import { getCommunityHeroMatchups, getMonthsForPreset } from "@/lib/hero-matchups";
import type { MatchupManiaGameState, MatchupManiaStats, MatchupRound } from "@/lib/matchupmania/types";
import type { CommunityMatchupCell } from "@/lib/hero-matchups";

function getTodayDateStr(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
}

export default function MatchupManiaPage() {
  const { user, profile } = useAuth();
  const dateStr = getTodayDateStr();

  const [gameState, setGameState] = useState<MatchupManiaGameState>(() => {
    if (typeof window === "undefined") return createFreshGameState(dateStr);
    return loadGameState(dateStr) || createFreshGameState(dateStr);
  });
  const [stats, setStats] = useState<MatchupManiaStats | null>(null);
  const [matchupData, setMatchupData] = useState<CommunityMatchupCell[] | null>(null);
  const [rounds, setRounds] = useState<MatchupRound[]>(gameState.rounds);
  const [showResult, setShowResult] = useState(gameState.completed);
  const [badgeTierUp, setBadgeTierUp] = useState<{ tier: import("@/lib/badge-tiers").BadgeTierInfo; count: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const completionSaved = useRef(false);
  const sharedDatesRef = useRef(new Set<string>());

  useEffect(() => { cleanupOldStates(); }, []);

  // Load matchup data
  useEffect(() => {
    const months = getMonthsForPreset("90d");
    getCommunityHeroMatchups(months)
      .then((data) => {
        setMatchupData(data);
        // Generate rounds if game hasn't started yet
        if (gameState.rounds.length === 0) {
          const generated = generateDailyMatchups(dateStr, data);
          setRounds(generated);
          const newState = { ...gameState, rounds: generated };
          setGameState(newState);
          saveGameState(newState);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [dateStr]);

  // Load stats
  useEffect(() => {
    if (user) loadStats(user.uid).then(setStats);
  }, [user]);

  const handlePick = useCallback((heroName: string) => {
    if (gameState.completed || gameState.currentRound >= TOTAL_ROUNDS) return;

    const round = rounds[gameState.currentRound];
    if (!round || round.picked) return;

    const winner = round.hero1WinRate >= round.hero2WinRate ? round.hero1 : round.hero2;
    const correct = heroName === winner;

    const updatedRound: MatchupRound = { ...round, picked: heroName, correct };
    const updatedRounds = [...rounds];
    updatedRounds[gameState.currentRound] = updatedRound;
    setRounds(updatedRounds);

    const newScore = gameState.score + (correct ? 1 : 0);
    const nextRound = gameState.currentRound + 1;
    const completed = nextRound >= TOTAL_ROUNDS;
    const won = completed && newScore >= WIN_THRESHOLD;

    const newState: MatchupManiaGameState = {
      ...gameState,
      rounds: updatedRounds,
      currentRound: nextRound,
      completed,
      won,
      score: newScore,
    };

    setGameState(newState);
    saveGameState(newState);

    if (completed) {
      // Delay showing result to let the last answer animate
      setTimeout(() => setShowResult(true), 800);

      if (user && !completionSaved.current) {
        completionSaved.current = true;
        const result = {
          date: dateStr,
          won,
          score: newScore,
          timestamp: Date.now(),
          uid: user.uid,
        };
        const oldGamesPlayed = stats?.gamesPlayed ?? 0;
        saveResult(user.uid, result)
          .then(() => loadStats(user.uid))
          .then((s) => {
            if (s) {
              setStats(s);
              const tierUp = detectTierUp("matchupmania-player", oldGamesPlayed, s.gamesPlayed);
              if (tierUp) setBadgeTierUp({ tier: tierUp, count: s.gamesPlayed });
              syncAchievementsAfterGame(user.uid).catch(() => {});
            }
          })
          .catch(console.error);

        if (profile) {
          createMatchupManiaFeedEvent(profile, "completed", dateStr, won, newScore, TOTAL_ROUNDS).catch(() => {});
        }
      }
    }
  }, [gameState, rounds, dateStr, user, profile]);

  function triggerShared() {
    if (sharedDatesRef.current.has(dateStr)) return;
    sharedDatesRef.current.add(dateStr);
    if (user) {
      markShared(user.uid).catch(() => {});
      logActivity("matchupmania_share", dateStr);
      if (profile) {
        createMatchupManiaFeedEvent(profile, "shared", dateStr, gameState.won, gameState.score, TOTAL_ROUNDS).catch(() => {});
      }
    }
  }

  const currentRound = rounds[gameState.currentRound];

  return (
    <div className="max-w-lg mx-auto py-4 px-4">
      <GameNav current="matchupmania" />

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-fab-text">Matchup Mania</h1>
          <p className="text-[10px] text-fab-dim">Pick the hero with the higher win rate</p>
        </div>
        <p className="text-[10px] text-fab-dim">{dateStr}</p>
      </div>

      {loading ? (
        <div className="text-center py-8 text-fab-dim text-sm">Loading matchup data...</div>
      ) : matchupData && matchupData.length === 0 ? (
        <div className="text-center py-8 text-fab-dim text-sm">Not enough matchup data yet. Check back soon!</div>
      ) : (
        <>
          {/* Round progress */}
          <div className="mb-4">
            <RoundProgress rounds={rounds} currentRound={gameState.currentRound} totalRounds={TOTAL_ROUNDS} />
            <p className="text-center text-[10px] text-fab-dim mt-1">
              Round {Math.min(gameState.currentRound + 1, TOTAL_ROUNDS)}/{TOTAL_ROUNDS}
              {" · "}Score: {gameState.score}
            </p>
          </div>

          {/* Current round */}
          {!gameState.completed && currentRound && (
            <MatchupCard round={currentRound} onPick={handlePick} />
          )}

          {/* Show completed rounds review */}
          {gameState.completed && !showResult && (
            <div className="text-center py-4 text-fab-dim text-sm">Calculating results...</div>
          )}

          {showResult && (
            <div className="mt-4">
              <MatchupManiaResult
                won={gameState.won}
                score={gameState.score}
                stats={stats}
                dateStr={dateStr}
                onShared={triggerShared}
                rounds={rounds}
              />
            </div>
          )}

          {badgeTierUp && (
            <BadgeTierUpPopup badgeId="matchupmania-player" badgeName="Matchup Maniac" tier={badgeTierUp.tier} count={badgeTierUp.count} onClose={() => setBadgeTierUp(null)} />
          )}
        </>
      )}
    </div>
  );
}
