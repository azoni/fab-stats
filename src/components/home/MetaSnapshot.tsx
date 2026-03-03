"use client";
import { memo, useState, useMemo } from "react";
import Link from "next/link";
import { getHeroByName } from "@/lib/heroes";
import { HeroClassIcon } from "@/components/heroes/HeroClassIcon";
import { MetaShareModal, DonutChart, buildSegments } from "@/components/meta/MetaShareCard";
import type { HeroMetaStats } from "@/lib/meta-stats";
import type { Top8HeroMeta } from "@/lib/meta-stats";

type Top8Sort = "top8" | "played" | "wins";

interface MetaSnapshotProps {
  topHeroes: HeroMetaStats[];
  top8Heroes?: Top8HeroMeta[];
  activeEventType?: string | null;
  seasonName?: string;
  seasonWeeks?: { label: string; start: string; end: string }[];
  selectedWeek?: number | null;
  onWeekChange?: (week: number | null) => void;
  backgroundImage?: string;
  showResults?: boolean;
}

const RANK_CLASS = ["meta-rank-1 font-black", "meta-rank-2 font-bold", "meta-rank-3 font-bold", "text-fab-muted font-bold", "text-fab-muted font-bold"];

const SORT_OPTIONS: { key: Top8Sort; label: string }[] = [
  { key: "top8", label: "Top 8s" },
  { key: "played", label: "Played" },
  { key: "wins", label: "Wins" },
];

const TOP8_PAGE_SIZE = 10;

