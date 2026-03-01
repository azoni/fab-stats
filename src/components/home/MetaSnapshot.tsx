"use client";
import { memo } from "react";
import Link from "next/link";
import { getHeroByName } from "@/lib/heroes";
import { HeroClassIcon } from "@/components/heroes/HeroClassIcon";
import type { HeroMetaStats } from "@/lib/meta-stats";
import type { Top8HeroMeta } from "@/lib/meta-stats";

interface MetaSnapshotProps {
  topHeroes: HeroMetaStats[];
  top8Heroes?: Top8HeroMeta[];
  activeEventType?: string | null;
}

const RANK_CLASS = ["meta-rank-1 font-black", "meta-rank-2 font-bold", "meta-rank-3 font-bold", "text-fab-dim font-bold", "text-fab-dim font-bold"];

export const MetaSnapshot = memo(function MetaSnapshot({ topHeroes, top8Heroes, activeEventType }: MetaSnapshotProps) {
  // Event weekend mode: show top 8 heroes for the active event type
  const showEventMode = activeEventType && top8Heroes && top8Heroes.length > 0;

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
              <p className="text-[10px] text-fab-dim leading-tight">Heroes making playoffs this week</p>
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
          top8Heroes!.slice(0, 10).map((t8, i) => {
            const heroInfo = getHeroByName(t8.hero);
            const heroClass = heroInfo?.classes[0];
            return (
              <div key={t8.hero} className={`relative flex items-center gap-3 px-4 py-2.5 ${i > 0 ? "border-t border-fab-border" : ""}`}>
                <span className={`text-sm w-5 text-center relative ${RANK_CLASS[i] || "text-fab-dim font-bold"}`}>{i + 1}</span>
                <HeroClassIcon heroClass={heroClass} size="sm" />
                <span className={`font-medium text-fab-text flex-1 truncate text-sm relative ${i === 0 ? "text-fab-gold" : ""}`}>{t8.hero}</span>
                <span className="text-xs text-fab-dim shrink-0 relative">
                  {t8.count} top 8{t8.count !== 1 ? "s" : ""}
                </span>
                {t8.champions > 0 && (
                  <span className="text-xs font-semibold text-fab-gold shrink-0 relative">
                    {t8.champions} win{t8.champions !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            );
          })
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
                <span className={`text-sm w-5 text-center relative ${RANK_CLASS[i] || "text-fab-dim font-bold"}`}>{i + 1}</span>
                <HeroClassIcon heroClass={heroClass} size="sm" />
                <span className={`font-medium text-fab-text flex-1 truncate text-sm relative ${i === 0 ? "text-fab-gold" : ""}`}>{hero.hero}</span>
                <span className="text-xs text-fab-dim shrink-0 relative">{hero.metaShare.toFixed(1)}%</span>
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
