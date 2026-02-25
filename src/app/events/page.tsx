"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useMatches } from "@/hooks/useMatches";
import { useAuth } from "@/contexts/AuthContext";
import { computeEventStats } from "@/lib/stats";
import { EventCard } from "@/components/events/EventCard";

export default function EventsPage() {
  const { matches, isLoaded } = useMatches();
  const { user } = useAuth();
  const [filterFormat, setFilterFormat] = useState("all");
  const [filterEventType, setFilterEventType] = useState("all");

  const eventStats = useMemo(() => computeEventStats(matches), [matches]);

  const allFormats = useMemo(() => {
    return [...new Set(eventStats.map((e) => e.format))].sort();
  }, [eventStats]);

  const allEventTypes = useMemo(() => {
    return [...new Set(eventStats.map((e) => e.eventType).filter(Boolean))] as string[];
  }, [eventStats]);

  const filtered = useMemo(() => {
    return eventStats.filter((e) => {
      if (filterFormat !== "all" && e.format !== filterFormat) return false;
      if (filterEventType !== "all" && e.eventType !== filterEventType) return false;
      return true;
    });
  }, [eventStats, filterFormat, filterEventType]);

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
        <div className="flex gap-3 flex-wrap">
          {allFormats.length > 1 && (
            <select
              value={filterFormat}
              onChange={(e) => setFilterFormat(e.target.value)}
              className="bg-fab-surface border border-fab-border text-fab-text text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-fab-gold"
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
              className="bg-fab-surface border border-fab-border text-fab-text text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-fab-gold"
            >
              <option value="all">All Event Types</option>
              {allEventTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          )}
        </div>
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
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-fab-dim">{filtered.length} event{filtered.length !== 1 ? "s" : ""}</p>
          {filtered.map((event) => (
            <EventCard key={`${event.eventName}-${event.eventDate}`} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
