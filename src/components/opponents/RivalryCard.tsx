"use client";
import { MatchResult } from "@/types";

export interface CardTheme {
  id: string;
  label: string;
  bg: string;
  surface: string;
  border: string;
  accent: string;
  text: string;
  muted: string;
  dim: string;
  win: string;
  loss: string;
  draw: string;
  barBg: string;
}

export const CARD_THEMES: CardTheme[] = [
  {
    id: "dark",
    label: "Dark",
    bg: "#0c0a0e",
    surface: "#16131a",
    border: "#2a2533",
    accent: "#c9a84c",
    text: "#ffffff",
    muted: "#71717a",
    dim: "#52525b",
    win: "#4ade80",
    loss: "#f87171",
    draw: "#a1a1aa",
    barBg: "rgba(248,113,113,0.25)",
  },
  {
    id: "midnight",
    label: "Midnight",
    bg: "#0a0f1a",
    surface: "#111827",
    border: "#1e3a5f",
    accent: "#60a5fa",
    text: "#f0f6ff",
    muted: "#6b7fa8",
    dim: "#3b5278",
    win: "#34d399",
    loss: "#fb7185",
    draw: "#94a3b8",
    barBg: "rgba(251,113,133,0.25)",
  },
  {
    id: "crimson",
    label: "Crimson",
    bg: "#120a0a",
    surface: "#1c1010",
    border: "#3b1a1a",
    accent: "#f59e0b",
    text: "#fff1f0",
    muted: "#8a6565",
    dim: "#5c3a3a",
    win: "#4ade80",
    loss: "#f87171",
    draw: "#a1a1aa",
    barBg: "rgba(248,113,113,0.25)",
  },
  {
    id: "forest",
    label: "Forest",
    bg: "#0a110e",
    surface: "#0f1a14",
    border: "#1a3527",
    accent: "#a3e635",
    text: "#ecfdf5",
    muted: "#5f8a72",
    dim: "#3b5c4a",
    win: "#86efac",
    loss: "#fca5a5",
    draw: "#a1a1aa",
    barBg: "rgba(252,165,165,0.25)",
  },
  {
    id: "royal",
    label: "Royal",
    bg: "#0e0a14",
    surface: "#16101e",
    border: "#2d1f4e",
    accent: "#c084fc",
    text: "#f5f0ff",
    muted: "#7c6b9b",
    dim: "#4a3b6b",
    win: "#4ade80",
    loss: "#fb7185",
    draw: "#a1a1aa",
    barBg: "rgba(251,113,133,0.25)",
  },
];

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