export const MetaSnapshot = memo(function MetaSnapshot({ topHeroes, top8Heroes, activeEventType, seasonName, seasonWeeks, selectedWeek, onWeekChange, backgroundImage, showResults }: MetaSnapshotProps) {
  const [sortBy, setSortBy] = useState<Top8Sort>("top8");
  const [top8Page, setTop8Page] = useState(0);
  const [metaShareOpen, setMetaShareOpen] = useState(false);

  // Event weekend mode: show top 8 heroes for the active event type
  const showEventMode = activeEventType && top8Heroes && top8Heroes.length > 0;
  const isSeason = !!seasonName;

  // Auto-select season banner if none provided
  const resolvedBg = backgroundImage || (isSeason && activeEventType
    ? activeEventType.toLowerCase().includes("proquest") ? "proquest-banner.png"
    : activeEventType.toLowerCase().includes("battle hardened") ? "battle-hardened-banner.png"
    : undefined
  : undefined) || undefined;

  const sortedTop8 = useMemo(() => {
    if (!top8Heroes) return [];
    const sorted = [...top8Heroes];
    if (sortBy === "played") sorted.sort((a, b) => b.totalPlayers - a.totalPlayers || b.count - a.count);
    else if (sortBy === "wins") sorted.sort((a, b) => b.champions - a.champions || b.count - a.count);
    else sorted.sort((a, b) => b.count - a.count);
    return sorted;
  }, [top8Heroes, sortBy]);

  const donutSegments = useMemo(() => {
    if (!showResults || !top8Heroes || top8Heroes.length === 0) return [];
    return buildSegments(top8Heroes);
  }, [showResults, top8Heroes]);

  const donutTotal = showResults && top8Heroes ? top8Heroes.reduce((sum, h) => sum + h.count, 0) : 0;

  if (!showResults && !showEventMode && topHeroes.length === 0) return null;

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
              {showResults ? `${seasonName} Results` : isSeason ? `${seasonName} Top 8s` : showEventMode ? `${activeEventType} Top 8s` : "Meta Snapshot"}
            </h2>
            {(showResults || showEventMode) && (
              <p className="text-xs text-fab-muted leading-tight">
                {showResults
                  ? "Hero breakdown by Top 8 finishes"
                  : isSeason
                    ? selectedWeek != null && seasonWeeks?.[selectedWeek]
                      ? seasonWeeks[selectedWeek].label
                      : "Season standings"
                    : "Heroes making playoffs this week"}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-3">
          {(showEventMode || (showResults && top8Heroes && top8Heroes.length > 0)) && sortedTop8.length > 0 && (
            <button
              onClick={() => setMetaShareOpen(true)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-fab-surface border border-fab-border text-fab-dim hover:text-fab-text hover:border-fab-muted transition-colors"
              title="Share meta breakdown"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
              </svg>
              <span className="text-[10px] font-semibold">Share</span>
            </button>
          )}
          <Link href="/meta" className="text-xs text-fab-gold hover:text-fab-gold-light transition-colors font-semibold">
            View Full Meta
          </Link>
        </div>
      </div>
      {/* Meta share modal */}
      {metaShareOpen && sortedTop8.length > 0 && (
        <MetaShareModal
          heroes={sortedTop8}
          title={showResults ? `${seasonName} Results` : isSeason ? `${seasonName} Top 8s` : `${activeEventType} Top 8s`}
          subtitle={showResults ? "Season results" : isSeason ? "Season standings" : "Heroes making playoffs this week"}
          onClose={() => setMetaShareOpen(false)}
        />
      )}
      <div className="relative bg-fab-surface border border-fab-border rounded-lg overflow-hidden flex-1">
        {/* Pitch strip */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-teal-400/30 to-transparent" />
        {/* Season background image */}
        {resolvedBg && (
          <div
            className="absolute inset-0 pointer-events-none z-0"
            style={{
              backgroundImage: `url(${resolvedBg.startsWith("http") || resolvedBg.startsWith("/") ? resolvedBg : `/seasons/${resolvedBg}`})`,
              backgroundSize: "cover",
              backgroundPosition: "center top",
              opacity: 0.08,
            }}
          />
        )}
        {showResults && donutSegments.length > 0 ? (
          // Results mode: show donut chart
          <div className="relative z-[1] p-5">
            <div className="flex flex-col items-center gap-4">
              {/* Donut chart */}
              <div className="relative">
                <DonutChart segments={donutSegments} size={180} strokeWidth={28} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-3xl font-black text-fab-text leading-none">{donutTotal}</p>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-fab-muted mt-0.5">Top 8s</p>
                </div>
              </div>

              {/* Legend */}
              <div className="w-full grid grid-cols-2 gap-x-4 gap-y-1">
                {donutSegments.map((seg) => (
                  <div key={seg.hero} className="flex items-center gap-1.5 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: seg.color }} />
                    <span className="text-xs text-fab-text font-medium truncate flex-1">{seg.hero}</span>
                    <span className="text-[10px] text-fab-muted font-bold shrink-0 tabular-nums">{seg.count}</span>
                    <span className="text-[10px] text-fab-dim shrink-0 tabular-nums w-8 text-right">{seg.percent.toFixed(0)}%</span>
                  </div>
                ))}
              </div>

              {/* Top 5 heroes by wins */}
              {top8Heroes && top8Heroes.length > 0 && (() => {
                const topWinners = [...top8Heroes]
                  .filter((h) => h.champions > 0)
                  .sort((a, b) => b.champions - a.champions)
                  .slice(0, 5);
                return topWinners.length > 0 ? (
                  <div className="w-full border-t border-fab-border pt-2">
                    <p className="text-[10px] text-fab-dim uppercase tracking-wider font-semibold mb-1.5">Most Wins</p>
                    <div className="space-y-1">
                      {topWinners.map((h, i) => (
                        <div key={h.hero} className="flex items-center justify-between">
                          <span className={`text-xs ${i === 0 ? "font-bold text-fab-gold" : "text-fab-text"}`}>{h.hero}</span>
                          <span className="text-xs text-fab-muted tabular-nums">{h.champions}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          </div>
        ) : showEventMode ? (
          // Event weekend: show top 8 hero placements
          <div className="relative z-[1]">
            {/* Week pills for season mode */}
            {isSeason && seasonWeeks && seasonWeeks.length > 1 && onWeekChange && (
              <div className="flex items-center gap-1 px-4 py-2 border-b border-fab-border overflow-x-auto scrollbar-hide">
                <button
                  onClick={() => { onWeekChange(null); setTop8Page(0); }}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${
                    selectedWeek === null
                      ? "bg-teal-500/15 text-teal-400"
                      : "text-fab-muted hover:text-fab-text"
                  }`}
                >
                  All
                </button>
                {seasonWeeks.map((w, wi) => (
                  <button
                    key={wi}
                    onClick={() => { onWeekChange(wi); setTop8Page(0); }}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${
                      selectedWeek === wi
                        ? "bg-teal-500/15 text-teal-400"
                        : "text-fab-muted hover:text-fab-text"
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            )}
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
                  {sortedTop8.reduce((sum, t) => sum + t.totalPlayers, 0)} heroes logged
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
          </div>
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
