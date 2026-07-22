"use client";
/**
 * Optional per-store date schedule for a league. When the organizer adds sessions,
 * a match counts only if its (store, date) is on the schedule (see
 * matchQualifiesForLeague). Stores come from the league's selected stores; the
 * "Generate weekly" helper builds a rotating circuit (e.g. 1 armory/week cycling
 * through stores) in one click.
 */
import { useMemo, useState } from "react";
import type { LeagueSession } from "@/types";

interface StoreOption {
  slug: string;
  name: string;
}

function fmtDate(iso: string): string {
  const p = iso.split("-");
  if (p.length !== 3) return iso;
  const mo = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+p[1] - 1];
  return mo ? `${mo} ${+p[2]}, ${p[0]}` : iso;
}

/** Add `weeks` to a YYYY-MM-DD date (UTC-safe, no timezone drift). */
function addWeeks(iso: string, weeks: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + weeks * 7));
  return dt.toISOString().slice(0, 10);
}

function dedupeSort(sessions: LeagueSession[]): LeagueSession[] {
  const seen = new Set<string>();
  const out: LeagueSession[] = [];
  for (const s of sessions) {
    if (!s.storeSlug || !/^\d{4}-\d{2}-\d{2}$/.test(s.date)) continue;
    const key = `${s.storeSlug}|${s.date}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.storeSlug.localeCompare(b.storeSlug)));
}

export function LeagueScheduleBuilder({
  sessions,
  onChange,
  stores,
}: {
  sessions: LeagueSession[];
  onChange: (sessions: LeagueSession[]) => void;
  stores: StoreOption[];
}) {
  const nameBySlug = useMemo(() => {
    const m: Record<string, string> = {};
    for (const s of stores) m[s.slug] = s.name;
    return m;
  }, [stores]);

  const [addStore, setAddStore] = useState("");
  const [addDate, setAddDate] = useState("");
  const [genStart, setGenStart] = useState("");
  const [genWeeks, setGenWeeks] = useState(10);
  const [genEveryStore, setGenEveryStore] = useState(false);

  const sorted = useMemo(() => dedupeSort(sessions), [sessions]);

  function addOne() {
    if (!addStore || !/^\d{4}-\d{2}-\d{2}$/.test(addDate)) return;
    onChange(dedupeSort([...sessions, { storeSlug: addStore, date: addDate }]));
    setAddDate("");
  }
  function remove(s: LeagueSession) {
    onChange(sessions.filter((x) => !(x.storeSlug === s.storeSlug && x.date === s.date)));
  }
  function generate() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(genStart) || stores.length === 0) return;
    const weeks = Math.max(1, Math.min(52, genWeeks || 0));
    const next: LeagueSession[] = [];
    for (let w = 0; w < weeks; w++) {
      const date = addWeeks(genStart, w);
      if (genEveryStore) {
        for (const st of stores) next.push({ storeSlug: st.slug, date });
      } else {
        // Rotate: one store per week, cycling through the selected stores.
        next.push({ storeSlug: stores[w % stores.length].slug, date });
      }
    }
    onChange(dedupeSort([...sessions, ...next]));
  }

  const disabled = stores.length === 0;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs text-fab-dim">
          Optional. Add specific dates per store and matches count only on those days. Leave empty to
          count any match at a league store within the date range.
        </p>
      </div>

      {disabled ? (
        <p className="text-xs text-fab-muted italic">Add at least one store above to schedule dates.</p>
      ) : (
        <>
          {/* Manual add */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={addStore}
              onChange={(e) => setAddStore(e.target.value)}
              className="min-w-0 flex-1 bg-fab-bg border border-fab-border rounded-md px-2 py-1.5 text-sm text-fab-text focus:outline-none focus:border-fab-gold"
            >
              <option value="">Store…</option>
              {stores.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={addDate}
              onChange={(e) => setAddDate(e.target.value)}
              className="bg-fab-bg border border-fab-border rounded-md px-2 py-1.5 text-sm text-fab-text focus:outline-none focus:border-fab-gold [color-scheme:dark]"
            />
            <button
              type="button"
              onClick={addOne}
              disabled={!addStore || !addDate}
              className="px-3 py-1.5 rounded-md text-sm font-semibold bg-fab-surface border border-fab-border text-fab-text hover:bg-fab-surface-hover disabled:opacity-40"
            >
              Add
            </button>
          </div>

          {/* Weekly generator */}
          <div className="rounded-lg border border-fab-border bg-fab-bg/40 p-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-fab-dim mb-2">Generate weekly</p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs text-fab-muted">From</label>
              <input
                type="date"
                value={genStart}
                onChange={(e) => setGenStart(e.target.value)}
                className="bg-fab-bg border border-fab-border rounded-md px-2 py-1.5 text-sm text-fab-text focus:outline-none focus:border-fab-gold [color-scheme:dark]"
              />
              <label className="text-xs text-fab-muted">for</label>
              <input
                type="number"
                min={1}
                max={52}
                value={genWeeks}
                onChange={(e) => setGenWeeks(parseInt(e.target.value) || 0)}
                className="w-14 bg-fab-bg border border-fab-border rounded-md px-2 py-1.5 text-sm text-fab-text text-center focus:outline-none focus:border-fab-gold"
              />
              <label className="text-xs text-fab-muted">weeks</label>
              <button
                type="button"
                onClick={generate}
                disabled={!genStart}
                className="px-3 py-1.5 rounded-md text-sm font-semibold bg-fab-gold/90 text-fab-bg hover:bg-fab-gold disabled:opacity-40"
              >
                Generate
              </button>
            </div>
            <label className="mt-2 flex items-center gap-2 text-xs text-fab-muted cursor-pointer select-none">
              <input type="checkbox" checked={genEveryStore} onChange={(e) => setGenEveryStore(e.target.checked)} className="accent-fab-gold" />
              {genEveryStore ? "Every store, each week" : "One store per week (rotate through stores)"}
            </label>
          </div>

          {/* Session list */}
          {sorted.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-fab-muted">{sorted.length} session{sorted.length === 1 ? "" : "s"} scheduled</p>
                <button type="button" onClick={() => onChange([])} className="text-xs text-fab-loss hover:underline">
                  Clear all
                </button>
              </div>
              <div className="max-h-56 overflow-y-auto rounded-lg border border-fab-border divide-y divide-fab-border">
                {sorted.map((s) => (
                  <div key={`${s.storeSlug}|${s.date}`} className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-sm">
                    <span className="min-w-0 truncate text-fab-text">{nameBySlug[s.storeSlug] || s.storeSlug}</span>
                    <span className="shrink-0 text-fab-dim tabular-nums">{fmtDate(s.date)}</span>
                    <button type="button" onClick={() => remove(s)} className="shrink-0 text-fab-dim hover:text-fab-loss" aria-label="Remove session">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
