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
  verdict?: string;
}

export function CompareCard({ data, theme }: { data: CompareData; theme: CardTheme }) {
  const t = theme;
  const { p1Name, p2Name, stats, p1TopHero, p2TopHero, p1Matches, p2Matches, p1CategoryWins, p2CategoryWins, p1Dominance, p2Dominance, h2h, verdict } = data;
  // Use dominance score for leading/color logic
  const p1Leading = p1Dominance > p2Dominance;
  const tied = p1Dominance === p2Dominance;

  return (
    <div style={{ backgroundColor: t.surface, borderColor: t.border, width: 420 }} className="border rounded-xl overflow-hidden">
      {/* Header */}
      <div style={{ backgroundColor: t.bg, borderColor: t.border }} className="px-4 py-2 border-b">
        <p style={{ color: t.accent }} className="text-[11px] uppercase tracking-[0.2em] text-center font-bold">Player Comparison</p>
      </div>

      <div className="px-4 pt-3 pb-3">
        {/* VS section */}
        <div className="flex items-center justify-between gap-2">
          <div className="text-center flex-1 min-w-0">
            <p style={{ color: t.text }} className="text-base font-black truncate">{p1Name}</p>
            <p style={{ color: t.muted }} className="text-[10px]">{p1Matches} matches</p>
          </div>
          <div className="shrink-0">
            <div style={{ backgroundColor: t.bg, borderColor: t.border }} className="w-8 h-8 rounded-full border flex items-center justify-center">
              <p style={{ color: t.accent }} className="text-[9px] font-bold">VS</p>
            </div>
          </div>
          <div className="text-center flex-1 min-w-0">
            <p style={{ color: t.text }} className="text-base font-black truncate">{p2Name}</p>
            <p style={{ color: t.muted }} className="text-[10px]">{p2Matches} matches</p>
          </div>
        </div>

        {/* Scores — categories + dominance side by side */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div style={{ backgroundColor: t.bg }} className="rounded-lg py-2 px-3 text-center">
            <div className="flex items-baseline justify-center gap-2">
              <span style={{ color: p1CategoryWins > p2CategoryWins ? t.win : p1CategoryWins === p2CategoryWins ? t.draw : t.text }} className="text-2xl font-black">{p1CategoryWins}</span>
              <span style={{ color: t.border }} className="text-sm font-light">—</span>
              <span style={{ color: p2CategoryWins > p1CategoryWins ? t.win : p1CategoryWins === p2CategoryWins ? t.draw : t.text }} className="text-2xl font-black">{p2CategoryWins}</span>
            </div>
            <p style={{ color: t.muted }} className="text-[9px] mt-0.5">categories won</p>
          </div>
          <div style={{ backgroundColor: t.bg }} className="rounded-lg py-2 px-3 text-center">
            <div className="flex items-baseline justify-center gap-2">
              <span style={{ color: p1Leading ? t.win : tied ? t.draw : t.text }} className="text-2xl font-black">{p1Dominance}</span>
              <span style={{ color: t.border }} className="text-sm font-light">—</span>
              <span style={{ color: !p1Leading && !tied ? t.win : tied ? t.draw : t.text }} className="text-2xl font-black">{p2Dominance}</span>
            </div>
            <p style={{ color: t.muted }} className="text-[9px] mt-0.5">dominance score</p>
          </div>
        </div>

        {/* Stats rows */}
        <div className="mt-3 space-y-0">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-center py-1" style={{ borderBottom: `1px solid ${t.border}22` }}>
              <span
                style={{ color: stat.better === 1 ? t.win : t.text }}
                className="text-[11px] font-semibold w-[105px] text-right truncate"
              >
                {stat.v1}
              </span>
              <span style={{ color: t.muted }} className="text-[9px] flex-1 text-center px-1 truncate">
                {stat.label}
              </span>
              <span
                style={{ color: stat.better === 2 ? t.win : t.text }}
                className="text-[11px] font-semibold w-[105px] text-left truncate"
              >
                {stat.v2}
              </span>
            </div>
          ))}
        </div>

        {/* Head-to-Head */}
        {h2h && h2h.total > 0 && (
          <div className="mt-2 py-1.5 text-center" style={{ borderTop: `1px solid ${t.border}44`, borderBottom: `1px solid ${t.border}44` }}>
            <p style={{ color: t.accent }} className="text-[9px] uppercase tracking-wider font-semibold mb-0.5">Head-to-Head</p>
            <p style={{ color: t.text }} className="text-xs font-bold">
              <span style={{ color: h2h.p1Wins > h2h.p2Wins ? t.win : t.text }}>{h2h.p1Wins}W</span>
              {h2h.draws > 0 && <span style={{ color: t.muted }}> - {h2h.draws}D</span>}
              <span style={{ color: t.muted }}> - </span>
              <span style={{ color: h2h.p2Wins > h2h.p1Wins ? t.win : t.text }}>{h2h.p2Wins}L</span>
            </p>
          </div>
        )}

        {/* Top Heroes — inline row */}
        {(p1TopHero || p2TopHero) && (
          <div className="mt-2 flex items-center py-1" style={{ borderBottom: `1px solid ${t.border}22` }}>
            <span style={{ color: t.text }} className="text-[11px] font-semibold w-[105px] text-right truncate">{p1TopHero || "—"}</span>
            <span style={{ color: t.accent }} className="text-[9px] flex-1 text-center px-1">Top Hero</span>
            <span style={{ color: t.text }} className="text-[11px] font-semibold w-[105px] text-left truncate">{p2TopHero || "—"}</span>
          </div>
        )}

        {/* Verdict */}
        {verdict && (
          <div className="mt-2 rounded-lg py-2 px-2.5" style={{ backgroundColor: t.bg }}>
            <p style={{ color: t.accent }} className="text-[9px] uppercase tracking-wider font-semibold mb-0.5">Verdict</p>
            <p style={{ color: t.muted }} className="text-[10px] leading-snug">{verdict}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ backgroundColor: t.bg, borderColor: t.border }} className="px-4 py-1.5 border-t">
        <p style={{ color: t.accent }} className="text-[10px] text-center tracking-wider font-semibold opacity-70">fabstats.net</p>
      </div>
    </div>
  );
}
