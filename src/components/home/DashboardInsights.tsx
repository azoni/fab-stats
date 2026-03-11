"use client";
import { useMemo } from "react";
import Link from "next/link";
import type { HeroStats, OpponentStats } from "@/types";

interface DashboardInsightsProps {
  heroStats: HeroStats[];
  opponentStats: OpponentStats[];
}

interface RivalryHighlights {
  nemesis: OpponentStats | null;
  bestMatchup: OpponentStats | null;
  mostPlayed: OpponentStats | null;
}

export function DashboardInsights({ heroStats, opponentStats }: DashboardInsightsProps) {
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

  const hasHeroes = topHeroes.length > 0;
  const hasRivalries = highlights !== null;

  if (!hasHeroes && !hasRivalries) return null;

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
