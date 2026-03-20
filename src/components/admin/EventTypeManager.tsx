"use client";

import { useState } from "react";
import Link from "next/link";
import { searchUsernames } from "@/lib/firestore-storage";
import { adminGetUserEvents, adminOverrideEventType, adminResyncLeaderboard, type AdminEventSummary } from "@/lib/admin";

const EVENT_TYPES = [
  "Other", "Armory", "Pre-Release", "On Demand", "Skirmish",
  "Road to Nationals", "ProQuest", "Battle Hardened", "The Calling",
  "Nationals", "Pro Tour", "Worlds", "Championship",
];

export function EventTypeManager() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<{ username: string; userId: string }[]>([]);
  const [selectedUser, setSelectedUser] = useState<{ username: string; userId: string } | null>(null);
  const [events, setEvents] = useState<AdminEventSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [resyncing, setResyncing] = useState(false);
  const [resyncResult, setResyncResult] = useState("");

  async function searchUsers(val: string) {
    setQuery(val);
    if (val.trim().length < 2) { setSuggestions([]); return; }
    const results = await searchUsernames(val.trim(), 5);
    setSuggestions(results);
  }

  async function loadEvents(user: { username: string; userId: string }) {
    setSelectedUser(user);
    setSuggestions([]);
    setQuery(user.username);
    setLoading(true);
    try {
      const result = await adminGetUserEvents(user.userId);
      setEvents(result);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  async function overrideType(event: AdminEventSummary, newType: string) {
    if (!selectedUser) return;
    setSaving(event.eventName + event.eventDate);
    try {
      await adminOverrideEventType(selectedUser.userId, event.matchIds, newType);
      setEvents((prev) =>
        prev.map((e) =>
          e.eventName === event.eventName && e.eventDate === event.eventDate
            ? { ...e, eventType: newType, hasOverride: true }
            : e
        )
      );
    } catch {
      // silent fail
    } finally {
      setSaving(null);
    }
  }

  const filtered = filter
    ? events.filter((e) => e.eventType === filter)
    : events;

  return (
    <div className="border-t border-fab-border pt-3 mt-3">
      <h3 className="text-sm font-semibold text-fab-text mb-2">Event Type Manager</h3>

      {/* User search */}
      <div className="relative mb-3">
        <input
          type="text"
          value={query}
          onChange={(e) => searchUsers(e.target.value)}
          placeholder="Search username..."
          className="w-full px-3 py-1.5 rounded-lg text-sm bg-fab-bg border border-fab-border text-fab-text placeholder:text-fab-dim focus:outline-none focus:border-fab-gold/50"
        />
        {suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-fab-surface border border-fab-border rounded-lg shadow-xl z-50 overflow-hidden">
            {suggestions.map((s) => (
              <button
                key={s.userId}
                onClick={() => loadEvents(s)}
                className="block w-full text-left px-3 py-2 text-sm text-fab-text hover:bg-fab-surface-hover transition-colors"
              >
                {s.username}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && <p className="text-xs text-fab-dim animate-pulse">Loading events...</p>}

      {selectedUser && !loading && events.length > 0 && (
        <>
          {/* User actions */}
          <div className="flex items-center gap-2 mb-2">
            <Link
              href={`/player/${selectedUser.username}`}
              target="_blank"
              className="px-2.5 py-1 rounded text-xs font-medium bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text transition-colors"
            >
              View Profile
            </Link>
            <button
              onClick={async () => {
                if (!selectedUser) return;
                setResyncing(true);
                setResyncResult("");
                try {
                  await adminResyncLeaderboard(selectedUser.userId);
                  setResyncResult("Leaderboard re-synced");
                } catch {
                  setResyncResult("Re-sync failed");
                } finally {
                  setResyncing(false);
                }
              }}
              disabled={resyncing}
              className="px-2.5 py-1 rounded text-xs font-medium bg-fab-gold/15 text-fab-gold hover:bg-fab-gold/25 transition-colors disabled:opacity-50"
            >
              {resyncing ? "Syncing..." : "Re-sync Leaderboard"}
            </button>
            {resyncResult && <span className="text-xs text-fab-dim">{resyncResult}</span>}
          </div>
          <div className="flex flex-wrap items-center gap-1 mb-2">
            <button
              onClick={() => setFilter("")}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${!filter ? "bg-fab-gold/15 text-fab-gold" : "text-fab-dim hover:text-fab-text"}`}
            >
              All ({events.length})
            </button>
            {[...new Set(events.map((e) => e.eventType))].sort().map((t) => (
              <button
                key={t}
                onClick={() => setFilter(filter === t ? "" : t)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${filter === t ? "bg-fab-gold/15 text-fab-gold" : "text-fab-dim hover:text-fab-text"}`}
              >
                {t} ({events.filter((e) => e.eventType === t).length})
              </button>
            ))}
          </div>

          {/* Event list */}
          <div className="space-y-1 max-h-[400px] overflow-auto">
            {filtered.map((event) => (
              <div
                key={event.eventName + event.eventDate}
                className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs ${event.hasOverride ? "bg-fab-gold/5 border border-fab-gold/20" : "bg-fab-bg"}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-fab-text truncate" title={event.eventName}>{event.eventName}</p>
                  <p className="text-fab-dim">{event.eventDate} · {event.matchCount} matches</p>
                </div>
                <select
                  value={event.eventType}
                  onChange={(e) => overrideType(event, e.target.value)}
                  disabled={saving === event.eventName + event.eventDate}
                  className="px-2 py-1 rounded text-[11px] bg-fab-surface border border-fab-border text-fab-text focus:outline-none focus:border-fab-gold/50"
                >
                  {EVENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </>
      )}

      {selectedUser && !loading && events.length === 0 && (
        <p className="text-xs text-fab-dim">No events found for {selectedUser.username}.</p>
      )}
    </div>
  );
}
