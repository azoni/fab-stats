"use client";
import { memo, useState, useMemo } from "react";
import Link from "next/link";
import { getHeroByName } from "@/lib/heroes";
import { HeroClassIcon } from "@/components/heroes/HeroClassIcon";
import type { HeroMetaStats } from "@/lib/meta-stats";
import type { Top8HeroMeta } from "@/lib/meta-stats";

type Top8Sort = "top8" | "played" | "wins";

interface MetaSnapshotProps {
  topHeroes: HeroMetaStats[];
  top8Heroes?: Top8HeroMeta[];
  activeEventType?: string | null;
}

const RANK_CLASS = ["meta-rank-1 font-black", "meta-rank-2 font-bold", "meta-rank-3 font-bold", "text-fab-muted font-bold", "text-fab-muted font-bold"];

const SORT_OPTIONS: { key: Top8Sort; label: string }[] = [
  { key: "top8", label: "Top 8s" },
  { key: "played", label: "Played" },
  { key: "wins", label: "Wins" },
];

const TOP8_PAGE_SIZE = 10;

export const MetaSnapshot = memo(function MetaSnapshot({ topHeroes, top8Heroes, activeEventType }: MetaSnapshotProps) {
  const [sortBy, setSortBy] = useState<Top8Sort>("top8");
  const [top8Page, setTop8Page] = useState(0);

  // Event weekend mode: show top 8 heroes for the active event type
  const showEventMode = activeEventType && top8Heroes && top8Heroes.length > 0;

  const sortedTop8 = useMemo(() => {
    if (!top8Heroes) return [];
    const sorted = [...top8Heroes];
    if (sortBy === "played") sorted.sort((a, b) => b.totalPlayers - a.totalPlayers || b.count - a.count);
    else if (sortBy === "wins") sorted.sort((a, b) => b.champions - a.champions || b.count - a.count);
    else sorted.sort((a, b) => b.count - a.count);
    return sorted;
  }, [top8Heroes, sortBy]);

  if (!showEventMode && topHeroes.length === 0) return null;

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="section-header flex items-center gap-2 flex-1">
          <div className="w-7 h-7 rounded-lg bg-teal-500/10 flex items-center justify-center ring-1 ring-inset ring-teal-500/20">
            <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-fab-text leading-tight">
              {showEventMode ? `${activeEventType} Top 8s` : "Meta Snapshot"}
            </h2>
            {showEventMode && (
              <p className="text-xs text-fab-muted leading-tight">Heroes making playoffs this week</p>
            )}
          </div>
        </div>
        <Link href="/meta" className="text-xs text-fab-gold hover:text-fab-gold-light transition-colors ml-3 font-semibold">
          View Full Meta
        </Link>
      </div>
      <div className="relative bg-fab-surface border border-fab-border rounded-lg overflow-hidden flex-1">
        {/* Pitch strip */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-teal-400/30 to-transparent" />
        {showEventMode ? (
          // Event weekend: show top 8 hero placements
          <>
            <div className="flex items-center justify-between px-4 py-2 border-b border-fab-border">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => { setSortBy(opt.key); setTop8Page(0); }}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        sortBy === opt.key
                          ? "bg-teal-500/15 text-teal-400"
                          : "text-fab-muted hover:text-fab-text"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-fab-dim">
                  {sortedTop8.length} heroes
                </span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-fab-dim uppercase tracking-wide">
                <span>Played</span>
                <span>Top 8</span>
                <span>Won</span>
              </div>
            </div>
            {/* Fixed-height hero list for consistent layout across pages */}
            <div style={{ minHeight: `${TOP8_PAGE_SIZE * 40}px` }}>
              {sortedTop8.slice(top8Page * TOP8_PAGE_SIZE, (top8Page + 1) * TOP8_PAGE_SIZE).map((t8, i) => {
                const globalIdx = top8Page * TOP8_PAGE_SIZE + i;
                const heroInfo = getHeroByName(t8.hero);
                const heroClass = heroInfo?.classes[0];
                return (
                  <div key={t8.hero} className={`relative flex items-center gap-3 px-4 py-2.5 ${i > 0 ? "border-t border-fab-border" : ""}`}>
                    <span className={`text-sm w-5 text-center relative ${RANK_CLASS[globalIdx] || "text-fab-muted font-bold"}`}>{globalIdx + 1}</span>
                    <HeroClassIcon heroClass={heroClass} size="sm" />
                    <span className={`font-medium text-fab-text flex-1 truncate text-sm relative ${globalIdx === 0 ? "text-fab-gold" : ""}`}>{t8.hero}</span>
                    <div className="flex items-center gap-3 shrink-0 relative text-xs tabular-nums">
                      <span className="text-fab-muted w-8 text-right">{t8.totalPlayers > 0 ? t8.totalPlayers : "–"}</span>
                      <span className="text-fab-muted font-medium w-7 text-right">{t8.count}</span>
                      <span className={`w-6 text-right ${t8.champions > 0 ? "font-semibold text-fab-gold" : "text-fab-dim"}`}>{t8.champions > 0 ? t8.champions : "–"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Pagination + disclaimer */}
            <div className="px-4 py-2 border-t border-fab-border flex items-center justify-between">
              <p className="text-[10px] text-fab-dim leading-tight italic">Top 8s / tracked players — conversion may be skewed</p>
              {sortedTop8.length > TOP8_PAGE_SIZE && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTop8Page((p) => Math.max(0, p - 1))}
                    disabled={top8Page === 0}
                    className="text-[10px] text-fab-muted hover:text-fab-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Prev
                  </button>
                  <span className="text-[10px] text-fab-dim">
                    {top8Page + 1}/{Math.ceil(sortedTop8.length / TOP8_PAGE_SIZE)}
                  </span>
                  <button
                    onClick={() => setTop8Page((p) => Math.min(Math.ceil(sortedTop8.length / TOP8_PAGE_SIZE) - 1, p + 1))}
                    disabled={top8Page >= Math.ceil(sortedTop8.length / TOP8_PAGE_SIZE) - 1}
                    className="text-[10px] text-fab-muted hover:text-fab-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          // Default: show hero meta stats (weekly armory CC or all-time fallback)
          topHeroes.slice(0, 5).map((hero, i) => {
            const heroInfo = getHeroByName(hero.hero);
            const heroClass = heroInfo?.classes[0];
            return (
              <div key={hero.hero} className={`relative flex items-center gap-3 px-4 py-2.5 ${i > 0 ? "border-t border-fab-border" : ""}`}>
                {/* Win rate background bar */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `linear-gradient(90deg, ${hero.avgWinRate >= 50 ? "rgba(74,222,128,0.06)" : "rgba(248,113,113,0.06)"} 0%, transparent 100%)`,
                    width: `${Math.min(hero.avgWinRate, 100)}%`,
                  }}
                />
                <span className={`text-sm w-5 text-center relative ${RANK_CLASS[i] || "text-fab-muted font-bold"}`}>{i + 1}</span>
                <HeroClassIcon heroClass={heroClass} size="sm" />
                <span className={`font-medium text-fab-text flex-1 truncate text-sm relative ${i === 0 ? "text-fab-gold" : ""}`}>{hero.hero}</span>
                <span className="text-xs text-fab-muted shrink-0 relative">{hero.metaShare.toFixed(1)}%</span>
                <span className={`text-xs font-semibold shrink-0 w-14 text-right relative ${hero.avgWinRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
                  {hero.avgWinRate.toFixed(1)}%
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});
