"use client";
import { useState, useEffect } from "react";
import type { BrawlStats, BrawlGameState } from "@/lib/brutebrawl/types";
import type { DailyBrawl } from "@/lib/brutebrawl/puzzle-generator";
import { BossChat } from "@/components/dice/BossChat";
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

  return <p className="text-[10px] text-red-400/40 text-center">Next brawl in {timeStr}</p>;
}

export function BrawlResult({
  gameState,
  stats,
  puzzle,
  dateStr,
  onShare,
}: {
  gameState: BrawlGameState;
  stats: BrawlStats | null;
  puzzle: DailyBrawl;
  dateStr: string;
  onShare: () => void;
}) {
  const { won, totalDamage, targetDamage, roundHistory, defenderName, defenderImageUrl, difficulty } = gameState;
  const taunts = puzzle.taunts;

  const smashes = roundHistory.filter((r) => r.isSmash).length;
  const blocks = roundHistory.filter((r) => r.isBlock).length;

  return (
    <div className={`space-y-4 ${won ? "animate-victory" : ""}`}>
      {/* Boss reaction */}
      <BossChat
        heroImageUrl={defenderImageUrl}
        heroName={defenderName}
        message={won ? taunts.victory : taunts.defeat}
        mood={won ? "defeated" : "taunt"}
      />

      {/* Result */}
      <div className="bg-[#1a0808]/80 border border-red-900/40 rounded-lg p-4 space-y-3">
        <div className="text-center">
          <p className={`text-lg font-bold ${won ? "text-amber-400" : "text-red-400"}`}>
            {won ? `${defenderName} Defeated!` : `${defenderName} Wins!`}
          </p>
          <p className="text-xs text-red-200/60">
            vs {defenderName}
          </p>
          <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-medium ${
            difficulty === "Hard" ? "bg-red-900/40 text-red-300" :
            difficulty === "Medium" ? "bg-amber-900/30 text-amber-300" :
            "bg-green-900/30 text-green-300"
          }`}>
            {difficulty}
          </span>
          <p className="text-sm text-red-200/70 mt-1">
            {totalDamage}/{targetDamage} damage dealt
          </p>
        </div>

        {/* Round-by-round recap */}
        <div className="space-y-1">
          {roundHistory.map((round, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="text-red-400/50 w-8">R{i + 1}:</span>
              <span className="text-red-200/60">[{round.attackDice.join("+")}]</span>
              {round.isSmash && <span className="text-amber-400 text-[10px]">SMASH!</span>}
              <span className="text-red-400/30">vs</span>
              <span className="text-zinc-400/60">[{round.defenseDice.join("+")}]</span>
              {round.isBlock && <span className="text-zinc-400 text-[10px]">BLOCK!</span>}
              <span className="text-red-400/30">&rarr;</span>
              {round.isSmash ? (
                <span className="text-amber-400 font-medium">{round.damage}</span>
              ) : round.isBlock ? (
                <span className="text-zinc-400 font-medium">0</span>
              ) : round.damage > 0 ? (
                <span className="text-amber-400 font-medium">{round.damage}</span>
              ) : (
                <span className="text-red-400/40">0</span>
              )}
              {round.rerolledIndex !== undefined && <span className="text-purple-400/50 text-[10px]">rerolled</span>}
            </div>
          ))}
        </div>

        {/* Game summary */}
        <div className="flex items-center justify-center gap-4 text-[10px] text-red-400/50 pt-1 border-t border-red-900/20">
          {smashes > 0 && <span>Smashes: {smashes}</span>}
          {blocks > 0 && <span>Blocked: {blocks}</span>}
          <span>Rounds: {roundHistory.length}/{gameState.totalRounds}</span>
        </div>

        {/* Stats grid */}
        {stats && (
          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-red-900/30">
            {[
              { label: "Played", value: stats.gamesPlayed },
              { label: "Win %", value: stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0 },
              { label: "Streak", value: stats.currentStreak },
              { label: "Best Dmg", value: stats.bestDamage },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-lg font-bold text-red-100">{s.value}</p>
                <p className="text-[10px] text-red-400/50">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Extra stats */}
        {stats && (
          <div className="flex items-center justify-center gap-4 text-[10px] text-red-400/40">
            <span>Total dmg: {stats.totalDamageDealt}</span>
            <span>Max streak: {stats.maxStreak}</span>
            <span>Smashes: {stats.totalSmashes}</span>
          </div>
        )}

        {/* Share button */}
        <button
          onClick={onShare}
          className="w-full py-2.5 rounded-lg font-semibold text-sm bg-red-700 hover:bg-red-600 text-red-50 transition-colors"
        >
          Share Result
        </button>

        <CountdownToMidnight />
      </div>
    </div>
  );
}
