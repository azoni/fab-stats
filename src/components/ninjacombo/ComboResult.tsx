"use client";
import { useState, useEffect } from "react";
import type { NinjaComboStats, NinjaComboGameState } from "@/lib/ninjacombo/types";
import type { DailyCombo } from "@/lib/ninjacombo/puzzle-generator";
import { CardTypeIcon } from "./CardTypeIcon";
import "@/components/dice/dice.css";

function CountdownToMidnight() {
  const [timeStr, setTimeStr] = useState("");

  useEffect(() => {
    function update() {
      const now = new Date();
      const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
      const diff = tomorrow.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeStr(`${h}h ${m}m ${s}s`);
    }
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return <p className="text-[10px] text-cyan-400/40 text-center">Next combo in {timeStr}</p>;
}

function getRating(score: number, optimal: number): { label: string; color: string } {
  const ratio = score / optimal;
  if (ratio >= 1) return { label: "Perfect Chain!", color: "text-amber-400" };
  if (ratio >= 0.9) return { label: "Combo Master", color: "text-cyan-300" };
  if (ratio >= 0.75) return { label: "Sharp Strike", color: "text-cyan-400" };
  if (ratio >= 0.6) return { label: "Decent Combo", color: "text-cyan-400/70" };
  return { label: "Off Rhythm", color: "text-cyan-400/50" };
}

export function ComboResult({
  gameState,
  stats,
  puzzle,
  dateStr,
  onShare,
}: {
  gameState: NinjaComboGameState;
  stats: NinjaComboStats | null;
  puzzle: DailyCombo;
  dateStr: string;
  onShare: () => void;
}) {
  const { won, totalDamage, targetDamage, chain } = gameState;
  const comboCount = chain.filter((s) => s.comboed).length;
  const maxStreak = Math.max(0, ...chain.map((s) => s.consecutiveCombo));
  const baseDmg = chain.reduce((sum, s) => sum + s.card.baseDamage, 0);
  const bonusDmg = chain.reduce((sum, s) => sum + s.bonusDamage, 0);
  const rating = getRating(totalDamage, puzzle.optimalScore);

  return (
    <div className={`space-y-4 ${won ? "animate-victory" : ""}`}>
      {/* Result header */}
      <div className="bg-[#081a1a]/80 border border-cyan-900/40 rounded-lg p-4 space-y-3">
        <div className="text-center">
          <h2 className={`text-xl font-bold ${won ? "text-cyan-200" : "text-cyan-400/60"}`}>
            {won ? "Target Defeated!" : "Not Enough Damage"}
          </h2>
          <p className="text-xs text-cyan-400/50 mt-0.5">
            {puzzle.taunts[won ? "victory" : "defeat"]}
          </p>
        </div>

        {/* Chain replay */}
        <div className="space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-cyan-400/40">Your Chain</span>
          <div className="flex gap-1">
            {chain.map((slot, i) => (
              <div
                key={i}
                className={`flex-1 rounded-md p-1.5 text-center border ${
                  slot.comboed
                    ? "bg-amber-900/30 border-amber-500/50"
                    : "bg-[#0a1a1a] border-cyan-900/30"
                }`}
              >
                <div className="flex justify-center"><CardTypeIcon type={slot.card.type} className="w-4 h-4 text-cyan-300" /></div>
                <div className="text-[8px] text-cyan-200 truncate">{slot.card.name}</div>
                <div className={`text-xs font-bold ${slot.comboed ? "text-amber-400" : "text-cyan-300"}`}>
                  {slot.totalDamage}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Score breakdown */}
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="bg-[#0a1a1a]/60 rounded-md p-2">
            <div className="text-[10px] text-cyan-400/50">Base Damage</div>
            <div className="text-lg font-bold text-cyan-300">{baseDmg}</div>
          </div>
          <div className="bg-[#0a1a1a]/60 rounded-md p-2">
            <div className="text-[10px] text-cyan-400/50">Combo Bonus</div>
            <div className="text-lg font-bold text-amber-400">+{bonusDmg}</div>
          </div>
        </div>

        {/* Total + Rating */}
        <div className="text-center space-y-1">
          <div className="text-2xl font-bold text-cyan-100">
            {totalDamage} / {targetDamage}
          </div>
          <div className={`text-xs font-semibold ${rating.color}`}>
            {rating.label} ({Math.round((totalDamage / puzzle.optimalScore) * 100)}% of optimal)
          </div>
          <div className="text-[10px] text-cyan-400/40">
            Optimal: {puzzle.optimalScore} dmg
          </div>
        </div>

        {/* Combo stats */}
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="bg-[#0a1a1a]/60 rounded-md p-2">
            <div className="text-[10px] text-cyan-400/50">Combos</div>
            <div className="text-sm font-bold text-cyan-300">{comboCount} / {chain.length}</div>
          </div>
          <div className="bg-[#0a1a1a]/60 rounded-md p-2">
            <div className="text-[10px] text-cyan-400/50">Best Streak</div>
            <div className="text-sm font-bold text-amber-400">x{maxStreak}</div>
          </div>
        </div>

        {/* Player stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-1 text-center">
            <div>
              <div className="text-[10px] text-cyan-400/40">Played</div>
              <div className="text-xs font-bold text-cyan-300">{stats.gamesPlayed}</div>
            </div>
            <div>
              <div className="text-[10px] text-cyan-400/40">Win %</div>
              <div className="text-xs font-bold text-cyan-300">
                {stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0}%
              </div>
            </div>
            <div>
              <div className="text-[10px] text-cyan-400/40">Streak</div>
              <div className="text-xs font-bold text-cyan-300">{stats.currentStreak}</div>
            </div>
            <div>
              <div className="text-[10px] text-cyan-400/40">Best</div>
              <div className="text-xs font-bold text-cyan-300">{stats.bestDamage}</div>
            </div>
          </div>
        )}

        {/* Share button */}
        <button
          onClick={onShare}
          className="w-full py-2.5 rounded-lg font-semibold text-sm bg-cyan-700 hover:bg-cyan-600 text-cyan-50 transition-colors"
        >
          Share Result
        </button>

        <CountdownToMidnight />
      </div>
    </div>
  );
}
