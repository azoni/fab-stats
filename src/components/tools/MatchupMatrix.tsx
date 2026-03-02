"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { computeHeroStats } from "@/lib/stats";
import { getAvailableFormats } from "@/lib/meta-stats";
import { getHeroByName } from "@/lib/heroes";
import { getCommunityHeroMatchups, getMonthsForPreset, type CommunityMatchupCell } from "@/lib/hero-matchups";
import type { MatchRecord, LeaderboardEntry, HeroStats } from "@/types";

type Mode = "personal" | "community";
type Period = "all" | "30d" | "90d" | "custom";

const PERIOD_PRESETS: { id: Period; label: string }[] = [
  { id: "all", label: "All Time" },
  { id: "30d", label: "30 Days" },
  { id: "90d", label: "90 Days" },
];

function HeroIcon({ name }: { name: string }) {
  const hero = getHeroByName(name);
  const cls = hero?.classes[0] || "";
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-fab-surface text-fab-muted text-[9px] font-bold shrink-0 border border-fab-border" title={cls}>
      {cls.charAt(0) || "?"}
    </span>
  );
}

interface MatchupMatrixProps {
  matches: MatchRecord[];
  entries: LeaderboardEntry[];
  isLoaded: boolean;
}

export function MatchupMatrix({ matches, entries, isLoaded }: MatchupMatrixProps) {
  const [mode, setMode] = useState<Mode>("personal");
  const [format, setFormat] = useState<string>("");
  const [selectedCell, setSelectedCell] = useState<{ hero: string; opp: string } | null>(null);

  // Community state
  const [period, setPeriod] = useState<Period>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [communityData, setCommunityData] = useState<CommunityMatchupCell[]>([]);
  const [communityLoading, setCommunityLoading] = useState(false);

  // Formats for personal data
  const personalFormats = useMemo(() => {
    const set = new Set(matches.map((m) => m.format));
    return [...set].sort();
  }, [matches]);

  // Formats for community data
  const communityFormats = useMemo(() => getAvailableFormats(entries), [entries]);

  const formats = mode === "personal" ? personalFormats : communityFormats;

  // Filter matches by format
  const filteredMatches = useMemo(() => {
    let m = matches;
    if (format) m = m.filter((match) => match.format === format);
    return m;
  }, [matches, format]);

  // Personal hero stats
  const heroStats = useMemo(
    () => computeHeroStats(filteredMatches).filter((h) => getHeroByName(h.heroName)),
    [filteredMatches]
  );

  const allOpponents = useMemo(
    () =>
      [...new Set(filteredMatches.map((m) => m.opponentHero).filter((h) => h !== "Unknown"))].sort(),
    [filteredMatches]
  );

  // Fetch community matchup data
  const fetchCommunity = useCallback(async () => {
    setCommunityLoading(true);
    try {
      let preset = period as string;
      if (period === "custom" && customStart && customEnd) {
        preset = `custom:${customStart}:${customEnd}`;
      }
      const months = getMonthsForPreset(preset);
      const data = await getCommunityHeroMatchups(months, format || undefined);
      setCommunityData(data);
    } catch {
      setCommunityData([]);
    } finally {
      setCommunityLoading(false);
    }
  }, [period, customStart, customEnd, format]);

  useEffect(() => {
    if (mode === "community") {
      fetchCommunity();
    }
  }, [mode, fetchCommunity]);

  if (!isLoaded) {
    return <div className="h-8 w-48 bg-fab-surface rounded animate-pulse" />;
  }

  return (
    <div>
      {/* Mode toggle + filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex rounded-lg border border-fab-border overflow-hidden">
          <button
            onClick={() => { setMode("personal"); }}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === "personal" ? "bg-fab-gold/15 text-fab-gold" : "text-fab-muted hover:text-fab-text"
            }`}
          >
            Personal
          </button>
          <button
            onClick={() => { setMode("community"); }}
            className={`px-3 py-1.5 text-sm font-medium transition-colors border-l border-fab-border ${
              mode === "community" ? "bg-fab-gold/15 text-fab-gold" : "text-fab-muted hover:text-fab-text"
            }`}
          >
            Community
          </button>
        </div>

        {/* Format filter */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFormat("")}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              !format ? "bg-fab-gold/15 text-fab-gold" : "bg-fab-surface text-fab-muted hover:text-fab-text border border-fab-border"
            }`}
          >
            All Formats
          </button>
          {formats.map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                format === f ? "bg-fab-gold/15 text-fab-gold" : "bg-fab-surface text-fab-muted hover:text-fab-text border border-fab-border"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Timeframe presets (community only) */}
        {mode === "community" && (
          <div className="flex flex-wrap gap-1.5">
            {PERIOD_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  period === p.id ? "bg-teal-500/15 text-teal-400" : "bg-fab-surface text-fab-muted hover:text-fab-text border border-fab-border"
                }`}
              >
                {p.label}
              </button>
            ))}
            <button
              onClick={() => setPeriod("custom")}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                period === "custom" ? "bg-teal-500/15 text-teal-400" : "bg-fab-surface text-fab-muted hover:text-fab-text border border-fab-border"
              }`}
            >
              Custom
            </button>
          </div>
        )}
      </div>

      {/* Custom date range inputs */}
      {mode === "community" && period === "custom" && (
        <div className="flex items-center gap-2 mb-4">
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="px-2 py-1 text-xs rounded-lg bg-fab-surface border border-fab-border text-fab-text"
          />
          <span className="text-xs text-fab-dim">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="px-2 py-1 text-xs rounded-lg bg-fab-surface border border-fab-border text-fab-text"
          />
        </div>
      )}

      {mode === "personal" ? (
        <PersonalGrid
          heroStats={heroStats}
          allOpponents={allOpponents}
          selectedCell={selectedCell}
          onCellClick={setSelectedCell}
        />
      ) : (
        <CommunityMatchupGrid
          data={communityData}
          loading={communityLoading}
          selectedCell={selectedCell}
          onCellClick={setSelectedCell}
        />
      )}
    </div>
  );
}

function PersonalGrid({
  heroStats,
  allOpponents,
  selectedCell,
  onCellClick,
}: {
  heroStats: HeroStats[];
  allOpponents: string[];
  selectedCell: { hero: string; opp: string } | null;
  onCellClick: (cell: { hero: string; opp: string } | null) => void;
}) {
  if (heroStats.length === 0 || allOpponents.length === 0) {
    return (
      <div className="text-center py-12 text-fab-dim">
        <p className="text-lg mb-1">No matchup data yet</p>
        <p className="text-sm">Log matches with hero selections to see your matchup grid.</p>
      </div>
    );
  }

  const selectedMu = selectedCell
    ? heroStats
        .find((h) => h.heroName === selectedCell.hero)
        ?.matchups.find((m) => m.opponentHero === selectedCell.opp)
    : null;

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left p-2 text-fab-muted font-medium border-b border-fab-border sticky left-0 bg-fab-bg z-10">
                Your Hero / Opp
              </th>
              {allOpponents.map((opp) => (
                <th
                  key={opp}
                  className="p-2 text-fab-muted font-medium border-b border-fab-border text-center min-w-[90px]"
                >
                  <span className="text-xs">{opp}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {heroStats.map((hero) => (
              <tr key={hero.heroName}>
                <td className="p-2 font-semibold text-fab-text border-b border-fab-border/50 sticky left-0 bg-fab-bg whitespace-nowrap z-10">
                  {hero.heroName}
                  <span className="ml-1.5 text-xs text-fab-dim">({hero.totalMatches})</span>
                </td>
                {allOpponents.map((opp) => {
                  const mu = hero.matchups.find((m) => m.opponentHero === opp);
                  const isSelected = selectedCell?.hero === hero.heroName && selectedCell?.opp === opp;
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
                      onClick={() => onCellClick(isSelected ? null : { hero: hero.heroName, opp })}
                      className={`p-2 text-center border-b border-fab-border/50 cursor-pointer transition-all ${bgColor} ${
                        isSelected ? "ring-2 ring-fab-gold ring-inset" : "hover:brightness-125"
                      }`}
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
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail panel */}
      {selectedCell && selectedMu && (
        <div className="mt-3 p-3 bg-fab-surface border border-fab-border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-fab-text">
              {selectedCell.hero} vs {selectedCell.opp}
            </h3>
            <button onClick={() => onCellClick(null)} className="text-fab-dim hover:text-fab-muted">
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
              {selectedMu.totalMatches} match{selectedMu.totalMatches !== 1 ? "es" : ""}
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

// ── Community Matchup Grid ──

interface ProcessedHeroRow {
  hero: string;
  totalMatches: number;
  matchups: Map<string, { wins: number; losses: number; draws: number; total: number; winRate: number }>;
}

function CommunityMatchupGrid({
  data,
  loading,
  selectedCell,
  onCellClick,
}: {
  data: CommunityMatchupCell[];
  loading: boolean;
  selectedCell: { hero: string; opp: string } | null;
  onCellClick: (cell: { hero: string; opp: string } | null) => void;
}) {
  const [showAll, setShowAll] = useState(false);

  // Build per-hero rows from the pair data
  const { heroRows, allHeroes, totalMatches } = useMemo(() => {
    const heroMap = new Map<string, Map<string, { wins: number; losses: number; draws: number; total: number }>>();
    let total = 0;

    for (const cell of data) {
      total += cell.total;

      // hero1's perspective
      if (!heroMap.has(cell.hero1)) heroMap.set(cell.hero1, new Map());
      heroMap.get(cell.hero1)!.set(cell.hero2, {
        wins: cell.hero1Wins,
        losses: cell.hero2Wins,
        draws: cell.draws,
        total: cell.total,
      });

      // hero2's perspective (mirror)
      if (!heroMap.has(cell.hero2)) heroMap.set(cell.hero2, new Map());
      heroMap.get(cell.hero2)!.set(cell.hero1, {
        wins: cell.hero2Wins,
        losses: cell.hero1Wins,
        draws: cell.draws,
        total: cell.total,
      });
    }

    // Build sorted rows
    const rows: ProcessedHeroRow[] = [];
    for (const [hero, matchups] of heroMap) {
      let totalForHero = 0;
      const enriched = new Map<string, { wins: number; losses: number; draws: number; total: number; winRate: number }>();
      for (const [opp, stats] of matchups) {
        totalForHero += stats.total;
        enriched.set(opp, {
          ...stats,
          winRate: stats.total > 0 ? (stats.wins / stats.total) * 100 : 0,
        });
      }
      rows.push({ hero, totalMatches: totalForHero, matchups: enriched });
    }

    rows.sort((a, b) => b.totalMatches - a.totalMatches);

    // Column heroes = same order (by total matches)
    const heroes = rows.map((r) => r.hero);

    return { heroRows: rows, allHeroes: heroes, totalMatches: total };
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-fab-gold/30 border-t-fab-gold rounded-full animate-spin" />
        <span className="ml-3 text-sm text-fab-dim">Loading community matchup data...</span>
      </div>
    );
  }

  if (heroRows.length === 0) {
    return (
      <div className="text-center py-12 text-fab-dim">
        <p className="text-lg mb-1">No community matchup data yet</p>
        <p className="text-sm">Matchup data is generated when players import linked matches.</p>
      </div>
    );
  }

  const displayRows = showAll ? heroRows : heroRows.slice(0, 20);
  const displayCols = showAll ? allHeroes : allHeroes.slice(0, 20);

  // Find selected cell data
  const selectedMu = selectedCell
    ? heroRows.find((r) => r.hero === selectedCell.hero)?.matchups.get(selectedCell.opp)
    : null;

  return (
    <div>
      {/* Data coverage */}
      <div className="flex items-center gap-4 mb-3 text-xs text-fab-dim">
        <span>{totalMatches.toLocaleString()} linked matches</span>
        <span>{heroRows.length} heroes</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left p-2 text-fab-muted font-medium border-b border-fab-border sticky left-0 bg-fab-bg z-10">
                Hero / vs
              </th>
              {displayCols.map((hero) => (
                <th
                  key={hero}
                  className="p-2 text-fab-muted font-medium border-b border-fab-border text-center min-w-[90px]"
                >
                  <span className="text-xs">{hero}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row) => (
              <tr key={row.hero}>
                <td className="p-2 font-semibold text-fab-text border-b border-fab-border/50 sticky left-0 bg-fab-bg whitespace-nowrap z-10">
                  <div className="flex items-center gap-1.5">
                    <HeroIcon name={row.hero} />
                    <span className="truncate max-w-[140px]">{row.hero}</span>
                  </div>
                  <span className="text-[10px] text-fab-dim">({row.totalMatches})</span>
                </td>
                {displayCols.map((opp) => {
                  if (opp === row.hero) {
                    return (
                      <td key={opp} className="p-2 text-center border-b border-fab-border/50 bg-fab-surface/30">
                        <span className="text-fab-dim text-xs">-</span>
                      </td>
                    );
                  }
                  const mu = row.matchups.get(opp);
                  const isSelected = selectedCell?.hero === row.hero && selectedCell?.opp === opp;
                  if (!mu || mu.total === 0) {
                    return (
                      <td key={opp} className="p-2 text-center border-b border-fab-border/50 text-fab-dim">
                        -
                      </td>
                    );
                  }

                  const lowSample = mu.total < 5;
                  const bgColor = lowSample
                    ? "bg-fab-surface/20"
                    : mu.winRate >= 60
                      ? "bg-fab-win/20"
                      : mu.winRate >= 45
                        ? "bg-fab-draw/10"
                        : "bg-fab-loss/20";
                  const textColor = lowSample
                    ? "text-fab-dim"
                    : mu.winRate >= 60
                      ? "text-fab-win"
                      : mu.winRate >= 45
                        ? "text-fab-draw"
                        : "text-fab-loss";

                  return (
                    <td
                      key={opp}
                      onClick={() => onCellClick(isSelected ? null : { hero: row.hero, opp })}
                      className={`p-2 text-center border-b border-fab-border/50 cursor-pointer transition-all ${bgColor} ${
                        isSelected ? "ring-2 ring-fab-gold ring-inset" : "hover:brightness-125"
                      }`}
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
            ))}
          </tbody>
        </table>
      </div>

      {/* Show all / collapse */}
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
            <button onClick={() => onCellClick(null)} className="text-fab-dim hover:text-fab-muted">
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
