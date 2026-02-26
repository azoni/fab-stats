"use client";
import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useMatches } from "@/hooks/useMatches";
import { useAuth } from "@/contexts/AuthContext";
import { computeEventStats } from "@/lib/stats";
import { EventCard } from "@/components/events/EventCard";
import { QuickEventImportModal } from "@/components/events/QuickEventImportModal";

type View = "timeline" | "standings";
const PAGE_SIZE = 25;

export default function EventsPage() {
  const { matches, isLoaded, refreshMatches } = useMatches();
  const { user } = useAuth();
  const [filterFormat, setFilterFormat] = useState("all");
  const [filterEventType, setFilterEventType] = useState("all");
  const [view, setView] = useState<View>("timeline");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Reset to page 1 when filters/search change
  useEffect(() => {
    setPage(1);
  }, [filterFormat, filterEventType, search]);

  const eventStats = useMemo(() => computeEventStats(matches), [matches]);

  const allFormats = useMemo(() => {
    return [...new Set(eventStats.map((e) => e.format))].sort();
  }, [eventStats]);

  const allEventTypes = useMemo(() => {
    return [...new Set(eventStats.map((e) => e.eventType).filter(Boolean))] as string[];
  }, [eventStats]);

  const filtered = useMemo(() => {
    let result = eventStats;

    if (filterFormat !== "all") {
      result = result.filter((e) => e.format === filterFormat);
    }
    if (filterEventType !== "all") {
      result = result.filter((e) => e.eventType === filterEventType);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((e) => {
        const haystack = [
          e.eventName,
          e.venue,
          e.format,
          e.eventType,
          e.eventDate,
          ...e.matches.map((m) => m.opponentName),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    return result;
  }, [eventStats, filterFormat, filterEventType, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const pageEvents = filtered.slice(startIdx, startIdx + PAGE_SIZE);

  if (!isLoaded) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 bg-fab-surface rounded animate-pulse" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-fab-surface border border-fab-border rounded-lg p-4 h-20 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-fab-gold">Events</h1>
          <p className="text-fab-muted text-sm mt-1">Your tournaments and their results, grouped by event</p>
        </div>
        <div className="flex gap-3 flex-wrap items-center">
          {/* View toggle */}
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

      {/* Search */}
      <div className="mb-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search events..."
          className="w-full bg-fab-surface border border-fab-border rounded-lg px-3 py-2 text-fab-text text-sm placeholder:text-fab-dim focus:outline-none focus:border-fab-gold"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {allFormats.length > 1 && (
          <select
            value={filterFormat}
            onChange={(e) => setFilterFormat(e.target.value)}
            className="bg-fab-surface border border-fab-border rounded-md px-3 py-1.5 text-fab-text text-sm outline-none"
          >
            <option value="all">All Formats</option>
            {allFormats.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        )}
        {allEventTypes.length > 1 && (
          <select
            value={filterEventType}
            onChange={(e) => setFilterEventType(e.target.value)}
            className="bg-fab-surface border border-fab-border rounded-md px-3 py-1.5 text-fab-text text-sm outline-none"
          >
            <option value="all">All Event Types</option>
            {allEventTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        )}
      </div>

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
          <p className="text-xs text-fab-dim mb-2">
            Showing {startIdx + 1}-{Math.min(startIdx + PAGE_SIZE, filtered.length)} of {filtered.length} event{filtered.length !== 1 ? "s" : ""}
          </p>
          <div className="space-y-2">
            {pageEvents.map((event) => (
              <EventCard key={`${event.eventName}-${event.eventDate}`} event={event} />
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="text-xs text-fab-dim mb-2">
            Showing {startIdx + 1}-{Math.min(startIdx + PAGE_SIZE, filtered.length)} of {filtered.length} event{filtered.length !== 1 ? "s" : ""}
          </p>
          <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-fab-muted border-b border-fab-border">
                  <th className="text-left px-4 py-3 font-medium">Event</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Date</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Format</th>
                  <th className="text-right px-4 py-3 font-medium">Record</th>
                  <th className="text-right px-4 py-3 font-medium">Win %</th>
                </tr>
              </thead>
              <tbody>
                {pageEvents.map((event) => (
                  <tr key={`${event.eventName}-${event.eventDate}`} className="border-t border-fab-border/50 hover:bg-fab-surface-hover transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-fab-text truncate max-w-[200px]">{event.eventName}</div>
                      <div className="text-xs text-fab-dim sm:hidden">{new Date(event.eventDate).toLocaleDateString()}</div>
                      {event.venue && event.venue !== "Unknown" && (
                        <div className="text-xs text-fab-dim truncate max-w-[200px]">{event.venue}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-fab-dim hidden sm:table-cell whitespace-nowrap">
                      {new Date(event.eventDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="px-2 py-0.5 rounded bg-fab-bg text-fab-dim text-xs">{event.format}</span>
                    </td>
                    <td className={`px-4 py-3 text-right font-bold ${event.wins > event.losses ? "text-fab-win" : event.wins < event.losses ? "text-fab-loss" : "text-fab-draw"}`}>
                      {event.wins}-{event.losses}{event.draws > 0 ? `-${event.draws}` : ""}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${event.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
                      {event.winRate.toFixed(0)}%
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
