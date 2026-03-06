"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { GameNav } from "@/components/games/GameNav";
import { TriviaBoard } from "@/components/trivia/TriviaBoard";
import { TriviaResult } from "@/components/trivia/TriviaResult";
import { generateDailyQuestions, QUESTIONS_PER_GAME, WIN_THRESHOLD } from "@/lib/trivia/puzzle-generator";
import { createFreshGameState, loadGameState, saveGameState, cleanupOldStates } from "@/lib/trivia/game-state";
import { saveResult, loadStats, markShared } from "@/lib/trivia/firestore";
import { createTriviaFeedEvent } from "@/lib/feed";
import { logActivity } from "@/lib/activity-log";
import { detectTierUp } from "@/lib/badge-tiers";
import { BadgeTierUpPopup } from "@/components/profile/BadgeTierUpPopup";
import type { TriviaGameState, TriviaStats, TriviaAnswer } from "@/lib/trivia/types";
import type { TriviaQuestion } from "@/lib/trivia/question-bank";

function getTodayDateStr(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
}

export default function TriviaPage() {
  const { user, profile } = useAuth();
  const dateStr = getTodayDateStr();
  const questions = generateDailyQuestions(dateStr);

  const [gameState, setGameState] = useState<TriviaGameState>(() => {
    if (typeof window === "undefined") return createFreshGameState(dateStr);
    return loadGameState(dateStr) || createFreshGameState(dateStr);
  });
  const [stats, setStats] = useState<TriviaStats | null>(null);
  const [showResult, setShowResult] = useState(gameState.completed);
  const [badgeTierUp, setBadgeTierUp] = useState<{ tier: import("@/lib/badge-tiers").BadgeTierInfo; count: number } | null>(null);
  const completionSaved = useRef(false);
  const sharedDatesRef = useRef(new Set<string>());

  useEffect(() => { cleanupOldStates(); }, []);

  useEffect(() => {
    if (user) loadStats(user.uid).then(setStats);
  }, [user]);

  const handleAnswer = useCallback((questionId: number, selectedIndex: number) => {
    if (gameState.completed) return;

    const question = questions.find((q) => q.id === questionId);
    if (!question) return;

    const correct = selectedIndex === question.correctIndex;
    const answer: TriviaAnswer = { questionId, selectedIndex, correct };
    const newAnswers = [...gameState.answers, answer];
    const newScore = gameState.score + (correct ? 1 : 0);
    const nextQ = gameState.currentQuestion + 1;
    const completed = nextQ >= QUESTIONS_PER_GAME;
    const won = completed && newScore >= WIN_THRESHOLD;

    const newState: TriviaGameState = {
      ...gameState,
      answers: newAnswers,
      currentQuestion: nextQ,
      completed,
      won,
      score: newScore,
    };

    setGameState(newState);
    saveGameState(newState);

    if (completed) {
      setShowResult(true);

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
              const tierUp = detectTierUp("trivia-player", oldGamesPlayed, s.gamesPlayed);
              if (tierUp) setBadgeTierUp({ tier: tierUp, count: s.gamesPlayed });
            }
          })
          .catch(console.error);

        if (profile) {
          createTriviaFeedEvent(profile, "completed", dateStr, won, newScore, QUESTIONS_PER_GAME).catch(() => {});
        }
      }
    }
  }, [gameState, questions, dateStr, user, profile]);

  function triggerShared() {
    if (sharedDatesRef.current.has(dateStr)) return;
    sharedDatesRef.current.add(dateStr);
    if (user) {
      markShared(user.uid).catch(() => {});
      logActivity("trivia_share", dateStr);
      if (profile) {
        createTriviaFeedEvent(profile, "shared", dateStr, gameState.won, gameState.score, QUESTIONS_PER_GAME).catch(() => {});
      }
    }
  }

  return (
    <div className="max-w-lg mx-auto py-4 px-4">
      <GameNav current="trivia" />

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-fab-text">FaB Trivia</h1>
          <p className="text-[10px] text-fab-dim">{QUESTIONS_PER_GAME} daily questions · Need {WIN_THRESHOLD} to win</p>
        </div>
        <p className="text-[10px] text-fab-dim">{dateStr}</p>
      </div>

      <TriviaBoard
        questions={questions}
        answers={gameState.answers}
        currentQuestion={gameState.currentQuestion}
        completed={gameState.completed}
        onAnswer={handleAnswer}
      />

      {showResult && (
        <div className="mt-4">
          <TriviaResult
            won={gameState.won}
            score={gameState.score}
            stats={stats}
            dateStr={dateStr}
            onShared={triggerShared}
            answers={gameState.answers}
          />
        </div>
      )}

      {badgeTierUp && (
        <BadgeTierUpPopup badgeId="trivia-player" badgeName="Trivia Buff" tier={badgeTierUp.tier} count={badgeTierUp.count} onClose={() => setBadgeTierUp(null)} />
      )}
    </div>
  );
}
