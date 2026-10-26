"use client";

import { useId, useMemo, useRef } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { MatchCard } from "./MatchCard";
import { MatchFilterSelect } from "./MatchFilterSelect";
import { MatchResult, type MatchRecord } from "@/types";
import { localDate } from "@/lib/constants";
import { filterMatchHistory, getMatchFilterOptions, type MatchHistoryFilters } from "@/lib/match-history";
import { useMatchHistoryFilters } from "@/hooks/useMatchHistoryFilters";
import { WinRateRing } from "@/components/charts/WinRateRing";
import { SegmentedBar } from "@/components/charts/SegmentedBar";
import { EmptyState } from "@/components/ui/EmptyState";

const PAGE_SIZE = 25;
const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fab-gold focus-visible:ring-offset-2 focus-visible:ring-offset-fab-bg";
const INPUT = `w-full min-w-0 min-h-11 sm:min-h-9 rounded-md border border-fab-border bg-fab-surface px-3 text-sm text-fab-text ${FOCUS}`;
const RESULT_PILLS = [
  { value: "", label: "All", activeClass: "bg-fab-muted/15 border-fab-muted/40 text-fab-text" },
  { value: MatchResult.Win, label: "Wins", activeClass: "bg-fab-win/15 border-fab-win/40 text-fab-win" },
  { value: MatchResult.Loss, label: "Losses", activeClass: "bg-fab-loss/15 border-fab-loss/40 text-fab-loss" },
  { value: MatchResult.Draw, label: "Draws", activeClass: "bg-fab-draw/15 border-fab-draw/40 text-fab-draw" },
  { value: MatchResult.Bye, label: "Byes", activeClass: "bg-fab-muted/15 border-fab-muted/40 text-fab-muted" },
];

interface MatchListProps {
  matches: MatchRecord[];
  matchOwnerUid?: string;
  enableComments?: boolean;
  editable?: boolean;
  onUpdateMatch?: (id: string, updates: Partial<Omit<MatchRecord, "id" | "createdAt">>) => Promise<void>;
  onDeleteMatch?: (id: string) => Promise<void>;
  missingGemId?: boolean;
  obfuscateOpponents?: boolean;
}

