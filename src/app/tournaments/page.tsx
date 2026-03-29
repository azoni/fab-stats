"use client";
import { useMemo, useState } from "react";
import { useFeaturedEvents } from "@/hooks/useFeaturedEvents";
import { useHistoricalEvents } from "@/hooks/useHistoricalEvents";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { TournamentCard } from "@/components/home/TournamentCard";
import { TrophyIcon } from "@/components/icons/NavIcons";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { FeaturedEvent } from "@/types";

const PAGE_SIZE = 12;

export default function TournamentsPage() {
  const featuredEvents = useFeaturedEvents();
  const { events: historicalEvents, loading: historicalLoading } = useHistoricalEvents();
  const { entries: lbEntries, loading } = useLeaderboard();
  const [filterFormat, setFilterFormat] = useState("all");
  const [filterEventType, setFilterEventType] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const entryMap = useMemo(() => new Map(lbEntries.map((e) => [e.username, e])), [lbEntries]);

  // Build a displayName → LeaderboardEntry map for auto-matching tournament player names
  const nameMap = useMemo(() => {
    const map = new Map<string, typeof lbEntries[0]>();
    for (const e of lbEntries) {
      if (e.displayName) {
        map.set(e.displayName.toLowerCase(), e);
      }
    }
    return map;
  }, [lbEntries]);

  // Merge featured + historical into a unified list
  const allEvents = useMemo(() => {
    const featuredKeys = new Set(
      featuredEvents.map((e) => `${e.name.toLowerCase()}|${e.date}`)
    );

    const historicalAsFeatured: FeaturedEvent[] = historicalEvents
      .filter((h) => !featuredKeys.has(`${h.name.toLowerCase()}|${h.date}`))
      .map((h) => ({
        name: h.name,
        date: h.date,
        format: h.format,
        eventType: h.eventType,
        players: h.top8.map((p) => ({
          name: p.name,
          hero: p.hero,
          username: p.fabstatsUsername || undefined,
        })),
      }));

    return [...featuredEvents, ...historicalAsFeatured];
  }, [featuredEvents, historicalEvents]);

  const formats = useMemo(() => {
    const set = new Set<string>();
    for (const e of allEvents) {
      if (e.format) set.add(e.format);
    }
    return Array.from(set).sort();
  }, [allEvents]);

  const eventTypes = useMemo(() => {
    const set = new Set<string>();
    for (const e of allEvents) {
      if (e.eventType) set.add(e.eventType);
    }
    return Array.from(set).sort();
  }, [allEvents]);

  const filtered = useMemo(() => {
    let result = allEvents.filter((e) =>
      (filterFormat === "all" || e.format === filterFormat) &&
      (filterEventType === "all" || e.eventType === filterEventType)
    );

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((e) => {
        const haystack = [e.name, e.format, e.eventType, e.description]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allEvents, filterFormat, filterEventType, search]);

  // Reset page when filters change
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Reset page on filter/search change
  const resetPage = () => setPage(1);

  if (loading || historicalLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-40 bg-fab-surface rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-fab-surface border border-fab-border rounded-lg p-6 h-40 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center ring-1 ring-inset ring-amber-500/20">
          <TrophyIcon className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-fab-text leading-tight">Tournaments</h1>
          <p className="text-xs text-fab-muted leading-tight">Major event results and top 8 finishes</p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); resetPage(); }}
          placeholder="Search..."
          className="bg-fab-surface border border-fab-border rounded-md px-3 py-1.5 text-fab-text text-sm placeholder:text-fab-dim focus:outline-none focus:border-fab-gold w-36 sm:w-44"
        />
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          {formats.length > 1 && (
            <select
              value={filterFormat}
              onChange={(e) => { setFilterFormat(e.target.value); resetPage(); }}
              className="bg-fab-surface border border-fab-border rounded-md px-3 py-1.5 text-fab-text text-sm outline-none"
            >
              <option value="all">All Formats</option>
              {formats.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          )}
          {eventTypes.length > 1 && (
            <select
              value={filterEventType}
              onChange={(e) => { setFilterEventType(e.target.value); resetPage(); }}
              className="bg-fab-surface border border-fab-border rounded-md px-3 py-1.5 text-fab-text text-sm outline-none"
            >
              <option value="all">All Event Types</option>
              {eventTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-fab-surface border border-fab-border rounded-lg p-8 text-center">
          <p className="text-fab-muted">
            {allEvents.length === 0 ? "No tournaments to display yet." : "No tournaments match the current filters."}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {paged.map((event, i) => (
              <TournamentCard key={`${event.name}-${event.date}-${i}`} event={event} entryMap={entryMap} nameMap={nameMap} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="p-1.5 rounded-lg bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
                .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, i) =>
                  item === "..." ? (
                    <span key={`dots-${i}`} className="text-fab-dim text-sm px-1">...</span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => setPage(item)}
                      className={`min-w-[32px] h-8 rounded-lg text-sm font-medium transition-colors ${
                        item === safePage
                          ? "bg-fab-gold/15 text-fab-gold border border-fab-gold/30"
                          : "bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text"
                      }`}
                    >
                      {item}
                    </button>
                  )
                )}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="p-1.5 rounded-lg bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <span className="text-xs text-fab-dim ml-2">
                {filtered.length} tournament{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
