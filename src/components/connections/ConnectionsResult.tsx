"use client";
import type { ConnectionsStats } from "@/lib/connections/types";
import { MAX_MISTAKES } from "@/lib/connections/puzzle-generator";

const DIFFICULTY_COLORS: Record<number, string> = {
  1: "bg-yellow-500",
  2: "bg-green-500",
  3: "bg-blue-500",
  4: "bg-purple-500",
};

function CountdownToMidnight() {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const diff = tomorrow.getTime() - now.getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return (
    <p className="text-[10px] text-fab-dim text-center">
      Next puzzle in {h}h {m}m
    </p>
  );
}

export function ConnectionsResult({
  won,
  mistakes,
  solveOrder,
  stats,
  dateStr,
  onShare,
}: {
  won: boolean;
  mistakes: number;
  solveOrder: number[];
  stats: ConnectionsStats | null;
  dateStr: string;
  onShare: () => void;
}) {
  return (
    <div className="bg-fab-surface border border-fab-border rounded-lg p-4 space-y-3">
      <div className="text-center">
        <p className={`text-lg font-bold ${won ? "text-fab-win" : "text-fab-loss"}`}>
          {won ? (mistakes === 0 ? "Perfect!" : "Well Done!") : "Better Luck Tomorrow"}
        </p>
        <p className="text-sm text-fab-muted">
          {won
            ? `Solved with ${mistakes}/${MAX_MISTAKES} mistake${mistakes !== 1 ? "s" : ""}`
            : `${MAX_MISTAKES} mistakes — puzzle failed`}
        </p>
      </div>

      {/* Solve order visualization */}
      <div className="flex justify-center gap-1.5">
        {solveOrder.map((difficulty, i) => (
          <div
            key={i}
            className={`w-8 h-8 rounded ${DIFFICULTY_COLORS[difficulty] || "bg-fab-border"} opacity-80`}
          />
        ))}
      </div>

      {stats && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Played", value: stats.gamesPlayed },
            { label: "Win %", value: stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0 },
            { label: "Streak", value: stats.currentStreak },
            { label: "Perfect", value: stats.perfectGames },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-lg font-bold text-fab-text">{s.value}</p>
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
