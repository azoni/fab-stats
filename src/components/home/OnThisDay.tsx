"use client";
import { useMemo } from "react";
import { MatchResult, type MatchRecord } from "@/types";
import { localDate } from "@/lib/constants";

interface OnThisDayProps {
  matches: MatchRecord[];
}

interface YearMemory {
  year: number;
  matches: MatchRecord[];
  wins: number;
  losses: number;
  draws: number;
  heroes: string[];
  opponents: string[];
  events: string[];
}

export function OnThisDay({ matches }: OnThisDayProps) {
  const memories = useMemo(() => {
    const today = new Date();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();
    const thisYear = today.getFullYear();

    // Find matches that happened on this day in previous years
    const onThisDay = matches.filter((m) => {
      const d = localDate(m.date);
      return d.getMonth() === todayMonth && d.getDate() === todayDate && d.getFullYear() < thisYear;
    });

    if (onThisDay.length === 0) return [];

    // Group by year
    const byYear = new Map<number, MatchRecord[]>();
    for (const m of onThisDay) {
      const year = localDate(m.date).getFullYear();
      if (!byYear.has(year)) byYear.set(year, []);
      byYear.get(year)!.push(m);
    }

    const result: YearMemory[] = [];
    for (const [year, yearMatches] of byYear) {
      const wins = yearMatches.filter((m) => m.result === MatchResult.Win).length;
      const losses = yearMatches.filter((m) => m.result === MatchResult.Loss).length;
      const draws = yearMatches.filter((m) => m.result === MatchResult.Draw).length;
      const heroes = [...new Set(yearMatches.map((m) => m.heroPlayed).filter((h) => h && h !== "Unknown"))];
      const opponents = [...new Set(yearMatches.map((m) => m.opponentName).filter(Boolean))] as string[];
      const events = [...new Set(yearMatches.map((m) => m.notes?.split(" | ")[0]).filter(Boolean))] as string[];

      result.push({ year, matches: yearMatches, wins, losses, draws, heroes, opponents, events });
    }

    return result.sort((a, b) => b.year - a.year);
  }, [matches]);

  if (memories.length === 0) return null;

  const today = new Date();
  const dateLabel = today.toLocaleDateString("en-US", { month: "long", day: "numeric" });

  return (
    <div className="bg-fab-surface border border-fab-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-5 h-5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <h3 className="text-sm font-semibold text-fab-text">On This Day</h3>
        <span className="text-xs text-fab-dim">{dateLabel}</span>
      </div>

      <div className="space-y-3">
        {memories.map((mem) => {
          const yearsAgo = today.getFullYear() - mem.year;
          const record = `${mem.wins}W-${mem.losses}L${mem.draws > 0 ? `-${mem.draws}D` : ""}`;
          const wasGoodDay = mem.wins > mem.losses;
          const wasUndefeated = mem.losses === 0 && mem.wins > 0;

          return (
            <div key={mem.year} className="flex gap-3">
              <div className="shrink-0 text-center w-12">
                <p className="text-lg font-bold text-fab-gold">{yearsAgo}</p>
                <p className="text-[10px] text-fab-dim">{yearsAgo === 1 ? "year ago" : "years ago"}</p>
              </div>
              <div className="flex-1 min-w-0 border-l border-fab-border pl-3">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${wasUndefeated ? "text-fab-gold" : wasGoodDay ? "text-fab-win" : "text-fab-loss"}`}>
                    {record}
                  </span>
                  {wasUndefeated && mem.wins >= 3 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-fab-gold/15 text-fab-gold font-semibold">
                      Undefeated
                    </span>
                  )}
                </div>
                <p className="text-xs text-fab-muted mt-0.5">
                  {mem.matches.length} match{mem.matches.length !== 1 ? "es" : ""}
                  {mem.heroes.length > 0 && <> playing {mem.heroes.join(", ")}</>}
                </p>
                {mem.events.length > 0 && (
                  <p className="text-xs text-fab-dim mt-0.5 truncate">
                    {mem.events.join(", ")}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
