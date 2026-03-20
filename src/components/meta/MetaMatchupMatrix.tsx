"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { getCommunityHeroMatchups, getMonthsForPreset, type CommunityMatchupCell } from "@/lib/hero-matchups";
import { getHeroByName, resolveHeroName } from "@/lib/heroes";
import { HeroImg } from "@/components/heroes/HeroImg";
import { EmptyState } from "@/components/ui/EmptyState";
import { useDragScroll } from "@/hooks/useDragScroll";

interface ProcessedHeroRow {
  hero: string;
  totalMatches: number;
  overallWinRate: number;
  matchups: Map<string, { wins: number; losses: number; draws: number; total: number; winRate: number }>;
}

function isLivingLegendHero(name: string): boolean {
  const hero = getHeroByName(name);
  if (!hero) return false;
  return hero.legalFormats.includes("Living Legend") &&
    !hero.legalFormats.includes("Classic Constructed") &&
    !hero.legalFormats.includes("Blitz");
}

function isYoungHero(name: string): boolean {
  const hero = getHeroByName(name);
  return hero?.young === true;
}

interface MetaMatchupMatrixProps {
  format?: string;
  sinceDate?: string;
  untilDate?: string;
  rated?: "rated" | "unrated";
}

export function MetaMatchupMatrix({ format, sinceDate, untilDate, rated }: MetaMatchupMatrixProps) {
  const [data, setData] = useState<CommunityMatchupCell[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ hero: string; opp: string } | null>(null);
  const [showAll, setShowAll] = useState(true);
  const [ageFilter, setAgeFilter] = useState<"adult" | "young" | "all">("adult");
  const [excludeLL, setExcludeLL] = useState(true);
  const [heroSearch, setHeroSearch] = useState("");
  const [highlightRow, setHighlightRow] = useState<string | null>(null);
  const [highlightCol, setHighlightCol] = useState<string | null>(null);
  const { ref: scrollRef, onMouseDown, movedRef } = useDragScroll();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let preset = "all";
      if (sinceDate && untilDate) {
        preset = `custom:${sinceDate}:${untilDate}`;
      }
      const months = getMonthsForPreset(preset);
      const result = await getCommunityHeroMatchups(months, format || undefined, rated);
      setData(result);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [format, sinceDate, untilDate, rated]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const { heroRows, allHeroes, totalMatches } = useMemo(() => {
    const heroMap = new Map<string, Map<string, { wins: number; losses: number; draws: number; total: number }>>();
    let total = 0;

    for (const cell of data) {
      const h1 = resolveHeroName(cell.hero1);
      const h2 = resolveHeroName(cell.hero2);
      if (!h1 || !h2) continue;
      if (excludeLL && (isLivingLegendHero(h1) || isLivingLegendHero(h2))) continue;
      if (ageFilter === "adult" && (isYoungHero(h1) || isYoungHero(h2))) continue;
      if (ageFilter === "young" && (!isYoungHero(h1) || !isYoungHero(h2))) continue;

      total += cell.total;

      if (!heroMap.has(h1)) heroMap.set(h1, new Map());
      heroMap.get(h1)!.set(h2, {
        wins: cell.hero1Wins, losses: cell.hero2Wins, draws: cell.draws, total: cell.total,
      });

      if (!heroMap.has(h2)) heroMap.set(h2, new Map());
      heroMap.get(h2)!.set(h1, {
        wins: cell.hero2Wins, losses: cell.hero1Wins, draws: cell.draws, total: cell.total,
      });
    }

    const rows: ProcessedHeroRow[] = [];
    for (const [hero, matchups] of heroMap) {
      let totalForHero = 0;
      let totalWins = 0;
      const enriched = new Map<string, { wins: number; losses: number; draws: number; total: number; winRate: number }>();
      for (const [opp, stats] of matchups) {
        totalForHero += stats.total;
        totalWins += stats.wins;
        enriched.set(opp, { ...stats, winRate: stats.total > 0 ? (stats.wins / stats.total) * 100 : 0 });
      }
      rows.push({ hero, totalMatches: totalForHero, overallWinRate: totalForHero > 0 ? (totalWins / totalForHero) * 100 : 0, matchups: enriched });
    }

    rows.sort((a, b) => b.totalMatches - a.totalMatches);
    const heroes = rows.map((r) => r.hero);
    return { heroRows: rows, allHeroes: heroes, totalMatches: total };
  }, [data, ageFilter, excludeLL]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-fab-gold/30 border-t-fab-gold rounded-full animate-spin" />
        <span className="ml-3 text-sm text-fab-dim">Loading matchup data...</span>
      </div>
    );
  }

  if (heroRows.length === 0) {
    return (
      <EmptyState
        title="No community matchup data available"
        subtitle="Matchup data is generated when players log matches with hero and opponent hero data."
      />
    );
  }

  const searchLower = heroSearch.toLowerCase().trim();
  const filteredRows = searchLower
    ? heroRows.filter((r) => r.hero.toLowerCase().includes(searchLower))
    : heroRows;
  const displayRows = showAll ? filteredRows : filteredRows.slice(0, 20);
  const displayCols = showAll ? allHeroes : allHeroes.slice(0, 20);

  const selectedMu = selectedCell
    ? heroRows.find((r) => r.hero === selectedCell.hero)?.matchups.get(selectedCell.opp)
    : null;

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex rounded-lg border border-fab-border overflow-hidden">
          {([
            { id: "adult" as const, label: "Adult" },
            { id: "young" as const, label: "Young" },
            { id: "all" as const, label: "All Ages" },
          ]).map((opt) => (
            <button
              key={opt.id}
              onClick={() => setAgeFilter(opt.id)}
              className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                opt.id !== "adult" ? "border-l border-fab-border" : ""
              } ${
                ageFilter === opt.id ? "bg-fab-gold/15 text-fab-gold" : "text-fab-muted hover:text-fab-text"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setExcludeLL(!excludeLL)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
            !excludeLL ? "bg-purple-500/15 text-purple-400" : "bg-fab-surface text-fab-muted hover:text-fab-text border border-fab-border"
          }`}
        >
          Living Legend
        </button>
        <input
          type="text"
          value={heroSearch}
          onChange={(e) => setHeroSearch(e.target.value)}
          placeholder="Search heroes..."
          className="ml-auto px-2.5 py-1 rounded-lg text-xs bg-fab-bg border border-fab-border text-fab-text placeholder:text-fab-dim focus:outline-none focus:border-fab-gold/50 w-36"
        />
        <span className="text-xs text-fab-dim">
          {filteredRows.length} of {heroRows.length} heroes
        </span>
      </div>

      {/* Matrix grid */}
      <div ref={scrollRef} onMouseDown={onMouseDown} className="overflow-auto max-h-[70vh] cursor-grab rounded-lg border border-fab-border bg-fab-bg">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left p-2 text-fab-muted font-medium border-b border-fab-border sticky left-0 top-0 bg-fab-surface z-20">
                Hero / vs
              </th>
              {displayCols.map((hero) => (
                <th
                  key={hero}
                  onClick={() => setHighlightCol(highlightCol === hero ? null : hero)}
                  className={`p-2 text-fab-muted font-medium border-b border-fab-border text-center min-w-[80px] sticky top-0 bg-fab-surface z-10 cursor-pointer select-none transition-colors ${
                    highlightCol === hero ? "!bg-fab-gold/10 text-fab-gold" : "hover:text-fab-text"
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <HeroImg name={hero} />
                    <span className="text-[10px] leading-tight">{hero.split(",")[0]}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row) => {
              const isRowHL = highlightRow === row.hero;
              return (
                <tr key={row.hero}>
                  <td
                    onClick={() => setHighlightRow(isRowHL ? null : row.hero)}
                    className={`p-2 font-semibold text-fab-text border-b border-fab-border/50 sticky left-0 whitespace-nowrap z-10 cursor-pointer select-none transition-colors ${
                      isRowHL ? "bg-fab-gold/10 text-fab-gold" : "bg-fab-surface hover:text-fab-gold"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <HeroImg name={row.hero} />
                      <span className="truncate max-w-[100px]" title={row.hero}>{row.hero.split(",")[0]}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className={row.overallWinRate >= 50 ? "text-fab-win" : "text-fab-loss"}>{row.overallWinRate.toFixed(0)}%</span>
                      <span className="text-fab-dim">({row.totalMatches})</span>
                    </div>
                  </td>
                  {displayCols.map((opp) => {
                    const isHL = isRowHL || highlightCol === opp;
                    if (opp === row.hero) {
                      return (
                        <td key={opp} className={`p-2 text-center border-b border-fab-border/50 ${isHL ? "bg-fab-gold/5" : "bg-fab-surface/30"}`}>
                          <span className="text-fab-dim text-xs">-</span>
                        </td>
                      );
                    }
                    const mu = row.matchups.get(opp);
                    const isSelected = selectedCell?.hero === row.hero && selectedCell?.opp === opp;
                    if (!mu || mu.total === 0) {
                      return (
                        <td key={opp} className={`p-2 text-center border-b border-fab-border/50 text-fab-dim ${isHL ? "bg-fab-gold/5" : ""}`}>
                          -
                        </td>
                      );
                    }

                    const lowSample = mu.total < 5;
                    const bgColor = lowSample
                      ? "bg-fab-surface/40"
                      : mu.winRate >= 60 ? "bg-fab-win/30"
                      : mu.winRate >= 45 ? "bg-fab-draw/20"
                      : "bg-fab-loss/30";
                    const textColor = lowSample
                      ? "text-fab-dim"
                      : mu.winRate >= 60 ? "text-fab-win"
                      : mu.winRate >= 45 ? "text-fab-draw"
                      : "text-fab-loss";

                    return (
                      <td
                        key={opp}
                        onClick={() => { if (!movedRef.current) setSelectedCell(isSelected ? null : { hero: row.hero, opp }); }}
                        className={`p-2 text-center border-b border-fab-border/50 cursor-pointer transition-all ${bgColor} ${
                          isSelected ? "ring-2 ring-fab-gold ring-inset" : "hover:ring-1 hover:ring-fab-gold/30 hover:shadow-[0_0_8px_rgba(212,165,74,0.1)]"
                        } ${isHL ? "!bg-fab-gold/10" : ""}`}
                        title={lowSample ? `Low sample (${mu.total} matches)` : undefined}
                      >
                        <div className={`font-bold ${textColor}`}>{mu.winRate.toFixed(0)}%</div>
                        <div className="text-xs text-fab-dim">
                          {mu.wins}-{mu.losses}
                          {mu.draws > 0 ? `-${mu.draws}` : ""}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Show all toggle */}
      {heroRows.length > 20 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-3 text-xs text-fab-gold hover:text-fab-gold-light transition-colors font-medium"
        >
          {showAll ? "Show top 20" : `Show all ${heroRows.length} heroes`}
        </button>
      )}

      {/* Detail panel */}
      {selectedCell && selectedMu && (
        <div className="mt-3 p-3 bg-fab-surface border border-fab-border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-fab-text">
              {selectedCell.hero} vs {selectedCell.opp}
            </h3>
            <button onClick={() => setSelectedCell(null)} className="text-fab-dim hover:text-fab-muted">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-fab-win font-semibold">{selectedMu.wins}W</span>
            <span className="text-fab-loss font-semibold">{selectedMu.losses}L</span>
            {selectedMu.draws > 0 && <span className="text-fab-draw font-semibold">{selectedMu.draws}D</span>}
            <span className="text-fab-muted">
              {selectedMu.total} match{selectedMu.total !== 1 ? "es" : ""}
            </span>
            <span className={`font-bold ${selectedMu.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
              {selectedMu.winRate.toFixed(1)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
