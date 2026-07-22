"use client";
/**
 * Organizer modal to close the current league season and roll into a fresh one.
 * Freezes the current standings into the league's history (leagues/{id}/seasons),
 * keeps the same members + stores + URL, and starts the new season on the given
 * dates (or per-store schedule). See startNewSeason in leagues-scoring.ts.
 */
import { useState } from "react";
import { toast } from "sonner";
import type { League, LeagueSession } from "@/types";
import { startNewSeason } from "@/lib/leagues-scoring";
import { LeagueScheduleBuilder } from "./LeagueScheduleBuilder";

export function NewSeasonModal({
  league,
  stores,
  onClose,
  onDone,
}: {
  league: League;
  stores: { slug: string; name: string }[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sessions, setSessions] = useState<LeagueSession[]>([]);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (sessions.length === 0) {
      if (!startDate || !endDate) {
        toast.error("Set the new season's start and end dates (or add a schedule).");
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
        startDate,
        endDate,
        sessions: sessions.length ? sessions : undefined,
      });
      toast.success(`Season ${n} started — previous standings archived.`);
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start new season.");
    }
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-fab-border bg-fab-bg p-5 shadow-2xl">
        <h3 className="mb-1 text-lg font-bold text-fab-gold">Start new season</h3>
        <p className="mb-4 text-xs text-fab-dim">
          Freezes the current standings into this league&apos;s history, then starts a fresh season with the
          same members and stores. Set the new dates — or a per-store schedule.
        </p>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-fab-muted">Season name (optional)</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`Season ${(league.seasonNumber || 1) + 1}`}
              className="w-full rounded-md border border-fab-border bg-fab-bg px-2 py-1.5 text-sm text-fab-text focus:border-fab-gold focus:outline-none"
            />
          </div>
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
          <div>
            <label className="mb-1 block text-xs font-semibold text-fab-muted">Schedule specific dates (optional)</label>
            <LeagueScheduleBuilder sessions={sessions} onChange={setSessions} stores={stores} />
          </div>
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
