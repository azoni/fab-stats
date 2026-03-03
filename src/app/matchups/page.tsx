"use client";
import { useState, useMemo } from "react";
import { useMatches } from "@/hooks/useMatches";
import { computeHeroStats } from "@/lib/stats";
import { getHeroByName } from "@/lib/heroes";

type SortMode = "most-played" | "alphabetical" | "best-wr" | "worst-wr";

export default function MatchupsPage() {
  const { matches, isLoaded } = useMatches();
  const [sortMode, setSortMode] = useState<SortMode>("most-played");
  const [minMatches, setMinMatches] = useState(1);

  const heroStats = useMemo(
    () => (isLoaded ? computeHeroStats(matches).filter((h) => getHeroByName(h.heroName)) : []),
    [matches, isLoaded]
  );

  // Compute per-opponent aggregate stats across all your heroes
  const opponentAggregates = useMemo(() => {
    const agg: Record<string, { total: number; wins: number; losses: number }> = {};
    for (const hero of heroStats) {
      for (const mu of hero.matchups) {
        if (!agg[mu.opponentHero]) agg[mu.opponentHero] = { total: 0, wins: 0, losses: 0 };
        agg[mu.opponentHero].total += mu.wins + mu.losses + mu.draws;
        agg[mu.opponentHero].wins += mu.wins;
        agg[mu.opponentHero].losses += mu.losses;
      }
    }
    return agg;
  }, [heroStats]);

  // Get filtered + sorted opponent list
  const sortedOpponents = useMemo(() => {
    const all = Object.keys(opponentAggregates).filter(
      (opp) => opp !== "Unknown" && opponentAggregates[opp].total >= minMatches
    );

    switch (sortMode) {
      case "most-played":
        return all.sort((a, b) => opponentAggregates[b].total - opponentAggregates[a].total);
      case "alphabetical":
        return all.sort((a, b) => a.localeCompare(b));
      case "best-wr": {
        return all.sort((a, b) => {
          const aWr = opponentAggregates[a].total > 0 ? opponentAggregates[a].wins / opponentAggregates[a].total : 0;
          const bWr = opponentAggregates[b].total > 0 ? opponentAggregates[b].wins / opponentAggregates[b].total : 0;
          return bWr - aWr || opponentAggregates[b].total - opponentAggregates[a].total;
        });
      }
      case "worst-wr": {
        return all.sort((a, b) => {
          const aWr = opponentAggregates[a].total > 0 ? opponentAggregates[a].wins / opponentAggregates[a].total : 0;
          const bWr = opponentAggregates[b].total > 0 ? opponentAggregates[b].wins / opponentAggregates[b].total : 0;
          return aWr - bWr || opponentAggregates[b].total - opponentAggregates[a].total;
        });
      }
      default:
        return all;
    }
  }, [opponentAggregates, sortMode, minMatches]);

  if (!isLoaded) {
    return <div className="h-8 w-48 bg-fab-surface rounded animate-pulse" />;
  }

  if (heroStats.length === 0 || Object.keys(opponentAggregates).length === 0) {
    return (
      <div className="text-center py-16 text-fab-dim">
        <p className="text-lg mb-1">No matchup data yet</p>
        <p className="text-sm">GEM imports don&apos;t include hero data. Log matches manually with hero selections to see hero vs hero analysis.</p>
      </div>
    );
  }

  const totalOpponents = Object.keys(opponentAggregates).filter((o) => o !== "Unknown").length;
  const hiddenCount = totalOpponents - sortedOpponents.length;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center ring-1 ring-inset ring-cyan-500/20">
          <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-bold text-fab-text leading-tight">Matchup Analysis</h1>
          <p className="text-xs text-fab-muted leading-tight">Win rates for your heroes against opponent heroes</p>
        </div>
      </div>

      {/* Sort & filter controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-fab-dim">Sort:</span>
          <div className="flex rounded-md border border-fab-border overflow-hidden">
            {([
              ["most-played", "Most Played"],
              ["alphabetical", "A-Z"],
              ["best-wr", "Best WR"],
              ["worst-wr", "Worst WR"],
            ] as [SortMode, string][]).map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setSortMode(mode)}
                className={`px-2 py-1 text-[11px] font-medium transition-colors ${
                  sortMode === mode
                    ? "bg-fab-gold/20 text-fab-gold"
                    : "text-fab-dim hover:text-fab-muted hover:bg-fab-surface-hover"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-fab-dim">Min matches:</span>
          <select
            value={minMatches}
            onChange={(e) => setMinMatches(Number(e.target.value))}
            className="bg-fab-surface border border-fab-border rounded-md px-2 py-1 text-xs text-fab-text"
          >
            <option value={1}>1+</option>
            <option value={2}>2+</option>
            <option value={3}>3+</option>
            <option value={5}>5+</option>
          </select>
        </div>
        <span className="text-[11px] text-fab-dim">
          {sortedOpponents.length} opponent{sortedOpponents.length !== 1 ? "s" : ""}
          {hiddenCount > 0 && ` (${hiddenCount} hidden)`}
        </span>
      </div>

      {sortedOpponents.length === 0 ? (
        <div className="text-center py-8 text-fab-dim text-sm">
          No opponents match the current filter. Try lowering the minimum matches.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left p-2 text-fab-muted font-medium border-b border-fab-border sticky left-0 bg-fab-bg">
                  Your Hero ↓ / Opp →
                </th>
                {sortedOpponents.map((opp) => (
                  <th
                    key={opp}
                    className="p-2 text-fab-muted font-medium border-b border-fab-border text-center min-w-[100px]"
                  >
                    <span className="text-xs">{opp}</span>
                    <div className="text-[10px] text-fab-dim font-normal">
                      ({opponentAggregates[opp].total})
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heroStats.map((hero) => (
                <tr key={hero.heroName}>
                  <td className="p-2 font-semibold text-fab-text border-b border-fab-border/50 sticky left-0 bg-fab-bg whitespace-nowrap">
                    {hero.heroName}
                    <span className="ml-2 text-xs text-fab-dim">({hero.totalMatches})</span>
                  </td>
                  {sortedOpponents.map((opp) => {
                    const mu = hero.matchups.find((m) => m.opponentHero === opp);
                    if (!mu) {
                      return (
                        <td key={opp} className="p-2 text-center border-b border-fab-border/50 text-fab-dim">
                          -
                        </td>
                      );
                    }
                    const bgColor =
                      mu.winRate >= 60
                        ? "bg-fab-win/20"
                        : mu.winRate >= 45
                          ? "bg-fab-draw/10"
                          : "bg-fab-loss/20";
                    const textColor =
                      mu.winRate >= 60
                        ? "text-fab-win"
                        : mu.winRate >= 45
                          ? "text-fab-draw"
                          : "text-fab-loss";

                    return (
                      <td
                        key={opp}
                        className={`p-2 text-center border-b border-fab-border/50 ${bgColor}`}
                      >
                        <div className={`font-bold ${textColor}`}>
                          {mu.winRate.toFixed(0)}%
                        </div>
                        <div className="text-xs text-fab-dim">
                          {mu.wins}-{mu.losses}
                          {mu.draws > 0 ? `-${mu.draws}` : ""}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
