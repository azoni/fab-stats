"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { computeHeroStats } from "@/lib/stats";
import { getAvailableFormats } from "@/lib/meta-stats";
import { getHeroByName } from "@/lib/heroes";

import { getCommunityHeroMatchups, getMonthsForPreset, type CommunityMatchupCell } from "@/lib/hero-matchups";
import type { MatchRecord, LeaderboardEntry, HeroStats } from "@/types";
import { useDragScroll } from "@/hooks/useDragScroll";
import { HeroImg } from "@/components/heroes/HeroImg";
import { EmptyState } from "@/components/ui/EmptyState";

type Mode = "personal" | "community";
type Period = "all" | "30d" | "90d" | "custom";
type AgeFilter = "adult" | "young" | "all";
type PersonalView = "list" | "grid";
type SortKey = "played" | "winrate" | "alpha" | "worst";

const PERIOD_PRESETS: { id: Period; label: string }[] = [
  { id: "all", label: "All Time" },
  { id: "30d", label: "30 Days" },
  { id: "90d", label: "90 Days" },
];

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

function passesHeroFilter(name: string, ageFilter: AgeFilter, includeLivingLegend: boolean): boolean {
  if (!includeLivingLegend && isLivingLegendHero(name)) return false;
  if (ageFilter === "adult" && isYoungHero(name)) return false;
  if (ageFilter === "young" && !isYoungHero(name)) return false;
  return true;
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
  const [ageFilter, setAgeFilter] = useState<AgeFilter>("adult");
  const [includeLivingLegend, setIncludeLivingLegend] = useState(false);
  const [heroFilter, setHeroFilter] = useState<string>("");
  const [personalView, setPersonalView] = useState<PersonalView>("grid");

  // Shared time filter state
  const [period, setPeriod] = useState<Period>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Community state
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

  // Filter matches by format and date
  const filteredMatches = useMemo(() => {
    let m = matches;
    if (format) m = m.filter((match) => match.format === format);
    if (period === "30d") {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const sinceStr = since.toISOString().slice(0, 10);
      m = m.filter((match) => match.date >= sinceStr);
    } else if (period === "90d") {
      const since = new Date();
      since.setDate(since.getDate() - 90);
      const sinceStr = since.toISOString().slice(0, 10);
      m = m.filter((match) => match.date >= sinceStr);
    } else if (period === "custom" && customStart && customEnd) {
      m = m.filter((match) => match.date >= customStart && match.date <= customEnd);
    }
    return m;
  }, [matches, format, period, customStart, customEnd]);

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

  // Available heroes for the filter dropdown
  const playedHeroes = useMemo(
    () => heroStats.map((h) => h.heroName).sort((a, b) => {
      const aTotal = heroStats.find((h) => h.heroName === a)?.totalMatches || 0;
      const bTotal = heroStats.find((h) => h.heroName === b)?.totalMatches || 0;
      return bTotal - aTotal;
    }),
    [heroStats]
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

  // Reset hero filter when switching modes
  useEffect(() => {
    setHeroFilter("");
  }, [mode]);

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

        {/* Timeframe presets */}
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
      </div>

      {/* Custom date range inputs */}
      {period === "custom" && (
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

      {/* Hero filtering row: age + Living Legend + hero picker (personal) + view toggle */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Age filter */}
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
                ageFilter === opt.id
                  ? "bg-fab-gold/15 text-fab-gold"
                  : "text-fab-muted hover:text-fab-text"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Living Legend toggle */}
        <button
          onClick={() => setIncludeLivingLegend(!includeLivingLegend)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
            includeLivingLegend
              ? "bg-purple-500/15 text-purple-400"
              : "bg-fab-surface text-fab-muted hover:text-fab-text border border-fab-border"
          }`}
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          Living Legend
        </button>

        {/* Hero picker — personal mode only */}
        {mode === "personal" && playedHeroes.length > 1 && (
          <select
            value={heroFilter}
            onChange={(e) => setHeroFilter(e.target.value)}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-fab-surface border border-fab-border text-fab-text"
          >
            <option value="">All Heroes ({playedHeroes.length})</option>
            {playedHeroes.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        )}

        {/* View toggle — personal mode only */}
        {mode === "personal" && (
          <div className="flex rounded-lg border border-fab-border overflow-hidden ml-auto">
            <button
              onClick={() => setPersonalView("list")}
              className={`px-2 py-1 text-xs font-medium transition-colors ${
                personalView === "list" ? "bg-fab-gold/15 text-fab-gold" : "text-fab-muted hover:text-fab-text"
              }`}
              title="List view"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
              </svg>
            </button>
            <button
              onClick={() => setPersonalView("grid")}
              className={`px-2 py-1 text-xs font-medium transition-colors border-l border-fab-border ${
                personalView === "grid" ? "bg-fab-gold/15 text-fab-gold" : "text-fab-muted hover:text-fab-text"
              }`}
              title="Grid view"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {mode === "personal" ? (
        personalView === "list" ? (
          <PersonalList
            heroStats={heroStats}
            heroFilter={heroFilter}
            selectedCell={selectedCell}
            onCellClick={setSelectedCell}
            ageFilter={ageFilter}
            includeLivingLegend={includeLivingLegend}
          />
        ) : (
          <PersonalGrid
            heroStats={heroStats}
            allOpponents={allOpponents}
            heroFilter={heroFilter}
            selectedCell={selectedCell}
            onCellClick={setSelectedCell}
            ageFilter={ageFilter}
            includeLivingLegend={includeLivingLegend}
          />
        )
      ) : (
        <CommunityMatchupGrid
          data={communityData}
          loading={communityLoading}
          selectedCell={selectedCell}
          onCellClick={setSelectedCell}
          ageFilter={ageFilter}
          includeLivingLegend={includeLivingLegend}
        />
      )}
    </div>
  );
}

// ── Personal List View ──

function PersonalList({
  heroStats,
  heroFilter,
  selectedCell,
  onCellClick,
  ageFilter,
  includeLivingLegend,
}: {
  heroStats: HeroStats[];
  heroFilter: string;
  selectedCell: { hero: string; opp: string } | null;
  onCellClick: (cell: { hero: string; opp: string } | null) => void;
  ageFilter: AgeFilter;
  includeLivingLegend: boolean;
}) {
  const [sortBy, setSortBy] = useState<SortKey>("played");

  const filteredStats = useMemo(
    () => heroStats.filter((h) =>
      passesHeroFilter(h.heroName, ageFilter, includeLivingLegend) &&
      (!heroFilter || h.heroName === heroFilter)
    ),
    [heroStats, ageFilter, includeLivingLegend, heroFilter]
  );

  if (filteredStats.length === 0) {
    return (
      <EmptyState
        title="No matchup data yet"
        subtitle="Log matches with hero selections to see your matchups."
      />
    );
  }

  return (
    <div className="space-y-6">
      {filteredStats.map((hero) => {
        const matchups = hero.matchups
          .filter((m) => m.opponentHero !== "Unknown" && passesHeroFilter(m.opponentHero, ageFilter, includeLivingLegend))
          .sort((a, b) => {
            if (sortBy === "alpha") return a.opponentHero.localeCompare(b.opponentHero);
            if (sortBy === "winrate") return b.winRate - a.winRate;
            if (sortBy === "worst") return a.winRate - b.winRate;
            return b.totalMatches - a.totalMatches;
          });

        if (matchups.length === 0) return null;
        const maxMatches = Math.max(...matchups.map((m) => m.totalMatches));

        return (
          <div key={hero.heroName}>
            {/* Hero header */}
            <div className="flex items-center gap-2 mb-3">
              <HeroImg name={hero.heroName} size="md" />
              <h3 className="text-sm font-bold text-fab-text">{hero.heroName}</h3>
              <span className="text-xs text-fab-dim">{hero.totalMatches} matches</span>

              {/* Sort controls */}
              <div className="flex gap-1 ml-auto">
                {([
                  { id: "played" as const, label: "Most Played" },
                  { id: "winrate" as const, label: "Best WR" },
                  { id: "worst" as const, label: "Worst WR" },
                  { id: "alpha" as const, label: "A-Z" },
                ]).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSortBy(s.id)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                      sortBy === s.id ? "bg-fab-gold/15 text-fab-gold" : "text-fab-dim hover:text-fab-text"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Matchup rows */}
            <div className="space-y-1">
              {matchups.map((mu) => {
                const isSelected = selectedCell?.hero === hero.heroName && selectedCell?.opp === mu.opponentHero;
                const barWidth = maxMatches > 0 ? (mu.totalMatches / maxMatches) * 100 : 0;
                const wrColor = mu.winRate >= 60
                  ? "text-fab-win"
                  : mu.winRate >= 45
                    ? "text-yellow-400"
                    : "text-fab-loss";
                const barColor = mu.winRate >= 60
                  ? "bg-green-500/25"
                  : mu.winRate >= 45
                    ? "bg-yellow-500/15"
                    : "bg-red-500/20";
                const rowBg = isSelected ? "ring-1 ring-fab-gold bg-fab-gold/5" : "hover:bg-fab-surface/50";

                return (
                  <button
                    key={mu.opponentHero}
                    onClick={() => onCellClick(isSelected ? null : { hero: hero.heroName, opp: mu.opponentHero })}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all cursor-pointer ${rowBg}`}
                  >
                    <HeroImg name={mu.opponentHero} />
                    <span className="text-sm font-medium text-fab-text w-36 min-w-[90px] truncate text-left">
                      {mu.opponentHero.split(",")[0]}
                    </span>

                    {/* Win rate bar */}
                    <div className="flex-1 h-5 bg-fab-bg rounded-full overflow-hidden relative" title={`${mu.totalMatches} matches`}>
                      <div className={`absolute inset-y-0 left-0 rounded-full transition-all ${barColor}`} style={{ width: `${barWidth}%` }} />
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-current opacity-15"
                        style={{ width: `${mu.winRate}%`, color: mu.winRate >= 60 ? "#22c55e" : mu.winRate >= 45 ? "#eab308" : "#ef4444" }}
                      />
                    </div>

                    <span className="text-xs text-fab-dim w-12 text-right font-mono">
                      {mu.wins}-{mu.losses}{mu.draws > 0 ? `-${mu.draws}` : ""}
                    </span>
                    <span className={`text-sm font-bold w-12 text-right ${wrColor}`}>
                      {mu.winRate.toFixed(0)}%
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Detail panel */}
            {selectedCell && selectedCell.hero === hero.heroName && (() => {
              const mu = matchups.find((m) => m.opponentHero === selectedCell.opp);
              if (!mu) return null;
              return (
                <div className="mt-2 p-3 bg-fab-surface border border-fab-border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-fab-text">
                      {hero.heroName} vs {selectedCell.opp}
                    </h4>
                    <button onClick={() => onCellClick(null)} className="text-fab-dim hover:text-fab-muted">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-fab-win font-semibold">{mu.wins}W</span>
                    <span className="text-fab-loss font-semibold">{mu.losses}L</span>
                    {mu.draws > 0 && <span className="text-fab-draw font-semibold">{mu.draws}D</span>}
                    <span className="text-fab-muted">{mu.totalMatches} match{mu.totalMatches !== 1 ? "es" : ""}</span>
                    <span className={`font-bold ${mu.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
                      {mu.winRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
        );
      })}
    </div>
  );
}

// ── Personal Grid View ──

function PersonalGrid({
  heroStats,
  allOpponents,
  heroFilter,
  selectedCell,
  onCellClick,
  ageFilter,
  includeLivingLegend,
}: {
  heroStats: HeroStats[];
  allOpponents: string[];
  heroFilter: string;
  selectedCell: { hero: string; opp: string } | null;
  onCellClick: (cell: { hero: string; opp: string } | null) => void;
  ageFilter: AgeFilter;
  includeLivingLegend: boolean;
}) {
  const { ref: scrollRef, onMouseDown, movedRef } = useDragScroll();
  const [highlightRow, setHighlightRow] = useState<string | null>(null);
  const [highlightCol, setHighlightCol] = useState<string | null>(null);

  // Filter heroes and opponents by age + LL + hero filter
  const filteredStats = useMemo(
    () => heroStats.filter((h) =>
      passesHeroFilter(h.heroName, ageFilter, includeLivingLegend) &&
      (!heroFilter || h.heroName === heroFilter)
    ),
    [heroStats, ageFilter, includeLivingLegend, heroFilter]
  );
  const filteredOpponents = useMemo(
    () => allOpponents.filter((o) => passesHeroFilter(o, ageFilter, includeLivingLegend)),
    [allOpponents, ageFilter, includeLivingLegend]
  );

  if (filteredStats.length === 0 || filteredOpponents.length === 0) {
    return (
      <EmptyState
        title="No matchup data yet"
        subtitle="Log matches with hero selections to see your matchup grid."
      />
    );
  }

  const selectedMu = selectedCell
    ? filteredStats
        .find((h) => h.heroName === selectedCell.hero)
        ?.matchups.find((m) => m.opponentHero === selectedCell.opp)
    : null;

  return (
    <div>
      <div ref={scrollRef} onMouseDown={onMouseDown} className="overflow-auto max-h-[70vh] cursor-grab rounded-lg border border-fab-border bg-fab-bg">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left p-2 text-fab-muted font-medium border-b border-fab-border sticky left-0 top-0 bg-fab-surface z-20">
                Your Hero / Opp
              </th>
              {filteredOpponents.map((opp) => (
                <th
                  key={opp}
                  onClick={() => setHighlightCol(highlightCol === opp ? null : opp)}
                  className={`p-2 text-fab-muted font-medium border-b border-fab-border text-center min-w-[80px] sticky top-0 bg-fab-surface z-10 cursor-pointer select-none transition-colors ${
                    highlightCol === opp ? "!bg-fab-gold/10 text-fab-gold" : "hover:text-fab-text"
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <HeroImg name={opp} />
                    <span className="text-[10px] leading-tight">{opp.split(",")[0]}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredStats.map((hero) => {
              const isRowHL = highlightRow === hero.heroName;
              return (
                <tr key={hero.heroName}>
                  <td
                    onClick={() => setHighlightRow(isRowHL ? null : hero.heroName)}
                    className={`p-2 font-semibold text-fab-text border-b border-fab-border/50 sticky left-0 whitespace-nowrap z-10 cursor-pointer select-none transition-colors ${
                      isRowHL ? "bg-fab-gold/10 text-fab-gold" : "bg-fab-surface hover:text-fab-gold"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <HeroImg name={hero.heroName} />
                      <span className="truncate max-w-[120px]">{hero.heroName.split(",")[0]}</span>
                    </div>
                    <span className="text-[10px] text-fab-dim ml-6">({hero.totalMatches})</span>
                  </td>
                  {filteredOpponents.map((opp) => {
                    const mu = hero.matchups.find((m) => m.opponentHero === opp);
                    const isSelected = selectedCell?.hero === hero.heroName && selectedCell?.opp === opp;
                    const isHL = isRowHL || highlightCol === opp;
                    if (!mu) {
                      return (
                        <td key={opp} className={`p-2 text-center border-b border-fab-border/50 text-fab-dim ${isHL ? "bg-fab-gold/5" : ""}`}>
                          -
                        </td>
                      );
                    }
                    const bgColor =
                      mu.winRate >= 60
                        ? "bg-fab-win/30"
                        : mu.winRate >= 45
                          ? "bg-fab-draw/20"
                          : "bg-fab-loss/30";
                    const textColor =
                      mu.winRate >= 60
                        ? "text-fab-win"
                        : mu.winRate >= 45
                          ? "text-fab-draw"
                          : "text-fab-loss";

                    return (
                      <td
                        key={opp}
                        onClick={() => { if (!movedRef.current) onCellClick(isSelected ? null : { hero: hero.heroName, opp }); }}
                        className={`p-2 text-center border-b border-fab-border/50 transition-all ${bgColor} ${
                          isSelected ? "ring-2 ring-fab-gold ring-inset" : "hover:ring-1 hover:ring-fab-gold/30 hover:shadow-[0_0_8px_rgba(212,165,74,0.1)]"
                        } ${isHL ? "!bg-fab-gold/10" : ""}`}
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
  ageFilter,
  includeLivingLegend,
}: {
  data: CommunityMatchupCell[];
  loading: boolean;
  selectedCell: { hero: string; opp: string } | null;
  onCellClick: (cell: { hero: string; opp: string } | null) => void;
  ageFilter: AgeFilter;
  includeLivingLegend: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  const { ref: scrollRef, onMouseDown, movedRef } = useDragScroll();
  const [highlightRow, setHighlightRow] = useState<string | null>(null);
  const [highlightCol, setHighlightCol] = useState<string | null>(null);

  // Build per-hero rows from the pair data, applying hero filters
  const { heroRows, allHeroes, totalMatches } = useMemo(() => {
    const heroMap = new Map<string, Map<string, { wins: number; losses: number; draws: number; total: number }>>();
    let total = 0;

    for (const cell of data) {
      if (!getHeroByName(cell.hero1) || !getHeroByName(cell.hero2)) continue;
      const h1Pass = passesHeroFilter(cell.hero1, ageFilter, includeLivingLegend);
      const h2Pass = passesHeroFilter(cell.hero2, ageFilter, includeLivingLegend);
      if (!h1Pass || !h2Pass) continue;

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
  }, [data, ageFilter, includeLivingLegend]);

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
      <EmptyState
        title="No community matchup data yet"
        subtitle="Matchup data is generated when players log matches with hero and opponent hero data."
      />
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
        <span>{totalMatches.toLocaleString()} matches</span>
        <span>{heroRows.length} heroes</span>
      </div>

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
                      <span className="truncate max-w-[140px]">{row.hero}</span>
                    </div>
                    <span className="text-[10px] text-fab-dim">({row.totalMatches})</span>
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
                      : mu.winRate >= 60
                        ? "bg-fab-win/30"
                        : mu.winRate >= 45
                          ? "bg-fab-draw/20"
                          : "bg-fab-loss/30";
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
                        onClick={() => { if (!movedRef.current) onCellClick(isSelected ? null : { hero: row.hero, opp }); }}
                        className={`p-2 text-center border-b border-fab-border/50 transition-all ${bgColor} ${
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
