"use client";
import { useState, useCallback } from "react";
import { DiceRoll } from "@/components/dice/DiceRoll";
import { HealthBar } from "@/components/dice/HealthBar";
import { DamagePopup } from "@/components/dice/DamagePopup";
import { RoundCounter } from "@/components/dice/RoundCounter";
import { BossChat } from "@/components/dice/BossChat";
import type { KnockoutGameState, KnockoutRound } from "@/lib/kayosknockout/types";
import { generateDailyKnockout, detectCombo } from "@/lib/kayosknockout/puzzle-generator";
import type { TauntEvent } from "@/lib/kayosknockout/taunts";

interface KnockoutBoardProps {
  gameState: KnockoutGameState;
  onUpdate: (state: KnockoutGameState) => void;
  heroImageUrl: string;
  dateStr: string;
}

type Phase = "round_start" | "rolling" | "pick_dice" | "rerolling" | "scoring" | "round_end";

export function KnockoutBoard({ gameState, onUpdate, heroImageUrl, dateStr }: KnockoutBoardProps) {
  const [phase, setPhase] = useState<Phase>(() => {
    if (gameState.currentDice.length > 0) return "pick_dice";
    return "round_start";
  });
  const [popup, setPopup] = useState<{ amount: number; type: "damage" | "combo" | "bust"; id: number } | null>(null);
  const [comboName, setComboName] = useState<string>("");

  const puzzle = generateDailyKnockout(dateStr);
  const taunts = puzzle.taunts;
  const gs = gameState;

  // Round results for the counter
  const roundResults: ("banked" | "bust" | "pending" | "scored" | "blocked" | "hit")[] = gs.roundHistory.map((r) => {
    return r.combo ? "scored" : "hit";
  });
  while (roundResults.length < gs.maxRounds) roundResults.push("pending");

  // Determine taunt and mood
  function getTaunt(): { message: string; mood: "neutral" | "taunt" | "angry" | "impressed" | "defeated" } {
    if (phase === "scoring" && comboName) return { message: taunts.bigCombo, mood: "impressed" };
    if (phase === "scoring") return { message: taunts.weakRound, mood: "taunt" };
    if (phase === "rerolling" || (phase === "pick_dice" && gs.rerollsUsed > 0)) return { message: taunts.reroll, mood: "neutral" };
    if (gs.currentRound === 1 && phase === "round_start") return { message: taunts.start, mood: "neutral" };
    if (gs.totalDamage >= gs.targetHP * 0.6) return { message: taunts.bigCombo, mood: "angry" };
    return { message: taunts.start, mood: "neutral" };
  }

  const taunt = getTaunt();

  /** Draw 5 dice (or fill unkept slots) from the sequence */
  function drawDice(count: number, startIndex: number): { dice: number[]; newIndex: number } {
    const dice: number[] = [];
    let idx = startIndex;
    for (let i = 0; i < count; i++) {
      dice.push(gs.diceSequence[idx % gs.diceSequence.length]);
      idx++;
    }
    return { dice, newIndex: idx };
  }

  /** Initial roll — roll all 5 dice */
  const rollDice = useCallback(() => {
    if (phase !== "round_start") return;

    const { dice, newIndex } = drawDice(5, gs.diceIndex);
    setPhase("rolling");

    onUpdate({
      ...gs,
      currentDice: dice,
      selectedIndices: [],
      rerollsUsed: 0,
      diceIndex: newIndex,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gs, phase, onUpdate]);

  /** Called when rolling animation completes */
  const onRollComplete = useCallback(() => {
    setPhase("pick_dice");
  }, []);

  /** Toggle a die's selected state */
  const toggleSelect = useCallback((index: number) => {
    if (phase !== "pick_dice") return;
    const current = gs.selectedIndices;
    const next = current.includes(index) ? current.filter((i) => i !== index) : [...current, index];
    onUpdate({ ...gs, selectedIndices: next });
  }, [gs, phase, onUpdate]);

  /** Reroll unkept dice */
  const reroll = useCallback(() => {
    if (phase !== "pick_dice") return;
    if (gs.rerollsUsed >= gs.maxRerolls) return;

    // Determine which dice to reroll (not selected)
    const keptIndices = new Set(gs.selectedIndices);
    const rerollCount = 5 - keptIndices.size;
    if (rerollCount === 0) return; // All dice kept, nothing to reroll

    const { dice: newValues, newIndex } = drawDice(rerollCount, gs.diceIndex);

    const newDice = [...gs.currentDice];
    let vi = 0;
    for (let i = 0; i < 5; i++) {
      if (!keptIndices.has(i)) {
        newDice[i] = newValues[vi++];
      }
    }

    setPhase("rerolling");

    onUpdate({
      ...gs,
      currentDice: newDice,
      rerollsUsed: gs.rerollsUsed + 1,
      diceIndex: newIndex,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gs, phase, onUpdate]);

  /** Called when rerolling animation completes */
  const onRerollComplete = useCallback(() => {
    setPhase("pick_dice");
  }, []);

  /** Score the current dice */
  const scoreDice = useCallback(() => {
    if (phase !== "pick_dice") return;

    const combo = detectCombo(gs.currentDice);
    const damage = combo.damage;
    const newTotalDamage = gs.totalDamage + damage;
    const won = newTotalDamage >= gs.targetHP;
    const nextRound = gs.currentRound + 1;
    const completed = won || nextRound > gs.maxRounds;

    const round: KnockoutRound = {
      finalDice: [...gs.currentDice],
      combo: combo.name,
      damage,
      rerolls: gs.rerollsUsed,
    };

    setComboName(combo.name);
    setPhase("scoring");

    setTimeout(() => {
      setPopup({ amount: damage, type: "damage", id: Date.now() });
    }, combo.name ? 600 : 0);

    setTimeout(() => {
      onUpdate({
        ...gs,
        totalDamage: newTotalDamage,
        currentDice: [],
        selectedIndices: [],
        rerollsUsed: 0,
        roundHistory: [...gs.roundHistory, round],
        currentRound: nextRound,
        completed,
        won,
        score: newTotalDamage,
      });
      setComboName("");
      setPhase(completed ? "round_end" : "round_start");
    }, 1800);
  }, [gs, phase, onUpdate]);

  if (gs.completed) return null;

  const isRolling = phase === "rolling";
  const isRerolling = phase === "rerolling";
  const canReroll = phase === "pick_dice" && gs.rerollsUsed < gs.maxRerolls;
  const canScore = phase === "pick_dice";
  const remainingHP = Math.max(0, gs.targetHP - gs.totalDamage);

  return (
    <div className="space-y-4">
      {/* Boss chat */}
      <BossChat
        heroImageUrl={heroImageUrl}
        heroName="Kayo"
        message={taunt.message}
        mood={taunt.mood}
      />

      {/* Health bar */}
      <HealthBar
        current={remainingHP}
        max={gs.targetHP}
        label="Kayo's HP"
      />

      {/* Round counter */}
      <RoundCounter current={gs.currentRound} total={gs.maxRounds} results={roundResults} />

      {/* Dice area */}
      <div className="relative flex flex-col items-center gap-3 py-4">
        {popup && <DamagePopup amount={popup.amount} type={popup.type} id={popup.id} />}

        {/* Combo name display */}
        {phase === "scoring" && comboName && (
          <div className="text-amber-400 font-bold text-lg animate-bounce">
            {comboName}!
          </div>
        )}

        {/* Dice */}
        {gs.currentDice.length > 0 && (
          <DiceRoll
            dice={gs.currentDice}
            rolling={isRolling || isRerolling}
            onRollComplete={isRolling ? onRollComplete : isRerolling ? onRerollComplete : undefined}
            selectedIndices={gs.selectedIndices}
            onToggleSelect={phase === "pick_dice" ? toggleSelect : undefined}
            variant="attack"
            size="lg"
            partialRoll={isRerolling ? gs.currentDice.map((_, i) => i).filter((i) => !gs.selectedIndices.includes(i)) : undefined}
          />
        )}

        {/* Reroll indicator */}
        {phase === "pick_dice" && (
          <p className="text-[10px] text-red-400/50">
            {gs.selectedIndices.length > 0
              ? `${gs.selectedIndices.length} kept · Tap dice to toggle`
              : "Tap dice to keep, then reroll or score"}
            {" · "}Rerolls: {gs.maxRerolls - gs.rerollsUsed}/{gs.maxRerolls}
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        {phase === "round_start" && (
          <button
            onClick={rollDice}
            className="flex-1 py-3 rounded-lg font-bold text-sm bg-red-700 hover:bg-red-600 text-red-50 transition-colors hover:shadow-[0_0_12px_rgba(220,38,38,0.4)] active:scale-[0.97]"
          >
            Roll
          </button>
        )}

        {canReroll && (
          <button
            onClick={reroll}
            className="flex-1 py-3 rounded-lg font-bold text-sm bg-red-700 hover:bg-red-600 text-red-50 transition-colors hover:shadow-[0_0_12px_rgba(220,38,38,0.4)] active:scale-[0.97]"
          >
            Reroll ({gs.maxRerolls - gs.rerollsUsed} left)
          </button>
        )}

        {canScore && (
          <button
            onClick={scoreDice}
            className="flex-1 py-3 rounded-lg font-bold text-sm bg-amber-600 hover:bg-amber-500 text-amber-50 transition-colors hover:shadow-[0_0_12px_rgba(245,158,11,0.4)] active:scale-[0.97]"
          >
            Score
          </button>
        )}
      </div>

      {/* Damage summary */}
      {gs.roundHistory.length > 0 && (
        <div className="flex items-center gap-2 text-[11px] text-red-400/50">
          <span>Damage: {gs.totalDamage} dmg</span>
          <span>|</span>
          <span>Need: {Math.max(0, gs.targetHP - gs.totalDamage)} more</span>
        </div>
      )}
    </div>
  );
}
