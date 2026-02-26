"use client";
import { MatchResult } from "@/types";

interface RivalryData {
  playerName: string;
  opponentName: string;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  matches: number;
  recentResults: MatchResult[];
  playerHeroes: string[];
  opponentHeroes: string[];
}

export function RivalryCard({ data }: { data: RivalryData }) {
  const { playerName, opponentName, wins, losses, draws, winRate, matches, recentResults, playerHeroes, opponentHeroes } = data;
  const isWinning = winRate > 50;
  const isTied = winRate === 50;

  return (
    <div className="bg-fab-surface border border-fab-border rounded-xl overflow-hidden max-w-md mx-auto">
      {/* Header */}
      <div className="bg-fab-bg px-5 py-3 border-b border-fab-border">
        <p className="text-xs text-fab-dim uppercase tracking-wider text-center font-semibold">Head to Head Rivalry</p>
      </div>

      {/* VS Section */}
      <div className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="text-center flex-1 min-w-0">
            <p className="text-lg font-bold text-fab-text truncate">{playerName}</p>
            {playerHeroes.length > 0 && (
              <p className="text-xs text-fab-dim mt-1 truncate">{playerHeroes.slice(0, 2).join(", ")}</p>
            )}
          </div>
          <div className="shrink-0 px-3">
            <p className="text-xs text-fab-dim uppercase tracking-wider mb-1 text-center">VS</p>
            <p className="text-sm font-bold text-fab-muted text-center">{matches} games</p>
          </div>
          <div className="text-center flex-1 min-w-0">
            <p className="text-lg font-bold text-fab-text truncate">{opponentName}</p>
            {opponentHeroes.length > 0 && (
              <p className="text-xs text-fab-dim mt-1 truncate">{opponentHeroes.slice(0, 2).join(", ")}</p>
            )}
          </div>
        </div>

        {/* Record */}
        <div className="mt-4 flex items-center justify-center gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-fab-win">{wins}</p>
            <p className="text-xs text-fab-muted">Wins</p>
          </div>
          <div className="text-3xl font-light text-fab-border">-</div>
          <div className="text-center">
            <p className="text-3xl font-bold text-fab-loss">{losses}</p>
            <p className="text-xs text-fab-muted">Losses</p>
          </div>
          {draws > 0 && (
            <>
              <div className="text-3xl font-light text-fab-border">-</div>
              <div className="text-center">
                <p className="text-3xl font-bold text-fab-draw">{draws}</p>
                <p className="text-xs text-fab-muted">Draws</p>
              </div>
            </>
          )}
        </div>

        {/* Win rate bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1">
            <span className={isWinning ? "text-fab-win font-semibold" : "text-fab-muted"}>{playerName}</span>
            <span className={`font-bold ${isWinning ? "text-fab-win" : isTied ? "text-fab-draw" : "text-fab-loss"}`}>
              {winRate.toFixed(0)}%
            </span>
            <span className={!isWinning && !isTied ? "text-fab-loss font-semibold" : "text-fab-muted"}>{opponentName}</span>
          </div>
          <div className="h-3 bg-fab-loss/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-fab-win rounded-full transition-all"
              style={{ width: `${winRate}%` }}
            />
          </div>
        </div>

        {/* Recent results */}
        {recentResults.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-fab-dim mb-2 text-center">Recent Results</p>
            <div className="flex gap-1 justify-center">
              {recentResults.map((r, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full ${
                    r === MatchResult.Win ? "bg-fab-win" : r === MatchResult.Loss ? "bg-fab-loss" : "bg-fab-draw"
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-fab-bg px-5 py-2 border-t border-fab-border">
        <p className="text-[10px] text-fab-dim text-center">fab-stats.com</p>
      </div>
    </div>
  );
}

/** Build URL params for a shareable rivalry link */
export function buildRivalryUrl(
  baseUrl: string,
  playerName: string,
  opponentName: string,
  wins: number,
  losses: number,
  draws: number,
  recentResults: MatchResult[],
  playerHeroes: string[],
  opponentHeroes: string[]
): string {
  const params = new URLSearchParams({
    p: playerName,
    o: opponentName,
    w: String(wins),
    l: String(losses),
    d: String(draws),
  });
  if (recentResults.length > 0) {
    params.set("r", recentResults.map((r) => r === MatchResult.Win ? "W" : r === MatchResult.Loss ? "L" : "D").join(""));
  }
  if (playerHeroes.length > 0) {
    params.set("ph", playerHeroes.slice(0, 3).join(","));
  }
  if (opponentHeroes.length > 0) {
    params.set("oh", opponentHeroes.slice(0, 3).join(","));
  }
  return `${baseUrl}/opponents/rivalry?${params.toString()}`;
}
