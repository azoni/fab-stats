"use client";
import { MatchResult } from "@/types";
import type { CardTheme } from "@/components/opponents/RivalryCard";

interface MemoryMatch {
  opponentName?: string;
  opponentHero?: string;
  result: MatchResult;
  format: string;
  notes?: string;
}

interface MemoryYear {
  year: number;
  yearsAgo: number;
  wins: number;
  losses: number;
  draws: number;
  heroes: string[];
  events: string[];
  matches: MemoryMatch[];
}

export interface OnThisDayData {
  dateLabel: string;
  memories: MemoryYear[];
}

export function OnThisDayCard({ data, theme }: { data: OnThisDayData; theme: CardTheme }) {
  const t = theme;
  const { dateLabel, memories } = data;

  return (
    <div style={{ backgroundColor: t.surface, borderColor: t.border, width: 420 }} className="border rounded-xl overflow-hidden">
      {/* Header */}
      <div style={{ backgroundColor: t.bg, borderColor: t.border }} className="px-5 py-3 border-b flex items-center justify-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <p style={{ color: t.accent }} className="text-[11px] uppercase tracking-[0.2em] font-bold">On This Day</p>
        <span style={{ color: t.muted }} className="text-[11px]">— {dateLabel}</span>
      </div>

      <div className="px-5 pt-4 pb-4 space-y-4">
        {memories.slice(0, 4).map((mem) => {
          const record = `${mem.wins}W-${mem.losses}L${mem.draws > 0 ? `-${mem.draws}D` : ""}`;
          const wasGoodDay = mem.wins > mem.losses;
          const wasUndefeated = mem.losses === 0 && mem.wins > 0;

          return (
            <div key={mem.year} className="flex gap-3">
              {/* Year badge */}
              <div className="shrink-0 text-center w-12 pt-0.5">
                <p style={{ color: t.accent }} className="text-lg font-bold">{mem.yearsAgo}</p>
                <p style={{ color: t.dim }} className="text-[9px]">{mem.yearsAgo === 1 ? "year ago" : "years ago"}</p>
              </div>

              <div className="flex-1 min-w-0" style={{ borderLeft: `1px solid ${t.border}`, paddingLeft: 12 }}>
                {/* Summary line */}
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    style={{ color: wasUndefeated ? t.accent : wasGoodDay ? t.win : t.loss }}
                    className="text-sm font-bold"
                  >
                    {record}
                  </span>
                  {wasUndefeated && mem.wins >= 3 && (
                    <span
                      style={{ backgroundColor: `${t.accent}22`, color: t.accent }}
                      className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                    >
                      Undefeated
                    </span>
                  )}
                </div>

                {/* Heroes */}
                {mem.heroes.length > 0 && (
                  <p style={{ color: t.muted }} className="text-[10px] mb-0.5">
                    playing {mem.heroes.join(", ")}
                  </p>
                )}

                {/* Event */}
                {mem.events.length > 0 && (
                  <p style={{ color: t.dim }} className="text-[10px] mb-1.5 truncate">
                    {mem.events.join(" / ")}
                  </p>
                )}

                {/* Match details */}
                <div className="space-y-1">
                  {mem.matches.slice(0, 6).map((m, i) => {
                    const resultColor = m.result === MatchResult.Win ? t.win : m.result === MatchResult.Loss ? t.loss : t.draw;
                    const resultLabel = m.result === MatchResult.Win ? "W" : m.result === MatchResult.Loss ? "L" : "D";
                    const round = m.notes?.match(/Round (\d+)/)?.[1];

                    return (
                      <div key={i} className="flex items-center gap-2 text-[11px]">
                        <span
                          style={{ backgroundColor: resultColor, color: "#fff" }}
                          className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0"
                        >
                          {resultLabel}
                        </span>
                        <span style={{ color: t.text }} className="font-medium truncate">
                          vs {m.opponentName || "Unknown"}
                        </span>
                        {m.opponentHero && m.opponentHero !== "Unknown" && (
                          <span style={{ color: t.dim }} className="truncate">({m.opponentHero})</span>
                        )}
                        <span style={{ color: t.dim }} className="ml-auto shrink-0">
                          {round ? `R${round}` : m.format}
                        </span>
                      </div>
                    );
                  })}
                  {mem.matches.length > 6 && (
                    <p style={{ color: t.dim }} className="text-[10px]">+{mem.matches.length - 6} more</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {memories.length > 4 && (
          <p style={{ color: t.dim }} className="text-[10px] text-center">+{memories.length - 4} more years</p>
        )}
      </div>

      {/* Footer */}
      <div style={{ backgroundColor: t.bg, borderColor: t.border }} className="px-5 py-2.5 border-t">
        <p style={{ color: t.accent }} className="text-[11px] text-center tracking-wider font-semibold opacity-70">fabstats.net</p>
      </div>
    </div>
  );
}
