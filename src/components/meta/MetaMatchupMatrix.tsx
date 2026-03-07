"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { getCommunityHeroMatchups, getMonthsForPreset, type CommunityMatchupCell } from "@/lib/hero-matchups";
import { getHeroByName } from "@/lib/heroes";
import { HeroClassIcon } from "@/components/heroes/HeroClassIcon";
import { WinRateRing } from "@/components/charts/WinRateRing";

interface ProcessedHeroRow {
  hero: string;
  totalMatches: number;
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
}

export function MetaMatchupMatrix({ format, sinceDate, untilDate }: MetaMatchupMatrixProps) {
  const [data, setData] = useState<CommunityMatchupCell[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ hero: string; opp: string } | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [ageFilter, setAgeFilter] = useState<"adult" | "young" | "all">("adult");
  const [excludeLL, setExcludeLL] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let preset = "all";
      if (sinceDate && untilDate) {
        preset = `custom:${sinceDate}:${untilDate}`;
      }
      const months = getMonthsForPreset(preset);
      const result = await getCommunityHeroMatchups(months, format || undefined);
      setData(result);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [format, sinceDate, untilDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const { heroRows, allHeroes, totalMatches } = useMemo(() => {
    const heroMap = new Map<string, Map<string, { wins: number; losses: number; draws: number; total: number }>>();
    let total = 0;

    for (const cell of data) {
      // Apply hero filters
      if (excludeLL && (isLivingLegendHero(cell.hero1) || isLivingLegendHero(cell.hero2))) continue;
      if (ageFilter === "adult" && (isYoungHero(cell.hero1) || isYoungHero(cell.hero2))) continue;
      if (ageFilter === "young" && (!isYoungHero(cell.hero1) || !isYoungHero(cell.hero2))) continue;

      total += cell.total;

      // hero1's perspective
      if (!heroMap.has(cell.hero1)) heroMap.set(cell.hero1, new Map());
      heroMap.get(cell.hero1)!.set(cell.hero2, {
        wins: cell.hero1Wins, losses: cell.hero2Wins, draws: cell.draws, total: cell.total,
      });

      // hero2's perspective (mirror)
      if (!heroMap.has(cell.hero2)) heroMap.set(cell.hero2, new Map());
      heroMap.get(cell.hero2)!.set(cell.hero1, {
        wins: cell.hero2Wins, losses: cell.hero1Wins, draws: cell.draws, total: cell.total,
      });
    }

    const rows: ProcessedHeroRow[] = [];
    for (const [hero, matchups] of heroMap) {
      let totalForHero = 0;
      const enriched = new Map<string, { wins: number; losses: number; draws: number; total: number; winRate: number }>();
      for (const [opp, stats] of matchups) {
        totalForHero += stats.total;
        enriched.set(opp, { ...stats, winRate: stats.total > 0 ? (stats.wins / stats.total) * 100 : 0 });
      }
      rows.push({ hero, totalMatches: totalForHero, matchups: enriched });
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
      <div className="text-center py-10 text-fab-dim">
        <p className="text-sm">No community matchup data available for this filter.</p>
        <p className="text-xs mt-1">Matchup data is generated when players import linked matches.</p>
      </div>
    );
  }

  const displayRows = showAll ? heroRows : heroRows.slice(0, 20);
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
        <span className="text-xs text-fab-dim ml-auto">
          {totalMatches.toLocaleString()} linked matches · {heroRows.length} heroes
        </span>
      </div>

      {/* Matrix grid */}
      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left p-1.5 text-fab-muted font-medium border-b border-fab-border sticky left-0 bg-fab-bg z-10 text-xs">
                Hero / vs
              </th>
              {displayCols.map((hero) => {
                const heroInfo = getHeroByName(hero);
                const heroClass = heroInfo?.classes[0];
                return (
                  <th key={hero} className="p-1 text-fab-muted font-medium border-b border-fab-border text-center min-w-[72px]">
                    <div className="flex flex-col items-center gap-0.5">
                      <HeroClassIcon heroClass={heroClass} size="sm" />
                      <span className="text-[9px] leading-tight max-w-[70px] truncate">{hero}</span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row) => {
              const heroInfo = getHeroByName(row.hero);
              const heroClass = heroInfo?.classes[0];
              return (
                <tr key={row.hero}>
                  <td className="p-1.5 font-semibold text-fab-text border-b border-fab-border/50 sticky left-0 bg-fab-bg whitespace-nowrap z-10">
                    <div className="flex items-center gap-1.5">
                      <HeroClassIcon heroClass={heroClass} size="sm" />
                      <span className="text-xs truncate max-w-[120px]">{row.hero}</span>
                    </div>
                    <span className="text-[9px] text-fab-dim ml-5">({row.totalMatches})</span>
                  </td>
                  {displayCols.map((opp) => {
                    if (opp === row.hero) {
                      return (
                        <td key={opp} className="p-1 text-center border-b border-fab-border/50 bg-fab-surface/30">
                          <span className="text-fab-dim text-[10px]">—</span>
                        </td>
                      );
                    }
                    const mu = row.matchups.get(opp);
                    const isSelected = selectedCell?.hero === row.hero && selectedCell?.opp === opp;
                    if (!mu || mu.total === 0) {
                      return (
                        <td key={opp} className="p-1 text-center border-b border-fab-border/50 text-fab-dim text-[10px]">—</td>
                      );
                    }

                    const lowSample = mu.total < 5;
                    const bgColor = lowSample
                      ? "bg-fab-surface/20"
                      : mu.winRate >= 60 ? "bg-fab-win/20"
                      : mu.winRate >= 45 ? "bg-fab-draw/10"
                      : "bg-fab-loss/20";
                    const textColor = lowSample
                      ? "text-fab-dim"
                      : mu.winRate >= 60 ? "text-fab-win"
                      : mu.winRate >= 45 ? "text-fab-draw"
                      : "text-fab-loss";

                    return (
                      <td
                        key={opp}
                        onClick={() => setSelectedCell(isSelected ? null : { hero: row.hero, opp })}
                        className={`p-1 text-center border-b border-fab-border/50 cursor-pointer transition-all ${bgColor} ${
                          isSelected ? "ring-2 ring-fab-gold ring-inset" : "hover:brightness-125"
                        }`}
                        title={lowSample ? `Low sample (${mu.total} matches)` : `${mu.wins}W-${mu.losses}L${mu.draws > 0 ? `-${mu.draws}D` : ""}`}
                      >
                        <div className={`text-xs font-bold ${textColor}`}>{mu.winRate.toFixed(0)}%</div>
                        <div className="text-[9px] text-fab-dim">{mu.total}</div>
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
            <WinRateRing value={selectedMu.winRate} size={36} strokeWidth={3.5} />
            <span className="text-fab-win font-semibold">{selectedMu.wins}W</span>
            <span className="text-fab-loss font-semibold">{selectedMu.losses}L</span>
            {selectedMu.draws > 0 && <span className="text-fab-draw font-semibold">{selectedMu.draws}D</span>}
            <span className="text-fab-muted">
              {selectedMu.total} match{selectedMu.total !== 1 ? "es" : ""}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
