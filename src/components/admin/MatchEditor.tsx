"use client";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { getProfileByUsername, getMatchesByUserId, updateMatchFirestore } from "@/lib/firestore-storage";
import type { MatchRecord } from "@/types";

/** Admin-only tool: look up any player and fix a match's venue (or clear it).
 *  Uses the admin read/update rules on users/{uid}/matches. Handy for repairing
 *  imports where a venue was mis-parsed or dropped. */
export function MatchEditor() {
  const [username, setUsername] = useState("");
  const [uid, setUid] = useState<string | null>(null);
  const [loadedName, setLoadedName] = useState("");
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

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
      // Newest first.
      setMatches([...ms].sort((a, b) => (b.date || "").localeCompare(a.date || "")));
      setDrafts({});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load matches.");
    } finally {
      setLoading(false);
    }
  }

  async function saveVenue(m: MatchRecord) {
    if (!uid) return;
    const v = (drafts[m.id] ?? m.venue ?? "").trim();
    setSavingId(m.id);
    try {
      await updateMatchFirestore(uid, m.id, { venue: v || undefined });
      setMatches((prev) => prev.map((x) => (x.id === m.id ? { ...x, venue: v || undefined } : x)));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[m.id];
        return next;
      });
      toast.success(v ? `Venue set to "${v}".` : "Venue cleared.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSavingId(null);
    }
  }

  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return matches;
    return matches.filter(
      (m) =>
        (m.notes || "").toLowerCase().includes(q) ||
        (m.date || "").includes(q) ||
        (m.venue || "").toLowerCase().includes(q) ||
        (m.opponentName || "").toLowerCase().includes(q),
    );
  }, [matches, filter]);

  return (
    <div className="rounded-lg border border-fab-border bg-fab-surface p-4">
      <h3 className="text-sm font-bold text-fab-text">Match editor</h3>
      <p className="mt-0.5 text-xs text-fab-muted">
        Look up a player and repair a match&apos;s venue (fixes mis-parsed/dropped imports so league
        store matching works). Admin-only.
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
          {loading ? "Loading…" : "Load matches"}
        </button>
      </div>

      {uid && (
        <div className="mt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-fab-muted">
              Editing <span className="font-bold text-fab-text">{loadedName}</span> · {matches.length} matches
            </p>
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by event / date / venue…"
              className="min-w-[180px] rounded-md border border-fab-border bg-fab-bg px-3 py-1.5 text-xs text-fab-text placeholder:text-fab-dim focus:border-fab-gold/60 focus:outline-none"
            />
          </div>

          <div className="mt-2 max-h-[420px] space-y-1.5 overflow-y-auto pr-1">
            {shown.slice(0, 150).map((m) => {
              const draft = drafts[m.id] ?? m.venue ?? "";
              const dirty = draft.trim() !== (m.venue ?? "").trim();
              return (
                <div key={m.id} className="flex flex-wrap items-center gap-2 rounded-md border border-fab-border/60 bg-fab-bg/50 px-2.5 py-1.5">
                  <div className="min-w-[200px] flex-1 text-xs">
                    <span className="font-bold text-fab-text">{m.date}</span>
                    <span className="text-fab-dim"> · {(m.notes || "").split(" | ")[0] || "—"} · {m.result}</span>
                    {!m.venue && <span className="ml-1 rounded bg-rose-500/15 px-1 text-[10px] font-bold text-rose-300">no venue</span>}
                  </div>
                  <input
                    value={draft}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [m.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && saveVenue(m)}
                    placeholder="venue"
                    className="w-40 rounded-md border border-fab-border bg-fab-bg px-2 py-1 text-xs text-fab-text placeholder:text-fab-dim focus:border-fab-gold/60 focus:outline-none"
                  />
                  <button
                    onClick={() => saveVenue(m)}
                    disabled={savingId === m.id || !dirty}
                    className="rounded-md border border-fab-border bg-fab-bg px-2.5 py-1 text-[11px] font-bold text-fab-text hover:border-fab-gold/40 hover:text-fab-gold disabled:opacity-40"
                  >
                    {savingId === m.id ? "…" : "Save"}
                  </button>
                </div>
              );
            })}
            {shown.length > 150 && (
              <p className="py-1 text-center text-[11px] text-fab-dim">Showing 150 of {shown.length} — filter to narrow.</p>
            )}
            {shown.length === 0 && <p className="py-2 text-center text-xs text-fab-dim">No matches for that filter.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
