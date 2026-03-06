"use client";
import type { RampageStats, RampageGameState } from "@/lib/rhinarsrampage/types";
import type { DailyRampage } from "@/lib/rhinarsrampage/puzzle-generator";
import { BossChat } from "@/components/dice/BossChat";
import "@/components/dice/dice.css";

function CountdownToMidnight() {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const diff = tomorrow.getTime() - now.getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return <p className="text-[10px] text-red-400/40 text-center">Next rampage in {h}h {m}m</p>;
}

export function RampageResult({
  gameState,
  stats,
  puzzle,
  heroImageUrl,
  dateStr,
  onShare,
}: {
  gameState: RampageGameState;
  stats: RampageStats | null;
  puzzle: DailyRampage;
  heroImageUrl: string;
  dateStr: string;
  onShare: () => void;
}) {
  const { won, score, currentTargetHP, roundHistory } = gameState;
  const taunts = puzzle.taunts;

  return (
    <div className={`space-y-4 ${won ? "animate-victory" : ""}`}>
      {/* Boss reaction */}
      <BossChat
        heroImageUrl={heroImageUrl}
        heroName="Rhinar"
        message={won ? taunts.victory : taunts.defeat}
        mood={won ? "defeated" : "taunt"}
      />

      {/* Result */}
      <div className="bg-[#1a0808]/80 border border-red-900/40 rounded-lg p-4 space-y-3">
        <div className="text-center">
          <p className={`text-lg font-bold ${won ? "text-amber-400" : "text-red-400"}`}>
            {won ? "Rhinar Defeated!" : "Rhinar Wins!"}
          </p>
          <p className="text-sm text-red-200/70">
            {score}/{currentTargetHP} damage dealt
          </p>
        </div>

        {/* Round recap */}
        <div className="space-y-1">
          {roundHistory.map((round, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="text-red-400/50 w-12">R{i + 1}:</span>
              <span className="text-red-200/60">
                [{round.rolls.join(", ")}]
              </span>
              <span className="text-red-400/30">{"\u2192"}</span>
              {round.banked ? (
                <span className="text-amber-400 font-medium">Banked {round.total}</span>
              ) : (
                <span className="text-red-500 font-medium">Bust!</span>
              )}
            </div>
          ))}
        </div>

        {/* Intimidate info */}
        {gameState.intimidateUsed && (
          <p className="text-[10px] text-purple-400/50 text-center">
            Intimidate: -{gameState.intimidateValue} HP
          </p>
        )}

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
            <span>Busts: {stats.totalBusts}</span>
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
