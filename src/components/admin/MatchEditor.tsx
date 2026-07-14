"use client";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { getProfileByUsername, getMatchesByUserId, batchUpdateMatchesFirestore } from "@/lib/firestore-storage";
import type { MatchRecord } from "@/types";

/** Admin-only tool: look up a player and fix a venue for a whole EVENT (all its
 *  rounds at once). Venue is an event-level thing, so we group matches by event.
 *  Uses admin read/update rules on users/{uid}/matches. */
interface EventGroup {
  key: string;
  eventName: string;
  date: string;
  matchIds: string[];
  venue: string; // representative current venue ("" if none)
  mixed: boolean;
}

export function MatchEditor() {
  const [username, setUsername] = useState("");
  const [uid, setUid] = useState<string | null>(null);
  const [loadedName, setLoadedName] = useState("");
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  async function load() {
    const uname = username.trim().toLowerCase();
    if (!uname) return;
    setLoading(true);
    try {
      const profile = await getProfileByUsername(uname);
      if (!profile) {
        toast.error("No such username.");
        setUid(null);
        setMatches([]);
        return;
      }
      const ms = await getMatchesByUserId(profile.uid);
      setUid(profile.uid);
      setLoadedName(profile.displayName || profile.username);
      setMatches(ms);
      setDrafts({});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load matches.");
    } finally {
      setLoading(false);
    }
  }

  const events = useMemo<EventGroup[]>(() => {
    const map = new Map<string, { eventName: string; date: string; matchIds: string[]; venues: Set<string> }>();
    for (const m of matches) {
      const eventName = (m.notes || "").split(" | ")[0].trim() || "(no event)";
      const date = (m.date || "").slice(0, 10);
      const key = `${date}__${eventName}`;
      let g = map.get(key);
      if (!g) {
        g = { eventName, date, matchIds: [], venues: new Set() };
        map.set(key, g);
      }
      g.matchIds.push(m.id);
      g.venues.add((m.venue || "").trim());
    }
    return [...map.values()]
      .map((g) => {
        const nonEmpty = [...g.venues].filter(Boolean);
        const mixed = g.venues.size > 1;
        return {
          key: `${g.date}__${g.eventName}`,
          eventName: g.eventName,
          date: g.date,
          matchIds: g.matchIds,
          venue: nonEmpty[0] || "",
          mixed,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [matches]);

  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return events;
    return events.filter(
      (e) => e.eventName.toLowerCase().includes(q) || e.date.includes(q) || e.venue.toLowerCase().includes(q),
    );
  }, [events, filter]);

  async function saveVenue(e: EventGroup) {
    if (!uid) return;
    const v = (drafts[e.key] ?? e.venue).trim();
    setSavingKey(e.key);
    try {
      await batchUpdateMatchesFirestore(uid, e.matchIds, { venue: v || undefined });
      setMatches((prev) => prev.map((m) => (e.matchIds.includes(m.id) ? { ...m, venue: v || undefined } : m)));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[e.key];
        return next;
      });
      toast.success(
        v
          ? `Set venue "${v}" on ${e.matchIds.length} match${e.matchIds.length === 1 ? "" : "es"}.`
          : `Cleared venue on ${e.matchIds.length} match${e.matchIds.length === 1 ? "" : "es"}.`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="rounded-lg border border-fab-border bg-fab-surface p-4">
      <h3 className="text-sm font-bold text-fab-text">Match editor</h3>
      <p className="mt-0.5 text-xs text-fab-muted">
        Look up a player and repair a venue for a whole event (all its rounds at once) — fixes
        mis-parsed/dropped imports so league store matching works. Admin-only.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder="username (e.g. seront)"
          className="min-w-[180px] flex-1 rounded-md border border-fab-border bg-fab-bg px-3 py-1.5 text-sm text-fab-text placeholder:text-fab-dim focus:border-fab-gold/60 focus:outline-none"
        />
        <button
          onClick={load}
          disabled={loading || !username.trim()}
          className="rounded-md border border-fab-border bg-fab-bg px-3 py-1.5 text-xs font-bold text-fab-text hover:border-fab-gold/40 hover:text-fab-gold disabled:opacity-50"
        >
          {loading ? "Loading…" : "Load events"}
        </button>
      </div>

      {uid && (
        <div className="mt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-fab-muted">
              Editing <span className="font-bold text-fab-text">{loadedName}</span> · {events.length} events ·{" "}
              {matches.length} matches
            </p>
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by event / date / venue…"
              className="min-w-[180px] rounded-md border border-fab-border bg-fab-bg px-3 py-1.5 text-xs text-fab-text placeholder:text-fab-dim focus:border-fab-gold/60 focus:outline-none"
            />
          </div>

          <div className="mt-2 max-h-[440px] space-y-1.5 overflow-y-auto pr-1">
            {shown.slice(0, 200).map((e) => {
              const draft = drafts[e.key] ?? e.venue;
              const dirty = draft.trim() !== e.venue.trim();
              return (
                <div key={e.key} className="flex flex-wrap items-center gap-2 rounded-md border border-fab-border/60 bg-fab-bg/50 px-2.5 py-1.5">
                  <div className="min-w-[220px] flex-1 text-xs">
                    <span className="font-bold text-fab-text">{e.eventName}</span>
                    <span className="text-fab-dim"> · {e.date} · {e.matchIds.length} match{e.matchIds.length === 1 ? "" : "es"}</span>
                    {!e.venue && <span className="ml-1 rounded bg-rose-500/15 px-1 text-[10px] font-bold text-rose-300">no venue</span>}
                    {e.mixed && <span className="ml-1 rounded bg-amber-500/15 px-1 text-[10px] font-bold text-amber-300">mixed venues</span>}
                  </div>
                  <input
                    value={draft}
                    onChange={(ev) => setDrafts((prev) => ({ ...prev, [e.key]: ev.target.value }))}
                    onKeyDown={(ev) => ev.key === "Enter" && saveVenue(e)}
                    placeholder="venue"
                    className="w-44 rounded-md border border-fab-border bg-fab-bg px-2 py-1 text-xs text-fab-text placeholder:text-fab-dim focus:border-fab-gold/60 focus:outline-none"
                  />
                  <button
                    onClick={() => saveVenue(e)}
                    disabled={savingKey === e.key || !dirty}
                    className="rounded-md border border-fab-border bg-fab-bg px-2.5 py-1 text-[11px] font-bold text-fab-text hover:border-fab-gold/40 hover:text-fab-gold disabled:opacity-40"
                  >
                    {savingKey === e.key ? "…" : "Save"}
                  </button>
                </div>
              );
            })}
            {shown.length > 200 && (
              <p className="py-1 text-center text-[11px] text-fab-dim">Showing 200 of {shown.length} — filter to narrow.</p>
            )}
            {shown.length === 0 && <p className="py-2 text-center text-xs text-fab-dim">No events for that filter.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
