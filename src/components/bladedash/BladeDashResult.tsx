"use client";
import type { BladeDashStats } from "@/lib/bladedash/types";

function formatTime(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function CountdownToMidnight() {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const diff = tomorrow.getTime() - now.getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return (
    <p className="text-[10px] text-fab-dim text-center">
      Next puzzle in {h}h {m}m
    </p>
  );
}

export function BladeDashResult({
  won,
  elapsedMs,
  hintsUsed,
  wordsSolved,
  stats,
  onShare,
}: {
  won: boolean;
  elapsedMs: number;
  hintsUsed: number;
  wordsSolved: number;
  stats: BladeDashStats | null;
  onShare: () => void;
}) {
  const isPerfect = won && hintsUsed === 0;

  return (
    <div className="bg-fab-surface border border-fab-border rounded-lg p-4 space-y-3">
      <div className="text-center">
        <p className={`text-lg font-bold ${won ? "text-fab-win" : "text-fab-loss"}`}>
          {won ? (isPerfect ? "Blade Master!" : "Well Done!") : "Keep Practicing"}
        </p>
        <p className="text-sm text-fab-muted">
          {wordsSolved}/8 words · {formatTime(elapsedMs)}
          {isPerfect && <span className="ml-2 text-fab-gold">No hints!</span>}
          {!isPerfect && hintsUsed > 0 && <span className="text-fab-dim"> · {hintsUsed} hints</span>}
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Played", value: stats.gamesPlayed },
            { label: "Win %", value: stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0 },
            { label: "Streak", value: stats.currentStreak },
            { label: "Best", value: stats.maxStreak },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-lg font-bold text-fab-text">{s.value}</p>
              <p className="text-[10px] text-fab-dim">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {stats && stats.bestTimeMs > 0 && (
        <div className="flex justify-center gap-6 text-xs text-fab-muted">
          <span>Best time: <span className="font-bold text-fab-text">{formatTime(stats.bestTimeMs)}</span></span>
          <span>Perfect games: <span className="font-bold text-fab-text">{stats.perfectGames}</span></span>
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
