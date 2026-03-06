"use client";
import { useState, useCallback } from "react";
import type { NinjaComboGameState, ComboCard, ChainSlot } from "@/lib/ninjacombo/types";
import type { DailyCombo } from "@/lib/ninjacombo/puzzle-generator";
import { scoreChain } from "@/lib/ninjacombo/puzzle-generator";
import { playCard, undoLastCard } from "@/lib/ninjacombo/game-state";
import { HealthBar } from "@/components/dice/HealthBar";
import { DamagePopup } from "@/components/dice/DamagePopup";
import { CardTypeIcon } from "./CardTypeIcon";
import "@/components/dice/dice.css";

const CONDITION_LABEL: Record<string, string> = {
  after_kick: "after Kick",
  after_punch: "after Punch",
  after_any: "after any",
  after_2_chain: "after 2+ combo",
};

function wouldCombo(card: ComboCard, chain: ChainSlot[]): boolean {
  if (chain.length === 0) return false;
  const prev = chain[chain.length - 1].card;
  let consecutiveCount = chain[chain.length - 1].consecutiveCombo;
  switch (card.comboCondition) {
    case "after_kick": return prev.type === "kick";
    case "after_punch": return prev.type === "punch";
    case "after_any": return true;
    case "after_2_chain": return consecutiveCount >= 2;
  }
}

export function ComboBoard({
  gameState,
  puzzle,
  onStateChange,
}: {
  gameState: NinjaComboGameState;
  puzzle: DailyCombo;
  onStateChange: (state: NinjaComboGameState) => void;
}) {
  const [popups, setPopups] = useState<{ id: number; amount: number; type: string }[]>([]);
  let popupId = 0;

  const handlePlayCard = useCallback((cardId: string) => {
    const newState = playCard(gameState, cardId);
    if (newState === gameState) return;
    onStateChange(newState);

    // Check if the newly added card comboed
    const lastSlot = newState.chain[newState.chain.length - 1];
    if (lastSlot?.comboed) {
      setPopups((prev) => [...prev, {
        id: Date.now() + Math.random(),
        amount: lastSlot.bonusDamage,
        type: lastSlot.card.type === "special" ? "combo" : "combo",
      }]);
    }
  }, [gameState, onStateChange]);

  const handleUndo = useCallback(() => {
    const newState = undoLastCard(gameState);
    if (newState === gameState) return;
    onStateChange(newState);
  }, [gameState, onStateChange]);

  const { hand, chain, chainSize, totalDamage, targetDamage } = gameState;

  // Preview: which hand cards would combo if played next
  const comboPreview = new Set(
    hand.filter((c) => wouldCombo(c, chain)).map((c) => c.id)
  );

  // Compute what a potential chain would look like for damage preview
  function previewDamage(cardId: string): number | null {
    const card = hand.find((c) => c.id === cardId);
    if (!card) return null;
    const chainCards = [...chain.map((s) => s.card), card];
    const { total } = scoreChain(chainCards);
    return total - totalDamage;
  }

  return (
    <div className="space-y-4">
      {/* Health bar */}
      <HealthBar current={totalDamage} max={targetDamage} label="Damage" invert />

      {/* Popups */}
      <div className="relative h-0">
        {popups.map((p) => (
          <DamagePopup key={p.id} id={p.id} amount={p.amount} type="combo" />
        ))}
      </div>

      {/* Chain slots */}
      <div className="bg-[#081a1a]/80 border border-cyan-900/40 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-wider text-cyan-400/60">Combo Chain</span>
          <span className="text-xs text-cyan-300/80 font-mono">
            {totalDamage} / {targetDamage} dmg
          </span>
        </div>

        <div className="flex gap-1.5">
          {Array.from({ length: chainSize }, (_, i) => {
            const slot = chain[i];
            if (slot) {
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-md p-1.5 text-center border transition-all ${
                    slot.comboed
                      ? "bg-amber-900/30 border-amber-500/50 shadow-[0_0_8px_rgba(251,191,36,0.2)]"
                      : "bg-[#0a1a1a] border-cyan-900/30"
                  }`}
                >
                  <div className="flex justify-center"><CardTypeIcon type={slot.card.type} className="w-4 h-4 text-cyan-300" /></div>
                  <div className="text-[9px] text-cyan-200 font-medium truncate">{slot.card.name}</div>
                  <div className={`text-xs font-bold ${slot.comboed ? "text-amber-400" : "text-cyan-300"}`}>
                    {slot.totalDamage}
                    {slot.comboed && <span className="text-[8px] text-amber-400/70"> +{slot.bonusDamage}</span>}
                  </div>
                  {slot.comboed && slot.consecutiveCombo > 0 && (
                    <div className="text-[8px] text-amber-400/60">x{slot.consecutiveCombo}</div>
                  )}
                </div>
              );
            }

            return (
              <div
                key={i}
                className="flex-1 rounded-md p-1.5 text-center border border-dashed border-cyan-900/20 bg-[#0a1a1a]/40"
              >
                <div className="text-sm opacity-20">?</div>
                <div className="text-[9px] text-cyan-400/20">Slot {i + 1}</div>
              </div>
            );
          })}
        </div>

        {/* Undo button */}
        {chain.length > 0 && !gameState.completed && (
          <button
            onClick={handleUndo}
            className="mt-2 text-[10px] text-cyan-400/50 hover:text-cyan-300 transition-colors"
          >
            Undo last card
          </button>
        )}
      </div>

      {/* Hand */}
      <div className="space-y-2">
        <span className="text-[10px] uppercase tracking-wider text-cyan-400/60">
          Your Hand ({hand.length} cards)
        </span>

        <div className="grid grid-cols-2 gap-2">
          {hand.map((card) => {
            const isComboable = comboPreview.has(card.id);
            const dmgPreview = chain.length < chainSize ? previewDamage(card.id) : null;

            return (
              <button
                key={card.id}
                onClick={() => handlePlayCard(card.id)}
                disabled={chain.length >= chainSize}
                className={`relative rounded-lg p-2.5 text-left border transition-all ${
                  isComboable
                    ? "bg-amber-900/20 border-amber-500/40 hover:border-amber-400/60 shadow-[0_0_6px_rgba(251,191,36,0.15)]"
                    : "bg-[#0a1a1a] border-cyan-900/30 hover:border-cyan-600/50"
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <div className="flex items-center gap-1.5">
                  <CardTypeIcon type={card.type} className="w-5 h-5 text-cyan-300 shrink-0" />
                  <span className="text-xs font-semibold text-cyan-100 truncate">{card.name}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-cyan-400/50">{CONDITION_LABEL[card.comboCondition]}</span>
                  <span className="text-xs font-bold text-cyan-300">{card.baseDamage} dmg</span>
                </div>
                {isComboable && (
                  <div className="absolute top-1 right-1.5 text-[8px] font-bold text-amber-400 uppercase tracking-wider">
                    combo!
                  </div>
                )}
                {dmgPreview !== null && (
                  <div className="text-[9px] text-cyan-400/40 mt-0.5">
                    +{dmgPreview} total
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
