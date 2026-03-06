"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { DiceRoll } from "@/components/dice/DiceRoll";
import { HealthBar } from "@/components/dice/HealthBar";
import { DamagePopup } from "@/components/dice/DamagePopup";
import { RoundCounter } from "@/components/dice/RoundCounter";
import { BossChat } from "@/components/dice/BossChat";
import type { BrawlGameState, BrawlRound } from "@/lib/brutebrawl/types";
import type { DailyBrawl } from "@/lib/brutebrawl/puzzle-generator";

interface BrawlBoardProps {
  gameState: BrawlGameState;
  puzzle: DailyBrawl;
  onStateChange: (state: BrawlGameState) => void;
}

function allSame(dice: number[]): boolean {
  return dice.length >= 2 && dice.every((d) => d === dice[0]);
}

function sumDice(dice: number[]): number {
  return dice.reduce((a, b) => a + b, 0);
}

export function BrawlBoard({ gameState, puzzle, onStateChange }: BrawlBoardProps) {
  const gs = gameState;
  const taunts = puzzle.taunts;

  const [playerRolling, setPlayerRolling] = useState(false);
  const [defenderRolling, setDefenderRolling] = useState(false);
  const [popup, setPopup] = useState<{ amount: number; type: "damage" | "bust" | "block" | "combo"; id: number } | null>(null);
  const [smashFlash, setSmashFlash] = useState(false);
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
    };
  }, []);

  // How many attack dice this round (4 if Bloodrush is available and unused)
  const attackDiceCount = gs.bloodrushAvailable && !gs.bloodrushUsed ? 4 : 3;

  // Consume N dice from the pre-rolled sequence
  function consumeDice(state: BrawlGameState, count: number): { values: number[]; newIndex: number } {
    const values: number[] = [];
    let idx = state.diceIndex;
    for (let i = 0; i < count; i++) {
      values.push(puzzle.diceSequence[idx] || 1);
      idx++;
    }
    return { values, newIndex: idx };
  }

  // Apply difficulty bonus to defender dice (clamped to 6)
  function applyDifficulty(dice: number[]): number[] {
    return dice.map((d) => Math.min(6, d + gs.difficultyBonus));
  }

  // Build round results array for RoundCounter
  const roundResults: ("banked" | "bust" | "pending" | "scored" | "blocked" | "hit")[] = gs.roundHistory.map((r) => {
    if (r.isSmash) return "hit" as const;
    if (r.isBlock) return "blocked" as const;
    if (r.damage > 0) return "scored" as const;
    return "bust" as const;
  });
  while (roundResults.length < gs.totalRounds) roundResults.push("pending");

  // Determine taunt message and mood based on game state
  function getTauntInfo(): { message: string; mood: "neutral" | "taunt" | "angry" | "impressed" | "defeated" } {
    if (gs.phase === "power_up") {
      return { message: taunts.powerUp, mood: "angry" };
    }
    const lastRound = gs.roundHistory[gs.roundHistory.length - 1];
    if (lastRound) {
      if (lastRound.isSmash) return { message: taunts.smash, mood: "angry" };
      if (lastRound.isBlock) return { message: taunts.block, mood: "taunt" };
      if (lastRound.damage > 0) return { message: taunts.smash, mood: "impressed" };
      return { message: taunts.block, mood: "taunt" };
    }
    return { message: taunts.start, mood: "neutral" };
  }

  const tauntInfo = getTauntInfo();

  // Power-up status display
  function getPowerUpStatus(): string | null {
    const parts: string[] = [];
    if (gs.bloodrushAvailable && !gs.bloodrushUsed) {
      parts.push("Bloodrush Bellow READY (4 dice this round!)");
    } else if (gs.bloodrushUsed) {
      parts.push("Bloodrush Bellow: Used");
    }
    if (gs.barragingAvailable && !gs.barragingUsed) {
      parts.push("Barraging Beatdown READY (tap a die to reroll)");
    } else if (gs.barragingUsed) {
      parts.push("Barraging Beatdown: Used");
    }
    return parts.length > 0 ? parts.join(" | ") : null;
  }

  // --- PHASE: ATTACK (player_roll) ---
  const handleAttack = useCallback(() => {
    if (gs.phase !== "ready") return;

    const { values: rawAttackDice, newIndex } = consumeDice(gs, attackDiceCount);
    const bloodrushUsedNow = gs.bloodrushAvailable && !gs.bloodrushUsed;

    setPlayerRolling(true);

    onStateChange({
      ...gs,
      phase: "player_roll",
      currentAttackDice: rawAttackDice,
      diceIndex: newIndex,
      bloodrushUsed: bloodrushUsedNow ? true : gs.bloodrushUsed,
    });
  }, [gs, attackDiceCount, onStateChange, puzzle]);

  // Called when attack dice animation finishes
  const handlePlayerRollComplete = useCallback(() => {
    setPlayerRolling(false);

    // If Barraging Beatdown is available and unused, offer reroll
    if (gs.barragingAvailable && !gs.barragingUsed) {
      onStateChange({ ...gs, phase: "reroll" });
    } else {
      // Go straight to defender roll
      triggerDefenderRoll(gs);
    }
  }, [gs, onStateChange]);

  // --- PHASE: REROLL ---
  const handleRerollDie = useCallback((index: number) => {
    if (gs.phase !== "reroll") return;

    const { values: newDieArr, newIndex } = consumeDice(gs, 1);
    const newAttackDice = [...gs.currentAttackDice];
    newAttackDice[index] = newDieArr[0];

    setPlayerRolling(true);

    const updated: BrawlGameState = {
      ...gs,
      phase: "player_roll",
      currentAttackDice: newAttackDice,
      diceIndex: newIndex,
      barragingUsed: true,
    };
    onStateChange(updated);

    // After brief animation, move to defender roll
    phaseTimerRef.current = setTimeout(() => {
      setPlayerRolling(false);
      triggerDefenderRoll(updated);
    }, 900);
  }, [gs, onStateChange, puzzle]);

  const handleSkipReroll = useCallback(() => {
    if (gs.phase !== "reroll") return;
    triggerDefenderRoll(gs);
  }, [gs]);

  // --- PHASE: DEFENDER ROLL ---
  function triggerDefenderRoll(currentState: BrawlGameState) {
    const { values: rawDefDice, newIndex } = consumeDice(currentState, 2);
    const defDice = applyDifficulty(rawDefDice);

    setDefenderRolling(true);

    onStateChange({
      ...currentState,
      phase: "defender_roll",
      currentDefenseDice: defDice,
      diceIndex: newIndex,
    });
  }

  const handleDefenderRollComplete = useCallback(() => {
    setDefenderRolling(false);
    resolveRound();
  }, [gs]);

  // --- PHASE: RESOLVE ---
  function resolveRound() {
    const aDice = gs.currentAttackDice;
    const dDice = gs.currentDefenseDice;
    const aTotal = sumDice(aDice);
    const dTotal = sumDice(dDice);

    const isSmash = allSame(aDice);
    const isBlock = !isSmash && allSame(dDice);

    let damage = 0;

    if (isSmash) {
      // SMASH: double attack total before subtracting defense
      damage = Math.max(0, aTotal * 2 - dTotal);
      setSmashFlash(true);
      setTimeout(() => setSmashFlash(false), 800);
      setPopup({ amount: damage, type: "combo", id: Date.now() });
    } else if (isBlock) {
      // BLOCK: no damage
      damage = 0;
      setPopup({ amount: 0, type: "block", id: Date.now() });
    } else {
      damage = Math.max(0, aTotal - dTotal);
      if (damage > 0) {
        setPopup({ amount: damage, type: "damage", id: Date.now() });
      } else {
        setPopup({ amount: 0, type: "block", id: Date.now() });
      }
    }

    const round: BrawlRound = {
      attackDice: [...aDice],
      defenseDice: [...dDice],
      attackTotal: aTotal,
      defenseTotal: dTotal,
      damage,
      isSmash,
      isBlock,
    };

    const newTotalDamage = gs.totalDamage + damage;
    const newHistory = [...gs.roundHistory, round];
    const nextRound = gs.currentRound + 1;

    // Check power-up thresholds
    let bloodrushAvailable = gs.bloodrushAvailable;
    let barragingAvailable = gs.barragingAvailable;
    let showPowerUp = false;

    if (!bloodrushAvailable && newTotalDamage >= 5) {
      bloodrushAvailable = true;
      showPowerUp = true;
    }
    if (!barragingAvailable && newTotalDamage >= 12) {
      barragingAvailable = true;
      showPowerUp = true;
    }

    const won = newTotalDamage >= gs.targetDamage;
    const completed = won || nextRound >= gs.totalRounds;

    const resolvedState: BrawlGameState = {
      ...gs,
      phase: "resolve",
      totalDamage: newTotalDamage,
      roundHistory: newHistory,
      currentRound: nextRound,
      bloodrushAvailable,
      barragingAvailable,
      completed,
      won,
    };

    onStateChange(resolvedState);

    // Auto-advance after resolve delay
    phaseTimerRef.current = setTimeout(() => {
      if (completed) {
        // Final state — keep phase as resolve, page.tsx will show result
        onStateChange({
          ...resolvedState,
          currentAttackDice: [],
          currentDefenseDice: [],
        });
        return;
      }

      if (showPowerUp) {
        const powerUpState: BrawlGameState = {
          ...resolvedState,
          phase: "power_up",
          currentAttackDice: [],
          currentDefenseDice: [],
        };
        onStateChange(powerUpState);

        phaseTimerRef.current = setTimeout(() => {
          onStateChange({ ...powerUpState, phase: "ready" });
        }, 2000);
      } else {
        onStateChange({
          ...resolvedState,
          phase: "ready",
          currentAttackDice: [],
          currentDefenseDice: [],
        });
      }
    }, 1500);
  }

  if (gs.completed) return null;

  const powerUpStatus = getPowerUpStatus();

  return (
    <div className={`space-y-4 ${smashFlash ? "animate-red-flash" : ""}`}>
      {/* Boss chat */}
      <BossChat
        heroImageUrl={gs.defenderImageUrl}
        heroName={gs.defenderName}
        message={tauntInfo.message}
        mood={tauntInfo.mood}
      />

      {/* Health bar -- inverted to show damage progress */}
      <HealthBar
        current={gs.totalDamage}
        max={gs.targetDamage}
        label={`Damage dealt to ${gs.defenderName}`}
        invert
      />

      {/* Difficulty badge + Round counter */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-red-400/40">
          Difficulty: <span className={
            gs.difficulty === "Hard" ? "text-red-400" :
            gs.difficulty === "Medium" ? "text-amber-400/70" :
            "text-green-400/70"
          }>{gs.difficulty}</span>
          {gs.difficultyBonus > 0 && ` (+${gs.difficultyBonus} per defender die)`}
        </p>
      </div>
      <RoundCounter current={gs.currentRound + 1} total={gs.totalRounds} results={roundResults} />

      {/* Power-up status */}
      {powerUpStatus && (
        <div className={`text-xs px-3 py-1.5 rounded-md border ${
          (gs.bloodrushAvailable && !gs.bloodrushUsed) || (gs.barragingAvailable && !gs.barragingUsed)
            ? "border-amber-500/40 bg-amber-900/20 text-amber-300 animate-pulse"
            : "border-red-900/30 bg-red-950/30 text-red-400/50"
        }`}>
          {powerUpStatus}
        </div>
      )}

      {/* Power-up notification */}
      {gs.phase === "power_up" && (
        <div className="text-center py-3 animate-chat-in">
          <p className="text-amber-400 font-bold text-sm">Power-Up Earned!</p>
          <p className="text-xs text-amber-300/70">
            {gs.barragingAvailable && !gs.barragingUsed && gs.totalDamage >= 12
              ? "Barraging Beatdown -- reroll one die next round!"
              : "Bloodrush Bellow -- roll 4 dice next round!"}
          </p>
        </div>
      )}

      {/* Dice area */}
      <div className="relative flex flex-col items-center gap-4 py-4">
        {popup && <DamagePopup amount={popup.amount} type={popup.type} id={popup.id} />}

        {/* Player attack dice */}
        {gs.currentAttackDice.length > 0 && (
          <div className="text-center space-y-1">
            <p className="text-xs text-red-400/60 font-medium">YOUR ATTACK</p>
            <DiceRoll
              dice={gs.currentAttackDice}
              rolling={playerRolling}
              onRollComplete={handlePlayerRollComplete}
              onToggleSelect={gs.phase === "reroll" ? handleRerollDie : undefined}
              variant="attack"
              size="lg"
            />
            {!playerRolling && gs.currentAttackDice.length > 0 && (
              <p className="text-sm font-bold text-amber-400">
                {allSame(gs.currentAttackDice)
                  ? `= ${sumDice(gs.currentAttackDice)} x2 SMASH!`
                  : `= ${sumDice(gs.currentAttackDice)}`}
              </p>
            )}
          </div>
        )}

        {/* Reroll prompt */}
        {gs.phase === "reroll" && (
          <div className="text-center space-y-2 animate-chat-in">
            <p className="text-xs text-amber-300 font-medium">Barraging Beatdown -- Tap a die to reroll it!</p>
            <button
              onClick={handleSkipReroll}
              className="px-4 py-1.5 rounded-md text-xs font-medium text-red-400/60 border border-red-900/30 hover:border-red-700/40 hover:text-red-300 transition-colors"
            >
              Skip Reroll
            </button>
          </div>
        )}

        {/* VS separator */}
        {gs.currentAttackDice.length > 0 && gs.currentDefenseDice.length > 0 && (
          <p className="text-xs text-red-400/40 font-bold">VS</p>
        )}

        {/* Defender dice */}
        {gs.currentDefenseDice.length > 0 && (
          <div className="text-center space-y-1">
            <p className="text-xs text-red-400/60 font-medium">DEFENSE</p>
            <DiceRoll
              dice={gs.currentDefenseDice}
              rolling={defenderRolling}
              onRollComplete={handleDefenderRollComplete}
              variant="defend"
              size="lg"
            />
            {!defenderRolling && gs.currentDefenseDice.length > 0 && (
              <p className="text-sm font-bold text-zinc-400">
                {allSame(gs.currentDefenseDice)
                  ? `= ${sumDice(gs.currentDefenseDice)} BLOCK!`
                  : `= ${sumDice(gs.currentDefenseDice)}`}
              </p>
            )}
          </div>
        )}

        {/* Damage result after resolve */}
        {gs.phase === "resolve" && gs.currentAttackDice.length > 0 && gs.currentDefenseDice.length > 0 && (
          <div className="text-center animate-chat-in">
            {(() => {
              const aTotal = sumDice(gs.currentAttackDice);
              const dTotal = sumDice(gs.currentDefenseDice);
              const isSmash = allSame(gs.currentAttackDice);
              const isBlock = !isSmash && allSame(gs.currentDefenseDice);
              if (isSmash) {
                const dmg = Math.max(0, aTotal * 2 - dTotal);
                return <p className="text-lg font-bold text-amber-400">= {aTotal * 2} vs = {dTotal} &rarr; {dmg} dmg!</p>;
              }
              if (isBlock) {
                return <p className="text-lg font-bold text-zinc-400">BLOCKED!</p>;
              }
              const dmg = Math.max(0, aTotal - dTotal);
              return <p className="text-lg font-bold text-amber-400">= {aTotal} vs = {dTotal} &rarr; {dmg} dmg!</p>;
            })()}
          </div>
        )}
      </div>

      {/* Attack button */}
      {gs.phase === "ready" && (
        <button
          onClick={handleAttack}
          className="w-full py-3 rounded-lg font-bold text-sm bg-red-700 hover:bg-red-600 text-red-50 transition-colors hover:shadow-[0_0_12px_rgba(220,38,38,0.4)] active:scale-[0.97]"
        >
          Attack!
          {gs.bloodrushAvailable && !gs.bloodrushUsed && " (4 dice!)"}
        </button>
      )}

      {/* Damage summary */}
      {gs.roundHistory.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-red-400/50">
          <span>Dealt: {gs.totalDamage}/{gs.targetDamage} dmg</span>
          <span>|</span>
          <span>Need: {Math.max(0, gs.targetDamage - gs.totalDamage)} more</span>
        </div>
      )}

      {/* Round history */}
      {gs.roundHistory.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-red-900/20">
          {gs.roundHistory.map((round, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="text-red-400/50 w-8">R{i + 1}:</span>
              <span className="text-red-200/60">[{round.attackDice.join("+")}]</span>
              <span className="text-red-400/30">vs</span>
              <span className="text-zinc-400/60">[{round.defenseDice.join("+")}]</span>
              <span className="text-red-400/30">&rarr;</span>
              {round.isSmash ? (
                <span className="text-amber-400 font-medium">{round.damage} dmg SMASH!</span>
              ) : round.isBlock ? (
                <span className="text-zinc-400 font-medium">BLOCKED!</span>
              ) : round.damage > 0 ? (
                <span className="text-amber-400 font-medium">{round.damage} dmg</span>
              ) : (
                <span className="text-red-400/40">0 dmg</span>
              )}
              {round.rerolledIndex !== undefined && <span className="text-purple-400/50">*</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
