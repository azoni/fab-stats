"use client";
import { useState, useMemo, useEffect, useCallback, useRef, useId } from "react";
import { getCommunityHeroMatchups, getMonthsForPreset, type CommunityMatchupCell } from "@/lib/hero-matchups";
import { getHeroByName, resolveHeroName, buildHeroLabels } from "@/lib/heroes";
import { HeroImg } from "@/components/heroes/HeroImg";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { MatchFilterSelect } from "@/components/matches/MatchFilterSelect";
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
  return (
    hero.legalFormats.includes("Living Legend") &&
    !hero.legalFormats.includes("Classic Constructed") &&
    !hero.legalFormats.includes("Blitz")
  );
}

function isYoungHero(name: string): boolean {
  const hero = getHeroByName(name);
  return hero?.young === true;
}

interface MetaMatchupMatrixProps {
  format?: string;
  eventType?: string;
  sinceDate?: string;
  untilDate?: string;
  rated?: "rated" | "unrated";
  enableExplorer?: boolean;
}

export function MetaMatchupMatrix({
  format,
  eventType,
  sinceDate,
  untilDate,
  rated,
  enableExplorer = false,
}: MetaMatchupMatrixProps) {
  const scopeKey = JSON.stringify([format, eventType, sinceDate, untilDate, rated]);
  const [request, setRequest] = useState<{
    scope: string;
    status: "loading" | "ready" | "error";
    data: CommunityMatchupCell[];
  }>({ scope: "", status: "loading", data: [] });
  const requestSequence = useRef(0);
  const [retry, setRetry] = useState(0);
  const currentScope = request.scope === scopeKey;
  const loading = !currentScope || request.status === "loading";
  const error = currentScope && request.status === "error";
  const data = useMemo(() => (currentScope && request.status === "ready" ? request.data : []), [currentScope, request]);
  const [selectedCell, setSelectedCell] = useState<{ hero: string; opp: string } | null>(null);
  // Top-20 by default: the full ~60-hero grid is a ~5000px-wide scroll on a
  // phone, and most lookups are top-meta anyway. "Show all" is one tap.
  const [showAll, setShowAll] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);
  const selectedButtonRef = useRef<HTMLButtonElement | null>(null);
  const detailId = useId();
  const [ageFilter, setAgeFilter] = useState<"adult" | "young" | "all">(enableExplorer ? "all" : "adult");
  const [excludeLL, setExcludeLL] = useState(!enableExplorer);
  const [heroSearch, setHeroSearch] = useState("");
  const [heroFilter, setHeroFilter] = useState("");
  const [opponentFilter, setOpponentFilter] = useState("");
  const [highlightRow, setHighlightRow] = useState<string | null>(null);
  const [highlightCol, setHighlightCol] = useState<string | null>(null);
  const { ref: scrollRef, onMouseDown, movedRef } = useDragScroll();

  const fetchData = useCallback(async () => {
    const sequence = ++requestSequence.current;
    setRequest({ scope: scopeKey, status: "loading", data: [] });
    setSelectedCell(null);
    try {
      let preset = "all";
      if (sinceDate) {
        const end = untilDate || new Date().toISOString().slice(0, 10);
        preset = `custom:${sinceDate}:${end}`;
      }
      const months = getMonthsForPreset(preset);
      const result = await getCommunityHeroMatchups(months, format || undefined, rated, eventType || undefined);
      if (sequence === requestSequence.current) {
        setRequest({ scope: scopeKey, status: "ready", data: result });
      }
    } catch {
      if (sequence === requestSequence.current) {
        setRequest({ scope: scopeKey, status: "error", data: [] });
      }
    }
  }, [format, eventType, sinceDate, untilDate, rated, scopeKey]);

  const fetchRef = useRef(fetchData);
  useEffect(() => {
    fetchRef.current = fetchData;
  }, [fetchData]);
  useEffect(() => {
    void fetchRef.current();
    return () => {
      requestSequence.current += 1;
    };
  }, [scopeKey, retry]);

  // Keep choices independent of the local age/LL/pair filters. A temporarily
  // incompatible choice stays visible and can be cleared deliberately.
  const heroOptions = useMemo(() => {
    const names = new Set<string>();
    data.forEach((cell) => {
      const hero = resolveHeroName(cell.hero1);
      const opponent = resolveHeroName(cell.hero2);
      if (hero) names.add(hero);
      if (opponent) names.add(opponent);
    });
    const selectedNames = new Set([heroFilter, opponentFilter].filter(Boolean));
    return [...new Set([...names, ...selectedNames])]
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({
        value: name,
        label: name,
        detail: names.has(name) ? undefined : loading ? "Loading scope" : "Outside current scope",
      }));
  }, [data, heroFilter, opponentFilter, loading]);

  const { heroRows, allHeroes } = useMemo(() => {
    const heroMap = new Map<string, Map<string, { wins: number; losses: number; draws: number; total: number }>>();

    for (const cell of data) {
      const h1 = resolveHeroName(cell.hero1);
      const h2 = resolveHeroName(cell.hero2);
      if (!h1 || !h2) continue;
      if (excludeLL && (isLivingLegendHero(h1) || isLivingLegendHero(h2))) continue;
      if (ageFilter === "adult" && (isYoungHero(h1) || isYoungHero(h2))) continue;
      if (ageFilter === "young" && (!isYoungHero(h1) || !isYoungHero(h2))) continue;

      if (!heroMap.has(h1)) heroMap.set(h1, new Map());
      heroMap.get(h1)!.set(h2, {
        wins: cell.hero1Wins,
        losses: cell.hero2Wins,
        draws: cell.draws,
        total: cell.total,
      });

      if (!heroMap.has(h2)) heroMap.set(h2, new Map());
      heroMap.get(h2)!.set(h1, {
        wins: cell.hero2Wins,
        losses: cell.hero1Wins,
        draws: cell.draws,
        total: cell.total,
      });
    }

    const rows: ProcessedHeroRow[] = [];
    for (const [hero, matchups] of heroMap) {
      let totalForHero = 0;
      let totalWins = 0;
      const enriched = new Map<
        string,
        { wins: number; losses: number; draws: number; total: number; winRate: number }
      >();
      for (const [opp, stats] of matchups) {
        totalForHero += stats.total;
        totalWins += stats.wins;
        enriched.set(opp, { ...stats, winRate: stats.total > 0 ? (stats.wins / stats.total) * 100 : 0 });
      }
      rows.push({
        hero,
        totalMatches: totalForHero,
        overallWinRate: totalForHero > 0 ? (totalWins / totalForHero) * 100 : 0,
        matchups: enriched,
      });
    }

    rows.sort((a, b) => b.totalMatches - a.totalMatches);
    const heroes = rows.map((r) => r.hero);
    return { heroRows: rows, allHeroes: heroes };
  }, [data, ageFilter, excludeLL]);

  // Disambiguate heroes that share a first name (e.g. the three adult Araknis), so a
  // cross-hero cell no longer reads like an impossible "Arakni vs Arakni" mirror.
  const heroLabels = useMemo(() => buildHeroLabels(allHeroes), [allHeroes]);

  const searchLower = heroSearch.toLowerCase().trim();
  const filteredRows = heroRows.filter((row) =>
    enableExplorer
      ? (!heroFilter || row.hero === heroFilter) &&
        (!opponentFilter || (row.hero !== opponentFilter && (row.matchups.get(opponentFilter)?.total || 0) > 0))
      : !searchLower || row.hero.toLowerCase().includes(searchLower),
  );
  const exactSelection = enableExplorer && !!(heroFilter || opponentFilter);
  const displayRows = showAll || exactSelection ? filteredRows : filteredRows.slice(0, 20);
  const eligibleColumns =
    enableExplorer && opponentFilter
      ? allHeroes.filter((hero) => hero === opponentFilter)
      : enableExplorer && heroFilter
        ? allHeroes.filter(
            (hero) => hero !== heroFilter && displayRows.some((row) => (row.matchups.get(hero)?.total || 0) > 0),
          )
        : allHeroes;
  const displayCols = showAll || exactSelection ? eligibleColumns : eligibleColumns.slice(0, 20);

  const selectedMu =
    selectedCell && displayCols.includes(selectedCell.opp)
      ? displayRows.find((r) => r.hero === selectedCell.hero)?.matchups.get(selectedCell.opp)
      : null;
  const hasGrid =
    displayRows.length > 0 &&
    displayCols.length > 0 &&
    heroRows.some((row) => [...row.matchups].some(([opponent, matchup]) => opponent !== row.hero && matchup.total > 0));
  const detailKey = selectedCell && selectedMu ? `${selectedCell.hero}|${selectedCell.opp}` : "";
  useEffect(() => {
    if (!detailKey) return;
    const frame = requestAnimationFrame(() => {
      const detail = detailRef.current;
      if (!detail) return;
      detail.focus({ preventScroll: true });
      detail.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "nearest",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [detailKey]);

  function clearHeroFilters() {
    setHeroFilter("");
    setOpponentFilter("");
    setHeroSearch("");
    setAgeFilter("all");
    setExcludeLL(false);
    setShowAll(false);
    setSelectedCell(null);
    setHighlightRow(null);
    setHighlightCol(null);
  }
  const hasHeroFilters = !!(heroFilter || opponentFilter || heroSearch || ageFilter !== "all" || excludeLL);
  function closeDetail() {
    setSelectedCell(null);
    if (selectedButtonRef.current?.isConnected) selectedButtonRef.current.focus({ preventScroll: true });
  }

  return (
    <div>
      {enableExplorer && (
        <div className="mb-3 grid min-w-0 grid-cols-2 gap-3">
          <MatchFilterSelect
            label="Hero"
            value={heroFilter}
            onChange={(value) => {
              setHeroFilter(value);
              setSelectedCell(null);
            }}
            options={heroOptions}
            allLabel="All heroes"
            disabled={loading}
          />
          <MatchFilterSelect
            label="Opponent hero"
            value={opponentFilter}
            onChange={(value) => {
              setOpponentFilter(value);
              setSelectedCell(null);
            }}
            options={heroOptions}
            allLabel="All heroes"
            disabled={loading}
          />
        </div>
      )}
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex rounded-lg border border-fab-border overflow-hidden">
          {[
            { id: "adult" as const, label: "Adult" },
            { id: "young" as const, label: "Young" },
            { id: "all" as const, label: "All Ages" },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              aria-pressed={ageFilter === opt.id}
              onClick={() => {
                setAgeFilter(opt.id);
                setSelectedCell(null);
              }}
              className={`${enableExplorer ? "min-h-11 px-3 py-2 text-sm sm:min-h-9" : "px-2.5 py-1 text-xs"} font-medium transition-colors focus-visible:outline-2 focus-visible:outline-fab-gold focus-visible:-outline-offset-2 ${
                opt.id !== "adult" ? "border-l border-fab-border" : ""
              } ${ageFilter === opt.id ? "bg-fab-gold/15 text-fab-gold" : "text-fab-muted hover:text-fab-text"}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-pressed={!excludeLL}
          onClick={() => {
            setExcludeLL(!excludeLL);
            setSelectedCell(null);
          }}
          className={`${enableExplorer ? "min-h-11 px-3 py-2 text-sm sm:min-h-9" : "px-2.5 py-1 text-xs"} rounded-full font-medium transition-colors focus-visible:outline-2 focus-visible:outline-fab-gold ${
            !excludeLL
              ? "bg-purple-500/15 text-purple-400"
              : "bg-fab-surface text-fab-muted hover:text-fab-text border border-fab-border"
          }`}
        >
          {enableExplorer ? "Include Living Legend" : "Living Legend"}
        </button>
        {!enableExplorer && (
          <input
            type="text"
            value={heroSearch}
            onChange={(e) => {
              setHeroSearch(e.target.value);
              setSelectedCell(null);
            }}
            aria-label="Search community heroes"
            placeholder="Search heroes..."
            className="ml-auto px-2.5 py-1 rounded-lg text-xs bg-fab-bg border border-fab-border text-fab-text placeholder:text-fab-dim focus:outline-none focus:border-fab-gold/50 w-36"
          />
        )}
        {hasHeroFilters && (
          <button
            type="button"
            onClick={clearHeroFilters}
            className="min-h-11 rounded-md px-3 py-2 text-sm font-medium text-fab-gold hover:text-fab-gold-light focus-visible:outline-2 focus-visible:outline-fab-gold sm:min-h-9"
          >
            Reset hero filters
          </button>
        )}
        <span className="text-xs text-fab-dim">
          {!loading &&
            !error &&
            `${displayRows.length} of ${heroRows.length} heroes${enableExplorer ? ` · ${displayCols.length} opponents` : ""}`}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12" role="status">
          <div
            className="w-6 h-6 border-2 border-fab-gold/30 border-t-fab-gold rounded-full animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
          <span className="ml-3 text-sm text-fab-dim">Loading matchup data...</span>
        </div>
      ) : error ? (
        <ErrorState
          title="Couldn’t load community matchups"
          detail="The matchup data could not be loaded. Retry to check this scope again."
          onRetry={() => setRetry((value) => value + 1)}
        />
      ) : !hasGrid ? (
        <EmptyState
          title={data.length ? "No matchups match these filters" : "No community matchups in this scope"}
          subtitle={
            data.length
              ? "Your selections are still applied. Change a hero or reset the hero filters; mirror matchups are not shown."
              : "Try another format, event type or date range above. Community matchups need recorded heroes on both sides."
          }
          action={hasHeroFilters ? { label: "Reset hero filters", onClick: clearHeroFilters } : undefined}
        />
      ) : (
        <>
          {/* Matrix grid */}
          <div
            ref={scrollRef}
            onMouseDown={onMouseDown}
            tabIndex={0}
            role="region"
            aria-label="Community matchup matrix"
            className="overflow-auto max-h-[70vh] cursor-grab rounded-lg border border-fab-border bg-fab-bg focus-visible:outline-2 focus-visible:outline-fab-gold"
          >
            <table className="w-full text-sm border-collapse">
              <caption className="sr-only">
                Community hero matchups. Rows are the hero whose win rate is shown; columns are their opponent. Each
                available matchup button includes its record and sample size.
              </caption>
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="text-left p-2 text-fab-muted font-medium border-b border-fab-border sticky left-0 top-0 bg-fab-surface z-20"
                  >
                    Hero / vs
                  </th>
                  {displayCols.map((hero) => {
                    const lbl = heroLabels.get(hero);
                    return (
                      <th
                        key={hero}
                        scope="col"
                        title={hero}
                        className={`text-fab-muted font-medium border-b border-fab-border text-center min-w-[80px] sticky top-0 bg-fab-surface z-10 select-none transition-colors ${
                          highlightCol === hero ? "!bg-fab-gold/10 text-fab-gold" : "hover:text-fab-text"
                        }`}
                      >
                        <button
                          type="button"
                          aria-label={`Highlight opponent ${hero}`}
                          aria-pressed={highlightCol === hero}
                          onClick={(event) => {
                            if (event.detail === 0 || !movedRef.current) {
                              event.currentTarget.focus({ preventScroll: true });
                              setHighlightCol(highlightCol === hero ? null : hero);
                            }
                          }}
                          className="flex min-h-11 w-full flex-col items-center gap-0.5 rounded p-2 focus-visible:outline-2 focus-visible:outline-fab-gold focus-visible:-outline-offset-2"
                        >
                          <HeroImg name={hero} />
                          <span
                            className={
                              enableExplorer
                                ? "max-w-[160px] break-words text-[13px] leading-snug"
                                : "text-[10px] leading-tight"
                            }
                          >
                            {enableExplorer ? hero : (lbl?.primary ?? hero.split(",")[0])}
                          </span>
                          {!enableExplorer && lbl?.secondary && (
                            <span className="max-w-[76px] truncate text-[8px] leading-none text-fab-gold/70">
                              {lbl.secondary}
                            </span>
                          )}
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row) => {
                  const isRowHL = highlightRow === row.hero;
                  const displayedRecord = displayCols.reduce(
                    (record, opponent) => {
                      const matchup = opponent === row.hero ? undefined : row.matchups.get(opponent);
                      return { wins: record.wins + (matchup?.wins || 0), total: record.total + (matchup?.total || 0) };
                    },
                    { wins: 0, total: 0 },
                  );
                  const rowTotal = enableExplorer ? displayedRecord.total : row.totalMatches;
                  const rowRate = enableExplorer
                    ? rowTotal
                      ? (displayedRecord.wins / rowTotal) * 100
                      : null
                    : row.overallWinRate;
                  return (
                    <tr key={row.hero}>
                      <th
                        scope="row"
                        className={`font-semibold text-fab-text border-b border-fab-border/50 sticky left-0 z-10 select-none transition-colors ${
                          isRowHL ? "bg-fab-gold/10 text-fab-gold" : "bg-fab-surface hover:text-fab-gold"
                        }`}
                      >
                        <button
                          type="button"
                          aria-label={`Highlight hero ${row.hero}`}
                          aria-pressed={isRowHL}
                          onClick={(event) => {
                            if (event.detail === 0 || !movedRef.current) {
                              event.currentTarget.focus({ preventScroll: true });
                              setHighlightRow(isRowHL ? null : row.hero);
                            }
                          }}
                          className="min-h-11 w-full rounded p-2 text-left focus-visible:outline-2 focus-visible:outline-fab-gold focus-visible:-outline-offset-2"
                        >
                          <div className="flex items-center gap-1.5">
                            <HeroImg name={row.hero} />
                            <span
                              className={
                                enableExplorer
                                  ? "min-w-[100px] max-w-[180px] whitespace-normal break-words text-[13px]"
                                  : "truncate max-w-[140px] whitespace-nowrap"
                              }
                              title={row.hero}
                            >
                              {enableExplorer
                                ? row.hero
                                : (heroLabels.get(row.hero)?.primary ?? row.hero.split(",")[0])}
                              {!enableExplorer && heroLabels.get(row.hero)?.secondary && (
                                <span className="text-fab-gold/70"> · {heroLabels.get(row.hero)!.secondary}</span>
                              )}
                            </span>
                          </div>
                          <div
                            className={`flex flex-wrap items-center gap-1.5 ${enableExplorer ? "text-[13px]" : "text-[10px]"}`}
                          >
                            <span className={rowRate !== null && rowRate >= 50 ? "text-fab-win" : "text-fab-loss"}>
                              {rowRate === null ? "—" : `${rowRate.toFixed(0)}%`}
                            </span>
                            <span className="text-fab-dim">
                              ({rowTotal}
                              {enableExplorer ? " shown" : ""})
                            </span>
                          </div>
                        </button>
                      </th>
                      {displayCols.map((opp) => {
                        const isHL = isRowHL || highlightCol === opp;
                        if (opp === row.hero) {
                          return (
                            <td
                              key={opp}
                              className={`p-2 text-center border-b border-fab-border/50 ${isHL ? "bg-fab-gold/5" : "bg-fab-surface/30"}`}
                            >
                              <span className="text-fab-dim text-xs">-</span>
                            </td>
                          );
                        }
                        const mu = row.matchups.get(opp);
                        const isSelected = selectedCell?.hero === row.hero && selectedCell?.opp === opp;
                        if (!mu || mu.total === 0) {
                          return (
                            <td
                              key={opp}
                              className={`p-2 text-center border-b border-fab-border/50 text-fab-dim ${isHL ? "bg-fab-gold/5" : ""}`}
                            >
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
                            className={`text-center border-b border-fab-border/50 transition-colors ${bgColor} ${
                              isSelected
                                ? "ring-2 ring-fab-gold ring-inset"
                                : "hover:ring-1 hover:ring-fab-gold/30 hover:shadow-[0_0_8px_rgba(212,165,74,0.1)]"
                            } ${isHL ? "!bg-fab-gold/10" : ""}`}
                            title={lowSample ? `Low sample (${mu.total} matches)` : undefined}
                          >
                            <button
                              type="button"
                              aria-label={`${row.hero} against ${opp}: ${mu.wins} wins, ${mu.losses} losses, ${mu.draws} draws from ${mu.total} matches; ${mu.winRate.toFixed(1)} percent win rate${lowSample ? "; low sample" : ""}`}
                              aria-pressed={isSelected}
                              aria-controls={isSelected ? detailId : undefined}
                              onClick={(event) => {
                                if (event.detail !== 0 && movedRef.current) return;
                                selectedButtonRef.current = event.currentTarget;
                                event.currentTarget.focus({ preventScroll: true });
                                setSelectedCell(isSelected ? null : { hero: row.hero, opp });
                              }}
                              className="min-h-11 w-full rounded p-2 focus-visible:outline-2 focus-visible:outline-fab-gold focus-visible:-outline-offset-2"
                            >
                              <div className={`font-bold ${textColor}`}>{mu.winRate.toFixed(0)}%</div>
                              <div className="text-xs text-fab-dim">
                                {mu.wins}-{mu.losses}
                                {mu.draws > 0 ? `-${mu.draws}` : ""}
                              </div>
                              {enableExplorer && lowSample && (
                                <span className="block text-[13px] text-fab-muted">Low sample</span>
                              )}
                            </button>
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
          {!exactSelection && (filteredRows.length > 20 || eligibleColumns.length > 20) && (
            <button
              type="button"
              onClick={() => setShowAll(!showAll)}
              className={`mt-3 rounded-md text-fab-gold hover:text-fab-gold-light transition-colors font-medium focus-visible:outline-2 focus-visible:outline-fab-gold ${enableExplorer ? "min-h-11 px-3 py-2 text-sm sm:min-h-9" : "text-xs"}`}
            >
              {showAll ? "Show top 20" : `Show all ${heroRows.length} heroes`}
            </button>
          )}

          {/* Detail panel */}
          {selectedCell && selectedMu && (
            <div
              id={detailId}
              ref={detailRef}
              tabIndex={-1}
              role="region"
              aria-labelledby={`${detailId}-title`}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  event.stopPropagation();
                  closeDetail();
                }
              }}
              className="mt-3 p-3 bg-fab-surface border border-fab-border rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-fab-gold/60"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 id={`${detailId}-title`} className="text-sm font-bold text-fab-text">
                  {selectedCell.hero} vs {selectedCell.opp}
                </h3>
                <button
                  type="button"
                  onClick={closeDetail}
                  aria-label="Close matchup detail"
                  className={`-m-2 flex shrink-0 items-center justify-center rounded-md p-2.5 text-fab-dim hover:text-fab-muted focus-visible:outline-2 focus-visible:outline-fab-gold ${enableExplorer ? "min-h-11 min-w-11" : ""}`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
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
              {selectedMu.total < 5 && (
                <p className="mt-2 text-[13px] text-fab-muted">
                  Low sample: fewer than 5 matches. This rate describes the recorded results, not a reliable matchup
                  estimate.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
