"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { HeroStats, OpponentStats, MatchRecord } from "@/types";

interface DashboardInsightsProps {
  heroStats: HeroStats[];
  opponentStats: OpponentStats[];
  matches?: MatchRecord[];
}

interface RivalryHighlights {
  nemesis: OpponentStats | null;
  bestMatchup: OpponentStats | null;
  mostPlayed: OpponentStats | null;
}

export function DashboardInsights({ heroStats, opponentStats, matches }: DashboardInsightsProps) {
  const router = useRouter();

  const highlights = useMemo((): RivalryHighlights | null => {
    const qualified = opponentStats.filter(
      (o) => o.totalMatches >= 3 && o.opponentName !== "Unknown"
    );
    if (qualified.length < 1) return null;

    const nemesis =
      [...qualified]
        .filter((o) => o.losses > o.wins)
        .sort((a, b) => a.winRate - b.winRate || b.losses - a.losses)[0] || null;

    const bestMatchup =
      [...qualified]
        .filter((o) => o.wins > o.losses)
        .sort((a, b) => b.winRate - a.winRate || b.totalMatches - a.totalMatches)[0] || null;

    const mostPlayed =
      [...qualified].sort((a, b) => b.totalMatches - a.totalMatches)[0] || null;

    if (!nemesis && !bestMatchup && !mostPlayed) return null;
    return { nemesis, bestMatchup, mostPlayed };
  }, [opponentStats]);

  // 5 newest opponents (only played once — first encounters)
  const newOpponents = useMemo(() => {
    if (!matches || matches.length === 0) return [];
    const counts = new Map<string, number>();
    for (const m of matches) {
      const name = m.opponentName?.trim()?.toLowerCase();
      if (!name || name === "unknown" || name === "bye") continue;
      counts.set(name, (counts.get(name) || 0) + 1);
    }
    const sorted = [...matches].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const seen = new Set<string>();
    const result: { name: string; date: string; result: string }[] = [];
    for (const m of sorted) {
      const name = m.opponentName?.trim();
      if (!name || name === "Unknown" || name === "BYE") continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      if ((counts.get(key) || 0) === 1) {
        result.push({ name, date: m.date, result: m.result });
        if (result.length >= 5) break;
      }
    }
    return result;
  }, [matches]);

  const [oppSearch, setOppSearch] = useState("");
  const searchResults = useMemo(() => {
    if (!oppSearch.trim()) return [];
    const q = oppSearch.toLowerCase();
    return opponentStats
      .filter((o) => o.opponentName.toLowerCase().includes(q) && o.opponentName !== "Unknown")
      .slice(0, 5);
  }, [oppSearch, opponentStats]);

  const hasRivalries = highlights !== null;
  const hasNewOpponents = newOpponents.length > 0;

  if (!hasRivalries && !hasNewOpponents && opponentStats.length === 0) return null;

  return (
    <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-fab-border/50">
        <p className="text-sm font-semibold text-fab-text">Opponents</p>
        <Link href="/opponents" className="text-xs font-semibold text-fab-gold border border-fab-gold/30 hover:bg-fab-gold/10 hover:border-fab-gold/50 px-2.5 py-1 rounded-md transition-colors">
          View all &rarr;
        </Link>
      </div>
      {/* Search bar */}
      <div className="px-3 pt-3 relative">
        <input
          type="text"
          value={oppSearch}
          onChange={(e) => setOppSearch(e.target.value)}
          placeholder="Search opponents..."
          className="w-full px-3 py-2 rounded-lg text-sm bg-fab-bg border border-fab-border text-fab-text placeholder:text-fab-dim focus:outline-none focus:border-fab-gold/50"
        />
        {searchResults.length > 0 && (
          <div className="absolute left-3 right-3 top-full mt-1 bg-fab-surface border border-fab-border rounded-lg shadow-xl z-50 overflow-hidden">
            {searchResults.map((opp) => (
              <Link
                key={opp.opponentName}
                href={`/opponents?q=${encodeURIComponent(opp.opponentName)}`}
                onClick={() => setOppSearch("")}
                className="flex items-center justify-between px-3 py-2 text-sm hover:bg-fab-surface-hover transition-colors"
              >
                <span className="text-fab-text truncate">{opp.opponentName}</span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-bold ${opp.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>{opp.winRate.toFixed(0)}%</span>
                  <span className="text-[10px] text-fab-dim">{opp.totalMatches}m</span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
      <div className="p-3 space-y-3">
        {/* Rivalry Highlights */}
        {hasRivalries && highlights && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
            {highlights.nemesis && (
              <RivalryCell label="Nemesis" labelColor="text-red-400" opponent={highlights.nemesis} />
            )}
            {highlights.bestMatchup && (
              <RivalryCell label="Best" labelColor="text-fab-win" opponent={highlights.bestMatchup} />
            )}
            {highlights.mostPlayed && (
              <RivalryCell label="Rival" labelColor="text-amber-400" opponent={highlights.mostPlayed} />
            )}
          </div>
        )}

        {/* New Opponents */}
        {hasNewOpponents && (
          <>
            {hasRivalries && <div className="border-t border-fab-border/30" />}
            <div>
              <p className="text-[10px] text-fab-dim uppercase tracking-wider font-medium mb-1.5">New Opponents</p>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-1">
                {newOpponents.map((opp) => {
                  const resultColor = opp.result === "win" ? "text-fab-win" : opp.result === "loss" ? "text-fab-loss" : opp.result === "draw" ? "text-fab-draw" : "text-fab-dim";
                  return (
                    <Link key={opp.name + opp.date} href={`/opponents?q=${encodeURIComponent(opp.name)}`} className="flex items-center gap-2 py-1 px-1.5 hover:bg-fab-bg/50 rounded-md transition-colors" onClick={(e) => e.stopPropagation()}>
                      <span className={`text-[9px] font-bold uppercase ${resultColor}`}>{opp.result === "win" ? "W" : opp.result === "loss" ? "L" : opp.result === "draw" ? "D" : "B"}</span>
                      <span className="text-sm text-fab-text truncate flex-1">{opp.name}</span>
                      <span className="text-[10px] text-fab-dim">{opp.date.slice(5)}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function RivalryCell({
  label,
  labelColor,
  opponent,
}: {
  label: string;
  labelColor: string;
  opponent: OpponentStats;
}) {
  return (
    <Link href={`/opponents?q=${encodeURIComponent(opponent.opponentName)}`} className="flex items-center gap-2 py-1.5 px-2 hover:bg-fab-bg/50 rounded-md transition-colors" onClick={(e) => e.stopPropagation()}>
      <span className={`text-[9px] uppercase tracking-wider font-bold shrink-0 ${labelColor}`}>
        {label}
      </span>
      <span className="text-sm font-medium text-fab-text truncate min-w-0 flex-1">
        {opponent.opponentName}
      </span>
      <span className={`text-[10px] font-bold tabular-nums shrink-0 ${opponent.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
        {opponent.winRate.toFixed(0)}%
      </span>
    </Link>
  );
}