export function MatchList({
  matches,
  matchOwnerUid,
  enableComments,
  editable,
  onUpdateMatch,
  onDeleteMatch,
  missingGemId,
  obfuscateOpponents = false,
}: MatchListProps) {
  const { filters, setFilters, setQuery, finishSearch, clearFilters } = useMatchHistoryFilters();
  const id = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLHeadingElement>(null);
  const options = useMemo(() => getMatchFilterOptions(matches), [matches]);
  const scoped = useMemo(
    () =>
      filterMatchHistory(matches, filters, {
        includeResult: false,
        obfuscateOpponents,
      }),
    [matches, filters, obfuscateOpponents],
  );
  const filtered = useMemo(
    () => (filters.result ? scoped.filter((match) => match.result === filters.result) : scoped),
    [scoped, filters.result],
  );
  // Result tabs describe the same search, before the selected result is applied.
  const resultCounts = useMemo(() => {
    const counts: Record<string, number> = { "": scoped.length };
    for (const match of scoped) counts[match.result] = (counts[match.result] || 0) + 1;
    return counts;
  }, [scoped]);
  const stats = useMemo(() => {
    const wins = filtered.filter((m) => m.result === MatchResult.Win).length;
    const losses = filtered.filter((m) => m.result === MatchResult.Loss).length;
    const draws = filtered.filter((m) => m.result === MatchResult.Draw).length;
    const byes = filtered.filter((m) => m.result === MatchResult.Bye).length;
    const played = wins + losses + draws;
    return { wins, losses, draws, byes, played, winRate: played ? (wins / played) * 100 : 0 };
  }, [filtered]);
  const extraCount = [
    filters.format,
    filters.eventType,
    filters.venue,
    filters.missing,
    filters.from,
    filters.to,
  ].filter(Boolean).length;
  const invalidDates = !!(filters.from && filters.to && filters.from > filters.to);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(filters.page, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const pageMatches = filtered.slice(startIdx, startIdx + PAGE_SIZE);
  const labelFor = (items: { value: string; label: string }[], value: string) =>
    items.find((item) => item.value === value)?.label || value;
  const selectedEvent = options.events.find((item) => item.value === filters.event);
  const selectedPlayer = options.opponents.find((item) => item.value === filters.opponent);
  const chips: { key: keyof MatchHistoryFilters; label: string }[] = [
    ...(filters.hero ? [{ key: "hero" as const, label: `Your hero: ${labelFor(options.heroes, filters.hero)}` }] : []),
    ...(filters.opponentHero
      ? [
          {
            key: "opponentHero" as const,
            label: `Opponent hero: ${labelFor(options.opponentHeroes, filters.opponentHero)}`,
          },
        ]
      : []),
    ...(filters.opponent
      ? [
          {
            key: "opponent" as const,
            label: obfuscateOpponents
              ? "Selected player"
              : selectedPlayer
                ? `Player: ${[selectedPlayer.label, selectedPlayer.detail].filter(Boolean).join(" · ")}`
                : "Player: unavailable player",
          },
        ]
      : []),
    ...(filters.event
      ? [
          {
            key: "event" as const,
            label: selectedEvent
              ? `Event: ${selectedEvent.label} · ${selectedEvent.detail || ""}`
              : "Event: unavailable event",
          },
        ]
      : []),
    ...(filters.format ? [{ key: "format" as const, label: `Format: ${filters.format}` }] : []),
    ...(filters.eventType ? [{ key: "eventType" as const, label: `Event type: ${filters.eventType}` }] : []),
    ...(filters.venue ? [{ key: "venue" as const, label: `Venue: ${filters.venue}` }] : []),
    ...(filters.missing
      ? [
          {
            key: "missing" as const,
            label: filters.missing === "no-hero" ? "Missing your hero" : "Missing opponent hero",
          },
        ]
      : []),
    ...(filters.from ? [{ key: "from" as const, label: `From: ${filters.from}` }] : []),
    ...(filters.to ? [{ key: "to" as const, label: `Through: ${filters.to}` }] : []),
  ];
  const hasFilters = chips.length > 0 || !!filters.query.trim() || !!filters.result;

  function clearAndFocus() {
    clearFilters();
    searchRef.current?.focus();
  }

  function goToPage(page: number) {
    setFilters({ page });
    resultsRef.current?.focus({ preventScroll: true });
    resultsRef.current?.scrollIntoView({ block: "start" });
  }

  return (
    <section aria-label="Match history" className="min-w-0">
      <div className="space-y-3 mb-4">
        <div>
          <label
            htmlFor={`${id}-search`}
            className="sr-only sm:not-sr-only sm:block text-xs font-medium text-fab-muted sm:mb-1.5"
          >
            Search matches
          </label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fab-dim pointer-events-none"
            />
            <input
              ref={searchRef}
              id={`${id}-search`}
              name="q"
              type="search"
              autoComplete="off"
              spellCheck={false}
              value={filters.query}
              onChange={(event) => setQuery(event.target.value)}
              onBlur={finishSearch}
              placeholder={
                obfuscateOpponents ? "Search heroes, events, or venues…" : "Search players, heroes, events, or venues…"
              }
              className={`${INPUT} pl-9 pr-11 [&::-webkit-search-cancel-button]:appearance-none`}
            />
            {filters.query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setFilters({ query: "" });
                  searchRef.current?.focus();
                }}
                className={`absolute right-0 top-0 h-full w-11 flex items-center justify-center rounded-md text-fab-muted hover:text-fab-text ${FOCUS}`}
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <MatchFilterSelect
            label="Your hero"
            value={filters.hero}
            onChange={(hero) => setFilters({ hero })}
            options={options.heroes}
            allLabel="All your heroes"
          />
          <MatchFilterSelect
            label="Opponent hero"
            value={filters.opponentHero}
            onChange={(opponentHero) => setFilters({ opponentHero })}
            options={options.opponentHeroes}
            allLabel="All opposing heroes"
          />
          {obfuscateOpponents ? (
            <div className="min-w-0">
              <p className="text-xs font-medium text-fab-muted mb-1.5">Opponent player</p>
              <p className="flex min-h-11 sm:min-h-9 items-center text-xs text-fab-dim">
                Names hidden{filters.opponent ? " · filter kept" : ""}
              </p>
            </div>
          ) : (
            <MatchFilterSelect
              label="Opponent player"
              value={filters.opponent}
              onChange={(opponent) => setFilters({ opponent })}
              options={options.opponents}
              allLabel="All players"
            />
          )}
          <MatchFilterSelect
            label="Event"
            value={filters.event}
            onChange={(event) => setFilters({ event })}
            options={options.events}
            allLabel="All events"
          />
        </div>

        <div className="relative">
          <details className="group rounded-md border border-fab-border/70">
            <summary
              className={`flex min-h-11 sm:min-h-9 cursor-pointer items-center gap-2 rounded-md pl-3 pr-36 sm:pr-3 text-xs font-medium text-fab-muted hover:text-fab-text list-none [&::-webkit-details-marker]:hidden ${FOCUS}`}
            >
              <SlidersHorizontal aria-hidden="true" className="h-3.5 w-3.5" />
              More filters
              {extraCount > 0 && (
                <span className="rounded bg-fab-gold/15 px-1.5 text-fab-gold tabular-nums">{extraCount}</span>
              )}
              <span aria-hidden="true" className="ml-auto group-open:hidden">
                +
              </span>
              <span aria-hidden="true" className="ml-auto hidden group-open:inline">
                −
              </span>
            </summary>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 px-3 pb-3 pt-1">
              <MatchFilterSelect
                label="Format"
                value={filters.format}
                onChange={(format) => setFilters({ format })}
                options={options.formats}
                allLabel="All formats"
              />
              <MatchFilterSelect
                label="Event type"
                value={filters.eventType}
                onChange={(eventType) => setFilters({ eventType })}
                options={options.eventTypes}
                allLabel="All event types"
              />
              <MatchFilterSelect
                label="Venue"
                value={filters.venue}
                onChange={(venue) => setFilters({ venue })}
                options={options.venues}
                allLabel="All venues"
              />
              <label className="block min-w-0 text-xs font-medium text-fab-muted">
                Missing data
                <select
                  name="filter"
                  value={filters.missing}
                  onChange={(event) => setFilters({ missing: event.target.value })}
                  className={`${INPUT} mt-1.5`}
                >
                  <option value="">Include all matches</option>
                  <option value="no-hero">No hero set</option>
                  <option value="no-opp-hero">No opponent hero</option>
                </select>
              </label>
              <label className="block min-w-0 text-xs font-medium text-fab-muted">
                From date
                <input
                  name="from"
                  type="date"
                  value={filters.from}
                  onChange={(event) => setFilters({ from: event.target.value })}
                  aria-invalid={invalidDates || undefined}
                  aria-describedby={invalidDates ? `${id}-dates-error` : undefined}
                  className={`${INPUT} mt-1.5`}
                />
              </label>
              <label className="block min-w-0 text-xs font-medium text-fab-muted">
                Through date
                <input
                  name="to"
                  type="date"
                  value={filters.to}
                  onChange={(event) => setFilters({ to: event.target.value })}
                  aria-invalid={invalidDates || undefined}
                  aria-describedby={invalidDates ? `${id}-dates-error` : undefined}
                  className={`${INPUT} mt-1.5`}
                />
              </label>
            </div>
          </details>
          <label className="absolute right-1 top-0 sm:hidden">
            <span className="sr-only">Filter by result</span>
            <select
              name="result"
              value={filters.result}
              onChange={(event) => setFilters({ result: event.target.value })}
              className={`min-h-11 max-w-32 rounded-md border-0 bg-fab-surface px-2 text-xs text-fab-text ${FOCUS}`}
            >
              {RESULT_PILLS.map((pill) => (
                <option key={pill.value} value={pill.value}>
                  {pill.label} ({resultCounts[pill.value] || 0})
                </option>
              ))}
            </select>
          </label>
        </div>
        {invalidDates && (
          <p id={`${id}-dates-error`} role="alert" className="text-sm text-fab-loss">
            The end date must be on or after the start date. Adjust either date to see your matches.
          </p>
        )}

        {hasFilters && (
          <div className="flex flex-wrap gap-1.5" aria-label="Active filters">
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => setFilters({ [chip.key]: "" })}
                aria-label={`Remove ${chip.label}`}
                title={chip.label}
                className={`inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-md border border-fab-gold/25 bg-fab-gold/10 px-2 text-xs text-fab-gold hover:bg-fab-gold/20 ${FOCUS}`}
              >
                <span className="truncate">{chip.label}</span>
                <X aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              </button>
            ))}
            <button
              type="button"
              onClick={clearAndFocus}
              className={`min-h-9 shrink-0 rounded px-2 text-xs font-medium text-fab-gold hover:text-fab-gold-light ${FOCUS}`}
            >
              Clear filters
            </button>
          </div>
        )}

        <div className="hidden sm:flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <div role="group" aria-label="Filter by result" className="flex flex-wrap gap-1">
            {RESULT_PILLS.map((pill) => (
              <button
                key={pill.value}
                type="button"
                aria-pressed={filters.result === pill.value}
                onClick={() => setFilters({ result: pill.value })}
                className={`min-h-11 sm:min-h-9 px-2 rounded-full text-xs font-medium border transition-colors ${FOCUS} ${filters.result === pill.value ? pill.activeClass : "border-transparent text-fab-muted hover:text-fab-text"}`}
              >
                {pill.label}
                <span className="ml-1 tabular-nums">{resultCounts[pill.value] || 0}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex min-h-9 items-center justify-between gap-2">
          <h2
            ref={resultsRef}
            tabIndex={-1}
            className="text-sm font-medium text-fab-text scroll-mt-24 focus:outline-none"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <span className="tabular-nums">{filtered.length.toLocaleString()}</span> of{" "}
            {matches.length.toLocaleString()} matches
          </h2>
          <label className="flex items-center gap-2 text-xs text-fab-muted">
            <span className="sr-only">Sort</span>
            <select
              name="sort"
              value={filters.sort}
              onChange={(event) => setFilters({ sort: event.target.value as "newest" | "oldest" })}
              className={`min-h-11 sm:min-h-9 rounded-md border border-fab-border bg-fab-surface px-2 text-xs text-fab-text ${FOCUS}`}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No matches found"
          subtitle={
            invalidDates
              ? "Check your date range, or clear the filters to start again."
              : "Try a different player, hero, or event, or clear your filters to see all matches."
          }
          action={hasFilters ? { label: "Show all matches", onClick: clearAndFocus } : undefined}
        />
      ) : (
        <>
          <div
            className="flex items-center gap-3 mb-3 px-3 py-3 bg-fab-surface/50 rounded-lg border border-fab-border/50"
            aria-label="Results for filtered matches"
          >
            <div
              role="img"
              aria-label={
                stats.played
                  ? `${Math.round(stats.winRate)}% win rate, excluding byes`
                  : "No played matches; win rate unavailable"
              }
            >
              <WinRateRing
                value={stats.winRate}
                size={44}
                strokeWidth={4}
                label={stats.played ? undefined : "—"}
                color={stats.played ? undefined : "var(--color-fab-muted)"}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold mb-1.5 tabular-nums">
                <span className="text-fab-win">{stats.wins}W</span>
                <span className="text-fab-dim" aria-hidden="true">
                  ·
                </span>
                <span className="text-fab-loss">{stats.losses}L</span>
                {stats.draws > 0 && (
                  <>
                    <span className="text-fab-dim" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-fab-draw">{stats.draws}D</span>
                  </>
                )}
                {stats.byes > 0 && (
                  <span className="text-xs font-normal text-fab-muted">
                    · {stats.byes} bye{stats.byes === 1 ? "" : "s"}
                  </span>
                )}
                <span className="sr-only sm:not-sr-only sm:ml-auto text-xs font-normal text-fab-muted">
                  Win rate excludes byes
                </span>
              </div>
              <SegmentedBar
                segments={[
                  { value: stats.wins, color: "var(--color-fab-win)" },
                  { value: stats.draws, color: "var(--color-fab-draw)" },
                  { value: stats.losses, color: "var(--color-fab-loss)" },
                ]}
                height="md"
              />
            </div>
          </div>
          <p className="text-xs text-fab-muted mb-2 tabular-nums">
            Showing {startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, filtered.length)} of {filtered.length} match
            {filtered.length === 1 ? "" : "es"}
          </p>
          <div className="space-y-1.5">
            {pageMatches.map((match, idx) => {
              const showDate = idx === 0 || match.date !== pageMatches[idx - 1].date;
              return (
                <div key={match.id}>
                  {showDate && (
                    <div className={`flex items-center gap-3 pb-1 ${idx > 0 ? "pt-3" : ""}`}>
                      <span className="text-xs font-medium text-fab-dim whitespace-nowrap">
                        {localDate(match.date).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <div className="flex-1 h-px bg-gradient-to-r from-fab-border/60 to-transparent" />
                    </div>
                  )}
                  <MatchCard
                    match={match}
                    matchOwnerUid={matchOwnerUid}
                    enableComments={enableComments}
                    editable={editable}
                    onUpdateMatch={onUpdateMatch}
                    onDeleteMatch={onDeleteMatch}
                    missingGemId={missingGemId}
                    obfuscateOpponents={obfuscateOpponents}
                  />
                </div>
              );
            })}
          </div>
          {totalPages > 1 && (
            <nav aria-label="Match history pages" className="flex items-center justify-center gap-3 mt-4">
              <button
                type="button"
                onClick={() => goToPage(safePage - 1)}
                disabled={safePage <= 1}
                className={`min-h-11 sm:min-h-9 px-3 rounded-md text-sm font-medium bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text disabled:opacity-30 disabled:cursor-not-allowed ${FOCUS}`}
              >
                Previous
              </button>
              <span className="text-sm text-fab-muted tabular-nums">
                Page {safePage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => goToPage(safePage + 1)}
                disabled={safePage >= totalPages}
                className={`min-h-11 sm:min-h-9 px-3 rounded-md text-sm font-medium bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text disabled:opacity-30 disabled:cursor-not-allowed ${FOCUS}`}
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
