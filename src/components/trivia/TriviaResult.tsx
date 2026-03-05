"use client";
import type { TriviaStats } from "@/lib/trivia/types";
import { QUESTIONS_PER_GAME, WIN_THRESHOLD } from "@/lib/trivia/puzzle-generator";

function CountdownToMidnight() {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const diff = tomorrow.getTime() - now.getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return (
    <p className="text-[10px] text-fab-dim text-center">
      Next quiz in {h}h {m}m
    </p>
  );
}

export function TriviaResult({
  won,
  score,
  stats,
  dateStr,
  onShare,
}: {
  won: boolean;
  score: number;
  stats: TriviaStats | null;
  dateStr: string;
  onShare: () => void;
}) {
  return (
    <div className="bg-fab-surface border border-fab-border rounded-lg p-4 space-y-3">
      <div className="text-center">
        <p className={`text-lg font-bold ${won ? "text-fab-win" : "text-fab-loss"}`}>
          {won ? "Nailed It!" : "Better Luck Tomorrow"}
        </p>
        <p className="text-sm text-fab-muted">
          {score}/{QUESTIONS_PER_GAME} correct {won ? "" : `(need ${WIN_THRESHOLD})`}
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
