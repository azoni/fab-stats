"use client";

export interface FinishTheme {
  id: string;
  label: string;
  bg: string;
  surface: string;
  border: string;
  accent: string;
  text: string;
  muted: string;
  dim: string;
  trophy: string;
}

export const FINISH_THEMES: FinishTheme[] = [
  {
    id: "gold",
    label: "Gold",
    bg: "#0c0a04",
    surface: "#161208",
    border: "#3d3010",
    accent: "#c9a84c",
    text: "#fff8e1",
    muted: "#9a8a5a",
    dim: "#6b5f3a",
    trophy: "#fbbf24",
  },
  {
    id: "platinum",
    label: "Platinum",
    bg: "#08080c",
    surface: "#101018",
    border: "#282840",
    accent: "#a5b4fc",
    text: "#eef2ff",
    muted: "#7a80b0",
    dim: "#4a4e78",
    trophy: "#c7d2fe",
  },
  {
    id: "emerald",
    label: "Emerald",
    bg: "#040c08",
    surface: "#0a1810",
    border: "#1a3828",
    accent: "#34d399",
    text: "#ecfdf5",
    muted: "#5a9a78",
    dim: "#3a6b50",
    trophy: "#6ee7b7",
  },
  {
    id: "flame",
    label: "Flame",
    bg: "#0c0604",
    surface: "#1a0e08",
    border: "#3d2010",
    accent: "#f97316",
    text: "#fff7ed",
    muted: "#9a7050",
    dim: "#6b4a30",
    trophy: "#fb923c",
  },
  {
    id: "diamond",
    label: "Diamond",
    bg: "#060a0c",
    surface: "#0c1418",
    border: "#1a2a38",
    accent: "#22d3ee",
    text: "#ecfeff",
    muted: "#5a8a98",
    dim: "#3a5a68",
    trophy: "#67e8f9",
  },
];

interface BestFinishData {
  playerName: string;
  finishLabel: string;
  eventName: string;
  eventDate: string;
  totalMatches: number;
  winRate: number;
  topHero?: string;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getFinishEmoji(label: string): string {
  switch (label.toLowerCase()) {
    case "champion": return "1st";
    case "finalist": return "2nd";
    case "top 4": return "T4";
    case "top 8": return "T8";
    default: return label;
  }
}

function getFinishTagline(label: string): string {
  switch (label.toLowerCase()) {
    case "champion": return "Standing at the top.";
    case "finalist": return "So close to glory.";
    case "top 4": return "Among the best.";
    case "top 8": return "Making their mark.";
    default: return "A finish to remember.";
  }
}

export function BestFinishCard({ data, theme }: { data: BestFinishData; theme?: FinishTheme }) {
  const t = theme || FINISH_THEMES[0];
  const { playerName, finishLabel, eventName, eventDate, totalMatches, winRate, topHero } = data;

  return (
    <div style={{ backgroundColor: t.surface, borderColor: t.border, width: 380 }} className="border rounded-xl overflow-hidden">
      {/* Header */}
      <div style={{ backgroundColor: t.bg, borderColor: t.border }} className="px-5 py-3 border-b">
        <p style={{ color: t.accent }} className="text-[11px] uppercase tracking-[0.25em] text-center font-black">Best Finish</p>
      </div>

      <div className="px-5 pt-5 pb-4">
        {/* Trophy placement */}
        <div className="text-center mb-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-2" style={{ backgroundColor: `${t.trophy}15`, border: `2px solid ${t.trophy}40` }}>
            <span style={{ color: t.trophy }} className="text-2xl font-black">{getFinishEmoji(finishLabel)}</span>
          </div>
          <p style={{ color: t.trophy }} className="text-2xl font-black tracking-tight">{finishLabel}</p>
        </div>

        {/* Event name */}
        <div className="text-center">
          <p style={{ color: t.text }} className="text-sm font-bold leading-tight">{eventName}</p>
          <p style={{ color: t.dim }} className="text-xs mt-1">{formatDate(eventDate)}</p>
        </div>

        {/* Player */}
        <div style={{ backgroundColor: t.bg }} className="rounded-lg p-3 mt-4 text-center">
          <p style={{ color: t.muted }} className="text-[10px] uppercase tracking-widest mb-1">Player</p>
          <p style={{ color: t.accent }} className="text-lg font-black">{playerName}</p>
          {topHero && (
            <p style={{ color: t.dim }} className="text-xs mt-0.5">{topHero}</p>
          )}
        </div>

        {/* Stats row */}
        <div className="mt-4 flex justify-center gap-6">
          <div className="text-center">
            <p style={{ color: t.text }} className="text-xl font-black">{totalMatches}</p>
            <p style={{ color: t.muted }} className="text-[10px] uppercase">Matches</p>
          </div>
          <div className="text-center">
            <p style={{ color: winRate >= 50 ? t.trophy : t.text }} className="text-xl font-black">{winRate.toFixed(0)}%</p>
            <p style={{ color: t.muted }} className="text-[10px] uppercase">Win Rate</p>
          </div>
        </div>

        {/* Tagline */}
        <p style={{ color: t.dim }} className="text-[10px] text-center mt-3 italic">
          {getFinishTagline(finishLabel)}
        </p>
      </div>

      {/* Footer */}
      <div style={{ backgroundColor: t.bg, borderColor: t.border }} className="px-5 py-2.5 border-t">
        <p style={{ color: t.accent }} className="text-[11px] text-center tracking-wider font-semibold opacity-50">fabstats.net</p>
      </div>
    </div>
  );
}

/** Build URL params for a shareable best finish link */
export function buildBestFinishUrl(
  baseUrl: string,
  playerName: string,
  finishLabel: string,
  eventName: string,
  eventDate: string,
  totalMatches: number,
  winRate: number,
  topHero?: string,
): string {
  const params = new URLSearchParams({
    p: playerName,
    f: finishLabel,
    e: eventName,
    ed: eventDate,
    m: String(totalMatches),
    wr: String(Math.round(winRate)),
  });
  if (topHero) params.set("h", topHero);
  return `${baseUrl}/achievements/best-finish?${params.toString()}`;
}
