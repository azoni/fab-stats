"use client";
import { useMemo, useState } from "react";
import { useFeaturedEvents } from "@/hooks/useFeaturedEvents";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { TournamentCard } from "@/components/home/TournamentCard";

export default function TournamentsPage() {
  const events = useFeaturedEvents();
  const { entries: lbEntries, loading } = useLeaderboard();
  const [filterFormat, setFilterFormat] = useState("all");
  const [filterEventType, setFilterEventType] = useState("all");
  const [search, setSearch] = useState("");

  const entryMap = useMemo(() => new Map(lbEntries.map((e) => [e.username, e])), [lbEntries]);

  const formats = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) {
      if (e.format) set.add(e.format);
    }
    return Array.from(set).sort();
  }, [events]);

  const eventTypes = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) {
      if (e.eventType) set.add(e.eventType);
    }
    return Array.from(set).sort();
  }, [events]);

  const filtered = useMemo(() => {
    let result = events.filter((e) =>
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

    return result;
  }, [events, filterFormat, filterEventType, search]);

  if (loading) {
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
      <div>
        <h1 className="text-2xl font-bold text-fab-gold">Tournaments</h1>
        <p className="text-fab-muted text-sm mt-1">Community tournaments and results</p>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="bg-fab-surface border border-fab-border rounded-md px-3 py-1.5 text-fab-text text-sm placeholder:text-fab-dim focus:outline-none focus:border-fab-gold w-36 sm:w-44"
        />
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          {formats.length > 1 && (
            <select
              value={filterFormat}
              onChange={(e) => setFilterFormat(e.target.value)}
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
              onChange={(e) => setFilterEventType(e.target.value)}
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
            {events.length === 0 ? "No tournaments to display yet." : "No tournaments match the current filters."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((event, i) => (
            <TournamentCard key={`${event.name}-${i}`} event={event} entryMap={entryMap} />
          ))}
        </div>
      )}
    </div>
  );
}
