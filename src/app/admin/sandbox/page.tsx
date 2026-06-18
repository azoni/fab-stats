"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { User } from "firebase/auth";
import { useAuth } from "@/contexts/AuthContext";
import { computeEventStats } from "@/lib/stats";
import { EventCard } from "@/components/events/EventCard";
import { parseGemPaste } from "@/lib/gem-paste-import";
import { getMatchesByUserId } from "@/lib/firestore-storage";
import { MatchResult, GameFormat, type MatchRecord } from "@/types";
import { PageHero } from "@/components/ui/PageHero";
import { FlaskConical } from "lucide-react";
import {
  getSandboxMatches,
  getSandboxCount,
  importSandboxMatches,
  seedSandboxMatches,
  clearSandboxMatches,
  updateSandboxMatch,
  batchUpdateSandboxMatches,
  deleteSandboxMatch,
  batchDeleteSandboxMatches,
  exportSandboxJson,
  isSandboxEnabled,
  setSandboxEnabled,
} from "@/lib/sandbox-store";

type Draft = Omit<MatchRecord, "id" | "createdAt">;

/** A faithful multi-format sample (CC swiss + Draft) so per-format records,
 *  format dividers and event editing can be exercised immediately. */
function sampleEvent(): Draft[] {
  const date = "2026-06-12";
  const venue = "FaB Foundry Events";
  const name = "US National Championship";
  const mk = (
    round: number,
    format: string,
    hero: string,
    oppHero: string,
    result: MatchResult,
  ): Draft => ({
    date,
    venue,
    format: format as GameFormat,
    heroPlayed: hero,
    opponentHero: oppHero,
    opponentName: `Opponent ${round}`,
    result,
    rated: true,
    eventType: "Nationals",
    notes: `${name} | Round ${round}`,
  });
  const CC = "Classic Constructed";
  const DR = "Draft";
  const hala = "Hala, Bladesaint of the Vow";
  const oscilio = "Oscilio, Scion of the Third Age";
  return [
    mk(1, CC, hala, "Gravy Bones, Shipwrecked Looter", MatchResult.Win),
    mk(2, CC, hala, "Prism, Awakener of Sol", MatchResult.Loss),
    mk(3, CC, hala, "Fang, Dracai of Blades", MatchResult.Loss),
    mk(4, CC, hala, "Gravy Bones, Shipwrecked Looter", MatchResult.Win),
    mk(5, CC, hala, "Gravy Bones, Shipwrecked Looter", MatchResult.Win),
    mk(6, DR, oscilio, "Aurora, Legacy of Tempest", MatchResult.Loss),
    mk(7, DR, oscilio, "Zyggy Starlight", MatchResult.Loss),
    { ...mk(8, DR, oscilio, "", MatchResult.Bye), opponentName: "Bye" },
  ];
}

