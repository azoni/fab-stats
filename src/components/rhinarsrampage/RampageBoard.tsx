"use client";
import { useState, useCallback } from "react";
import { DiceFace } from "@/components/dice/DiceFace";
import { HealthBar } from "@/components/dice/HealthBar";
import { DamagePopup } from "@/components/dice/DamagePopup";
import { RoundCounter } from "@/components/dice/RoundCounter";
import { BossChat } from "@/components/dice/BossChat";
import type { RampageGameState, RampageRound } from "@/lib/rhinarsrampage/types";
import type { DailyRampage } from "@/lib/rhinarsrampage/puzzle-generator";

interface RampageBoardProps {
  gameState: RampageGameState;
  puzzle: DailyRampage;
  heroImageUrl: string;
  onStateChange: (state: RampageGameState) => void;
}

type Phase = "ready" | "rolling" | "decide" | "bust_anim" | "bank_anim";

export function RampageBoard({ gameState, puzzle, heroImageUrl, onStateChange }: RampageBoardProps) {
  const [phase, setPhase] = useState<Phase>("ready");
  const [lastDie, setLastDie] = useState<number | null>(null);
  const [popup, setPopup] = useState<{ amount: number; type: "damage" | "bust" | "intimidate"; id: number } | null>(null);
  const [bustFlash, setBustFlash] = useState(false);

  const taunts = puzzle.taunts;
  const gs = gameState;

  // Build round results for RoundCounter
  const roundResults = gs.roundHistory.map((r) => (r.banked ? "banked" : "bust") as "banked" | "bust" | "pending");
  while (roundResults.length < gs.totalRounds) roundResults.push("pending");

  // Determine taunt and mood based on game phase and state
  function getTaunt(): { message: string; mood: "neutral" | "taunt" | "angry" | "impressed" | "defeated" } {
    if (phase === "bust_anim") return { message: taunts.bust, mood: "taunt" };
    if (phase === "bank_anim" && gs.unbankedTotal >= 12) return { message: taunts.bankHigh, mood: "impressed" };
    if (phase === "bank_anim") return { message: taunts.bankLow, mood: "taunt" };
    if (gs.unbankedTotal >= 15) return { message: taunts.rollHigh, mood: "impressed" };
    if (gs.unbankedRolls.length > 0 && gs.unbankedTotal <= 5) return { message: taunts.rollLow, mood: "taunt" };
    if (gs.roundHistory.length === 0 && gs.unbankedRolls.length === 0) return { message: taunts.start, mood: "neutral" };
    return { message: taunts.start, mood: "neutral" };
  }

  const taunt = getTaunt();

  const roll = useCallback(() => {
    if (phase !== "ready" && phase !== "decide") return;
    if (gs.diceIndex >= puzzle.diceSequence.length) return;

    const dieValue = puzzle.diceSequence[gs.diceIndex];
    const newUnbanked = gs.unbankedTotal + dieValue;
    const newRolls = [...gs.unbankedRolls, dieValue];
    const newIndex = gs.diceIndex + 1;

    setLastDie(dieValue);
    setPhase("rolling");

    setTimeout(() => {
      if (newUnbanked > 21) {
        // BUST
        const round: RampageRound = { rolls: newRolls, total: 0, banked: false };
        const newHistory = [...gs.roundHistory, round];
        const nextRound = gs.currentRound + 1;
        const completed = nextRound >= gs.totalRounds;
        const won = completed && gs.score >= gs.currentTargetHP;

        setBustFlash(true);
        setTimeout(() => setBustFlash(false), 600);
        setPopup({ amount: newUnbanked, type: "bust", id: Date.now() });
        setPhase("bust_anim");

        setTimeout(() => {
          onStateChange({
            ...gs,
            unbankedTotal: 0,
            unbankedRolls: [],
            roundHistory: newHistory,
            currentRound: nextRound,
            diceIndex: newIndex,
            completed,
            won,
          });
          setPhase("ready");
          setLastDie(null);
        }, 1500);
      } else {
        // Continue rolling
        onStateChange({
          ...gs,
          unbankedTotal: newUnbanked,
          unbankedRolls: newRolls,
          diceIndex: newIndex,
        });
        setPhase("decide");
      }
    }, 850);
  }, [gs, phase, onStateChange, puzzle.diceSequence]);

  const bank = useCallback(() => {
    if (phase !== "decide") return;
    const amount = gs.unbankedTotal;
    const round: RampageRound = { rolls: gs.unbankedRolls, total: amount, banked: true };
    const newHistory = [...gs.roundHistory, round];
    const newScore = gs.score + amount;
    const nextRound = gs.currentRound + 1;
    const won = newScore >= gs.currentTargetHP;
    const completed = won || nextRound >= gs.totalRounds;

    setPopup({ amount, type: "damage", id: Date.now() });
    setPhase("bank_anim");

    setTimeout(() => {
      onStateChange({
        ...gs,
        unbankedTotal: 0,
        unbankedRolls: [],
        roundHistory: newHistory,
        currentRound: nextRound,
        score: newScore,
        completed,
        won,
      });
      setPhase("ready");
      setLastDie(null);
    }, 1000);
  }, [gs, phase, onStateChange]);

  const intimidate = useCallback(() => {
    if (gs.intimidateUsed || gs.diceIndex >= puzzle.diceSequence.length) return;
    if (phase === "rolling" || phase === "bust_anim" || phase === "bank_anim") return;

    const dieValue = puzzle.diceSequence[gs.diceIndex];
    const newHP = Math.max(0, gs.currentTargetHP - dieValue);

    setPopup({ amount: dieValue, type: "intimidate", id: Date.now() });

    // Check if this makes the game already won
    const won = gs.score >= newHP;
    const completed = won;

    onStateChange({
      ...gs,
      intimidateUsed: true,
      intimidateValue: dieValue,
      currentTargetHP: newHP,
      diceIndex: gs.diceIndex + 1,
      completed,
      won,
    });
  }, [gs, phase, onStateChange, puzzle.diceSequence]);

  if (gs.completed) return null;

  return (
    <div className={`space-y-4 ${bustFlash ? "animate-red-flash" : ""}`}>
      {/* Boss chat */}
      <BossChat
        heroImageUrl={heroImageUrl}
        heroName="Rhinar"
        message={taunt.message}
        mood={taunt.mood}
      />

      {/* Health bar */}
      <HealthBar
        current={Math.max(0, gs.currentTargetHP - gs.score)}
        max={gs.currentTargetHP}
        label="Rhinar's HP"
      />

      {/* Round counter */}
      <RoundCounter current={gs.currentRound + 1} total={gs.totalRounds} results={roundResults} />

      {/* Dice area */}
      <div className="relative flex flex-col items-center gap-3 py-4">
        {popup && <DamagePopup amount={popup.amount} type={popup.type} id={popup.id} />}

        {/* Current die */}
        <div className="flex items-center gap-4">
          <DiceFace
            value={lastDie || 1}
            size="lg"
            rolling={phase === "rolling"}
          />
          {phase === "decide" && (
            <div className="text-center">
              <p className="text-xs text-red-400/60">Unbanked</p>
              <p className="text-2xl font-bold text-amber-400">{gs.unbankedTotal}</p>
              <p className={`text-[10px] ${gs.unbankedTotal > 15 ? "text-red-400" : "text-red-400/40"}`}>
                Bust at 22+
              </p>
            </div>
          )}
        </div>

        {/* Roll history this round */}
        {gs.unbankedRolls.length > 0 && (
          <div className="flex items-center gap-1">
            {gs.unbankedRolls.map((r, i) => (
              <DiceFace key={i} value={r} size="sm" />
            ))}
            <span className="text-xs text-red-400/60 ml-2">= {gs.unbankedTotal}</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        {(phase === "ready" || phase === "decide") && (
          <button
            onClick={roll}
            className="flex-1 py-3 rounded-lg font-bold text-sm bg-red-700 hover:bg-red-600 text-red-50 transition-colors hover:shadow-[0_0_12px_rgba(220,38,38,0.4)] active:scale-[0.97]"
          >
            {phase === "decide" ? "Roll Again" : "Roll"}
          </button>
        )}
        {phase === "decide" && (
          <button
            onClick={bank}
            className="flex-1 py-3 rounded-lg font-bold text-sm bg-amber-600 hover:bg-amber-500 text-amber-50 transition-colors hover:shadow-[0_0_12px_rgba(245,158,11,0.4)] active:scale-[0.97]"
          >
            Bank {gs.unbankedTotal}
          </button>
        )}
      </div>

      {/* Intimidate */}
      {!gs.intimidateUsed && (
        <button
          onClick={intimidate}
          disabled={phase === "rolling" || phase === "bust_anim" || phase === "bank_anim"}
          className="w-full py-2 rounded-lg text-xs font-medium bg-purple-900/30 border border-purple-800/30 text-purple-300 hover:bg-purple-900/50 hover:border-purple-700/40 transition-colors disabled:opacity-50"
        >
          Intimidate — roll a die to reduce Rhinar's HP
        </button>
      )}
      {gs.intimidateUsed && gs.intimidateValue > 0 && (
        <p className="text-[10px] text-purple-400/50 text-center">
          Intimidate used: -{gs.intimidateValue} HP
        </p>
      )}

      {/* Banked damage summary */}
      {gs.roundHistory.length > 0 && (
        <div className="flex items-center gap-2 text-[11px] text-red-400/50">
          <span>Banked: {gs.score} dmg</span>
          <span>|</span>
          <span>Need: {Math.max(0, gs.currentTargetHP - gs.score)} more</span>
        </div>
      )}
    </div>
  );
}
