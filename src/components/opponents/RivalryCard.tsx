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
  ratedWins: number;
  ratedLosses: number;
  ratedDraws: number;
  recentResults: MatchResult[];
  playerHeroes: string[];
  opponentHeroes: string[];
}

export function RivalryCard({ data }: { data: RivalryData }) {
  const { playerName, opponentName, wins, losses, draws, winRate, matches, ratedWins, ratedLosses, ratedDraws, recentResults } = data;
  const isWinning = winRate > 50;
  const isTied = winRate === 50;

  const ratedTotal = ratedWins + ratedLosses + ratedDraws;
  const casualWins = wins - ratedWins;
  const casualLosses = losses - ratedLosses;
  const casualDraws = draws - ratedDraws;
  const casualTotal = casualWins + casualLosses + casualDraws;

  return (
    <div className="bg-[#16131a] border border-[#2a2533] rounded-xl overflow-hidden w-[420px]">
      {/* Header */}
      <div className="bg-[#0c0a0e] px-5 py-3 border-b border-[#2a2533]">
        <p className="text-[11px] text-[#c9a84c] uppercase tracking-[0.2em] text-center font-bold">Head to Head Rivalry</p>
      </div>

      {/* VS Section */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-center flex-1 min-w-0">
            <p className="text-xl font-black text-white truncate">{playerName}</p>
          </div>
          <div className="shrink-0 px-2">
            <div className="w-10 h-10 rounded-full bg-[#0c0a0e] border border-[#2a2533] flex items-center justify-center">
              <p className="text-[10px] font-bold text-[#c9a84c]">VS</p>
            </div>
          </div>
          <div className="text-center flex-1 min-w-0">
            <p className="text-xl font-black text-white truncate">{opponentName}</p>
          </div>
        </div>

        {/* Big record */}
        <div className="mt-4 flex items-baseline justify-center gap-3">
          <span className="text-4xl font-black text-[#4ade80]">{wins}</span>
          <span className="text-2xl font-light text-[#2a2533]">—</span>
          <span className="text-4xl font-black text-[#f87171]">{losses}</span>
          {draws > 0 && (
            <>
              <span className="text-2xl font-light text-[#2a2533]">—</span>
              <span className="text-4xl font-black text-[#a1a1aa]">{draws}</span>
            </>
          )}
        </div>
        <p className="text-xs text-[#71717a] text-center mt-1">{matches} games played</p>

        {/* Win rate bar */}
        <div className="mt-4">
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className={isWinning ? "text-[#4ade80] font-bold" : "text-[#71717a]"}>{playerName}</span>
            <span className={`text-sm font-black ${isWinning ? "text-[#4ade80]" : isTied ? "text-[#a1a1aa]" : "text-[#f87171]"}`}>
              {winRate.toFixed(0)}%
            </span>
            <span className={!isWinning && !isTied ? "text-[#f87171] font-bold" : "text-[#71717a]"}>{opponentName}</span>
          </div>
          <div className="h-2.5 bg-[#f87171]/25 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#4ade80] rounded-full"
              style={{ width: `${winRate}%` }}
            />
          </div>
        </div>

        {/* Rated / Casual split */}
        {ratedTotal > 0 && casualTotal > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="bg-[#0c0a0e] rounded-lg p-2.5 text-center">
              <p className="text-[10px] text-[#c9a84c] uppercase tracking-wider font-semibold mb-1">Rated</p>
              <p className="text-sm font-bold text-white">
                <span className="text-[#4ade80]">{ratedWins}W</span>
                <span className="text-[#2a2533] mx-1">-</span>
                <span className="text-[#f87171]">{ratedLosses}L</span>
                {ratedDraws > 0 && <><span className="text-[#2a2533] mx-1">-</span><span className="text-[#a1a1aa]">{ratedDraws}D</span></>}
              </p>
            </div>
            <div className="bg-[#0c0a0e] rounded-lg p-2.5 text-center">
              <p className="text-[10px] text-[#71717a] uppercase tracking-wider font-semibold mb-1">Casual</p>
              <p className="text-sm font-bold text-white">
                <span className="text-[#4ade80]">{casualWins}W</span>
                <span className="text-[#2a2533] mx-1">-</span>
                <span className="text-[#f87171]">{casualLosses}L</span>
                {casualDraws > 0 && <><span className="text-[#2a2533] mx-1">-</span><span className="text-[#a1a1aa]">{casualDraws}D</span></>}
              </p>
            </div>
          </div>
        )}
        {ratedTotal > 0 && casualTotal === 0 && (
          <div className="mt-4">
            <div className="bg-[#0c0a0e] rounded-lg p-2.5 text-center">
              <p className="text-[10px] text-[#c9a84c] uppercase tracking-wider font-semibold mb-1">All Rated</p>
              <p className="text-sm font-bold text-white">
                <span className="text-[#4ade80]">{ratedWins}W</span>
                <span className="text-[#2a2533] mx-1">-</span>
                <span className="text-[#f87171]">{ratedLosses}L</span>
                {ratedDraws > 0 && <><span className="text-[#2a2533] mx-1">-</span><span className="text-[#a1a1aa]">{ratedDraws}D</span></>}
              </p>
            </div>
          </div>
        )}

        {/* Recent results */}
        {recentResults.length > 0 && (
          <div className="mt-4">
            <p className="text-[10px] text-[#71717a] mb-2 text-center uppercase tracking-wider font-semibold">Recent Results</p>
            <div className="flex gap-1.5 justify-center">
              {recentResults.map((r, i) => (
                <div
                  key={i}
                  className={`w-3.5 h-3.5 rounded-full ${
                    r === MatchResult.Win ? "bg-[#4ade80]" : r === MatchResult.Loss ? "bg-[#f87171]" : "bg-[#a1a1aa]"
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-[#0c0a0e] px-5 py-2 border-t border-[#2a2533]">
        <p className="text-[10px] text-[#52525b] text-center tracking-wider">fabstats.net</p>
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
  opponentHeroes: string[],
  ratedWins = 0,
  ratedLosses = 0,
  ratedDraws = 0,
): string {
  const params = new URLSearchParams({
    p: playerName,
    o: opponentName,
    w: String(wins),
    l: String(losses),
    d: String(draws),
  });
  if (ratedWins || ratedLosses || ratedDraws) {
    params.set("rw", String(ratedWins));
    params.set("rl", String(ratedLosses));
    params.set("rd", String(ratedDraws));
  }
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
