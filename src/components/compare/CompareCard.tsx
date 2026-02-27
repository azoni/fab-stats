"use client";
import type { CardTheme } from "@/components/opponents/RivalryCard";

interface CompareData {
  p1Name: string;
  p2Name: string;
  stats: { label: string; v1: string | number; v2: string | number; better: 1 | 2 | 0 }[];
  p1TopHero: string;
  p2TopHero: string;
  p1Matches: number;
  p2Matches: number;
  p1CategoryWins: number;
  p2CategoryWins: number;
  p1Dominance: number;
  p2Dominance: number;
  h2h?: { p1Wins: number; p2Wins: number; draws: number; total: number };
}

export function CompareCard({ data, theme }: { data: CompareData; theme: CardTheme }) {
  const t = theme;
  const { p1Name, p2Name, stats, p1TopHero, p2TopHero, p1Matches, p2Matches, p1CategoryWins, p2CategoryWins, p1Dominance, p2Dominance, h2h } = data;
  // Use dominance score for leading/color logic
  const p1Leading = p1Dominance > p2Dominance;
  const tied = p1Dominance === p2Dominance;

  return (
    <div style={{ backgroundColor: t.surface, borderColor: t.border, width: 420 }} className="border rounded-xl overflow-hidden">
      {/* Header */}
      <div style={{ backgroundColor: t.bg, borderColor: t.border }} className="px-5 py-3 border-b">
        <p style={{ color: t.accent }} className="text-[11px] uppercase tracking-[0.2em] text-center font-bold">Player Comparison</p>
      </div>

      <div className="px-5 pt-5 pb-4">
        {/* VS section */}
        <div className="flex items-center justify-between gap-3">
          <div className="text-center flex-1 min-w-0">
            <p style={{ color: t.text }} className="text-lg font-black truncate">{p1Name}</p>
            <p style={{ color: t.muted }} className="text-[10px] mt-0.5">{p1Matches} matches</p>
          </div>
          <div className="shrink-0 px-2">
            <div style={{ backgroundColor: t.bg, borderColor: t.border }} className="w-10 h-10 rounded-full border flex items-center justify-center">
              <p style={{ color: t.accent }} className="text-[10px] font-bold">VS</p>
            </div>
          </div>
          <div className="text-center flex-1 min-w-0">
            <p style={{ color: t.text }} className="text-lg font-black truncate">{p2Name}</p>
            <p style={{ color: t.muted }} className="text-[10px] mt-0.5">{p2Matches} matches</p>
          </div>
        </div>

        {/* Categories Won */}
        <div className="mt-4 flex items-baseline justify-center gap-3">
          <span style={{ color: p1CategoryWins > p2CategoryWins ? t.win : p1CategoryWins === p2CategoryWins ? t.draw : t.text }} className="text-3xl font-black">{p1CategoryWins}</span>
          <span style={{ color: t.border }} className="text-xl font-light">—</span>
          <span style={{ color: p2CategoryWins > p1CategoryWins ? t.win : p1CategoryWins === p2CategoryWins ? t.draw : t.text }} className="text-3xl font-black">{p2CategoryWins}</span>
        </div>
        <p style={{ color: t.muted }} className="text-[10px] text-center mt-0.5">categories won</p>

        {/* Dominance Score */}
        <div className="mt-2 flex items-baseline justify-center gap-3">
          <span style={{ color: p1Leading ? t.win : tied ? t.draw : t.text }} className="text-2xl font-black">{p1Dominance}</span>
          <span style={{ color: t.border }} className="text-lg font-light">—</span>
          <span style={{ color: !p1Leading && !tied ? t.win : tied ? t.draw : t.text }} className="text-2xl font-black">{p2Dominance}</span>
        </div>
        <p style={{ color: t.muted }} className="text-[10px] text-center mt-0.5">dominance score</p>

        {/* Stats rows */}
        <div className="mt-4 space-y-0">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-center py-1.5" style={{ borderBottom: `1px solid ${t.border}22` }}>
              <span
                style={{ color: stat.better === 1 ? t.win : t.text }}
                className="text-xs font-semibold w-[110px] text-right truncate"
              >
                {stat.v1}
              </span>
              <span style={{ color: t.muted }} className="text-[10px] flex-1 text-center px-1 truncate">
                {stat.label}
              </span>
              <span
                style={{ color: stat.better === 2 ? t.win : t.text }}
                className="text-xs font-semibold w-[110px] text-left truncate"
              >
                {stat.v2}
              </span>
            </div>
          ))}
        </div>

        {/* Head-to-Head */}
        {h2h && h2h.total > 0 && (
          <div className="mt-3 py-2 text-center" style={{ borderTop: `1px solid ${t.border}44`, borderBottom: `1px solid ${t.border}44` }}>
            <p style={{ color: t.accent }} className="text-[9px] uppercase tracking-wider font-semibold mb-1">Head-to-Head</p>
            <p style={{ color: t.text }} className="text-sm font-bold">
              <span style={{ color: h2h.p1Wins > h2h.p2Wins ? t.win : t.text }}>{h2h.p1Wins}W</span>
              {h2h.draws > 0 && <span style={{ color: t.muted }}> - {h2h.draws}D</span>}
              <span style={{ color: t.muted }}> - </span>
              <span style={{ color: h2h.p2Wins > h2h.p1Wins ? t.win : t.text }}>{h2h.p2Wins}L</span>
            </p>
          </div>
        )}

        {/* Top Heroes */}
        {(p1TopHero || p2TopHero) && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div style={{ backgroundColor: t.bg }} className="rounded-lg p-2.5 text-center">
              <p style={{ color: t.accent }} className="text-[10px] uppercase tracking-wider font-semibold mb-1">Top Hero</p>
              <p style={{ color: t.text }} className="text-sm font-bold truncate">{p1TopHero || "—"}</p>
            </div>
            <div style={{ backgroundColor: t.bg }} className="rounded-lg p-2.5 text-center">
              <p style={{ color: t.accent }} className="text-[10px] uppercase tracking-wider font-semibold mb-1">Top Hero</p>
              <p style={{ color: t.text }} className="text-sm font-bold truncate">{p2TopHero || "—"}</p>
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