function SandboxInner({ user }: { user: User }) {
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [paste, setPaste] = useState("");
  const [msg, setMsg] = useState("");
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [busy, setBusy] = useState(false);
  const [routeImports, setRouteImports] = useState(false);

  const refresh = useCallback(() => setMatches(getSandboxMatches()), []);

  useEffect(() => {
    refresh();
    setRouteImports(isSandboxEnabled());
  }, [refresh]);

  function toggleRouteImports() {
    const next = !routeImports;
    setSandboxEnabled(next);
    setRouteImports(next);
    setMsg(next
      ? "Imports now route to the sandbox — the extension, bookmarklet, quick sync and paste on /import all land here until you turn this off."
      : "Imports route to your real account again.");
  }

  const eventStats = useMemo(() => computeEventStats(matches), [matches]);

  // ── Sandbox CRUD wired into EventCard (all isolated, no Firestore) ──
  const onBatchUpdateHero = useCallback(async (ids: string[], hero: string) => {
    batchUpdateSandboxMatches(ids, { heroPlayed: hero });
    refresh();
  }, [refresh]);
  const onBatchUpdateFormat = useCallback(async (ids: string[], format: GameFormat) => {
    batchUpdateSandboxMatches(ids, { format });
    refresh();
  }, [refresh]);
  const onBatchUpdateEventType = useCallback(async (ids: string[], override: string) => {
    batchUpdateSandboxMatches(ids, { eventTypeOverride: override || undefined });
    refresh();
  }, [refresh]);
  const onBatchUpdateDay2 = useCallback(async (ids: string[], day2: boolean) => {
    batchUpdateSandboxMatches(ids, { day2: day2 ? true : undefined });
    refresh();
  }, [refresh]);
  const onDeleteEvent = useCallback(async (ids: string[]) => {
    batchDeleteSandboxMatches(ids);
    refresh();
  }, [refresh]);
  const onUpdateMatch = useCallback(async (id: string, updates: Partial<Draft>) => {
    updateSandboxMatch(id, updates);
    refresh();
  }, [refresh]);
  const onDeleteMatch = useCallback(async (id: string) => {
    deleteSandboxMatch(id);
    refresh();
  }, [refresh]);

  function handlePasteImport() {
    setMsg("");
    if (!paste.trim()) return;
    try {
      const result = parseGemPaste(paste);
      const drafts = result.events.flatMap((e) => e.matches);
      if (drafts.length === 0) {
        setMsg("No matches parsed from that paste.");
        return;
      }
      const added = importSandboxMatches(drafts);
      refresh();
      setMsg(`Parsed ${drafts.length}, added ${added} (skipped ${drafts.length - added} duplicate${drafts.length - added === 1 ? "" : "s"}).`);
      setPaste("");
    } catch {
      setMsg("Couldn't parse that — paste a GEM copy or use the full sandbox import.");
    }
  }

  function handleSeedSample() {
    seedSandboxMatches(sampleEvent());
    refresh();
    setMsg("Seeded a sample multi-format Nationals event.");
  }

  async function handleCopyReal() {
    setBusy(true);
    setMsg("");
    try {
      const real = await getMatchesByUserId(user.uid);
      const drafts: Draft[] = real.map((m) => {
        const { id: _id, createdAt: _c, ...rest } = m;
        void _id; void _c;
        return rest;
      });
      const added = seedSandboxMatches(drafts);
      refresh();
      setMsg(`Copied ${added} of your real matches into the sandbox (read-only copy — your account is untouched).`);
    } catch {
      setMsg("Failed to read your real matches.");
    }
    setBusy(false);
  }

  function handleWipe() {
    clearSandboxMatches();
    refresh();
    setConfirmWipe(false);
    setMsg("Sandbox wiped.");
  }

  async function handleExport() {
    try {
      await navigator.clipboard.writeText(exportSandboxJson());
      setMsg("Sandbox JSON copied to clipboard.");
    } catch {
      setMsg("Clipboard blocked — export unavailable.");
    }
  }

  const count = matches.length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHero
        eyebrow="Admin · Import Sandbox"
        title="Import sandbox"
        description="An isolated, local-only copy of your match store for testing the import pipeline. Nothing here ever touches your real account, leaderboard, feed or stats."
        icon={<FlaskConical className="h-4 w-4" />}
        metrics={[
          { label: "Matches", value: count, sub: "in sandbox" },
          { label: "Events", value: eventStats.length, sub: "derived" },
          { label: "Storage", value: "Local", sub: "this browser only" },
          { label: "Real data", value: "Safe", sub: "never written" },
        ]}
      />

      {/* Route-imports toggle — the key control for testing the extension/bookmarklet,
          which open /import in a fresh tab and otherwise hit the real account. */}
      <div className={`flex flex-wrap items-center gap-3 rounded-lg border p-4 ${routeImports ? "border-purple-500/50 bg-purple-500/10" : "border-fab-border bg-fab-surface"}`}>
        <button
          type="button"
          role="switch"
          aria-checked={routeImports}
          onClick={toggleRouteImports}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${routeImports ? "bg-purple-500" : "bg-fab-border"}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${routeImports ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${routeImports ? "text-purple-200" : "text-fab-text"}`}>
            Route imports to the sandbox {routeImports ? "· ON" : "· OFF"}
          </p>
          <p className="text-xs text-fab-muted">
            When on, every import on <span className="text-fab-text">/import</span> — including the <strong>browser extension</strong> and bookmarklet (which open a new tab) — lands in this sandbox instead of your real account. Persists across tabs until you turn it off.
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="rounded-lg border border-fab-border bg-fab-surface p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/import?sandbox=1"
            className="rounded-md bg-purple-500/15 border border-purple-500/40 px-3 py-1.5 text-sm font-semibold text-purple-200 hover:bg-purple-500/25"
          >
            🧪 Open sandbox import →
          </Link>
          <button onClick={handleSeedSample} className="rounded-md border border-fab-border bg-fab-bg px-3 py-1.5 text-sm text-fab-text hover:border-fab-gold/40">
            Seed sample event
          </button>
          <button onClick={handleCopyReal} disabled={busy} className="rounded-md border border-fab-border bg-fab-bg px-3 py-1.5 text-sm text-fab-text hover:border-fab-gold/40 disabled:opacity-50">
            {busy ? "Copying…" : "Copy my real events"}
          </button>
          <button onClick={handleExport} disabled={count === 0} className="rounded-md border border-fab-border bg-fab-bg px-3 py-1.5 text-sm text-fab-text hover:border-fab-gold/40 disabled:opacity-50">
            Export JSON
          </button>
          <div className="flex-1" />
          {confirmWipe ? (
            <span className="flex items-center gap-2">
              <span className="text-xs text-fab-loss">Wipe all {count} sandbox match{count === 1 ? "" : "es"}?</span>
              <button onClick={handleWipe} className="rounded-md bg-fab-loss/20 px-3 py-1.5 text-sm font-semibold text-fab-loss hover:bg-fab-loss/30">Confirm</button>
              <button onClick={() => setConfirmWipe(false)} className="rounded-md border border-fab-border px-3 py-1.5 text-sm text-fab-muted">Cancel</button>
            </span>
          ) : (
            <button onClick={() => setConfirmWipe(true)} disabled={count === 0} className="rounded-md border border-fab-border px-3 py-1.5 text-sm text-fab-dim hover:text-fab-loss hover:border-fab-loss/40 disabled:opacity-50">
              Wipe sandbox
            </button>
          )}
        </div>

        {/* Quick paste → import (fast loop; full review/recap lives on the sandbox import page) */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-fab-muted">Quick paste import (GEM copy-paste)</label>
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder="Paste a copied GEM history here for a quick import into the sandbox…"
            rows={3}
            className="w-full rounded-md border border-fab-border bg-fab-bg px-3 py-2 text-sm text-fab-text placeholder:text-fab-dim focus:border-fab-gold/50 focus:outline-none"
          />
          <div className="flex items-center gap-3">
            <button onClick={handlePasteImport} disabled={!paste.trim()} className="rounded-md bg-fab-gold px-4 py-1.5 text-sm font-semibold text-fab-bg hover:bg-fab-gold-light disabled:opacity-50">
              Import to sandbox
            </button>
            {msg && <span className="text-xs text-fab-muted">{msg}</span>}
          </div>
        </div>
      </div>

      {/* Events */}
      {eventStats.length === 0 ? (
        <div className="rounded-lg border border-dashed border-fab-border bg-fab-surface/50 p-8 text-center text-sm text-fab-dim">
          Sandbox is empty. Seed a sample event, copy your real events, or open the sandbox import to bring matches in.
        </div>
      ) : (
        <div className="space-y-3">
          {eventStats.map((event) => (
            <EventCard
              key={`${event.eventName}|${event.eventDate}|${event.venue || ""}`}
              event={event}
              /* playerName intentionally omitted: it gates the share button, whose
                 EventShareModal calls logActivity() — a real Firestore write. Sandbox
                 events must not pollute production analytics. */
              editable
              onBatchUpdateHero={onBatchUpdateHero}
              onBatchUpdateFormat={onBatchUpdateFormat}
              onBatchUpdateEventType={onBatchUpdateEventType}
              onBatchUpdateDay2={onBatchUpdateDay2}
              onDeleteEvent={onDeleteEvent}
              onUpdateMatch={onUpdateMatch}
              onDeleteMatch={onDeleteMatch}
              missingGemId={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SandboxPage() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) router.replace("/");
  }, [loading, user, isAdmin, router]);

  if (loading) return <div className="p-8 text-fab-dim">Loading…</div>;
  if (!user || !isAdmin) return null;
  return <SandboxInner user={user} />;
}
