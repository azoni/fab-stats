"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useFeaturedEvents } from "@/hooks/useFeaturedEvents";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { TournamentCard } from "@/components/home/TournamentCard";

export default function TournamentsPage() {
  const events = useFeaturedEvents();
  const { entries: lbEntries, loading } = useLeaderboard();
  const [filterFormat, setFilterFormat] = useState("all");
  const [filterEventType, setFilterEventType] = useState("all");

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

  const filtered = useMemo(
    () => events.filter((e) =>
      (filterFormat === "all" || e.format === filterFormat) &&
      (filterEventType === "all" || e.eventType === filterEventType)
    ),
    [events, filterFormat, filterEventType],
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-fab-surface border border-fab-border rounded-lg p-6 h-40 animate-pulse" />
        <div className="bg-fab-surface border border-fab-border rounded-lg p-6 h-40 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-fab-text">Tournaments</h1>
        <Link href="/" className="text-sm text-fab-gold hover:text-fab-gold-light transition-colors">
          &larr; Home
        </Link>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        {formats.length > 0 && (
          <>
            <button
              onClick={() => setFilterFormat("all")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filterFormat === "all"
                  ? "bg-fab-gold text-fab-bg"
                  : "bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text"
              }`}
            >
              All Formats
            </button>
            {formats.map((f) => (
              <button
                key={f}
                onClick={() => setFilterFormat(f)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  filterFormat === f
                    ? "bg-fab-gold text-fab-bg"
                    : "bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text"
                }`}
              >
                {f}
              </button>
            ))}
          </>
        )}
        {eventTypes.length > 0 && (
          <>
            {formats.length > 0 && <div className="w-px h-6 bg-fab-border self-center" />}
            <button
              onClick={() => setFilterEventType("all")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filterEventType === "all"
                  ? "bg-fab-gold text-fab-bg"
                  : "bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text"
              }`}
            >
              All Events
            </button>
            {eventTypes.map((et) => (
              <button
                key={et}
                onClick={() => setFilterEventType(et)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  filterEventType === et
                    ? "bg-fab-gold text-fab-bg"
                    : "bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text"
                }`}
              >
                {et}
              </button>
            ))}
          </>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-fab-surface border border-fab-border rounded-lg p-8 text-center">
          <p className="text-fab-muted">
            {events.length === 0 ? "No tournaments to display yet." : "No tournaments match this filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((event, i) => (
            <TournamentCard key={`${event.name}-${i}`} event={event} entryMap={entryMap} fullImage />
          ))}
        </div>
      )}
    </div>
  );
}
