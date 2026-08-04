"use client";
/**
 * Organizer modal to close the current league season and roll into a fresh one.
 * Freezes the current standings into the league's history (leagues/{id}/seasons),
 * keeps the same members + stores + URL, and starts the new season.
 *
 * The new season counts matches one of two mutually-exclusive ways, picked with a
 * toggle so it's never ambiguous which one applies:
 *   - "Date range": any match at a league store between Start and End counts.
 *   - "Scheduled dates": only matches at a store on a scheduled date count; the
 *     window is derived from the schedule (see startNewSeason / updateLeague).
 */
import { useState } from "react";
import { toast } from "sonner";
import type { League, LeagueSession, LeagueSeasonRecap } from "@/types";
import { startNewSeason } from "@/lib/leagues-scoring";
import { deriveFromSessions } from "@/lib/leagues";
import { LeagueScheduleBuilder } from "./LeagueScheduleBuilder";

function fmtDate(iso: string): string {
  const p = iso.split("-");
  if (p.length !== 3) return iso;
  const mo = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+p[1] - 1];
  return mo ? `${mo} ${+p[2]}, ${p[0]}` : iso;
}

export function NewSeasonModal({
  league,
  stores,
  recap,
  onClose,
  onDone,
}: {
  league: League;
  stores: { slug: string; name: string }[];
  /** Recap snapshot of the CLOSING season, built by the page from its live pool.
   *  Archived alongside the frozen standings so past recaps stay rich. */
  recap?: LeagueSeasonRecap;
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  // Default the new season to whichever style the current one used.
  const [mode, setMode] = useState<"range" | "schedule">(league.sessions?.length ? "schedule" : "range");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sessions, setSessions] = useState<LeagueSession[]>([]);
  const [busy, setBusy] = useState(false);

  const derived = mode === "schedule" ? deriveFromSessions(sessions) : null;

  async function submit() {
    if (mode === "schedule") {
      if (sessions.length === 0) {
        toast.error("Add at least one scheduled date, or switch to a date range.");
        return;
      }
    } else {
      if (!startDate || !endDate) {
        toast.error("Set the new season's start and end dates.");
        return;
      }
      if (startDate > endDate) {
        toast.error("End date must be after start date.");
        return;
      }
    }
    if (!confirm("Start a new season? The current standings are archived to this league's history and a fresh season begins.")) {
      return;
    }
    setBusy(true);
    try {
      const n = await startNewSeason(league.id, {
        name: name.trim() || undefined,
        // Schedule mode derives the window from the sessions; passing empty dates is
        // fine (updateLeague overwrites them). Range mode passes an empty schedule so
        // any leftover schedule from the previous season is cleared.
        startDate,
        endDate,
        sessions: mode === "schedule" ? sessions : [],
        recap,
      });
      toast.success(`Season ${n} started — previous standings archived.`);
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start new season.");
    }
    setBusy(false);
  }

  const segCls = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm font-bold transition-all ${
      active
        ? "bg-fab-surface text-fab-gold ring-1 ring-inset ring-fab-gold/25"
        : "text-fab-dim hover:text-fab-text"
    }`;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-fab-border bg-fab-bg p-5 shadow-2xl">
        <h3 className="mb-1 text-lg font-bold text-fab-gold">Start new season</h3>
        <p className="mb-4 text-xs text-fab-dim">
          Freezes the current standings into this league&apos;s history, then starts a fresh season with the
          same members and stores.
        </p>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-fab-muted">Season name (optional)</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`Season ${(league.seasonNumber || 1) + 1}`}
              className="w-full rounded-md border border-fab-border bg-fab-bg px-2 py-1.5 text-sm text-fab-text focus:border-fab-gold focus:outline-none"
            />
          </div>

          {/* Mode toggle — the two ways to count matches are mutually exclusive, so
              only one set of inputs shows at a time (no "do I fill both?"). */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-fab-muted">How matches count</label>
            <div className="inline-flex rounded-lg bg-fab-bg p-1 ring-1 ring-inset ring-fab-border/60">
              <button type="button" onClick={() => setMode("range")} className={segCls(mode === "range")}>
                Date range
              </button>
              <button type="button" onClick={() => setMode("schedule")} className={segCls(mode === "schedule")}>
                Scheduled dates
              </button>
            </div>
          </div>

          {mode === "range" ? (
            <div className="space-y-2">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-semibold text-fab-muted">Start</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-md border border-fab-border bg-fab-bg px-2 py-1.5 text-sm text-fab-text focus:border-fab-gold focus:outline-none [color-scheme:dark]"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-semibold text-fab-muted">End</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-md border border-fab-border bg-fab-bg px-2 py-1.5 text-sm text-fab-text focus:border-fab-gold focus:outline-none [color-scheme:dark]"
                  />
                </div>
              </div>
              <p className="text-xs text-fab-dim">
                Any match at a league store between these dates counts toward the season.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-fab-dim">
                Only matches at a store on a scheduled date count. The season runs from the first scheduled
                date to the last.
              </p>
              <LeagueScheduleBuilder sessions={sessions} onChange={setSessions} stores={stores} hideIntro />
              {derived && (
                <p className="text-[11px] text-fab-dim">
                  Runs {fmtDate(derived.startDate)} → {fmtDate(derived.endDate)} · {derived.storeSlugs.length}{" "}
                  {derived.storeSlugs.length === 1 ? "store" : "stores"}.
                </p>
              )}
            </div>
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-fab-border px-3 py-1.5 text-sm text-fab-text">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="rounded-md bg-fab-gold px-3 py-1.5 text-sm font-bold text-black hover:bg-fab-gold/80 disabled:opacity-50"
          >
            {busy ? "Starting…" : "Start season"}
          </button>
        </div>
      </div>
    </div>
  );
}
