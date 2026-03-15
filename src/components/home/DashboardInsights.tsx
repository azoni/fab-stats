"use client";
import { useMemo } from "react";
import Link from "next/link";
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
  const topHeroes = useMemo(() => {
    return heroStats
      .filter((h) => h.heroName !== "Unknown" && h.totalMatches >= 3)
      .slice(0, 3);
  }, [heroStats]);

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

  // 5 newest opponents — opponents you've only played once (first encounter)
  const newOpponents = useMemo(() => {
    if (!matches || matches.length === 0) return [];
    // Count how many times each opponent appears
    const counts = new Map<string, number>();
    for (const m of matches) {
      const name = m.opponentName?.trim()?.toLowerCase();
      if (!name || name === "unknown" || name === "bye") continue;
      counts.set(name, (counts.get(name) || 0) + 1);
    }
    // Find single-match opponents, sorted by most recent
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

  const hasHeroes = topHeroes.length > 0;
  const hasRivalries = highlights !== null;
  const hasNewOpponents = newOpponents.length > 0;

  if (!hasHeroes && !hasRivalries && !hasNewOpponents) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {/* Top Heroes */}
      {hasHeroes && (
        <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-fab-border/50">
            <p className="text-sm font-semibold text-fab-text">Top Heroes</p>
            <Link href="/trends" className="text-xs font-semibold text-fab-gold border border-fab-gold/30 hover:bg-fab-gold/10 hover:border-fab-gold/50 px-2.5 py-1 rounded-md transition-colors">
              Full stats &rarr;
            </Link>
          </div>
          <div className="p-3 space-y-2.5">
            {topHeroes.map((hero) => (
              <Link key={hero.heroName} href="/trends" className="flex items-center gap-3 hover:bg-fab-bg/50 rounded-md px-1 -mx-1 py-0.5 transition-colors">
                <span className="text-sm font-medium text-fab-text truncate min-w-0 flex-1">
                  {hero.heroName}
                </span>
                <span className="text-[10px] text-fab-dim tabular-nums shrink-0">
                  {hero.wins}W-{hero.losses}L
                </span>
                <div className="w-16 h-1.5 rounded-full bg-fab-border overflow-hidden shrink-0">
                  <div
                    className={`h-full rounded-full ${hero.winRate >= 50 ? "bg-fab-win" : "bg-fab-loss"}`}
                    style={{ width: `${Math.min(100, hero.winRate)}%` }}
                  />
                </div>
                <span className={`text-xs font-bold tabular-nums shrink-0 w-10 text-right ${hero.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
                  {hero.winRate.toFixed(0)}%
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Rivalry Highlights */}
      {hasRivalries && highlights && (
        <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-fab-border/50">
            <p className="text-sm font-semibold text-fab-text">Rivalries</p>
            <Link href="/opponents" className="text-xs font-semibold text-fab-gold border border-fab-gold/30 hover:bg-fab-gold/10 hover:border-fab-gold/50 px-2.5 py-1 rounded-md transition-colors">
              All opponents &rarr;
            </Link>
          </div>
          <div className="p-3 space-y-2">
            {highlights.nemesis && (
              <RivalryRow
                label="Nemesis"
                labelColor="text-red-400"
                opponent={highlights.nemesis}
              />
            )}
            {highlights.bestMatchup && (
              <RivalryRow
                label="Best"
                labelColor="text-fab-win"
                opponent={highlights.bestMatchup}
              />
            )}
            {highlights.mostPlayed && (
              <RivalryRow
                label="Rival"
                labelColor="text-amber-400"
                opponent={highlights.mostPlayed}
              />
            )}
          </div>
        </div>
      )}

      {/* New Opponents — first-time encounters */}
      {hasNewOpponents && (
        <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden md:col-span-2">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-fab-border/50">
            <p className="text-sm font-semibold text-fab-text">New Opponents</p>
            <Link href="/opponents" className="text-xs font-semibold text-fab-gold border border-fab-gold/30 hover:bg-fab-gold/10 hover:border-fab-gold/50 px-2.5 py-1 rounded-md transition-colors">
              All opponents &rarr;
            </Link>
          </div>
          <div className="p-3 grid grid-cols-1 sm:grid-cols-5 gap-1.5">
            {newOpponents.map((opp) => {
              const resultColor = opp.result === "win" ? "text-fab-win" : opp.result === "loss" ? "text-fab-loss" : opp.result === "draw" ? "text-fab-draw" : "text-fab-dim";
              return (
                <Link key={opp.name + opp.date} href={`/opponents?q=${encodeURIComponent(opp.name)}`} className="flex items-center gap-2 py-1 px-1.5 hover:bg-fab-bg/50 rounded-md transition-colors">
                  <span className={`text-[9px] font-bold uppercase ${resultColor}`}>{opp.result === "win" ? "W" : opp.result === "loss" ? "L" : opp.result === "draw" ? "D" : "B"}</span>
                  <span className="text-sm text-fab-text truncate flex-1">{opp.name}</span>
                  <span className="text-[10px] text-fab-dim">{opp.date.slice(5)}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function RivalryRow({
  label,
  labelColor,
  opponent,
}: {
  label: string;
  labelColor: string;
  opponent: OpponentStats;
}) {
  return (
    <Link href={`/opponents?q=${encodeURIComponent(opponent.opponentName)}`} className="flex items-center gap-2.5 py-1 hover:bg-fab-bg/50 rounded-md px-1 -mx-1 transition-colors">
      <span className={`text-[9px] uppercase tracking-wider font-bold shrink-0 w-12 ${labelColor}`}>
        {label}
      </span>
      <span className="text-sm font-medium text-fab-text truncate min-w-0 flex-1">
        {opponent.opponentName}
      </span>
      <span className="text-[10px] text-fab-dim tabular-nums shrink-0">
        {opponent.wins}W-{opponent.losses}L
      </span>
      <span className={`text-xs font-bold tabular-nums shrink-0 ${opponent.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
        {opponent.winRate.toFixed(0)}%
      </span>
    </Link>
  );
}
