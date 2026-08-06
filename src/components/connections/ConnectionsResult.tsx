"use client";
import { NextPuzzleCountdown } from "@/components/games/NextPuzzleCountdown";
import { WinBurst, CountUp } from "@/components/games/fx";
import type { ConnectionsStats } from "@/lib/connections/types";
import { MAX_MISTAKES } from "@/lib/connections/puzzle-generator";

const DIFFICULTY_COLORS: Record<number, string> = {
  1: "bg-yellow-500",
  2: "bg-green-500",
  3: "bg-blue-500",
  4: "bg-purple-500",
};

function CountdownToMidnight() {
  return <NextPuzzleCountdown label="Next puzzle in" />;
}

export function ConnectionsResult({
  won,
  mistakes,
  solveOrder,
  stats,
  dateStr,
  onShare,
  celebrate = false,
}: {
  won: boolean;
  mistakes: number;
  solveOrder: number[];
  stats: ConnectionsStats | null;
  dateStr: string;
  onShare: () => void;
  celebrate?: boolean;
}) {
  const perfect = won && mistakes === 0;
  return (
    <div className="relative overflow-hidden bg-fab-surface border border-fab-border rounded-lg p-4 space-y-3">
      {won && celebrate && <WinBurst count={perfect ? 40 : 26} />}
      <div className="relative text-center">
        <p
          className={`font-black ${won ? "text-fab-win text-2xl" : "text-fab-loss text-lg"} ${
            won && celebrate ? "game-pop" : ""
          } ${perfect ? "inline-block rounded-lg px-3 game-win-glow" : ""}`}
        >
          {won ? (mistakes === 0 ? "Perfect!" : "Well Done!") : "Better Luck Tomorrow"}
        </p>
        <p className="text-sm text-fab-muted">
          {won
            ? `Solved with ${mistakes}/${MAX_MISTAKES} mistake${mistakes !== 1 ? "s" : ""}`
            : `${MAX_MISTAKES} mistakes — puzzle failed`}
        </p>
      </div>

      {/* Solve order visualization — difficulty order is the bragging stat, cascade it */}
      <div className="relative flex justify-center gap-1.5">
        {solveOrder.map((difficulty, i) => (
          <div
            key={i}
            className={`w-8 h-8 rounded ${DIFFICULTY_COLORS[difficulty] || "bg-fab-border"} opacity-80 ${
              celebrate ? "game-flip-in" : ""
            }`}
            style={celebrate ? { animationDelay: `${i * 90}ms` } : undefined}
          />
        ))}
      </div>

      {stats && (
        <div className="relative grid grid-cols-4 gap-2">
          {[
            { label: "Played", value: stats.gamesPlayed },
            { label: "Win %", value: stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0, suffix: "%" },
            { label: "Streak", value: stats.currentStreak },
            { label: "Perfect", value: stats.perfectGames },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-lg font-bold text-fab-text"><CountUp value={s.value} suffix={s.suffix || ""} /></p>
              <p className="text-[10px] text-fab-dim">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onShare}
        className="w-full px-3 py-2 bg-fab-gold/15 text-fab-gold text-xs font-medium rounded-lg hover:bg-fab-gold/25 transition-colors"
      >
        Share Result
      </button>
      <CountdownToMidnight />
    </div>
  );
}
