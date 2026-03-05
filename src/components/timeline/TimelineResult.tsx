"use client";
import type { TimelineStats } from "@/lib/timeline/types";
import { ITEMS_PER_GAME } from "@/lib/timeline/puzzle-generator";

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

export function TimelineResult({
  won,
  correctPlacements,
  livesRemaining,
  stats,
  dateStr,
  onShare,
}: {
  won: boolean;
  correctPlacements: number;
  livesRemaining: number;
  stats: TimelineStats | null;
  dateStr: string;
  onShare: () => void;
}) {
  return (
    <div className="bg-fab-surface border border-fab-border rounded-lg p-4 space-y-3">
      <div className="text-center">
        <p className={`text-lg font-bold ${won ? "text-fab-win" : "text-fab-loss"}`}>
          {won ? "Perfect Timeline!" : "Out of Lives"}
        </p>
        <p className="text-sm text-fab-muted">
          {correctPlacements}/{ITEMS_PER_GAME} placed correctly
          {won ? "" : ` \u00B7 ${livesRemaining} lives remaining`}
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
