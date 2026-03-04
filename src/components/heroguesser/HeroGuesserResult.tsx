"use client";
import { useState, useEffect } from "react";
import type { HeroGuesserStats } from "@/lib/heroguesser/types";
import type { HeroInfo } from "@/types";

function getNextPuzzleCountdown(): string {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const diff = tomorrow.getTime() - now.getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${h}h ${m}m ${s}s`;
}

export function HeroGuesserResult({
  won,
  guessCount,
  maxGuesses,
  answer,
  stats,
  dateStr,
  onShare,
}: {
  won: boolean;
  guessCount: number;
  maxGuesses: number;
  answer: HeroInfo;
  stats: HeroGuesserStats | null;
  dateStr: string;
  onShare: () => void;
}) {
  const [countdown, setCountdown] = useState(getNextPuzzleCountdown());

  useEffect(() => {
    const id = setInterval(() => setCountdown(getNextPuzzleCountdown()), 1000);
    return () => clearInterval(id);
  }, []);

  const dist = stats?.guessDistribution ?? {};
  const maxDist = Math.max(1, ...Object.values(dist));

  return (
    <div className="bg-fab-surface border border-fab-border rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="text-center">
        {won ? (
          <>
            <p className="text-lg font-bold text-fab-win">Got it!</p>
            <p className="text-xs text-fab-muted">in {guessCount}/{maxGuesses} guesses</p>
          </>
        ) : (
          <>
            <p className="text-lg font-bold text-fab-loss">Not this time</p>
            <p className="text-xs text-fab-muted">The answer was <span className="font-semibold text-fab-text">{answer.name}</span></p>
          </>
        )}
      </div>

      {/* Answer card */}
      <div className="flex items-center gap-3 bg-fab-bg rounded-lg p-3">
        <img src={answer.imageUrl} alt={answer.name} className="w-12 h-12 rounded-lg object-cover" />
        <div>
          <p className="text-sm font-semibold text-fab-text">{answer.name}</p>
          <p className="text-[10px] text-fab-muted">{answer.classes.join(", ")} · {answer.talents.length > 0 ? answer.talents.join(", ") : "No Talent"}</p>
          <p className="text-[10px] text-fab-dim">{answer.young ? "Young" : "Adult"} · {answer.life} Life · {answer.intellect} Int</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-sm font-bold text-fab-text">{stats.gamesPlayed}</p>
            <p className="text-[9px] text-fab-dim">Played</p>
          </div>
          <div>
            <p className="text-sm font-bold text-fab-text">{stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0}%</p>
            <p className="text-[9px] text-fab-dim">Win %</p>
          </div>
          <div>
            <p className="text-sm font-bold text-fab-text">{stats.currentStreak}</p>
            <p className="text-[9px] text-fab-dim">Streak</p>
          </div>
          <div>
            <p className="text-sm font-bold text-fab-text">{stats.maxStreak}</p>
            <p className="text-[9px] text-fab-dim">Best</p>
          </div>
        </div>
      )}

      {/* Guess distribution */}
      {stats && stats.gamesWon > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-fab-dim font-medium uppercase tracking-wider">Guess Distribution</p>
          {[1, 2, 3, 4, 5, 6].map((n) => {
            const count = dist[n] || 0;
            const pct = (count / maxDist) * 100;
            const isThis = won && guessCount === n;
            return (
              <div key={n} className="flex items-center gap-2">
                <span className="text-[10px] text-fab-dim w-3 text-right">{n}</span>
                <div className="flex-1 h-4 rounded-sm overflow-hidden bg-fab-bg">
                  <div
                    className={`h-full rounded-sm flex items-center justify-end px-1 ${isThis ? "bg-fab-win/40" : "bg-fab-muted/20"}`}
                    style={{ width: `${Math.max(pct, count > 0 ? 8 : 0)}%` }}
                  >
                    {count > 0 && <span className="text-[9px] font-medium text-fab-text">{count}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onShare}
          className="flex-1 px-3 py-2 bg-fab-gold/15 text-fab-gold text-xs font-medium rounded-lg hover:bg-fab-gold/25 transition-colors"
        >
          Share
        </button>
      </div>

      {/* Countdown */}
      <p className="text-center text-[10px] text-fab-dim">Next puzzle in {countdown}</p>
    </div>
  );
}
