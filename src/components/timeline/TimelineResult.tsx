"use client";
import { NextPuzzleCountdown } from "@/components/games/NextPuzzleCountdown";
import { WinBurst, CountUp } from "@/components/games/fx";
import type { TimelineStats } from "@/lib/timeline/types";
import { ITEMS_PER_GAME } from "@/lib/timeline/puzzle-generator";

function CountdownToMidnight() {
  return <NextPuzzleCountdown label="Next puzzle in" />;
}

export function TimelineResult({
  won,
  correctPlacements,
  livesRemaining,
  stats,
  dateStr,
  onShare,
  celebrate = false,
}: {
  won: boolean;
  correctPlacements: number;
  livesRemaining: number;
  stats: TimelineStats | null;
  dateStr: string;
  onShare: () => void;
  celebrate?: boolean;
}) {
  // A win with all 3 lives intact is the real skill ceiling \u2014 call it out.
  const flawless = won && livesRemaining >= 3;
  return (
    <div className="relative overflow-hidden bg-fab-surface border border-fab-border rounded-lg p-4 space-y-3">
      {won && celebrate && <WinBurst count={flawless ? 40 : 26} />}
      <div className="relative text-center">
        <p
          className={`font-black ${won ? "text-fab-win text-2xl" : "text-fab-loss text-lg"} ${
            won && celebrate ? "game-pop" : ""
          } ${flawless ? "inline-block rounded-lg px-3 game-win-glow" : ""}`}
        >
          {flawless ? "Flawless Timeline!" : won ? "Timeline Complete!" : "Out of Lives"}
        </p>
        <p className="text-sm text-fab-muted">
          {correctPlacements}/{ITEMS_PER_GAME} placed correctly
          {won ? ` \u00B7 ${livesRemaining} ${livesRemaining === 1 ? "life" : "lives"} left` : ""}
        </p>
      </div>

      {stats && (
        <div className="relative grid grid-cols-4 gap-2">
          {[
            { label: "Played", value: stats.gamesPlayed },
            { label: "Win %", value: stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0, suffix: "%" },
            { label: "Streak", value: stats.currentStreak },
            { label: "Best", value: stats.maxStreak },
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
