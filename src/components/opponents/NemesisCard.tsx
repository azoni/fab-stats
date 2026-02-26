"use client";
import { MatchResult } from "@/types";

export interface NemesisTheme {
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

export const NEMESIS_THEMES: NemesisTheme[] = [
  {
    id: "blood",
    label: "Blood",
    bg: "#0a0000",
    surface: "#1a0808",
    border: "#4a1010",
    accent: "#dc2626",
    text: "#fde8e8",
    muted: "#9b5555",
    dim: "#6b3333",
    win: "#4ade80",
    loss: "#f87171",
    draw: "#a1a1aa",
    barBg: "rgba(248,113,113,0.3)",
  },
  {
    id: "void",
    label: "Void",
    bg: "#050008",
    surface: "#0d0a14",
    border: "#2a1848",
    accent: "#a855f7",
    text: "#ede9fe",
    muted: "#7c5aaa",
    dim: "#4c3272",
    win: "#4ade80",
    loss: "#c084fc",
    draw: "#a1a1aa",
    barBg: "rgba(192,132,252,0.3)",
  },
  {
    id: "abyss",
    label: "Abyss",
    bg: "#000508",
    surface: "#081018",
    border: "#102030",
    accent: "#38bdf8",
    text: "#e0f2fe",
    muted: "#4a8ab5",
    dim: "#2a5a7a",
    win: "#4ade80",
    loss: "#f87171",
    draw: "#94a3b8",
    barBg: "rgba(248,113,113,0.25)",
  },
  {
    id: "shadow",
    label: "Shadow",
    bg: "#050505",
    surface: "#0e0e0e",
    border: "#2a2a2a",
    accent: "#ef4444",
    text: "#e5e5e5",
    muted: "#737373",
    dim: "#525252",
    win: "#4ade80",
    loss: "#ef4444",
    draw: "#a1a1aa",
    barBg: "rgba(239,68,68,0.25)",
  },
  {
    id: "curse",
    label: "Curse",
    bg: "#0a0508",
    surface: "#160a12",
    border: "#3d1530",
    accent: "#f43f5e",
    text: "#fce7f3",
    muted: "#a05580",
    dim: "#6a2a50",
    win: "#4ade80",
    loss: "#fb7185",
    draw: "#a1a1aa",
    barBg: "rgba(251,113,133,0.3)",
  },
];

interface NemesisData {
  playerName: string;
  nemesisName: string;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  matches: number;
  recentResults: MatchResult[];
  filterLabel?: string;
}

export function NemesisCard({ data, theme }: { data: NemesisData; theme?: NemesisTheme }) {
  const t = theme || NEMESIS_THEMES[0];
  const { playerName, nemesisName, wins, losses, draws, winRate, matches, recentResults, filterLabel } = data;

  return (
    <div style={{ backgroundColor: t.surface, borderColor: t.border, width: 380 }} className="border rounded-xl overflow-hidden">
      {/* Header with skull */}
      <div style={{ backgroundColor: t.bg, borderColor: t.border }} className="px-5 py-3 border-b">
        <div className="flex items-center justify-center gap-2">
          <svg style={{ color: t.accent }} className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12c0 3.07 1.4 5.82 3.59 7.65L7 18v-2H5.5C4.12 12.02 5.28 8.42 8 6.22V10l2-2 2 2V6.22c2.72 2.2 3.88 5.8 2.5 9.78H13v2l1.41 1.65C16.6 17.82 18 15.07 18 12h-1V9h1c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1c-.55 0-1 .45-1 1v1h-2V4c0-.55-.45-1-1-1h-2c-.55 0-1 .45-1 1v1H8V4c0-.55-.45-1-1-1H6c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v3H6C3.79 12 2 13.79 2 16v1" />
          </svg>
          <p style={{ color: t.accent }} className="text-[11px] uppercase tracking-[0.25em] text-center font-black">Nemesis</p>
          <svg style={{ color: t.accent }} className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12c0 3.07 1.4 5.82 3.59 7.65L7 18v-2H5.5C4.12 12.02 5.28 8.42 8 6.22V10l2-2 2 2V6.22c2.72 2.2 3.88 5.8 2.5 9.78H13v2l1.41 1.65C16.6 17.82 18 15.07 18 12h-1V9h1c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1c-.55 0-1 .45-1 1v1h-2V4c0-.55-.45-1-1-1h-2c-.55 0-1 .45-1 1v1H8V4c0-.55-.45-1-1-1H6c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v3H6C3.79 12 2 13.79 2 16v1" />
          </svg>
        </div>
        {filterLabel && (
          <p style={{ color: t.dim }} className="text-[9px] text-center mt-1 uppercase tracking-wider">{filterLabel}</p>
        )}
      </div>

      <div className="px-5 pt-5 pb-4">
        {/* Nemesis name - big and dramatic */}
        <div className="text-center mb-1">
          <p style={{ color: t.muted }} className="text-[10px] uppercase tracking-widest mb-1">{playerName}&apos;s nightmare</p>
          <p style={{ color: t.accent }} className="text-2xl font-black tracking-tight">{nemesisName}</p>
        </div>

        {/* Record - emphasizing losses */}
        <div className="mt-4 flex items-baseline justify-center gap-3">
          <div className="text-center">
            <span style={{ color: t.win }} className="text-3xl font-black">{wins}</span>
            <p style={{ color: t.muted }} className="text-[10px] uppercase mt-0.5">Wins</p>
          </div>
          <span style={{ color: t.border }} className="text-2xl font-light pb-4">—</span>
          <div className="text-center">
            <span style={{ color: t.loss }} className="text-3xl font-black">{losses}</span>
            <p style={{ color: t.muted }} className="text-[10px] uppercase mt-0.5">Losses</p>
          </div>
          {draws > 0 && (
            <>
              <span style={{ color: t.border }} className="text-2xl font-light pb-4">—</span>
              <div className="text-center">
                <span style={{ color: t.draw }} className="text-3xl font-black">{draws}</span>
                <p style={{ color: t.muted }} className="text-[10px] uppercase mt-0.5">Draws</p>
              </div>
            </>
          )}
        </div>

        {/* Win rate bar (will be low — that's the point) */}
        <div className="mt-4">
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span style={{ color: t.muted }}>{playerName}</span>
            <span style={{ color: t.loss }} className="text-sm font-black">{winRate.toFixed(0)}%</span>
            <span style={{ color: t.accent, fontWeight: 700 }}>{nemesisName}</span>
          </div>
          <div style={{ backgroundColor: t.barBg }} className="h-2.5 rounded-full overflow-hidden">
            <div
              style={{ backgroundColor: t.win, width: `${Math.max(winRate, 2)}%` }}
              className="h-full rounded-full"
            />
          </div>
        </div>

        {/* Sad tagline */}
        <p style={{ color: t.dim }} className="text-[10px] text-center mt-3 italic">
          {winRate === 0
            ? "A perfect record of defeat."
            : winRate < 20
              ? "Some battles can't be won."
              : winRate < 35
                ? "The odds aren't in your favor."
                : winRate < 50
                  ? "So close, yet so far."
                  : "A rivalry for the ages."}
        </p>

        {/* Recent results */}
        {recentResults.length > 0 && (
          <div className="mt-4">
            <p style={{ color: t.muted }} className="text-[10px] mb-2 text-center uppercase tracking-wider font-semibold">Recent Encounters</p>
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
        <p style={{ color: t.accent }} className="text-[11px] text-center tracking-wider font-semibold opacity-50">fabstats.net</p>
      </div>
    </div>
  );
}

/** Build URL params for a shareable nemesis link */
export function buildNemesisUrl(
  baseUrl: string,
  playerName: string,
  nemesisName: string,
  wins: number,
  losses: number,
  draws: number,
  recentResults: MatchResult[],
  filterLabel?: string,
): string {
  const params = new URLSearchParams({
    p: playerName,
    n: nemesisName,
    w: String(wins),
    l: String(losses),
    d: String(draws),
  });
  if (recentResults.length > 0) {
    params.set("r", recentResults.map((r) => r === MatchResult.Win ? "W" : r === MatchResult.Loss ? "L" : "D").join(""));
  }
  if (filterLabel) params.set("fl", filterLabel);
  return `${baseUrl}/opponents/nemesis?${params.toString()}`;
}