export function RivalryCard({ data, theme }: { data: RivalryData; theme?: CardTheme }) {
  const t = theme || CARD_THEMES[0];
  const { playerName, opponentName, wins, losses, draws, winRate, matches, ratedWins, ratedLosses, ratedDraws, recentResults } = data;
  const isWinning = winRate > 50;
  const isTied = winRate === 50;

  const ratedTotal = ratedWins + ratedLosses + ratedDraws;
  const casualWins = wins - ratedWins;
  const casualLosses = losses - ratedLosses;
  const casualDraws = draws - ratedDraws;
  const casualTotal = casualWins + casualLosses + casualDraws;

  return (
    <div style={{ backgroundColor: t.surface, borderColor: t.border, width: 420 }} className="border rounded-xl overflow-hidden">
      {/* Header */}
      <div style={{ backgroundColor: t.bg, borderColor: t.border }} className="px-5 py-3 border-b">
        <p style={{ color: t.accent }} className="text-[11px] uppercase tracking-[0.2em] text-center font-bold">Head to Head</p>
      </div>

      {/* VS Section */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-center flex-1 min-w-0">
            <p style={{ color: t.text }} className="text-xl font-black truncate">{playerName}</p>
          </div>
          <div className="shrink-0 px-2">
            <div style={{ backgroundColor: t.bg, borderColor: t.border }} className="w-10 h-10 rounded-full border flex items-center justify-center">
              <p style={{ color: t.accent }} className="text-[10px] font-bold">VS</p>
            </div>
          </div>
          <div className="text-center flex-1 min-w-0">
            <p style={{ color: t.text }} className="text-xl font-black truncate">{opponentName}</p>
          </div>
        </div>

        {/* Big record */}
        <div className="mt-4 flex items-baseline justify-center gap-3">
          <span style={{ color: t.win }} className="text-4xl font-black">{wins}</span>
          <span style={{ color: t.border }} className="text-2xl font-light">—</span>
          <span style={{ color: t.loss }} className="text-4xl font-black">{losses}</span>
          {draws > 0 && (
            <>
              <span style={{ color: t.border }} className="text-2xl font-light">—</span>
              <span style={{ color: t.draw }} className="text-4xl font-black">{draws}</span>
            </>
          )}
        </div>
        <p style={{ color: t.muted }} className="text-xs text-center mt-1">{matches} games played</p>

        {/* Win rate bar */}
        <div className="mt-4">
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span style={{ color: isWinning ? t.win : t.muted, fontWeight: isWinning ? 700 : 400 }}>{playerName}</span>
            <span style={{ color: isWinning ? t.win : isTied ? t.draw : t.loss }} className="text-sm font-black">
              {winRate.toFixed(0)}%
            </span>
            <span style={{ color: !isWinning && !isTied ? t.loss : t.muted, fontWeight: !isWinning && !isTied ? 700 : 400 }}>{opponentName}</span>
          </div>
          <div style={{ backgroundColor: t.barBg }} className="h-2.5 rounded-full overflow-hidden">
            <div
              style={{ backgroundColor: t.win, width: `${winRate}%` }}
              className="h-full rounded-full"
            />
          </div>
        </div>

        {/* Rated / Casual split */}
        {ratedTotal > 0 && casualTotal > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div style={{ backgroundColor: t.bg }} className="rounded-lg p-2.5 text-center">
              <p style={{ color: t.accent }} className="text-[10px] uppercase tracking-wider font-semibold mb-1">Rated</p>
              <p style={{ color: t.text }} className="text-sm font-bold">
                <span style={{ color: t.win }}>{ratedWins}W</span>
                <span style={{ color: t.border }} className="mx-1">-</span>
                <span style={{ color: t.loss }}>{ratedLosses}L</span>
                {ratedDraws > 0 && <><span style={{ color: t.border }} className="mx-1">-</span><span style={{ color: t.draw }}>{ratedDraws}D</span></>}
              </p>
            </div>
            <div style={{ backgroundColor: t.bg }} className="rounded-lg p-2.5 text-center">
              <p style={{ color: t.muted }} className="text-[10px] uppercase tracking-wider font-semibold mb-1">Casual</p>
              <p style={{ color: t.text }} className="text-sm font-bold">
                <span style={{ color: t.win }}>{casualWins}W</span>
                <span style={{ color: t.border }} className="mx-1">-</span>
                <span style={{ color: t.loss }}>{casualLosses}L</span>
                {casualDraws > 0 && <><span style={{ color: t.border }} className="mx-1">-</span><span style={{ color: t.draw }}>{casualDraws}D</span></>}
              </p>
            </div>
          </div>
        )}
        {ratedTotal > 0 && casualTotal === 0 && (
          <div className="mt-4">
            <div style={{ backgroundColor: t.bg }} className="rounded-lg p-2.5 text-center">
              <p style={{ color: t.accent }} className="text-[10px] uppercase tracking-wider font-semibold mb-1">All Rated</p>
              <p style={{ color: t.text }} className="text-sm font-bold">
                <span style={{ color: t.win }}>{ratedWins}W</span>
                <span style={{ color: t.border }} className="mx-1">-</span>
                <span style={{ color: t.loss }}>{ratedLosses}L</span>
                {ratedDraws > 0 && <><span style={{ color: t.border }} className="mx-1">-</span><span style={{ color: t.draw }}>{ratedDraws}D</span></>}
              </p>
            </div>
          </div>
        )}

        {/* Recent results */}
        {recentResults.length > 0 && (
          <div className="mt-4">
            <p style={{ color: t.muted }} className="text-[10px] mb-2 text-center uppercase tracking-wider font-semibold">Recent Results</p>
            <div className="flex gap-1.5 justify-center">
              {recentResults.map((r, i) => (
                <div
                  key={i}
                  style={{ backgroundColor: r === MatchResult.Win ? t.win : r === MatchResult.Loss ? t.loss : t.draw }}
                  className="w-3.5 h-3.5 rounded-full"
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ backgroundColor: t.bg, borderColor: t.border }} className="px-5 py-2.5 border-t">
        <p style={{ color: t.accent }} className="text-[11px] text-center tracking-wider font-semibold opacity-70">fabstats.net</p>
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
