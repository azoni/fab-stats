"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMatches } from "@/hooks/useMatches";
import { useAuth } from "@/contexts/AuthContext";
import { computeEventStats, computeOverallStats, computePlayoffFinishes, computeBestFinish } from "@/lib/stats";
import { updateLeaderboardEntry } from "@/lib/leaderboard";
import { propagateHeroToOpponent } from "@/lib/match-linking";
import { deleteFeedEventsForEvent } from "@/lib/feed";
import { EventCard } from "@/components/events/EventCard";
import { localDate } from "@/lib/constants";
import { type GameFormat } from "@/types";
import { QuickEventImportModal } from "@/components/events/QuickEventImportModal";
import { CalendarIcon } from "@/components/icons/NavIcons";

type View = "timeline" | "standings";
type SortKey = "newest" | "oldest" | "best-record" | "highest-winrate";
const PAGE_SIZE = 25;

export default function EventsPage() {
  const searchParams = useSearchParams();
  const { matches, isLoaded, refreshMatches, batchUpdateHero, batchUpdateFormat, batchDeleteMatches } = useMatches();
  const { user, profile } = useAuth();
  const [filterFormat, setFilterFormat] = useState("all");
  const [filterEventType, setFilterEventType] = useState("all");
  const [filterHero, setFilterHero] = useState("all");
  const [view, setView] = useState<View>("timeline");
  const [sortBy, setSortBy] = useState<SortKey>("newest");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const handleBatchUpdateHero = useCallback(
    async (matchIds: string[], hero: string) => {
      await batchUpdateHero(matchIds, hero);
      if (profile && matches.length > 0) {
        const updated = matches.map((m) =>
          matchIds.includes(m.id) ? { ...m, heroPlayed: hero } : m
        );
        updateLeaderboardEntry(profile, updated).catch(() => {});
      }
      if (user) {
        const affectedMatches = matches.filter(
          (m) => matchIds.includes(m.id) && m.opponentGemId
        );
        for (const match of affectedMatches) {
          propagateHeroToOpponent(user.uid, match, hero).catch(() => {});
        }
      }
    },
    [batchUpdateHero, profile, matches, user]
  );

  const handleBatchUpdateFormat = useCallback(
    async (matchIds: string[], format: GameFormat) => {
      await batchUpdateFormat(matchIds, format);
      if (profile && matches.length > 0) {
        const updated = matches.map((m) =>
          matchIds.includes(m.id) ? { ...m, format } : m
        );
        updateLeaderboardEntry(profile, updated).catch(() => {});
      }
    },
    [batchUpdateFormat, profile, matches]
  );

  const handleDeleteEvent = useCallback(
    async (matchIds: string[], eventName: string, eventDate: string) => {
      await batchDeleteMatches(matchIds);
      if (profile && matches.length > 0) {
        const idSet = new Set(matchIds);
        const remaining = matches.filter((m) => !idSet.has(m.id));
        updateLeaderboardEntry(profile, remaining).catch(() => {});
      }
      if (user) {
        deleteFeedEventsForEvent(user.uid, eventName, eventDate).catch(console.error);
      }
    },
    [batchDeleteMatches, profile, matches, user]
  );

  // Auto-open import modal from ?import=1 (e.g. from navbar "Log Event")
  // Also initialize filters from URL params (e.g. from trends page links)
  useEffect(() => {
    if (searchParams.get("import") === "1") {
      setImportModalOpen(true);
    }
    const urlFormat = searchParams.get("format");
    const urlType = searchParams.get("type");
    const urlHero = searchParams.get("hero");
    if (urlFormat) setFilterFormat(urlFormat);
    if (urlType) setFilterEventType(urlType);
    if (urlHero) setFilterHero(urlHero);
  }, [searchParams]);

  // Reset to page 1 when filters/search/sort change
  useEffect(() => {
    setPage(1);
  }, [filterFormat, filterEventType, filterHero, search, sortBy]);

  const eventStats = useMemo(() => computeEventStats(matches), [matches]);

  const allFormats = useMemo(() => {
    return [...new Set(eventStats.flatMap((e) => e.formats))].sort();
  }, [eventStats]);

  const allEventTypes = useMemo(() => {
    return [...new Set(eventStats.map((e) => e.eventType).filter(Boolean))] as string[];
  }, [eventStats]);

  const getEventHero = useCallback((event: typeof eventStats[0]): string | null => {
    const heroes = new Set(event.matches.map((m) => m.heroPlayed).filter((h) => h && h !== "Unknown"));
    return heroes.size === 1 ? [...heroes][0]! : null;
  }, []);

  const allHeroes = useMemo(() => {
    const heroes = new Set(eventStats.map(getEventHero).filter(Boolean)) as Set<string>;
    return [...heroes].sort();
  }, [eventStats, getEventHero]);

  const hasUnsetHeroes = useMemo(() => {
    return eventStats.some((e) => !getEventHero(e));
  }, [eventStats, getEventHero]);

  const filtered = useMemo(() => {
    let result = eventStats;
    if (filterFormat !== "all") {
      result = result.filter((e) => e.formats.includes(filterFormat));
    }
    if (filterEventType !== "all") {
      result = result.filter((e) => e.eventType === filterEventType);
    }
    if (filterHero === "none") {
      result = result.filter((e) => !getEventHero(e));
    } else if (filterHero !== "all") {
      result = result.filter((e) => getEventHero(e) === filterHero);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((e) => {
        const haystack = [
          e.eventName, e.venue, ...e.formats, e.eventType, e.eventDate,
          ...e.matches.map((m) => m.opponentName),
        ].filter(Boolean).join(" ").toLowerCase();
        return haystack.includes(q);
      });
    }
    return result;
  }, [eventStats, filterFormat, filterEventType, filterHero, getEventHero, search]);

  // Summary stats from filtered events
  const filteredMatches = useMemo(() => filtered.flatMap((e) => e.matches), [filtered]);
  const summaryStats = useMemo(() => computeOverallStats(filteredMatches), [filteredMatches]);
  const bestFinish = useMemo(() => computeBestFinish(filtered), [filtered]);
  const playoffCount = useMemo(() => computePlayoffFinishes(filtered).length, [filtered]);

  // Sorted events
  const sorted = useMemo(() => {
    const list = [...filtered];
    switch (sortBy) {
      case "oldest":
        return list.sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
      case "best-record":
        return list.sort((a, b) => (b.wins - b.losses) - (a.wins - a.losses) || b.winRate - a.winRate);
      case "highest-winrate":
        return list.sort((a, b) => b.winRate - a.winRate || b.totalMatches - a.totalMatches);
      default:
        return list.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
    }
  }, [filtered, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const pageEvents = sorted.slice(startIdx, startIdx + PAGE_SIZE);

  if (!isLoaded) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-40 bg-fab-surface rounded animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-fab-surface border border-fab-border rounded-lg p-4 h-20 animate-pulse" />
          ))}
        </div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-fab-surface border border-fab-border rounded-lg p-4 h-20 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center ring-1 ring-inset ring-blue-500/20">
            <CalendarIcon className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-fab-text leading-tight">Events</h1>
            <p className="text-xs text-fab-muted leading-tight">Your tournaments and their results, grouped by event</p>
          </div>
        </div>
        <div className="flex gap-3 flex-wrap items-center">
          <div className="flex bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
            <button
              onClick={() => setView("timeline")}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                view === "timeline" ? "bg-fab-gold/15 text-fab-gold" : "text-fab-muted hover:text-fab-text"
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setView("standings")}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                view === "standings" ? "bg-fab-gold/15 text-fab-gold" : "text-fab-muted hover:text-fab-text"
              }`}
            >
              Standings
            </button>
          </div>
          <button
            onClick={() => setImportModalOpen(true)}
            className="flex items-center gap-1.5 bg-fab-surface border border-fab-border text-fab-text text-sm font-medium rounded-lg px-3 py-1.5 hover:bg-fab-surface-hover transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Import Event
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-fab-surface border border-fab-border rounded-lg p-3">
            <p className="text-[10px] text-fab-dim uppercase tracking-wider">Win Rate</p>
            <p className={`text-xl font-bold ${summaryStats.overallWinRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
              {summaryStats.overallWinRate.toFixed(1)}%
            </p>
            <div className="mt-1.5 h-1.5 bg-fab-bg rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${summaryStats.overallWinRate >= 50 ? "bg-fab-win/60" : "bg-fab-loss/60"}`}
                style={{ width: `${summaryStats.overallWinRate}%` }}
              />
            </div>
          </div>
          <div className="bg-fab-surface border border-fab-border rounded-lg p-3">
            <p className="text-[10px] text-fab-dim uppercase tracking-wider">Record</p>
            <p className="text-xl font-bold">
              <span className="text-fab-win">{summaryStats.totalWins}</span>
              <span className="text-fab-dim mx-0.5">-</span>
              <span className="text-fab-loss">{summaryStats.totalLosses}</span>
              {summaryStats.totalDraws > 0 && (
                <>
                  <span className="text-fab-dim mx-0.5">-</span>
                  <span className="text-fab-draw">{summaryStats.totalDraws}</span>
                </>
              )}
            </p>
          </div>
          <div className="bg-fab-surface border border-fab-border rounded-lg p-3">
            <p className="text-[10px] text-fab-dim uppercase tracking-wider">Events</p>
            <p className="text-xl font-bold text-fab-text">{filtered.length}</p>
            <p className="text-[10px] text-fab-dim">{summaryStats.totalMatches} matches</p>
          </div>
          <div className="bg-fab-surface border border-fab-border rounded-lg p-3">
            <p className="text-[10px] text-fab-dim uppercase tracking-wider">
              {bestFinish ? "Best Finish" : "Playoffs"}
            </p>
            {bestFinish ? (
              <>
                <p className="text-lg font-bold text-fab-gold truncate">{bestFinish.label}</p>
                <p className="text-[10px] text-fab-dim truncate">{bestFinish.eventName}</p>
              </>
            ) : (
              <>
                <p className="text-xl font-bold text-fab-text">{playoffCount}</p>
                <p className="text-[10px] text-fab-dim">top 8 finishes</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Search + Filters + Sort */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search events..."
          className="bg-fab-surface border border-fab-border rounded-md px-3 py-1.5 text-fab-text text-sm placeholder:text-fab-dim focus:outline-none focus:border-fab-gold w-36 sm:w-44"
        />

        {/* Format pills */}
        {allFormats.length > 1 && (
          <div className="flex gap-0.5 bg-fab-bg rounded-lg p-0.5 border border-fab-border">
            <button
              onClick={() => setFilterFormat("all")}
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                filterFormat === "all" ? "bg-fab-surface text-fab-text shadow-sm" : "text-fab-dim hover:text-fab-muted"
              }`}
            >
              All
            </button>
            {allFormats.map((f) => (
              <button
                key={f}
                onClick={() => setFilterFormat(f)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
                  filterFormat === f ? "bg-fab-surface text-fab-text shadow-sm" : "text-fab-dim hover:text-fab-muted"
                }`}
              >
                {f === "Classic Constructed" ? "CC" : f}
              </button>
            ))}
          </div>
        )}

        {/* Event Type pills */}
        {allEventTypes.length > 1 && (
          <div className="flex gap-0.5 bg-fab-bg rounded-lg p-0.5 border border-fab-border overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setFilterEventType("all")}
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                filterEventType === "all" ? "bg-fab-surface text-fab-text shadow-sm" : "text-fab-dim hover:text-fab-muted"
              }`}
            >
              All
            </button>
            {allEventTypes.map((t) => (
              <button
                key={t}
                onClick={() => setFilterEventType(t)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
                  filterEventType === t ? "bg-fab-surface text-fab-text shadow-sm" : "text-fab-dim hover:text-fab-muted"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {/* Hero dropdown (kept as select for long lists) */}
        {(allHeroes.length > 0 || hasUnsetHeroes) && (
          <select
            value={filterHero}
            onChange={(e) => setFilterHero(e.target.value)}
            className="bg-fab-surface border border-fab-border rounded-md px-3 py-1.5 text-fab-text text-sm outline-none"
          >
            <option value="all">All Heroes</option>
            {hasUnsetHeroes && <option value="none">No Hero Set</option>}
            {allHeroes.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        )}

        {/* Sort options */}
        <div className="flex gap-1 ml-auto">
          {([
            { id: "newest", label: "Newest" },
            { id: "oldest", label: "Oldest" },
            { id: "best-record", label: "Best Record" },
            { id: "highest-winrate", label: "Best Win %" },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSortBy(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                sortBy === tab.id
                  ? "bg-fab-gold/15 text-fab-gold"
                  : "bg-fab-surface text-fab-muted hover:text-fab-text"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-fab-muted mb-4">
            {eventStats.length === 0
              ? user
                ? "No events yet. Import your match history to see your tournaments here."
                : "Sign up and import your matches to see your tournament history here."
              : "No events match the current filters."}
          </p>
          {eventStats.length === 0 && !user && (
            <Link
              href="/login"
              className="inline-block px-6 py-3 rounded-md font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors"
            >
              Sign Up to Get Started
            </Link>
          )}
        </div>
      ) : view === "timeline" ? (
        <>
          <p className="text-xs text-fab-dim">
            Showing {startIdx + 1}-{Math.min(startIdx + PAGE_SIZE, sorted.length)} of {sorted.length} event{sorted.length !== 1 ? "s" : ""}
          </p>
          <div className="space-y-2">
            {pageEvents.map((event) => (
              <EventCard key={`${event.eventName}-${event.eventDate}`} event={event} playerName={profile?.displayName || profile?.username} editable={!!user} onBatchUpdateHero={handleBatchUpdateHero} onBatchUpdateFormat={handleBatchUpdateFormat} onDeleteEvent={handleDeleteEvent} missingGemId={!!user && !profile?.gemId} />
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="text-xs text-fab-dim">
            Showing {startIdx + 1}-{Math.min(startIdx + PAGE_SIZE, sorted.length)} of {sorted.length} event{sorted.length !== 1 ? "s" : ""}
          </p>
          <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] text-fab-dim uppercase tracking-wider border-b border-fab-border">
                  <th className="text-left px-4 py-3 font-medium">Event</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Date</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Format</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Type</th>
                  <th className="text-right px-4 py-3 font-medium">Record</th>
                  <th className="text-right px-4 py-3 font-medium w-28">Win Rate</th>
                </tr>
              </thead>
              <tbody>
                {pageEvents.map((event, i) => (
                  <tr
                    key={`${event.eventName}-${event.eventDate}`}
                    className={`border-t border-fab-border/50 hover:bg-fab-surface-hover transition-colors ${i % 2 === 1 ? "bg-fab-bg/30" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-fab-text truncate max-w-[220px]">{event.eventName}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-fab-dim sm:hidden">{localDate(event.eventDate).toLocaleDateString()}</span>
                        {event.venue && event.venue !== "Unknown" && (
                          <span className="text-xs text-fab-dim truncate max-w-[160px]">{event.venue}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-fab-dim text-xs hidden sm:table-cell whitespace-nowrap">
                      {localDate(event.eventDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex gap-1 flex-wrap">
                        {event.formats.map((f) => (
                          <span key={f} className="px-2 py-0.5 rounded bg-fab-bg text-fab-dim text-xs">
                            {f === "Classic Constructed" ? "CC" : f}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {event.eventType && event.eventType !== "Other" && (
                        <span className="px-2 py-0.5 rounded bg-fab-bg text-fab-dim text-xs">{event.eventType}</span>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-right font-bold ${
                      event.wins > event.losses ? "text-fab-win" : event.wins < event.losses ? "text-fab-loss" : "text-fab-draw"
                    }`}>
                      {event.wins}-{event.losses}{event.draws > 0 ? `-${event.draws}` : ""}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <div className="w-16 h-1.5 bg-fab-bg rounded-full overflow-hidden hidden sm:block">
                          <div
                            className={`h-full rounded-full transition-all ${event.winRate >= 50 ? "bg-fab-win/60" : "bg-fab-loss/60"}`}
                            style={{ width: `${event.winRate}%` }}
                          />
                        </div>
                        <span className={`font-medium text-sm ${event.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
                          {event.winRate.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="px-3 py-1.5 rounded-md text-sm font-medium bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-fab-dim">
            Page {safePage} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="px-3 py-1.5 rounded-md text-sm font-medium bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}

      <QuickEventImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImportComplete={refreshMatches}
      />
    </div>
  );
}
