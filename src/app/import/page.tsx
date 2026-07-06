"use client";
import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { parseGemCsv } from "@/lib/gem-import";
import { parseGemPaste, parseExtensionJson, type PasteImportResult } from "@/lib/gem-paste-import";
import { useAuth } from "@/contexts/AuthContext";
import { importMatchesFirestore, clearAllMatchesFirestore, updateProfile, registerGemId, normalizeNotes } from "@/lib/firestore-storage";
import { importMatchesLocal } from "@/lib/storage";
import { createImportFeedEvent, createPlacementFeedEvent, deleteAllFeedEventsForUser } from "@/lib/feed";
import { detectNewAchievements } from "@/lib/achievement-tracking";
import { evaluateAchievements } from "@/lib/achievements";
import { computeOverallStats, computeHeroStats, computeOpponentStats, computeEventStats, computePlayoffFinishes, getEventName, isDay2Match, computeDay2Boundary, couldBeDay2, suggestedManualDay2Round, type PlayoffFinish } from "@/lib/stats";
import { linkMatchesWithOpponents, resolveOpponentHeroesForReview, type ReviewMatchRef } from "@/lib/match-linking";
import { computeH2HForUser } from "@/lib/h2h";
import { updateCommunityHeroMatchups } from "@/lib/hero-matchups";
import type { GemMetadata } from "@/lib/gem-import";
import { updateLeaderboardEntry } from "@/lib/leaderboard";
import { trackImportMethod } from "@/lib/analytics";
import { getMatchesByUserId } from "@/lib/firestore-storage";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircleIcon, FileIcon, ChevronDownIcon, ChevronUpIcon } from "@/components/icons/NavIcons";
import { MatchResult, GameFormat, type MatchRecord, type Achievement } from "@/types";
import { HERO_REQUIRED_CUTOFF } from "@/lib/constants";
import { computeHeroGate } from "@/lib/import-hero-gate";
import { HeroSelect } from "@/components/heroes/HeroSelect";
import { computeSessionRecap, type SessionRecap } from "@/lib/session-recap";
import { PostEventRecap } from "@/components/import/PostEventRecap";
import { getAllMatches as getLocalMatches } from "@/lib/storage";
import { getSandboxMatches, importSandboxMatches, clearSandboxMatches, isSandboxEnabled, setSandboxEnabled } from "@/lib/sandbox-store";
import { detectTierUp, type BadgeTierInfo } from "@/lib/badge-tiers";
import { GemAutoSync } from "@/components/import/GemAutoSync";
import { PageHero } from "@/components/ui/PageHero";
import { ClipboardPaste, FileText, MousePointerClick, Sparkles, UploadCloud } from "lucide-react";

const BOOKMARKLET_HREF = `javascript:void((async function(){var els=document.querySelectorAll('a,button,summary,span,div,[role=button]');var n=0;for(var i=0;i<els.length;i++){var t=(els[i].textContent||'').trim();if(t.match(/View Results/i)&&t.length<30){els[i].click();n++;await new Promise(function(r){setTimeout(r,600)})}}alert('Expanded '+n+' events. Press Ctrl+A, Ctrl+C to copy.')})())`;

type ImportMethod = "extension" | "bookmarklet" | "paste" | "csv" | null;

/** Sentinel stored in heroOverrides when user explicitly acknowledges an unknown hero */
const ACKNOWLEDGED_UNKNOWN = "__ACKNOWLEDGED_UNKNOWN__";

type ImportMatchDraft = Omit<MatchRecord, "id" | "createdAt">;

function importFingerprint(match: Pick<ImportMatchDraft, "date" | "opponentName" | "notes" | "result">): string {
  return `${match.date}|${(match.opponentName || "").toLowerCase()}|${match.notes ? normalizeNotes(match.notes) : ""}|${match.result}`;
}

function formatImportCount(matches: ImportMatchDraft[]): string {
  const byes = matches.filter((m) => m.result === MatchResult.Bye).length;
  const played = matches.length - byes;
  const parts: string[] = [];
  if (played > 0) parts.push(`${played} match${played === 1 ? "" : "es"}`);
  if (byes > 0) parts.push(`${byes} bye${byes === 1 ? "" : "s"}`);
  return parts.join(" + ") || "0 matches";
}

function evaluateImportAchievements(matches: MatchRecord[]): Achievement[] {
  const overall = computeOverallStats(matches);
  const heroStats = computeHeroStats(matches);
  const oppStats = computeOpponentStats(matches);
  return evaluateAchievements(matches, overall, heroStats, oppStats);
}

function TurnOrderPicker({ value, onChange }: { value: boolean | undefined; onChange: (value: boolean | undefined) => void }) {
  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-fab-muted">Turn Order</span>
      <div className="flex flex-wrap items-center gap-1">
        {[
          { label: "First", value: true },
          { label: "Second", value: false },
        ].map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-md border px-2 py-1 text-xs font-semibold transition-colors ${
              value === option.value
                ? "border-fab-gold/50 bg-fab-gold/15 text-fab-gold"
                : "border-fab-border bg-fab-bg text-fab-dim hover:text-fab-text"
            }`}
          >
            {option.label}
          </button>
        ))}
        {value !== undefined && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="rounded-md border border-transparent px-2 py-1 text-xs font-semibold text-fab-dim transition-colors hover:text-fab-muted"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

/** Day-2 boundary control shown on import preview events.
 *  - `boundary != null` → Day 2 is on; show the editable start-round.
 *  - `boundary == null` && `auto` → auto-detected but turned off; offer re-enable.
 *  - `boundary == null` && `!auto` → opt-in for events that didn't auto-detect.
 *  `onEnable` is wired by the parent to do the right thing for each case. */
function Day2Control({ boundary, auto, onSetRound, onTurnOff, onEnable }: {
  boundary: number | null;
  auto: boolean;
  onSetRound: (n: number) => void;
  onTurnOff: () => void;
  onEnable: () => void;
}) {
  if (boundary != null) {
    return (
      <div onClick={(e) => e.stopPropagation()} className="rounded-lg border border-indigo-500/30 bg-indigo-500/[0.06] p-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-xs font-bold uppercase tracking-wide text-indigo-300">
            {auto ? "Day 2 detected" : "Day 2"}
          </span>
          <label className="flex items-center gap-1.5 text-xs text-fab-muted">
            starts at round
            <input
              type="number"
              min={2}
              value={boundary}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                if (Number.isFinite(n) && n >= 2) onSetRound(n);
              }}
              className="w-16 rounded-md border border-fab-border bg-fab-bg px-2 py-1 text-xs text-fab-text focus:border-fab-gold/60 focus:outline-none"
            />
          </label>
          <button type="button" onClick={onTurnOff} className="ml-auto text-xs font-semibold text-fab-dim hover:text-fab-loss">
            Not a Day 2
          </button>
        </div>
      </div>
    );
  }
  // Off / opt-in — keep it subtle so it doesn't clutter normal 1-day events.
  return (
    <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-between gap-2 rounded-lg border border-fab-border/60 bg-fab-bg/40 px-3 py-2">
      <span className="text-xs text-fab-muted">{auto ? "Day 2 turned off." : "Was this a 2-day event?"}</span>
      <button type="button" onClick={onEnable} className="text-xs font-semibold text-indigo-300 hover:text-indigo-200">
        {auto ? "Mark as Day 2" : "Mark Day 2"}
      </button>
    </div>
  );
}

/** Per-round hero + format editor for multi-format / multi-hero events on
 *  import (draft re-picks, sealed→draft Callings, day-2 format changes).
 *  Each segment assigns a hero + format to a round range; Apply writes the
 *  per-match overrides in the parent. */
type Seg = { hero: string; format: string; from: string; to: string };

function ImportSegmentEditor({ matchCount, defaultHero, defaultFormat, splitAt, onApply, initialSegments }: {
  matchCount: number;
  defaultHero: string;
  defaultFormat: string;
  /** 1-based MATCH POSITION where day two begins (not a round number — the caller
   *  converts the day-2 round to a position). When set, the editor opens pre-split
   *  into a Day 1 and a Day 2 segment so the user only has to pick heroes/formats. */
  splitAt?: number;
  onApply: (assignments: { matchIdx: number; hero?: string; format?: string }[], segments: Seg[]) => void;
  /** Restore previously-entered segments (the editor unmounts when collapsed). */
  initialSegments?: Seg[];
}) {
  const [segments, setSegments] = useState<Seg[]>(() => {
    if (initialSegments && initialSegments.length > 0) return initialSegments;
    const d1Hero = defaultHero === "Unknown" ? "" : defaultHero;
    // Pre-seed a Day 1 / Day 2 split when the event spans two days.
    if (splitAt && splitAt > 1 && splitAt <= matchCount) {
      return [
        { hero: d1Hero, format: defaultFormat || "", from: "1", to: String(splitAt - 1) },
        { hero: "", format: "", from: String(splitAt), to: String(matchCount) },
      ];
    }
    return [{ hero: d1Hero, format: defaultFormat || "", from: "1", to: String(matchCount) }];
  });

  const clamp = (v: string) => {
    const n = parseInt(v, 10);
    if (!Number.isFinite(n)) return "1";
    return String(Math.min(Math.max(n, 1), matchCount));
  };
  const update = (i: number, patch: Partial<Seg>) =>
    setSegments((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const add = () =>
    setSegments((prev) => {
      const last = prev[prev.length - 1];
      const nextFrom = Math.min(parseInt(last.to, 10) + 1 || 1, matchCount);
      return [...prev, { hero: "", format: last.format || "", from: String(nextFrom), to: String(matchCount) }];
    });
  const remove = (i: number) => setSegments((prev) => prev.filter((_, idx) => idx !== i));

  // Auto-apply on every change (like the rest of the import fields) + persist the
  // segments to the parent so they survive collapsing/expanding the editor.
  const onApplyRef = useRef(onApply);
  onApplyRef.current = onApply;
  useEffect(() => {
    const clampN = (v: string) => {
      const n = parseInt(v, 10);
      return Number.isFinite(n) ? Math.min(Math.max(n, 1), matchCount) : 1;
    };
    const assignments: { matchIdx: number; hero?: string; format?: string }[] = [];
    for (const seg of segments) {
      const from = clampN(seg.from);
      const to = clampN(seg.to);
      const lo = Math.min(from, to);
      const hi = Math.max(from, to);
      for (let round = lo; round <= hi; round++) {
        assignments.push({
          matchIdx: round - 1,
          hero: seg.hero && seg.hero !== "Unknown" ? seg.hero : undefined,
          format: seg.format || undefined,
        });
      }
    }
    onApplyRef.current(assignments, segments);
  }, [segments, matchCount]);

  return (
    <div onClick={(e) => e.stopPropagation()} className="rounded-lg border border-fab-border/60 bg-fab-bg/40 p-3 space-y-2">
      <p className="text-[11px] text-fab-muted">
        Set your hero &amp; format per round — for drafts (new hero each pod) or mixed events like the Calling (sealed, then draft).
      </p>
      {segments.map((seg, i) => (
        <div key={i} className="flex flex-wrap items-end gap-2">
          <div className="w-44">
            <HeroSelect value={seg.hero} onChange={(v) => update(i, { hero: v })} label="Hero" format={seg.format} allowClear />
          </div>
          <select
            value={seg.format}
            onChange={(e) => update(i, { format: e.target.value })}
            className="rounded-md border border-fab-border bg-fab-bg px-2 py-1.5 text-xs text-fab-text focus:border-fab-gold/60 focus:outline-none"
          >
            <option value="">Format</option>
            {Object.values(GameFormat).map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <div className="flex items-center gap-1 text-xs text-fab-muted">
            <span>rounds</span>
            <input type="number" min={1} max={matchCount} value={seg.from}
              onChange={(e) => update(i, { from: e.target.value })} onBlur={() => update(i, { from: clamp(seg.from) })}
              className="w-12 rounded-md border border-fab-border bg-fab-bg px-1.5 py-1 text-center text-xs text-fab-text focus:border-fab-gold/60 focus:outline-none" />
            <span>–</span>
            <input type="number" min={1} max={matchCount} value={seg.to}
              onChange={(e) => update(i, { to: e.target.value })} onBlur={() => update(i, { to: clamp(seg.to) })}
              className="w-12 rounded-md border border-fab-border bg-fab-bg px-1.5 py-1 text-center text-xs text-fab-text focus:border-fab-gold/60 focus:outline-none" />
          </div>
          {segments.length > 1 && (
            <button type="button" onClick={() => remove(i)} className="px-1.5 py-1 text-fab-dim hover:text-fab-loss" title="Remove segment">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      ))}
      <div className="flex items-center gap-3">
        <button type="button" onClick={add} className="text-xs font-semibold text-fab-gold hover:text-fab-gold-light">
          + Add segment
        </button>
        <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-fab-win">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Saved automatically
        </span>
      </div>
    </div>
  );
}

/** Toggle + per-round hero/format editor. The toggle reads as a real button so
 *  users notice it, and the copy adapts when a Day 2 split is available. */
function PerRoundEditor({ open, onToggle, matchCount, defaultHero, defaultFormat, splitAt, onApply, initialSegments }: {
  open: boolean;
  onToggle: () => void;
  matchCount: number;
  defaultHero: string;
  defaultFormat: string;
  splitAt?: number;
  onApply: (assignments: { matchIdx: number; hero?: string; format?: string }[], segments: Seg[]) => void;
  initialSegments?: Seg[];
}) {
  const hasSplit = !!splitAt && splitAt > 1 && splitAt <= matchCount;
  const label = open
    ? "Hide per-round hero / format"
    : hasSplit
      ? "Set Day 1 / Day 2 hero & format"
      : "Different hero or format by round?";
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-md border border-fab-gold/40 bg-fab-gold/[0.08] px-2.5 py-1.5 text-xs font-semibold text-fab-gold transition-colors hover:border-fab-gold/70 hover:bg-fab-gold/[0.15]"
      >
        {/* split / layers icon */}
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          {open ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
        {label}
      </button>
      {open && (
        <div className="mt-2">
          <ImportSegmentEditor
            matchCount={matchCount}
            defaultHero={defaultHero}
            defaultFormat={defaultFormat}
            splitAt={splitAt}
            onApply={onApply}
            initialSegments={initialSegments}
          />
        </div>
      )}
    </div>
  );
}

/** Subtle status for the background opponent-hero pre-fill. */
function PrefillStatus({ state, count }: { state: "idle" | "running" | "done"; count: number }) {
  if (state === "running") {
    return (
      <p className="flex items-center gap-1.5 text-xs text-fab-muted">
        <span className="inline-block w-3 h-3 rounded-full border-2 border-fab-border border-t-fab-gold animate-spin" />
        Matching opponent heroes from players who use FaB Stats…
      </p>
    );
  }
  if (state === "done" && count > 0) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-fab-win">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        Auto-filled {count} opponent hero{count === 1 ? "" : "es"} from linked players.
      </p>
    );
  }
  return null;
}

function ImportFlowDiagram({ activeStep }: { activeStep: number }) {
  const steps = [
    { label: "Pull", detail: "export from GEM" },
    { label: "Review", detail: "check events" },
    { label: "Fix", detail: "add heroes" },
    { label: "Import", detail: "save history" },
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-4">
      {steps.map((step, index) => (
        <div
          key={step.label}
          data-active={index <= activeStep}
          className="fab-step-card rounded-lg px-3 py-3"
        >
          <div className="flex items-center gap-2">
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-black ${
              index <= activeStep ? "bg-fab-gold text-fab-bg" : "bg-fab-bg text-fab-dim"
            }`}>
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-fab-text">{step.label}</p>
              <p className="text-[10px] text-fab-dim">{step.detail}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

interface ImportPageProps {
  shareMode?: boolean;
}

// The newest GEM event in a Quick Sync payload (by event date). After a
// confirmed import, everything up to this event is logged — so the extension
// can Smart-Sync only newer matches next time, keyed by this event id.
function computeSyncWatermark(
  result: PasteImportResult
): { eventId: string; date: string } | null {
  let best: { eventId: string; date: string } | null = null;
  for (const ev of result.events) {
    const eventId = ev.matches.find((m) => m.gemEventId)?.gemEventId;
    if (!eventId) continue;
    if (!best || ev.eventDate > best.date) best = { eventId, date: ev.eventDate };
  }
  return best;
}

export default function ImportPage({ shareMode = false }: ImportPageProps = {}) {
  const router = useRouter();
  const { user, profile, isGuest, isAdmin } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const eventCardRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const bookmarkletRef = useCallback((node: HTMLAnchorElement | null) => {
    if (node) node.setAttribute("href", BOOKMARKLET_HREF);
  }, []);
  const [method, setMethod] = useState<ImportMethod>(null);
  const [dragActive, setDragActive] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteResult, setPasteResult] = useState<PasteImportResult | null>(null);
  const [csvMatches, setCsvMatches] = useState<Omit<MatchRecord, "id" | "createdAt">[] | null>(null);
  const [csvMetadata, setCsvMetadata] = useState<GemMetadata | null>(null);
  const [error, setError] = useState("");
  const [imported, setImported] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [filterFormat, setFilterFormat] = useState("all");
  const [filterEventType, setFilterEventType] = useState("all");
  const [expandedEvent, setExpandedEvent] = useState<number | null>(null);
  const [skippedCount, setSkippedCount] = useState(0);
  const [coverageHerosFilled, setCoverageHerosFilled] = useState(0);
  const [importing, setImporting] = useState(false);
  const [autoDetected, setAutoDetected] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [heroOverrides, setHeroOverrides] = useState<Record<number, string>>({});
  const [opponentHeroOverrides, setOpponentHeroOverrides] = useState<Record<string, string>>({});
  const [matchNotesOverrides, setMatchNotesOverrides] = useState<Record<string, string>>({});
  // Per-match (round) hero + format overrides for multi-format / multi-hero
  // events (draft re-picks, sealed→draft Callings, day-2 format changes).
  // Keyed by `${origIdx}-${matchIdx}`. These win over the event-level hero.
  const [matchHeroOverrides, setMatchHeroOverrides] = useState<Record<string, string>>({});
  const [matchFormatOverrides, setMatchFormatOverrides] = useState<Record<string, string>>({});
  // Which events have the per-round hero/format editor open (keyed by origIdx).
  const [segEditorEvents, setSegEditorEvents] = useState<Record<number, boolean>>({});
  // Per-event segment definitions, persisted so the editor restores when reopened.
  const [segmentsByEvent, setSegmentsByEvent] = useState<Record<number, Seg[]>>({});
  // Background pre-fill of opponent heroes from linked FaB Stats players.
  const [prefillState, setPrefillState] = useState<"idle" | "running" | "done">("idle");
  const [prefilledCount, setPrefilledCount] = useState(0);
  const prefillRunRef = useRef<PasteImportResult | null>(null);
  // Opp-hero keys the user has manually set OR cleared — the background pre-fill
  // must never re-fill these, even if the user cleared a field mid-resolution.
  const userTouchedOppKeysRef = useRef<Set<string>>(new Set());
  // Snapshot of the matches array taken when the user clicks Import. Used by
  // the loader so the count text never disagrees with what the preview showed
  // (defensive: avoids a useMemo recompute desync between click + paint).
  const [importingMatches, setImportingMatches] = useState<ImportMatchDraft[] | null>(null);
  const [quickPreviewReady, setQuickPreviewReady] = useState(false);
  const [quickConfirmImport, setQuickConfirmImport] = useState(false);
  const [existingFingerprints, setExistingFingerprints] = useState<Set<string> | null>(null);
  const [sessionRecap, setSessionRecap] = useState<SessionRecap | null>(null);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
  const [newPlacements, setNewPlacements] = useState<PlayoffFinish[]>([]);
  const [matchBadgeTierUp, setMatchBadgeTierUp] = useState<{ tier: BadgeTierInfo; count: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showPasteSteps, setShowPasteSteps] = useState(false);
  const [clearBeforeImport, setClearBeforeImport] = useState(false);
  const [quickMode, setQuickMode] = useState(false);
  const [showHeroWarning, setShowHeroWarning] = useState(false);
  const [confirmSkipHero, setConfirmSkipHero] = useState(false);
  const [heroRequiredHard, setHeroRequiredHard] = useState(false);
  const [showOtherBrowsers, setShowOtherBrowsers] = useState(false);
  const [visibleEventCount, setVisibleEventCount] = useState(10);
  const [turnOrderOverrides, setTurnOrderOverrides] = useState<Record<string, boolean>>({});
  // Per-event day-2 boundary override, keyed by origIdx. "off" disables day 2;
  // a number sets the round where day 2 starts; absent → use the auto heuristic.
  const [day2BoundaryOverrides, setDay2BoundaryOverrides] = useState<Record<number, number | "off">>({});
  // Events the user removed from this import (by origIdx) — excluded from both
  // the preview list and what actually gets imported. Restorable before import.
  const [excludedEventIdxs, setExcludedEventIdxs] = useState<Set<number>>(new Set());
  // Admin-only import sandbox: when on, all reads/writes route to the isolated
  // sandbox store (src/lib/sandbox-store.ts) and every Firestore side-effect
  // (feed, leaderboard, achievements, cross-player links) is skipped — so the
  // full import → review → recap flow can be tested without touching real data.
  const [sandboxMode, setSandboxMode] = useState(false);
  const sandboxActive = isAdmin && sandboxMode;

  // Turn sandbox mode on/off AND persist it (localStorage), so the choice
  // survives the fresh tab the extension/bookmarklet open. Admin-only.
  const setSandbox = useCallback((on: boolean) => {
    setSandboxMode(on);
    setSandboxEnabled(on);
  }, []);

  // Enable sandbox mode for admins from ?sandbox=1 / #sandbox, OR from the
  // persisted flag (so an extension/bookmarklet import lands in the sandbox).
  useEffect(() => {
    if (!isAdmin || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("sandbox") === "1" || window.location.hash.includes("sandbox")) {
      setSandbox(true); // also persists, so the next extension tab inherits it
    } else if (isSandboxEnabled()) {
      setSandboxMode(true);
    }
  }, [isAdmin, setSandbox]);

  // Detect mobile viewport
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Auto-expand paste method on mobile (Browser Extension not available on phones)
  // OR when invoked from /share (the focused post-event flow).
  useEffect(() => {
    if ((isMobile || shareMode) && method === null && !pasteResult && !csvMatches && !autoDetected) {
      setMethod("paste");
    }
  }, [isMobile]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-detect extension data from URL hash (#ext= or #quickext=)
  useEffect(() => {
    const hash = window.location.hash;
    const isQuick = hash.startsWith("#quickext=");
    const isExt = hash.startsWith("#ext=");
    if (isQuick || isExt) {
      try {
        const encoded = hash.slice(isQuick ? 10 : 5);
        const json = decodeURIComponent(
          atob(encoded)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        );
        const result = parseExtensionJson(json);
        if (result.totalMatches > 0) {
          setPasteResult(result);
          setAutoDetected(true);
          // Method derives from where the payload came from, not from whether
          // it's Quick Sync. The parser tags each match's `source` from its
          // extensionVersion ("bookmarklet..." prefix → bookmarklet, else
          // extension), so use that as the source of truth.
          const firstMatch = result.events[0]?.matches[0];
          const detectedSource = firstMatch?.source === "bookmarklet" ? "bookmarklet" : "extension";
          setMethod(detectedSource);
          if (isQuick) setQuickMode(true);
        }
      } catch (e) {
        console.error("Failed to parse extension data from URL:", e);
      }
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  // Quick mode: pre-fetch existing matches for duplicate detection, then show preview
  useEffect(() => {
    if (quickMode && pasteResult && !quickPreviewReady && !imported && !importing && (user || isGuest)) {
      (async () => {
        try {
          let existing: MatchRecord[] = [];
          if (isAdmin && sandboxMode) {
            existing = getSandboxMatches();
          } else if (user) {
            existing = await getMatchesByUserId(user.uid);
          } else {
            existing = getLocalMatches();
          }
          const fps = new Set(existing.map(importFingerprint));
          setExistingFingerprints(fps);
        } catch {
          setExistingFingerprints(new Set());
        }
        setQuickPreviewReady(true);
      })();
    }
  }, [quickMode, pasteResult, user, isGuest, isAdmin, sandboxMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Background pre-fill: once the preview is up, look up unknown opponent heroes
  // from opponents who use FaB Stats and fill them in live. Never blocks the
  // preview — runs async, bounded, and skips fields the user has already set.
  useEffect(() => {
    if (!pasteResult || !user || imported) return;
    if (quickMode && !quickPreviewReady) return;
    if (prefillRunRef.current === pasteResult) return; // run once per parsed result
    prefillRunRef.current = pasteResult;

    const refs: ReviewMatchRef[] = [];
    pasteResult.events.forEach((event, origIdx) => {
      event.matches.forEach((m, matchIdx) => {
        if (m.result === MatchResult.Bye) return;
        if (!m.opponentGemId) return;
        if (m.opponentHero && m.opponentHero !== "Unknown") return;
        refs.push({ key: `${origIdx}-${matchIdx}`, date: m.date, notes: m.notes, result: m.result, opponentGemId: m.opponentGemId });
      });
    });
    if (refs.length === 0) return;

    const signal = { aborted: false };
    (async () => {
      setPrefillState("running");
      setPrefilledCount(0);
      try {
        await resolveOpponentHeroesForReview(user.uid, refs, {
          signal,
          onResolved: (key, hero) => {
            // Never override a field the user has manually set or cleared.
            if (userTouchedOppKeysRef.current.has(key)) return;
            setOpponentHeroOverrides((prev) => (prev[key] ? prev : { ...prev, [key]: hero }));
            setPrefilledCount((c) => c + 1);
          },
        });
      } finally {
        if (!signal.aborted) setPrefillState("done");
      }
    })();

    return () => { signal.aborted = true; };
  }, [pasteResult, user, imported, quickMode, quickPreviewReady]);

  // Filtered events (with original index for hero overrides)
  const filteredEvents = useMemo(() => {
    if (!pasteResult) return [] as { event: PasteImportResult["events"][0]; origIdx: number }[];
    return pasteResult.events
      .map((e, i) => ({ event: e, origIdx: i }))
      .filter(({ event: e }) => {
        if (filterFormat !== "all" && e.format !== filterFormat) return false;
        if (filterEventType !== "all" && e.eventType !== filterEventType) return false;
        return true;
      });
  }, [pasteResult, filterFormat, filterEventType]);

  // Per-event day-2 boundary (round number where day 2 starts, or null).
  // Honors the user's override; falls back to the auto heuristic.
  const day2Boundaries = useMemo(() => {
    const map = new Map<number, number | null>();
    (pasteResult?.events ?? []).forEach((e, i) => {
      const ov = day2BoundaryOverrides[i];
      if (ov === "off") map.set(i, null);
      else if (typeof ov === "number") map.set(i, ov);
      else map.set(i, computeDay2Boundary(e.matches as MatchRecord[]));
    });
    return map;
  }, [pasteResult, day2BoundaryOverrides]);

  const applyImportOverrides = useCallback((match: ImportMatchDraft, origIdx: number, matchIdx: number): ImportMatchDraft => {
    const hero = heroOverrides[origIdx];
    const key = `${origIdx}-${matchIdx}`;
    const oppHero = opponentHeroOverrides[key];
    const hasTurnOrder = Object.prototype.hasOwnProperty.call(turnOrderOverrides, key);
    const hasNote = Object.prototype.hasOwnProperty.call(matchNotesOverrides, key);
    const matchHero = matchHeroOverrides[key];
    const matchFormat = matchFormatOverrides[key];
    let updated = { ...match };
    if (hero && hero !== ACKNOWLEDGED_UNKNOWN) updated = { ...updated, heroPlayed: hero };
    // Per-round (per-match) hero wins over the event-level hero.
    if (matchHero && matchHero !== ACKNOWLEDGED_UNKNOWN) updated = { ...updated, heroPlayed: matchHero };
    if (matchFormat) updated = { ...updated, format: matchFormat as GameFormat };
    if (oppHero) updated = { ...updated, opponentHero: oppHero };
    if (hasTurnOrder) updated = { ...updated, goingFirst: turnOrderOverrides[key] };
    if (hasNote) {
      const trimmed = (matchNotesOverrides[key] || "").trim();
      updated = { ...updated, matchNotes: trimmed || undefined };
    }
    const day2Start = day2Boundaries.get(origIdx);
    if (day2Start != null && isDay2Match(match as MatchRecord, day2Start)) {
      updated = { ...updated, day2: true };
    }
    return updated;
  }, [heroOverrides, opponentHeroOverrides, turnOrderOverrides, matchNotesOverrides, matchHeroOverrides, matchFormatOverrides, day2Boundaries]);

  const filteredMatches = useMemo(() => {
    return filteredEvents.flatMap(({ event, origIdx }) =>
      event.matches.map((m, matchIdx) => applyImportOverrides(m, origIdx, matchIdx))
    );
  }, [filteredEvents, applyImportOverrides]);

  // Apply per-round segment assignments → write match hero/format overrides.
  const applySegmentAssignments = useCallback(
    (origIdx: number, assignments: { matchIdx: number; hero?: string; format?: string }[], segments?: Seg[]) => {
      if (segments) setSegmentsByEvent((prev) => ({ ...prev, [origIdx]: segments }));
      setMatchHeroOverrides((prev) => {
        const next = { ...prev };
        for (const a of assignments) {
          const key = `${origIdx}-${a.matchIdx}`;
          if (a.hero) next[key] = a.hero;
          else delete next[key];
        }
        return next;
      });
      setMatchFormatOverrides((prev) => {
        const next = { ...prev };
        for (const a of assignments) {
          const key = `${origIdx}-${a.matchIdx}`;
          if (a.format) next[key] = a.format;
          else delete next[key];
        }
        return next;
      });
    },
    [],
  );

  // Events missing hero selection (for validation + UI)
  const missingHeroEvents = useMemo(() => {
    if (!pasteResult) return { all: [] as typeof filteredEvents, postCutoff: [] as typeof filteredEvents, preCutoff: 0 };
    const all = filteredEvents.filter(({ event, origIdx }) =>
      !(origIdx in heroOverrides) &&
      event.matches.every((m) => m.heroPlayed === "Unknown")
    );
    const postCutoff = all.filter(({ event }) =>
      event.matches.some((m) => m.date >= HERO_REQUIRED_CUTOFF)
    );
    return { all, postCutoff, preCutoff: all.length - postCutoff.length };
  }, [filteredEvents, heroOverrides, pasteResult]);

  // Auto-expand when only 1 event
  useEffect(() => {
    if (filteredEvents.length === 1) setExpandedEvent(0);
  }, [filteredEvents.length]);

  const availableFormats = useMemo(() => {
    if (!pasteResult) return [];
    return [...new Set(pasteResult.events.map((e) => e.format))];
  }, [pasteResult]);

  const availableEventTypes = useMemo(() => {
    if (!pasteResult) return [];
    return [...new Set(pasteResult.events.map((e) => e.eventType))];
  }, [pasteResult]);

  // Quick mode: filter events to only those with at least one non-duplicate match,
  // and drop any the user removed from this sync.
  const quickFilteredEvents = useMemo(() => {
    if (!quickMode || !existingFingerprints) return filteredEvents;
    return filteredEvents.filter(({ event, origIdx }) =>
      !excludedEventIdxs.has(origIdx) &&
      event.matches.some((m) => {
        return !existingFingerprints.has(importFingerprint(m));
      })
    );
  }, [quickMode, existingFingerprints, filteredEvents, excludedEventIdxs]);

  const quickImportMatches = useMemo(() => {
    if (!quickMode || !existingFingerprints) return filteredMatches;
    return filteredEvents.flatMap(({ event, origIdx }) =>
      excludedEventIdxs.has(origIdx)
        ? []
        : event.matches.flatMap((m, matchIdx) =>
            existingFingerprints.has(importFingerprint(m))
              ? []
              : [applyImportOverrides(m, origIdx, matchIdx)]
          )
    );
  }, [quickMode, existingFingerprints, filteredEvents, filteredMatches, applyImportOverrides, excludedEventIdxs]);

  // In quick mode, use the filtered (non-duplicate) events for display
  const displayEvents = quickMode ? quickFilteredEvents : filteredEvents;

  // Quick sync found nothing new (e.g. first run on a new machine whose account
  // is already fully synced): still advance the extension's Smart Sync watermark
  // so it doesn't re-pull full history on every future sync. Safe because every
  // event in the payload is already logged. The normal (has-new-matches) path
  // fires the same ping from handleImport after a confirmed import.
  useEffect(() => {
    if (
      quickMode &&
      quickPreviewReady &&
      !imported &&
      !importing &&
      pasteResult &&
      quickFilteredEvents.length === 0 &&
      excludedEventIdxs.size === 0
    ) {
      try {
        const wm = computeSyncWatermark(pasteResult);
        if (wm) {
          window.postMessage(
            { __fabstats: "sync-confirmed", eventId: wm.eventId, date: wm.date },
            window.location.origin
          );
        }
      } catch {
        // best-effort — extension falls back to a full fetch
      }
    }
  }, [quickMode, quickPreviewReady, imported, importing, pasteResult, quickFilteredEvents, excludedEventIdxs]);

  function handleParsePaste() {
    setError("");
    setPasteResult(null);
    setCsvMatches(null);

    if (!pasteText.trim()) {
      setError("Please paste some text from your GEM History page.");
      return;
    }

    try {
      const trimmed = pasteText.trim();
      let result: PasteImportResult;

      if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
        result = parseExtensionJson(trimmed);
      } else {
        result = parseGemPaste(pasteText);
      }

      if (result.totalMatches === 0) {
        if (result.skippedEventNames.length > 0) {
          setError(
            `Found ${result.skippedEventNames.length} event${result.skippedEventNames.length === 1 ? "" : "s"} but none had match results to import (${result.skippedEventNames.join(", ")}). Teaching events and events without completed rounds are skipped.`
          );
        } else {
          setError("No matches found. Make sure you've clicked \"View Results\" on each event on the GEM page before selecting all and copying.");
        }
        return;
      }
      setPasteResult(result);
    } catch {
      setError("Failed to parse the pasted text. Try copying more of the page content.");
    }
  }

  async function handleFile(file: File) {
    setError("");
    setCsvMatches(null);
    setPasteResult(null);

    const isJson = file.name.endsWith(".json");
    const isCsv = file.name.endsWith(".csv");

    if (!isCsv && !isJson) {
      setError("Please upload a CSV or JSON file.");
      return;
    }

    try {
      const text = await file.text();

      if (isJson) {
        const result = parseExtensionJson(text);
        if (result.totalMatches === 0) {
          setError("No valid matches found in the JSON file.");
          return;
        }
        setPasteResult(result);
        setAutoDetected(true);
        setMethod("extension");
        return;
      }

      const parsed = parseGemCsv(text);
      if (parsed.matches.length === 0) {
        setError("No valid matches found in the CSV.");
        return;
      }
      setCsvMatches(parsed.matches);
      setCsvMetadata(parsed.metadata);
    } catch {
      setError("Failed to parse the file.");
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleImportClick() {
    const matches = pasteResult ? (quickMode ? quickImportMatches : filteredMatches) : csvMatches;
    if (!matches) return;

    // Whether any match still needs a hero before importing. Events the user
    // explicitly cleared via "No hero (clear)" are stored as ACKNOWLEDGED_UNKNOWN:
    // their matches keep heroPlayed === "Unknown", but the user HAS resolved them,
    // so they must not block the import. A raw per-match scan can't tell an
    // acknowledged unknown from an unresolved one (both read "Unknown"), which is
    // why clearing every post-cutoff event used to leave the user stuck on a
    // contradictory "0 events need a hero" hard warning. For the paste/extension
    // flow we build per-match gate items with overrides applied and the event's
    // resolved state (heroOverrides) attached; CSV has no per-event review UI, so
    // every match is treated as unresolved.
    const gateItems = pasteResult
      ? (quickMode ? quickFilteredEvents : filteredEvents).flatMap(({ event, origIdx }) =>
          event.matches
            .map((m, matchIdx) => ({ m, matchIdx }))
            // Quick mode only imports non-duplicate matches.
            .filter(({ m }) => !quickMode || !existingFingerprints?.has(importFingerprint(m)))
            .map(({ m, matchIdx }) => ({
              date: m.date,
              heroPlayed: applyImportOverrides(m, origIdx, matchIdx).heroPlayed,
              // An entry in heroOverrides means the user set a hero or cleared it.
              resolved: Boolean(heroOverrides[origIdx]),
            }))
        )
      : matches.map((m) => ({ date: m.date, heroPlayed: m.heroPlayed, resolved: false }));

    const { hasAnyMissing, hasPostCutoffMissing } = computeHeroGate(gateItems);

    if (hasPostCutoffMissing) {
      setShowHeroWarning(true);
      setHeroRequiredHard(true);
    } else if (hasAnyMissing) {
      setShowHeroWarning(true);
      setHeroRequiredHard(false);
    } else {
      handleImport();
    }
  }

  async function handleImport() {
    const matches = pasteResult ? (quickMode ? quickImportMatches : filteredMatches) : csvMatches;
    if (!matches || (!user && !isGuest)) return;
    // Snapshot the matches we're about to import so the loader text always
    // matches what the user just confirmed on the preview — even if a
    // useMemo dependency causes quickImportMatches to recompute mid-import.
    setImportingMatches(matches);
    setImporting(true);

    // Admin sandbox: route every read/write to the isolated store and skip all
    // Firestore side-effects below. Real account data is never touched.
    const sandbox = isAdmin && sandboxMode;

    // Clear existing data first if requested
    if (clearBeforeImport) {
      if (sandbox) {
        clearSandboxMatches();
      } else if (user) {
        await clearAllMatchesFirestore(user.uid);
        await deleteAllFeedEventsForUser(user.uid);
      }
    }

    // Capture matches before import for recap
    let beforeMatches: MatchRecord[] = [];
    let beforeMatchesLoaded = false;
    try {
      if (sandbox) {
        beforeMatches = getSandboxMatches();
      } else if (user) {
        beforeMatches = await getMatchesByUserId(user.uid);
      } else {
        beforeMatches = getLocalMatches();
      }
      beforeMatchesLoaded = true;
    } catch {
      // If we can't get before matches, recap will still work with empty array
    }

    // Enrich matches with opponent heroes from coverage data
    let coverageHeroCount = 0;
    if (!quickMode) {
      try {
        const { getAllCoverageMatches } = await import("@/lib/sitemap-scraper");
        const { buildCoverageIndex, findOpponentHero } = await import("@/lib/coverage-lookup");
        const coverageMatches = await getAllCoverageMatches();
        if (coverageMatches.length > 0) {
          const index = buildCoverageIndex(coverageMatches);
          for (const m of matches) {
            if (m.opponentHero && m.opponentHero !== "Unknown") continue;
            if (!m.opponentName) continue;
            const lookup = findOpponentHero(
              m.opponentName,
              m.date,
              m.notes || "",
              index
            );
            if (lookup && lookup.confidence === "exact") {
              (m as Record<string, unknown>).opponentHero = lookup.hero;
              coverageHeroCount++;
            }
          }
        }
      } catch {
        // Coverage enrichment is best-effort; don't block import.
      }
    }

    let count: number;
    if (sandbox) {
      count = importSandboxMatches(matches);
    } else if (user) {
      count = await importMatchesFirestore(user.uid, matches);
    } else {
      count = importMatchesLocal(matches);
    }
    setImportedCount(count);
    setSkippedCount(matches.length - count);
    if (coverageHeroCount > 0) {
      setCoverageHerosFilled(coverageHeroCount);
    }

    // Compute session recap + achievements + placements before showing results
    let afterMatches: MatchRecord[] = [];
    let newlyImported: MatchRecord[] = [];
    let detectedNew: Achievement[] = [];
    let freshFinishes: PlayoffFinish[] = [];

    // Session recap always runs — even on a pure re-import where dedup wrote
    // nothing (count 0) — so the user still gets a summary of what they imported.
    try {
      if (sandbox) {
        afterMatches = getSandboxMatches();
      } else if (user) {
        afterMatches = await getMatchesByUserId(user.uid);
      } else {
        afterMatches = getLocalMatches();
      }
      const beforeIds = new Set(beforeMatches.map((m) => m.id));
      newlyImported = afterMatches.filter((m) => !beforeIds.has(m.id));
      // If nothing new was written (re-import), recap the matches just imported
      // so the summary still reflects this session.
      const sessionMatches = newlyImported.length > 0 ? newlyImported : (matches as unknown as MatchRecord[]);
      const recap = computeSessionRecap(beforeMatches, afterMatches, sessionMatches);
      setSessionRecap(recap);

      // Detect match badge tier-up
      const tierUp = detectTierUp("first-match", beforeMatches.length, afterMatches.length);
      if (tierUp) setMatchBadgeTierUp({ tier: tierUp, count: afterMatches.length });
    } catch {
      // Recap computation failed — will fall back to basic completion screen
    }

    // Achievements & placements only when real writes happened (count > 0).
    // Skipped in sandbox mode — detectNewAchievements reads/writes Firestore.
    if (!sandbox && count > 0 && user && profile && afterMatches.length > 0) {
      try {
        const beforeEarnedIds = beforeMatchesLoaded
          ? new Set(evaluateImportAchievements(beforeMatches).map((a) => a.id))
          : new Set<string>();
        const earned = evaluateImportAchievements(afterMatches);
        const sessionNewIds = new Set(
          earned.filter((a) => !beforeEarnedIds.has(a.id)).map((a) => a.id)
        );
        const storedNew = await detectNewAchievements(user.uid, earned);
        detectedNew = beforeMatchesLoaded
          ? storedNew.filter((a) => sessionNewIds.has(a.id))
          : [];
        setNewAchievements(detectedNew);

        const eventStats = computeEventStats(afterMatches);
        const allFinishes = computePlayoffFinishes(eventStats);
        // Only show placements for events that contain newly imported matches
        const newEventKeys = new Set(
          newlyImported.map((m) => `${getEventName(m)}|${m.date}`)
        );
        freshFinishes = allFinishes.filter((f) =>
          newEventKeys.has(`${f.eventName}|${f.eventDate}`)
        );
        setNewPlacements(freshFinishes);
      } catch {
        // Non-critical: celebration just won't show achievements/placements
      }
    }

    // Now show the results
    setImported(true);
    setImporting(false);

    // Tell the browser extension this Quick Sync was confirmed, so its Smart
    // Sync fetches only newer matches next time. The extension's relay content
    // script (fabstats-relay.js) listens for this message and stores the
    // watermark. Best-effort — if nobody's listening, nothing happens.
    if (quickMode && pasteResult) {
      try {
        const wm = computeSyncWatermark(pasteResult);
        if (wm) {
          window.postMessage(
            { __fabstats: "sync-confirmed", eventId: wm.eventId, date: wm.date },
            window.location.origin
          );
        }
      } catch {
        // ignore — extension falls back to a full fetch
      }
    }

    // Post to activity feed + update leaderboard (non-blocking, only for signed-in users with a profile).
    // Skipped in sandbox mode — these all write Firestore / cross-player data.
    if (!sandbox && user && profile && count > 0) {
      const heroCounts: Record<string, number> = {};
      const heroSource = newlyImported.length > 0 ? newlyImported : matches;
      for (const m of heroSource) {
        if (m.heroPlayed && m.heroPlayed !== "Unknown") {
          heroCounts[m.heroPlayed] = (heroCounts[m.heroPlayed] || 0) + 1;
        }
      }
      const topHeroes = Object.entries(heroCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([hero]) => hero);
      createImportFeedEvent(profile, count, topHeroes, method || undefined).catch(() => {});
      trackImportMethod(method || "unknown", count);
      getMatchesByUserId(user.uid)
        .then((allUserMatches) => updateLeaderboardEntry(profile, allUserMatches))
        .catch(() => {});

      // Auto-save GEM ID from CSV metadata or extension metadata
      const newGemId = csvMetadata?.gemId || pasteResult?.extensionMeta?.userGemId;
      if (newGemId && !profile.gemId) {
        updateProfile(user.uid, { gemId: newGemId }).catch(() => {});
      }
      // Always register GEM ID in lookup table (covers paste imports where profile.gemId was set via settings)
      const gemIdToRegister = newGemId || profile.gemId;
      if (gemIdToRegister) {
        registerGemId(user.uid, gemIdToRegister).catch(() => {});
      }

      // Placement feed events (non-blocking, dedup handled in createPlacementFeedEvent)
      for (const finish of freshFinishes) {
        const eventMatches = afterMatches.filter((m) => getEventName(m) === finish.eventName && m.date === finish.eventDate);
        const hero = eventMatches[0]?.heroPlayed;
        createPlacementFeedEvent(profile, finish, hero).catch(() => {});
      }

      // Cross-player match linking + H2H + community matchups (non-blocking)
      getMatchesByUserId(user.uid)
        .then((allMatches) => {
          linkMatchesWithOpponents(user.uid, allMatches);
          computeH2HForUser(user.uid, allMatches);
          updateCommunityHeroMatchups(user.uid, allMatches);
        })
        .catch(() => {});
    }
  }

  // Admin-only sandbox banner/toggle, shared by the main page and the Quick
  // Sync preview (the screen the extension/bookmarklet land on).
  function renderSandboxBar() {
    if (!isAdmin) return null;
    return sandboxActive ? (
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-purple-500/40 bg-purple-500/10 px-4 py-3">
        <span className="inline-flex items-center gap-1.5 rounded bg-purple-500/20 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-purple-300">
          🧪 Sandbox mode
        </span>
        <p className="min-w-0 flex-1 text-sm text-purple-200">
          <strong>All imports</strong> (extension, bookmarklet, quick sync, paste) go to an <strong>isolated test store</strong> until you turn this off — your real account, leaderboard, feed and stats are untouched.
        </p>
        <Link href="/admin/sandbox" className="shrink-0 text-sm font-semibold text-purple-300 underline hover:text-purple-200">
          View sandbox →
        </Link>
        <button
          type="button"
          onClick={() => setSandbox(false)}
          className="shrink-0 rounded-md border border-purple-500/40 px-2.5 py-1 text-xs font-semibold text-purple-200 hover:bg-purple-500/20"
        >
          Turn off
        </button>
      </div>
    ) : (
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setSandbox(true)}
          className="rounded-md border border-fab-border bg-fab-bg px-3 py-1.5 text-xs font-medium text-fab-dim hover:border-purple-500/40 hover:text-purple-300"
          title="Route all imports (including the extension) into an isolated test store instead of your account"
        >
          🧪 Enable sandbox mode
        </button>
      </div>
    );
  }

  function handleReset() {
    setPasteResult(null);
    setCsvMatches(null);
    setCsvMetadata(null);
    setPasteText("");
    setError("");
    setImported(false);
    setSkippedCount(0);
    setCoverageHerosFilled(0);
    setFilterFormat("all");
    setFilterEventType("all");
    setExpandedEvent(null);
    setMethod(null);
    setAutoDetected(false);
    setHeroOverrides({});
    setOpponentHeroOverrides({});
    setTurnOrderOverrides({});
    setDay2BoundaryOverrides({});
    setExcludedEventIdxs(new Set());
    setMatchHeroOverrides({});
    setMatchFormatOverrides({});
    setSessionRecap(null);
    setNewAchievements([]);
    setNewPlacements([]);
    setMatchBadgeTierUp(null);
  }

  async function handleClearAll() {
    if (isAdmin && sandboxMode) {
      setClearing(true);
      clearSandboxMatches();
      setCleared(true);
      setConfirmClear(false);
      setClearing(false);
      return;
    }
    if (!user) return;
    setClearing(true);
    try {
      await clearAllMatchesFirestore(user.uid);
      await deleteAllFeedEventsForUser(user.uid);
      setCleared(true);
      setConfirmClear(false);
    } catch {
      setError("Failed to clear matches. Please try again.");
    }
    setClearing(false);
  }

  const hasResults = pasteResult || csvMatches;
  const pendingImportMatches = pasteResult ? (quickMode ? quickImportMatches : filteredMatches) : (csvMatches ?? []);
  const totalToImport = pendingImportMatches.length;
  const allMatches = pasteResult ? (quickMode ? quickImportMatches : filteredMatches) : (csvMatches ?? []);

  // Shared "Heroes missing!" modal. Rendered both in the Quick Sync branch
  // (which has an early return) and in the main return, so the warning
  // fires correctly when Quick Sync users click Import without a hero.
  const renderHeroWarningModal = () => {
    if (!showHeroWarning) return null;
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowHeroWarning(false); setConfirmSkipHero(false); }} />
        <div className="relative bg-fab-bg border border-fab-border rounded-xl shadow-2xl w-full max-w-md p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-fab-loss/15 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-fab-loss" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-fab-text">Heroes Missing!</h3>
          </div>
          {heroRequiredHard ? (
            <>
              <p className="text-sm text-fab-muted mb-2">
                {missingHeroEvents.postCutoff.length} event{missingHeroEvents.postCutoff.length !== 1 ? "s" : ""} from Feb 24, 2026 onward {missingHeroEvents.postCutoff.length === 1 ? "needs" : "need"} a hero selection before importing:
              </p>
              <ul className="text-sm mb-3 space-y-1">
                {missingHeroEvents.postCutoff.map(({ event, origIdx }) => (
                  <li key={origIdx} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-fab-loss shrink-0" />
                    <span className="text-fab-text">{event.eventName}</span>
                    <span className="text-fab-dim text-xs">({event.eventDate})</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-fab-muted mb-2">
                Set the hero for {missingHeroEvents.postCutoff.length === 1 ? "that event" : "those events"} — use &quot;No hero (clear)&quot; if you don&apos;t remember.
                {missingHeroEvents.preCutoff > 0 && ` Your ${missingHeroEvents.preCutoff} older event${missingHeroEvents.preCutoff !== 1 ? "s" : ""} can still import without a hero.`}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-fab-muted mb-2">
                {pasteResult
                  ? `${missingHeroEvents.all.length} of your ${filteredEvents.length} event${filteredEvents.length !== 1 ? "s" : ""} ${missingHeroEvents.all.length === 1 ? "is" : "are"} missing hero information.`
                  : "Your matches are missing hero information."}
              </p>
              <p className="text-sm text-fab-muted mb-2">
                Without heroes, your stats will be incomplete and your placements will show without a hero on the feed.
              </p>
              <p className="text-sm text-fab-muted mb-5">
                Set heroes per event in the preview above, or use the Browser Extension for automatic detection.
              </p>
            </>
          )}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                setShowHeroWarning(false);
                setConfirmSkipHero(false);
                setHeroRequiredHard(false);
                const first = missingHeroEvents.postCutoff[0] ?? missingHeroEvents.all[0];
                if (first) {
                  const displayIdx = filteredEvents.findIndex((e) => e.origIdx === first.origIdx);
                  if (displayIdx >= 0) {
                    if (displayIdx >= visibleEventCount) setVisibleEventCount(displayIdx + 1);
                    setExpandedEvent(displayIdx);
                    requestAnimationFrame(() => {
                      eventCardRefs.current[displayIdx]?.scrollIntoView({ behavior: "smooth", block: "center" });
                    });
                  }
                }
              }}
              className="w-full min-h-[44px] py-2.5 rounded-lg font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors text-sm"
            >
              Go Back &amp; Add Heroes
            </button>
            {!heroRequiredHard && (
              !confirmSkipHero ? (
                <button
                  onClick={() => setConfirmSkipHero(true)}
                  className="w-full min-h-[44px] py-2.5 rounded-lg font-semibold bg-fab-surface border border-fab-border text-fab-dim hover:text-fab-muted transition-colors text-xs"
                >
                  Import without heroes...
                </button>
              ) : (
                <button
                  onClick={() => { setShowHeroWarning(false); setConfirmSkipHero(false); handleImport(); }}
                  className="w-full min-h-[44px] py-2.5 rounded-lg font-semibold bg-fab-loss/20 border border-fab-loss/30 text-fab-loss hover:bg-fab-loss/30 transition-colors text-sm"
                >
                  Yes, import without heroes
                </button>
              )
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── Quick Mode Preview Screen ──────────────────────────────────

  if (quickMode && !imported) {
    // Still loading fingerprints
    if (!quickPreviewReady || importing) {
      return (
        <div className="text-center py-16">
          <div className="w-12 h-12 border-4 border-fab-border border-t-fab-gold rounded-full animate-spin mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-fab-gold mb-2">{importing ? "Importing..." : "Quick Syncing..."}</h1>
          <p className="text-fab-muted">
            {importing ? `Importing ${formatImportCount(importingMatches ?? pendingImportMatches)}` : "Checking for new events"}
          </p>
        </div>
      );
    }

    // No new events. If the user removed every event, offer to restore rather
    // than implying they were all duplicates.
    if (quickFilteredEvents.length === 0) {
      if (excludedEventIdxs.size > 0) {
        return (
          <div className="text-center py-16">
            <h1 className="text-2xl font-bold text-fab-gold mb-2">All events removed</h1>
            <p className="text-fab-muted mb-6">You removed every event from this sync. Restore them to import.</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button onClick={() => setExcludedEventIdxs(new Set())} className="px-6 min-h-[48px] py-3 rounded-md font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light active:bg-fab-gold-light transition-colors">
                Restore all events
              </button>
              <button onClick={() => router.push("/")} className="px-6 min-h-[48px] py-3 rounded-md font-semibold bg-fab-surface border border-fab-border text-fab-text hover:bg-fab-surface-hover transition-colors">
                Dashboard
              </button>
            </div>
          </div>
        );
      }
      return (
        <div className="text-center py-16">
          <CheckCircleIcon className="w-14 h-14 text-fab-win mb-4 mx-auto" />
          <h1 className="text-2xl font-bold text-fab-gold mb-2">You&apos;re up to date!</h1>
          <p className="text-fab-muted mb-2">No new matches to import.</p>
          {pasteResult && pasteResult.totalMatches > 0 && (
            <p className="text-fab-dim text-sm mb-6">{pasteResult.totalMatches} match{pasteResult.totalMatches === 1 ? "" : "es"} already in your history.</p>
          )}
          <button onClick={() => router.push("/")} className="px-6 min-h-[48px] py-3 rounded-md font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light active:bg-fab-gold-light transition-colors">
            Dashboard
          </button>
        </div>
      );
    }

    // Has new events — show preview
    const getQuickReviewMatches = (event: PasteImportResult["events"][number]) =>
      event.matches
        .map((match, matchIdx) => ({ match, matchIdx }))
        .filter(({ match }) => !existingFingerprints?.has(importFingerprint(match)));
    const quickNewMatchLabel = formatImportCount(quickImportMatches);

    return (
      <>
      <div className="space-y-6">
        {renderSandboxBar()}
        <div>
          <h1 className="text-2xl font-bold text-fab-gold mb-1">Quick Sync</h1>
          <p className="text-fab-muted text-sm">
            {quickFilteredEvents.length} new event{quickFilteredEvents.length === 1 ? "" : "s"} found ({quickNewMatchLabel}). Review and confirm.
          </p>
          <div className="mt-1"><PrefillStatus state={prefillState} count={prefilledCount} /></div>
        </div>

        {/* Hero warning */}
        {quickFilteredEvents.some(({ event, origIdx }) => {
          const reviewMatches = getQuickReviewMatches(event);
          return !heroOverrides[origIdx] && reviewMatches.every(({ match }) => match.heroPlayed === "Unknown");
        }) && (
          <div className="bg-fab-draw/10 border border-fab-draw/30 rounded-lg p-4 text-sm">
            <p className="text-fab-draw font-medium mb-1">Some events are missing hero info</p>
            <p className="text-fab-muted">Expand events below to set your hero. You can also edit after importing.</p>
          </div>
        )}

        {/* Removed-events restore bar */}
        {excludedEventIdxs.size > 0 && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-fab-border bg-fab-bg/60 px-4 py-2.5 text-sm">
            <span className="text-fab-muted">
              {excludedEventIdxs.size} event{excludedEventIdxs.size === 1 ? "" : "s"} removed from this sync
            </span>
            <button
              type="button"
              onClick={() => setExcludedEventIdxs(new Set())}
              className="font-semibold text-fab-gold hover:text-fab-gold-light transition-colors"
            >
              Restore all
            </button>
          </div>
        )}

        {/* Events list */}
        <div className="space-y-2">
          {quickFilteredEvents.map(({ event, origIdx }, i) => {
            const reviewMatches = getQuickReviewMatches(event);
            const wins = reviewMatches.filter(({ match }) => match.result === MatchResult.Win).length;
            const losses = reviewMatches.filter(({ match }) => match.result === MatchResult.Loss).length;
            const isExpanded = expandedEvent === i;
            const rawOverride = heroOverrides[origIdx];
            const heroValue = rawOverride === ACKNOWLEDGED_UNKNOWN ? "" : (rawOverride || reviewMatches[0]?.match.heroPlayed || "");
            const needsHero = !heroOverrides[origIdx] && reviewMatches.every(({ match }) => match.heroPlayed === "Unknown");
            const qDay2Boundary = day2Boundaries.get(origIdx) ?? null;
            const qDay2Auto = computeDay2Boundary(event.matches as MatchRecord[]);
            // Day-2 boundary is a round NUMBER; the segment editor works in match
            // POSITIONS. Convert to the 1-based position of the first day-2 match
            // so the pre-seeded split is correct even with byes / non-contiguous rounds.
            const qDay2SplitPos = qDay2Boundary != null
              ? (event.matches.findIndex((m) => isDay2Match(m as MatchRecord, qDay2Boundary)) + 1) || undefined
              : undefined;

            return (
              <div key={i} ref={(el) => { eventCardRefs.current[i] = el; }} className="bg-fab-surface border border-fab-border rounded-lg">
                <button
                  onClick={() => setExpandedEvent(isExpanded ? null : i)}
                  className={`w-full p-4 text-left hover:bg-fab-surface-hover transition-colors ${isExpanded ? "rounded-t-lg" : "rounded-lg"}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-fab-text">{event.eventName}</span>
                        {event.rated && <span className="px-1.5 py-0.5 rounded bg-fab-gold/15 text-fab-gold text-xs">Rated</span>}
                        {needsHero && <span className="px-1.5 py-0.5 rounded bg-fab-draw/15 text-fab-draw text-xs">Missing Hero</span>}
                        {qDay2Boundary != null && <span className="px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 text-xs font-bold">Day 2</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-fab-dim">
                        <span>{event.eventDate}</span>
                        {event.venue && <span>at {event.venue}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="px-2 py-0.5 rounded bg-fab-bg text-fab-dim text-xs">{event.format}</span>
                      <span className="px-2 py-0.5 rounded bg-fab-bg text-fab-dim text-xs">{event.eventType}</span>
                      <span className={`text-sm font-bold ${wins > losses ? "text-fab-win" : wins < losses ? "text-fab-loss" : "text-fab-draw"}`}>
                        {wins}W-{losses}L
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label="Remove this event from the sync"
                        title="Remove from this sync"
                        onClick={(e) => { e.stopPropagation(); setExcludedEventIdxs((prev) => new Set(prev).add(origIdx)); }}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setExcludedEventIdxs((prev) => new Set(prev).add(origIdx)); } }}
                        className="text-fab-dim hover:text-fab-loss transition-colors cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </span>
                      {isExpanded ? <ChevronUpIcon className="w-4 h-4 text-fab-dim" /> : <ChevronDownIcon className="w-4 h-4 text-fab-dim" />}
                    </div>
                  </div>
                </button>
                {isExpanded && (
                  <div className="border-t border-fab-border px-4 pb-4 pt-3 space-y-3">
                    {/* Hero selection */}
                    <div onClick={(e) => e.stopPropagation()}>
                      <HeroSelect
                        value={heroValue === "Unknown" ? "" : heroValue}
                        onChange={(val) => {
                          setHeroOverrides((prev) => val && val !== "Unknown" && val !== "" ? { ...prev, [origIdx]: val } : { ...prev, [origIdx]: ACKNOWLEDGED_UNKNOWN });
                        }}
                        label="Your Hero"
                        format={event.format}
                        allowClear
                      />
                    </div>
                    {/* Day 2 control */}
                    {(qDay2Auto != null || day2BoundaryOverrides[origIdx] != null || couldBeDay2(event.matches as MatchRecord[])) && (
                      <Day2Control
                        boundary={qDay2Boundary}
                        auto={qDay2Auto != null}
                        onSetRound={(n) => setDay2BoundaryOverrides((prev) => ({ ...prev, [origIdx]: n }))}
                        onTurnOff={() => setDay2BoundaryOverrides((prev) => ({ ...prev, [origIdx]: "off" }))}
                        onEnable={() => setDay2BoundaryOverrides((prev) => {
                          if (qDay2Auto != null) { const { [origIdx]: _, ...rest } = prev; return rest; }
                          return { ...prev, [origIdx]: suggestedManualDay2Round(event.matches as MatchRecord[]) };
                        })}
                      />
                    )}
                    {/* Per-round hero/format editor for multi-format / draft events */}
                    <PerRoundEditor
                      open={!!segEditorEvents[origIdx]}
                      onToggle={() => setSegEditorEvents((prev) => ({ ...prev, [origIdx]: !prev[origIdx] }))}
                      matchCount={event.matches.length}
                      defaultHero={heroValue || ""}
                      defaultFormat={event.format}
                      splitAt={qDay2SplitPos}
                      onApply={(a, segs) => applySegmentAssignments(origIdx, a, segs)}
                      initialSegments={segmentsByEvent[origIdx]}
                    />
                    {/* Matches with opponent hero editing */}
                    <div className="space-y-2">
                      {reviewMatches.map(({ match, matchIdx }) => {
                        const oppKey = `${origIdx}-${matchIdx}`;
                        const oppHero = opponentHeroOverrides[oppKey] || match.opponentHero || "";
                        const hasTurnOrder = Object.prototype.hasOwnProperty.call(turnOrderOverrides, oppKey);
                        const turnOrder = hasTurnOrder ? turnOrderOverrides[oppKey] : match.goingFirst;
                        const roundInfo = match.notes?.split(" | ")[1]?.trim() || "";
                        const style = match.result === MatchResult.Win ? "border-l-fab-win bg-fab-win/[0.03]" :
                                      match.result === MatchResult.Loss ? "border-l-fab-loss bg-fab-loss/[0.03]" :
                                      match.result === MatchResult.Draw ? "border-l-fab-draw bg-fab-draw/[0.03]" :
                                      "border-l-fab-dim bg-fab-muted/[0.02]";
                        return (
                          <div key={matchIdx} className={`border-l-2 ${style} rounded-r-lg px-3 py-2`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`text-xs font-bold ${
                                  match.result === MatchResult.Win ? "text-fab-win" :
                                  match.result === MatchResult.Loss ? "text-fab-loss" :
                                  match.result === MatchResult.Draw ? "text-fab-draw" : "text-fab-dim"
                                }`}>
                                  {match.result === MatchResult.Bye ? "BYE" : match.result.toUpperCase()}
                                </span>
                                {roundInfo && <span className="text-[10px] text-fab-dim">{roundInfo}</span>}
                                <span className="text-sm text-fab-text truncate">vs {match.opponentName || "Unknown"}</span>
                              </div>
                            </div>
                            {match.result !== MatchResult.Bye && (
                              <div className="mt-1.5 space-y-2" onClick={(e) => e.stopPropagation()}>
                                <HeroSelect
                                  value={oppHero === "Unknown" ? "" : oppHero}
                                  onChange={(val) => {
                                    userTouchedOppKeysRef.current.add(oppKey);
                                    setOpponentHeroOverrides((prev) => val && val !== "Unknown" ? { ...prev, [oppKey]: val } : (() => { const { [oppKey]: _, ...rest } = prev; return rest; })());
                                  }}
                                  label="Opp Hero"
                                  format={event.format}
                                  allowClear
                                />
                                <div className="grid gap-2 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start">
                                  <TurnOrderPicker
                                    value={turnOrder}
                                    onChange={(value) => {
                                      setTurnOrderOverrides((prev) => {
                                        if (value === undefined) {
                                          const { [oppKey]: _, ...rest } = prev;
                                          return rest;
                                        }
                                        return { ...prev, [oppKey]: value };
                                      });
                                    }}
                                  />
                                  <div>
                                    <label className="mb-1 block text-xs font-medium text-fab-muted" htmlFor={`import-notes-${oppKey}`}>
                                      Notes
                                    </label>
                                    <textarea
                                      id={`import-notes-${oppKey}`}
                                      rows={1}
                                      maxLength={2000}
                                      placeholder="Optional — e.g. 'mulligan'd to 0', 'opp on first', etc."
                                      value={matchNotesOverrides[oppKey] ?? match.matchNotes ?? ""}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        setMatchNotesOverrides((prev) => ({ ...prev, [oppKey]: v }));
                                      }}
                                      className="w-full resize-y rounded-md border border-fab-border bg-fab-bg px-2 py-1.5 text-xs text-fab-text placeholder:text-fab-dim focus:border-fab-gold/60 focus:outline-none focus:ring-2 focus:ring-fab-gold/30"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Light opponent hero warning — only while there are still unknown opponents */}
        {quickConfirmImport && quickFilteredEvents.some(({ event, origIdx }) =>
          getQuickReviewMatches(event).some(({ match, matchIdx }) => match.result !== MatchResult.Bye && (!match.opponentHero || match.opponentHero === "Unknown") && !opponentHeroOverrides[`${origIdx}-${matchIdx}`])
        ) && (
          <div className="bg-fab-surface border border-fab-draw/30 rounded-lg p-3 text-sm flex items-start gap-2">
            <svg className="w-4 h-4 text-fab-draw shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <p className="text-fab-muted">
              <span className="font-semibold text-fab-text">Some opponent heroes are unknown.</span>{" "}
              They&apos;ll auto-fill once your opponents (who use FaB Stats) import their side.{" "}
              <span className="font-semibold text-fab-draw">Click Import again to add them anyway.</span>
            </p>
          </div>
        )}

        {/* Import button */}
        {(() => {
          const hasUnknownOpp = quickFilteredEvents.some(({ event, origIdx }) =>
            getQuickReviewMatches(event).some(({ match, matchIdx }) => match.result !== MatchResult.Bye && (!match.opponentHero || match.opponentHero === "Unknown") && !opponentHeroOverrides[`${origIdx}-${matchIdx}`])
          );
          const showConfirm = hasUnknownOpp && !quickConfirmImport;
          const confirming = hasUnknownOpp && quickConfirmImport;
          return (
            <button
              onClick={() => {
                if (showConfirm) { setQuickConfirmImport(true); return; }
                handleImportClick();
              }}
              disabled={importing}
              className="w-full py-3 rounded-md font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors disabled:opacity-50"
            >
              {importing ? "Importing..." : confirming ? `Import ${quickNewMatchLabel} anyway` : `Import ${quickNewMatchLabel}`}
            </button>
          );
        })()}
      </div>
      {renderHeroWarningModal()}
      </>
    );
  }

  // ── Import Complete Screen ─────────────────────────────────────

  if (imported) {
    // Quick mode: "You're up to date!" when nothing new
    if (quickMode && importedCount === 0) {
      return (
        <div className="text-center py-16">
          <CheckCircleIcon className="w-14 h-14 text-fab-win mb-4 mx-auto" />
          <h1 className="text-2xl font-bold text-fab-gold mb-2">You&apos;re up to date!</h1>
          <p className="text-fab-muted mb-2">No new matches to import.</p>
          {skippedCount > 0 && (
            <p className="text-fab-dim text-sm mb-6">{skippedCount} match{skippedCount === 1 ? "" : "es"} already in your history.</p>
          )}
          {skippedCount === 0 && <div className="mb-6" />}
          <button onClick={() => router.push("/")} className="px-6 min-h-[48px] py-3 rounded-md font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light active:bg-fab-gold-light transition-colors">
            Dashboard
          </button>
        </div>
      );
    }

    if (sessionRecap && sessionRecap.sessionMatches.length > 0) {
      return (
        <PostEventRecap
          recap={sessionRecap}
          onViewOpponents={() => router.push("/opponents")}
          onDashboard={() => router.push("/")}
          onImportMore={handleReset}
          skippedCount={skippedCount}
          newAchievements={newAchievements}
          newPlacements={newPlacements}
          playerName={profile?.displayName || profile?.username}
          matchBadgeTierUp={matchBadgeTierUp}
          quickMode={quickMode}
        />
      );
    }

    return (
      <div className="text-center py-16">
        <CheckCircleIcon className="w-14 h-14 text-fab-win mb-4 mx-auto" />
        <h1 className="text-2xl font-bold text-fab-gold mb-2">{quickMode ? "Sync Complete!" : "Import Complete!"}</h1>
        <p className="text-fab-muted mb-2">{importedCount} matches imported successfully.</p>
        {skippedCount > 0 && (
          <p className="text-fab-dim text-sm mb-2">{skippedCount} duplicate{skippedCount === 1 ? "" : "s"} skipped.</p>
        )}
        {coverageHerosFilled > 0 && (
          <p className="text-purple-400 text-sm mb-2">{coverageHerosFilled} opponent hero{coverageHerosFilled === 1 ? "" : "es"} auto-filled from tournament data.</p>
        )}
        {skippedCount === 0 && coverageHerosFilled === 0 && <div className="mb-6" />}
        {(skippedCount > 0 || coverageHerosFilled > 0) && <div className="mb-4" />}
        <div className="flex gap-3 justify-center flex-wrap">
          <button onClick={() => router.push("/opponents")} className="px-6 min-h-[48px] py-3 rounded-md font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light active:bg-fab-gold-light transition-colors">
            View Opponent Stats
          </button>
          <button onClick={() => router.push("/")} className="px-6 min-h-[48px] py-3 rounded-md font-semibold bg-fab-surface border border-fab-border text-fab-text hover:bg-fab-surface-hover active:bg-fab-surface-hover transition-colors">
            Dashboard
          </button>
          <button onClick={handleReset} className="px-6 min-h-[48px] py-3 rounded-md font-semibold bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text active:bg-fab-surface-hover transition-colors">
            Import More
          </button>
        </div>
      </div>
    );
  }

  // ── Main Import Page ───────────────────────────────────────────

  const flowStep = imported ? 3 : hasResults ? (missingHeroEvents.all.length > 0 ? 2 : 1) : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHero
        eyebrow={shareMode ? "Event Recap" : "GEM Import"}
        title={shareMode ? "Share your tournament result" : "Import your matches"}
        description={shareMode
          ? "Paste your latest GEM event and turn it into a clean recap card with your record, finish, and hero."
          : "Bring your official GEM history into FaB Stats with a guided review step, duplicate protection, and clearer hero cleanup before anything is saved."}
        icon={<UploadCloud className="h-4 w-4" />}
        actions={(
          <a href="https://gem.fabtcg.com/profile/history/" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center rounded-md border border-fab-border bg-fab-bg px-4 text-sm font-semibold text-fab-text hover:border-fab-gold/40 hover:text-fab-gold">
            Open GEM
          </a>
        )}
        metrics={[
          { label: "Best Path", value: "Extension", sub: "auto hero detection" },
          { label: "Fallback", value: "Paste", sub: "works anywhere" },
          { label: "Review", value: "Before Save", sub: "you stay in control" },
          { label: "Duplicates", value: "Skipped", sub: "automatically" },
        ]}
      />
      <ImportFlowDiagram activeStep={flowStep} />

      {/* Admin-only import sandbox controls */}
      {renderSandboxBar()}

      <h1 className="sr-only">{shareMode ? "Share your tournament result" : "Import Your Matches"}</h1>
      <p className="sr-only">
        {shareMode ? "Paste your latest event from " : "Pull in your match history from "}
        <a href="https://gem.fabtcg.com/profile/history/" target="_blank" rel="noopener noreferrer" className="text-fab-gold hover:text-fab-gold-light underline">
          GEM
        </a>
        {shareMode
          ? " and we'll generate a shareable recap card with your stats."
          : " — the official Flesh and Blood tournament site where your event results are recorded. Pick a method below to get started."}
      </p>

      {!user && !isGuest && (
        <div className="bg-fab-gold/10 border border-fab-gold/30 rounded-lg p-4 mb-6">
          <p className="text-fab-gold font-semibold mb-1">Sign up to save your matches</p>
          <p className="text-fab-muted text-sm mb-3">Create a free account to import and track your tournament history, view stats, and appear on the leaderboard.</p>
          <Link
            href="/login"
            className="inline-block px-4 py-2 rounded-lg text-sm font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors"
          >
            Sign Up
          </Link>
        </div>
      )}

      {error && (
        <div className="bg-fab-loss/10 border border-fab-loss/30 text-fab-loss rounded-md px-4 py-3 text-sm mb-4">{error}</div>
      )}

      {/* GEM Auto-Sync (hidden in sandbox mode — it syncs the real account) */}
      {user && !isGuest && !hasResults && !sandboxActive && (
        <div className="mb-6">
          <GemAutoSync />
        </div>
      )}

      {!hasResults && (
        <div className="grid gap-3 lg:grid-cols-4">
          {[
            {
              id: "extension" as ImportMethod,
              title: "Fastest and cleanest",
              text: "Install once, export from GEM, and keep hero data intact.",
              icon: <Sparkles className="h-5 w-5" />,
              badge: "Recommended",
            },
            {
              id: "bookmarklet" as ImportMethod,
              title: "Mobile quick sync",
              text: "Set up a bookmarklet when extensions are not available.",
              icon: <MousePointerClick className="h-5 w-5" />,
              badge: "Mobile",
            },
            {
              id: "paste" as ImportMethod,
              title: "No install fallback",
              text: "Copy your GEM history page and paste it for a guided review.",
              icon: <ClipboardPaste className="h-5 w-5" />,
              badge: "Fallback",
            },
            {
              id: "csv" as ImportMethod,
              title: "Advanced upload",
              text: "Use a file when you already have exported match data.",
              icon: <FileText className="h-5 w-5" />,
              badge: "Advanced",
            },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setMethod(option.id)}
              className={`fab-step-card rounded-lg p-4 text-left transition-colors ${method === option.id ? "border-fab-gold/50" : "hover:border-fab-gold/30"}`}
              data-active={method === option.id}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-fab-border bg-fab-bg text-fab-gold">
                  {option.icon}
                </span>
                <span className="rounded-full border border-fab-border bg-fab-bg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-fab-muted">
                  {option.badge}
                </span>
              </div>
              <p className="font-bold text-fab-text">{option.title}</p>
              <p className="mt-1 text-sm leading-5 text-fab-muted">{option.text}</p>
            </button>
          ))}
        </div>
      )}

      {/* Method Selection Cards */}
      {!hasResults && (
        <div className="space-y-3 mb-6">

          {/* ── Method 1: Browser Extension ── */}
          <div
            onClick={() => setMethod(method === "extension" ? null : "extension")}
            className={`bg-fab-surface border rounded-lg cursor-pointer transition-all ${method === "extension" ? "border-fab-gold ring-1 ring-fab-gold/30" : "border-fab-border hover:border-fab-muted"}`}
          >
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-fab-gold/15 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-5 h-5 text-fab-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-fab-text">Browser Extension</h3>
                    <span className="px-1.5 py-0.5 rounded bg-fab-gold/15 text-fab-gold text-xs font-semibold">Recommended</span>
                  </div>
                  <p className="text-sm text-fab-muted mt-0.5">One-click export with automatic hero detection. Works on Chrome, Firefox, Edge &amp; more.</p>
                </div>
                <svg className={`w-5 h-5 text-fab-dim shrink-0 mt-1 transition-transform ${method === "extension" ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {method === "extension" && (
              <div className="border-t border-fab-border px-4 pb-4 pt-3" onClick={(e) => e.stopPropagation()}>
                <div className="space-y-4">
                  <a
                    href="https://chromewebstore.google.com/detail/fab-stats-gem-exporter/kcaaaibikofempdbphoeeljdbjakhmjh"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-fab-gold text-fab-bg font-semibold hover:bg-fab-gold-light transition-colors text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Add to Chrome
                  </a>
                  <p className="text-xs text-fab-muted">
                    Install from the Chrome Web Store. Also works on Edge, Brave, and Arc.
                  </p>

                  {/* Firefox install */}
                  <button
                    onClick={() => setShowOtherBrowsers(!showOtherBrowsers)}
                    className="w-full flex items-center justify-between bg-fab-bg rounded-lg p-4 text-left hover:bg-fab-bg/80 transition-colors"
                  >
                    <span className="text-sm font-semibold text-fab-text">Using Firefox?</span>
                    <svg className={`w-4 h-4 text-fab-dim transition-transform ${showOtherBrowsers ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showOtherBrowsers && (
                    <div className="bg-fab-bg rounded-lg p-4 space-y-3">
                      {/* NOTE: link goes live once the AMO listing is approved. When
                          creating the listing, use the slug "fab-stats-gem-exporter"
                          so this URL resolves. See SUBMITTING-FIREFOX.md in the repo root. */}
                      <a
                        href="https://addons.mozilla.org/firefox/addon/fab-stats-gem-exporter/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-fab-gold text-fab-bg font-semibold hover:bg-fab-gold-light transition-colors text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Add to Firefox
                      </a>
                      <p className="text-xs text-fab-muted">
                        Install from Firefox Add-ons — permanent, with automatic updates. Same one-click export as Chrome.
                      </p>

                      <details className="group">
                        <summary className="text-xs text-fab-dim cursor-pointer hover:text-fab-muted select-none">
                          Prefer a manual install?
                        </summary>
                        <ol className="text-sm text-fab-muted space-y-2.5 list-decimal list-inside mt-3">
                          <li>
                            <a href="/fab-stats-extension.zip" download className="text-fab-gold hover:underline font-semibold">Download the extension zip</a>{" "}
                            and <strong className="text-fab-text">unzip</strong> it
                          </li>
                          <li>
                            Type{" "}
                            <code className="px-1.5 py-0.5 rounded bg-fab-surface text-fab-gold text-xs font-mono select-all">about:debugging#/runtime/this-firefox</code>{" "}
                            in the address bar
                          </li>
                          <li>
                            Click{" "}
                            <strong className="text-fab-text">&quot;Load Temporary Add-on&quot;</strong>{" "}
                            and select <strong className="text-fab-text">manifest.json</strong> from the unzipped folder
                          </li>
                        </ol>
                        <p className="text-xs text-fab-dim mt-2">Temporary add-ons reset when Firefox restarts — you&apos;ll need to reload each session.</p>
                      </details>
                    </div>
                  )}

                  <div className="bg-fab-bg rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-fab-text mb-3">To export your matches:</h4>
                    <ol className="text-sm text-fab-muted space-y-2.5 list-decimal list-inside">
                      <li>
                        Go to your{" "}
                        <a href="https://gem.fabtcg.com/profile/history/" target="_blank" rel="noopener noreferrer" className="text-fab-gold hover:underline">
                          GEM History page
                        </a>
                      </li>
                      <li>
                        Click the gold{" "}
                        <strong className="text-fab-text">&quot;Export to FaB Stats&quot;</strong>{" "}
                        button in the bottom-right corner
                      </li>
                      <li>
                        <strong className="text-fab-text">Wait</strong> while it automatically expands all events and scrapes every page — this may take a minute
                      </li>
                      <li>
                        When it says <strong className="text-fab-text">&quot;Export Complete&quot;</strong>, click{" "}
                        <strong className="text-fab-text">&quot;Open FaB Stats Import&quot;</strong> — your data will load automatically
                      </li>
                    </ol>
                    <p className="text-xs text-fab-dim mt-3">
                      If the auto-import link doesn&apos;t work, your data is also copied to clipboard. Just paste below:
                    </p>
                  </div>

                  <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="Paste the extension output here (only needed as fallback)..."
                    rows={4}
                    className="w-full bg-fab-bg border border-fab-border rounded-lg px-4 py-3 text-fab-text text-sm outline-none focus:border-fab-gold/50 placeholder:text-fab-dim resize-y font-mono"
                  />
                  <button
                    onClick={handleParsePaste}
                    disabled={!pasteText.trim()}
                    className="w-full py-3 rounded-md font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Parse Matches
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Method 2: Quick Sync Bookmarklet ── */}
          <div
            onClick={() => setMethod(method === "bookmarklet" ? null : "bookmarklet")}
            className={`bg-fab-surface border rounded-lg cursor-pointer transition-all ${method === "bookmarklet" ? "border-fab-gold ring-1 ring-fab-gold/30" : "border-fab-border hover:border-fab-muted"}`}
          >
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-fab-gold/15 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-5 h-5 text-fab-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-fab-text">Quick Sync Bookmarklet</h3>
                    <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 text-xs font-semibold">Mobile Friendly</span>
                  </div>
                  <p className="text-sm text-fab-muted mt-0.5">One-tap import from GEM — no extension needed. Works on mobile and desktop.</p>
                </div>
                <svg className={`w-5 h-5 text-fab-dim shrink-0 mt-1 transition-transform ${method === "bookmarklet" ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {method === "bookmarklet" && (
              <div className="border-t border-fab-border px-4 pb-4 pt-3" onClick={(e) => e.stopPropagation()}>
                <div className="space-y-4">
                  <Link
                    href="/bookmarklet"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-fab-gold text-fab-bg font-semibold hover:bg-fab-gold-light transition-colors text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    Set Up Bookmarklet
                  </Link>
                  <div className="bg-fab-bg rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-fab-text mb-3">How it works:</h4>
                    <ol className="text-sm text-fab-muted space-y-2.5 list-decimal list-inside">
                      <li>Add the bookmarklet to your browser (one-time setup)</li>
                      <li>
                        Tap it from anywhere — it takes you to your{" "}
                        <a href="https://gem.fabtcg.com/profile/history/" target="_blank" rel="noopener noreferrer" className="text-fab-gold hover:underline">
                          GEM History
                        </a>
                      </li>
                      <li>Tap it again on the history page — matches sync automatically</li>
                      <li>For more history, go to page 2, 3, etc. and tap again. Duplicates are skipped.</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Method 3: Copy & Paste ── */}
          <div
            onClick={() => setMethod(method === "paste" ? null : "paste")}
            className={`bg-fab-surface border rounded-lg cursor-pointer transition-all ${method === "paste" ? "border-fab-gold ring-1 ring-fab-gold/30" : "border-fab-border hover:border-fab-muted"}`}
          >
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-fab-surface flex items-center justify-center shrink-0 mt-0.5 border border-fab-border">
                  <svg className="w-5 h-5 text-fab-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-fab-text">Copy &amp; Paste from GEM</h3>
                  <p className="text-sm text-fab-muted mt-0.5">No installation needed. Copy your GEM history page and paste it here.</p>
                </div>
                <svg className={`w-5 h-5 text-fab-dim shrink-0 mt-1 transition-transform ${method === "paste" ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {method === "paste" && (
              <div className="border-t border-fab-border px-4 pb-4 pt-3" onClick={(e) => e.stopPropagation()}>
                <div className="space-y-4">
                  {/* Collapsible instructions */}
                  <div className="bg-fab-bg rounded-lg overflow-hidden">
                    <button
                      onClick={() => setShowPasteSteps(!showPasteSteps)}
                      className="w-full flex items-center justify-between p-4 min-h-[48px]"
                    >
                      <h4 className="text-sm font-semibold text-fab-text">
                        {showPasteSteps ? "Steps" : "How to copy from GEM"}
                      </h4>
                      <svg
                        className={`w-4 h-4 text-fab-dim transition-transform ${showPasteSteps ? "rotate-180" : ""}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {showPasteSteps && (
                      <div className="px-4 pb-4">
                        <ol className="text-sm text-fab-muted space-y-2 list-decimal list-inside">
                          <li>
                            Go to your{" "}
                            <a href="https://gem.fabtcg.com/profile/history/" target="_blank" rel="noopener noreferrer" className="text-fab-gold hover:underline">
                              GEM History page
                            </a>{" "}
                            and log in
                          </li>
                          <li>Click <strong className="text-fab-text">&quot;View Results&quot;</strong> on each event to expand it</li>
                          {isMobile ? (
                            <>
                              <li>Long-press to start selecting text, then <strong className="text-fab-text">Select All</strong></li>
                              <li>Tap <strong className="text-fab-text">Copy</strong>, then use the paste button below</li>
                            </>
                          ) : (
                            <>
                              <li>Press <kbd className="px-1.5 py-0.5 rounded bg-fab-surface text-fab-gold text-xs font-mono">Ctrl+A</kbd> to select all, then <kbd className="px-1.5 py-0.5 rounded bg-fab-surface text-fab-gold text-xs font-mono">Ctrl+C</kbd> to copy</li>
                              <li>Paste below with <kbd className="px-1.5 py-0.5 rounded bg-fab-surface text-fab-gold text-xs font-mono">Ctrl+V</kbd></li>
                            </>
                          )}
                        </ol>
                        {!isMobile && (
                          <div className="flex items-center gap-3 text-xs text-fab-dim mt-3">
                            <span className="text-fab-muted font-medium">Tip:</span>
                            Drag this to your bookmarks bar to auto-expand all events on GEM:{" "}
                            <a
                              ref={bookmarkletRef}
                              href="#"
                              onClick={(e) => e.preventDefault()}
                              className="inline-block px-2.5 py-1 rounded bg-fab-gold/15 text-fab-gold font-semibold hover:bg-fab-gold/25 transition-colors cursor-grab whitespace-nowrap"
                              title="Drag this to your bookmarks bar"
                            >
                              Expand GEM Events
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="bg-fab-draw/10 border border-fab-draw/20 rounded-lg px-3 py-2 text-xs text-fab-dim">
                    <strong className="text-fab-draw">Note:</strong> If GEM shows multiple pages of history, import each page separately — we&apos;ll skip any duplicates automatically. This method can&apos;t detect which hero you played (use the Browser Extension for that).
                  </div>

                  {/* Paste from Clipboard button (mobile-friendly) */}
                  {isMobile && !pasteText && (
                    <button
                      onClick={async () => {
                        try {
                          const text = await navigator.clipboard.readText();
                          if (text.trim()) {
                            setPasteText(text);
                          }
                        } catch {
                          // Clipboard permission denied — user can still paste manually
                        }
                      }}
                      className="w-full min-h-[48px] py-3 rounded-lg font-semibold bg-fab-surface border-2 border-dashed border-fab-gold/40 text-fab-gold hover:bg-fab-gold/10 active:bg-fab-gold/15 transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Paste from Clipboard
                    </button>
                  )}

                  <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder={isMobile ? "Tap \"Paste from Clipboard\" above or long-press here to paste..." : "Paste your GEM History page here..."}
                    rows={isMobile ? 6 : 10}
                    className="w-full bg-fab-bg border border-fab-border rounded-lg px-4 py-3 text-fab-text text-sm outline-none focus:border-fab-gold/50 placeholder:text-fab-dim resize-y font-mono"
                  />
                  <button
                    onClick={handleParsePaste}
                    disabled={!pasteText.trim()}
                    className="w-full min-h-[48px] py-3 rounded-md font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light active:bg-fab-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Parse Matches
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Method 3: CSV Upload ── */}
          <div
            onClick={() => setMethod(method === "csv" ? null : "csv")}
            className={`bg-fab-surface border rounded-lg cursor-pointer transition-all ${method === "csv" ? "border-fab-gold ring-1 ring-fab-gold/30" : "border-fab-border hover:border-fab-muted"}`}
          >
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-fab-surface flex items-center justify-center shrink-0 mt-0.5 border border-fab-border">
                  <FileIcon className="w-5 h-5 text-fab-muted" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-fab-text">Upload File</h3>
                  <p className="text-sm text-fab-muted mt-0.5">
                    For users of the{" "}
                    <a href="https://github.com/AltarisV/FaB-History-Scraper" target="_blank" rel="noopener noreferrer" className="text-fab-gold hover:underline" onClick={(e) => e.stopPropagation()}>
                      FaB History Scraper
                    </a>{" "}
                    tool, or a <code className="text-fab-gold text-xs">.json</code> file from a large extension export.
                  </p>
                </div>
                <svg className={`w-5 h-5 text-fab-dim shrink-0 mt-1 transition-transform ${method === "csv" ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {method === "csv" && (
              <div className="border-t border-fab-border px-4 pb-4 pt-3" onClick={(e) => e.stopPropagation()}>
                <div className="space-y-4">
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${dragActive ? "border-fab-gold bg-fab-gold/5" : "border-fab-border hover:border-fab-muted"}`}
                  >
                    <FileIcon className="w-10 h-10 text-fab-muted mb-3 mx-auto" />
                    <p className="text-fab-text font-medium mb-1">Drop your file here</p>
                    <p className="text-fab-dim text-sm">CSV or JSON &middot; click to browse</p>
                    <input ref={fileInputRef} type="file" accept=".csv,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Clear & Re-import ────────────────────────────────────── */}
      {user && !hasResults && !cleared && (
        <div className="mt-8 pt-6 border-t border-fab-border">
          <h2 className="text-sm font-semibold text-fab-text mb-2">Clear All Matches</h2>
          <p className="text-xs text-fab-dim mb-3">
            If your existing data has wrong event associations (from an older extension version), you can clear everything and re-import with the updated extension.
          </p>
          {!confirmClear ? (
            <button
              onClick={() => setConfirmClear(true)}
              className="px-4 py-2 rounded-md text-sm font-semibold bg-fab-surface border border-fab-loss/30 text-fab-loss hover:bg-fab-loss/10 transition-colors"
            >
              Clear All Matches...
            </button>
          ) : (
            <div className="bg-fab-loss/10 border border-fab-loss/30 rounded-lg p-4">
              <p className="text-sm text-fab-loss font-semibold mb-2">Are you sure?</p>
              <p className="text-xs text-fab-muted mb-3">
                This will permanently delete all your match data. You&apos;ll need to re-import from GEM afterward.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleClearAll}
                  disabled={clearing}
                  className="px-4 py-2 rounded-md text-sm font-semibold bg-fab-loss text-white hover:bg-fab-loss/80 transition-colors disabled:opacity-50"
                >
                  {clearing ? "Clearing..." : "Yes, Delete All Matches"}
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="px-4 py-2 rounded-md text-sm font-semibold bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cleared success message */}
      {cleared && !hasResults && (
        <div className="bg-fab-win/10 border border-fab-win/30 rounded-lg p-4 mb-6">
          <p className="text-fab-win font-semibold mb-1">All matches cleared!</p>
          <p className="text-fab-muted text-sm">Now re-import your matches using the Browser Extension above for the best results.</p>
        </div>
      )}

      {/* ── Results Preview ─────────────────────────────────────── */}
      {hasResults && (
        <div className="space-y-6">
          <PrefillStatus state={prefillState} count={prefilledCount} />
          {/* Auto-detected from extension */}
          {autoDetected && (
            <div className="bg-fab-gold/10 border border-fab-gold/30 rounded-lg p-4 text-sm">
              <p className="text-fab-gold font-semibold mb-1">Data received from Browser Extension</p>
              <p className="text-fab-muted">Review your matches below and click Import when ready.</p>
            </div>
          )}

          {/* Save disclaimer */}
          {!autoDetected && (
            <div className="bg-sky-900/20 border border-sky-700/30 rounded-lg p-3 text-sm flex items-start gap-2">
              <svg className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              <p className="text-fab-muted">
                Review your matches below. Nothing is saved until you click <strong className="text-fab-text">Import</strong> at the bottom. Re-importing will not overwrite matches you&apos;ve already edited.
              </p>
            </div>
          )}

          {/* Summary stats */}
          <div className="bg-fab-surface border border-fab-border rounded-lg p-4">
            {(() => {
              const wins = allMatches.filter((m) => m.result === MatchResult.Win).length;
              const losses = allMatches.filter((m) => m.result === MatchResult.Loss).length;
              const draws = allMatches.filter((m) => m.result === MatchResult.Draw).length;
              const byes = allMatches.filter((m) => m.result === MatchResult.Bye).length;
              const played = wins + losses + draws;
              const winRate = played > 0 ? ((wins / played) * 100).toFixed(0) : "-";
              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-fab-gold">{pasteResult ? filteredEvents.length : "-"}</p>
                    <p className="text-xs text-fab-muted">Events</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-fab-text">{winRate}%</p>
                    <p className="text-xs text-fab-muted">Win Rate</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      <span className="text-fab-win">{wins}W</span>
                      <span className="text-fab-dim"> - </span>
                      <span className="text-fab-loss">{losses}L</span>
                    </p>
                    <p className="text-xs text-fab-muted">
                      {[
                        draws > 0 ? `${draws} draw${draws !== 1 ? "s" : ""}` : "",
                        byes > 0 ? `${byes} bye${byes !== 1 ? "s" : ""}` : "",
                      ].filter(Boolean).join(" · ") || "Record"}
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-fab-text">{played}{byes > 0 ? <span className="text-fab-dim text-lg"> + {byes}</span> : ""}</p>
                    <p className="text-xs text-fab-muted">{byes > 0 ? "Matches + Byes" : "Matches"}</p>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Filters (paste mode only) */}
          {pasteResult && (
            <div className="flex flex-wrap gap-2">
              {availableFormats.length > 1 && (
                <select
                  value={filterFormat}
                  onChange={(e) => { setFilterFormat(e.target.value); setVisibleEventCount(10); }}
                  className="bg-fab-surface border border-fab-border rounded-md px-3 py-1.5 text-fab-text text-sm outline-none"
                >
                  <option value="all">All Formats ({pasteResult.events.length})</option>
                  {availableFormats.map((f) => (
                    <option key={f} value={f}>{f} ({pasteResult.events.filter((e) => e.format === f).length})</option>
                  ))}
                </select>
              )}
              {availableEventTypes.length > 1 && (
                <select
                  value={filterEventType}
                  onChange={(e) => { setFilterEventType(e.target.value); setVisibleEventCount(10); }}
                  className="bg-fab-surface border border-fab-border rounded-md px-3 py-1.5 text-fab-text text-sm outline-none"
                >
                  <option value="all">All Event Types</option>
                  {availableEventTypes.map((t) => (
                    <option key={t} value={t}>{t} ({pasteResult.events.filter((e) => e.eventType === t).length})</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Events list (paste mode) */}
          {pasteResult && filteredEvents.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-fab-text mb-3">Events ({filteredEvents.length})</h2>
              <div className="space-y-2">
                {filteredEvents.slice(0, visibleEventCount).map(({ event, origIdx }, i) => {
                  const wins = event.matches.filter((m) => m.result === MatchResult.Win).length;
                  const losses = event.matches.filter((m) => m.result === MatchResult.Loss).length;
                  const isExpanded = expandedEvent === i;
                  const rawOverride = heroOverrides[origIdx];
                  const heroValue = rawOverride === ACKNOWLEDGED_UNKNOWN ? "" : (rawOverride || event.matches[0]?.heroPlayed || "");
                  const needsHero = !heroOverrides[origIdx] && event.matches.every((m) => m.heroPlayed === "Unknown");
                  // Post-cutoff events hard-block import without a hero, so the
                  // field must read "required" — not "optional" — for them.
                  const eventIsPostCutoff = event.matches.some((m) => m.date >= HERO_REQUIRED_CUTOFF);

                  const day2Boundary = day2Boundaries.get(origIdx) ?? null;
                  const day2Auto = computeDay2Boundary(event.matches as MatchRecord[]);
                  // Round number → 1-based match position for the pre-seeded split.
                  const day2SplitPos = day2Boundary != null
                    ? (event.matches.findIndex((m) => isDay2Match(m as MatchRecord, day2Boundary)) + 1) || undefined
                    : undefined;

                  // Detect playoff placement from match round labels
                  const playoffRanks: Record<string, number> = { "Finals": 4, "Top 4": 3, "Top 8": 2, "Playoff": 2 };
                  let bestPlayoff: string | null = null;
                  let bestRank = 0;
                  for (const m of event.matches) {
                    const roundInfo = m.notes?.split(" | ")[1]?.trim() || "";
                    const rank = playoffRanks[roundInfo] ?? (/^Round P/i.test(roundInfo) ? 2 : 0);
                    if (rank > bestRank) {
                      bestRank = rank;
                      bestPlayoff = roundInfo === "Playoff" || /^Round P/i.test(roundInfo) ? "Top 8" : roundInfo;
                    }
                  }

                  return (
                    <div key={i} ref={(el) => { eventCardRefs.current[i] = el; }} className="bg-fab-surface border border-fab-border rounded-lg">
                      <button
                        onClick={() => setExpandedEvent(isExpanded ? null : i)}
                        className={`w-full p-4 text-left hover:bg-fab-surface-hover transition-colors ${isExpanded ? "rounded-t-lg" : "rounded-lg"}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-fab-text">{event.eventName}</span>
                              {event.rated && <span className="px-1.5 py-0.5 rounded bg-fab-gold/15 text-fab-gold text-xs">Rated</span>}
                              {bestPlayoff && (
                                <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                                  bestPlayoff === "Finals" ? "bg-yellow-500/20 text-yellow-400" :
                                  bestPlayoff === "Top 4" ? "bg-amber-500/15 text-amber-400" :
                                  bestPlayoff === "Top 8" ? "bg-orange-500/15 text-orange-400" :
                                  "bg-blue-500/15 text-blue-400"
                                }`}>{bestPlayoff}</span>
                              )}
                              {needsHero && (
                                <span className={`px-1.5 py-0.5 rounded text-xs ${
                                  event.matches.some((m) => m.date >= HERO_REQUIRED_CUTOFF)
                                    ? "bg-fab-loss/15 text-fab-loss"
                                    : "bg-fab-draw/15 text-fab-draw"
                                }`}>Missing Hero</span>
                              )}
                              {day2Boundary != null && (
                                <span className="px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 text-xs font-bold">Day 2</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-fab-dim">
                              <span>{event.eventDate}</span>
                              {event.venue && <span>at {event.venue}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="px-2 py-0.5 rounded bg-fab-bg text-fab-dim text-xs">{event.format}</span>
                            <span className="px-2 py-0.5 rounded bg-fab-bg text-fab-dim text-xs">{event.eventType}</span>
                            <span className={`text-sm font-bold ${wins > losses ? "text-fab-win" : wins < losses ? "text-fab-loss" : "text-fab-draw"}`}>
                              {wins}W-{losses}L
                            </span>
                            {isExpanded ? <ChevronUpIcon className="w-4 h-4 text-fab-dim" /> : <ChevronDownIcon className="w-4 h-4 text-fab-dim" />}
                          </div>
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="border-t border-fab-border px-4 pb-4 pt-3 space-y-3">
                          <div onClick={(e) => e.stopPropagation()}>
                            <HeroSelect
                              value={heroValue === "Unknown" ? "" : heroValue}
                              onChange={(val) => {
                                setHeroOverrides((prev) => val && val !== "Unknown" && val !== "" ? { ...prev, [origIdx]: val } : { ...prev, [origIdx]: ACKNOWLEDGED_UNKNOWN });
                              }}
                              label={eventIsPostCutoff ? "Hero (required)" : "Hero (optional)"}
                              format={event.format}
                              allowClear
                            />
                          </div>
                          {/* Day 2 control — shown for multi-day events (>10 swiss rounds) */}
                          {(day2Auto != null || day2BoundaryOverrides[origIdx] != null || couldBeDay2(event.matches as MatchRecord[])) && (
                            <Day2Control
                              boundary={day2Boundary}
                              auto={day2Auto != null}
                              onSetRound={(n) => setDay2BoundaryOverrides((prev) => ({ ...prev, [origIdx]: n }))}
                              onTurnOff={() => setDay2BoundaryOverrides((prev) => ({ ...prev, [origIdx]: "off" }))}
                              onEnable={() => setDay2BoundaryOverrides((prev) => {
                                if (day2Auto != null) { const { [origIdx]: _, ...rest } = prev; return rest; } // re-enable auto
                                return { ...prev, [origIdx]: suggestedManualDay2Round(event.matches as MatchRecord[]) };
                              })}
                            />
                          )}
                          {/* Per-round hero/format editor for multi-format / draft events */}
                          <PerRoundEditor
                            open={!!segEditorEvents[origIdx]}
                            onToggle={() => setSegEditorEvents((prev) => ({ ...prev, [origIdx]: !prev[origIdx] }))}
                            matchCount={event.matches.length}
                            defaultHero={heroValue || ""}
                            defaultFormat={event.format}
                            splitAt={day2SplitPos}
                            onApply={(a, segs) => applySegmentAssignments(origIdx, a, segs)}
                            initialSegments={segmentsByEvent[origIdx]}
                          />
                          <div className="space-y-2">
                            {event.matches.map((match, j) => {
                              const oppKey = `${origIdx}-${j}`;
                              const oppHero = opponentHeroOverrides[oppKey] || match.opponentHero || "";
                              const hasTurnOrder = Object.prototype.hasOwnProperty.call(turnOrderOverrides, oppKey);
                              const turnOrder = hasTurnOrder ? turnOrderOverrides[oppKey] : match.goingFirst;
                              const roundInfo = match.notes?.split(" | ")[1]?.trim() || "";
                              const mStyle = match.result === MatchResult.Win ? "border-l-fab-win bg-fab-win/[0.03]" :
                                             match.result === MatchResult.Loss ? "border-l-fab-loss bg-fab-loss/[0.03]" :
                                             match.result === MatchResult.Draw ? "border-l-fab-draw bg-fab-draw/[0.03]" :
                                             "border-l-fab-dim bg-fab-muted/[0.02]";
                              return (
                                <div key={j} className={`border-l-2 ${mStyle} rounded-r-lg px-3 py-2`}>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className={`text-xs font-bold ${
                                        match.result === MatchResult.Win ? "text-fab-win" :
                                        match.result === MatchResult.Loss ? "text-fab-loss" :
                                        match.result === MatchResult.Draw ? "text-fab-draw" : "text-fab-dim"
                                      }`}>
                                        {match.result === MatchResult.Bye ? "BYE" : match.result.toUpperCase()}
                                      </span>
                                      {roundInfo && <span className="text-[10px] text-fab-dim">{roundInfo}</span>}
                                      <span className="text-sm text-fab-text truncate">vs {match.opponentName || "Unknown"}</span>
                                    </div>
                                  </div>
                                  {match.result !== MatchResult.Bye && (
                                    <div className="mt-1.5 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]" onClick={(e) => e.stopPropagation()}>
                                      <HeroSelect
                                        value={oppHero === "Unknown" ? "" : oppHero}
                                        onChange={(val) => {
                                          userTouchedOppKeysRef.current.add(oppKey);
                                          setOpponentHeroOverrides((prev) => val && val !== "Unknown" ? { ...prev, [oppKey]: val } : (() => { const { [oppKey]: _, ...rest } = prev; return rest; })());
                                        }}
                                        label="Opp Hero"
                                        format={event.format}
                                        allowClear
                                      />
                                      <TurnOrderPicker
                                        value={turnOrder}
                                        onChange={(value) => {
                                          setTurnOrderOverrides((prev) => {
                                            if (value === undefined) {
                                              const { [oppKey]: _, ...rest } = prev;
                                              return rest;
                                            }
                                            return { ...prev, [oppKey]: value };
                                          });
                                        }}
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {filteredEvents.length > 10 && (
                <div className="flex justify-center pt-2">
                  {visibleEventCount < filteredEvents.length ? (
                    <button
                      onClick={() => setVisibleEventCount((c) => Math.min(c + 10, filteredEvents.length))}
                      className="px-4 py-2 rounded-lg bg-fab-surface border border-fab-border text-fab-text text-sm font-medium hover:bg-fab-surface-hover transition-colors"
                    >
                      Show more ({filteredEvents.length - visibleEventCount} remaining)
                    </button>
                  ) : (
                    <button
                      onClick={() => { setVisibleEventCount(10); setExpandedEvent(null); }}
                      className="px-4 py-2 rounded-lg bg-fab-surface border border-fab-border text-fab-dim text-sm font-medium hover:bg-fab-surface-hover transition-colors"
                    >
                      Show less
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Skipped events note */}
          {pasteResult && pasteResult.skippedEventNames.length > 0 && (
            <div className="bg-fab-draw/10 border border-fab-draw/30 rounded-lg p-4 text-sm">
              <p className="text-fab-draw font-medium mb-1">
                {pasteResult.skippedEventNames.length} event{pasteResult.skippedEventNames.length === 1 ? "" : "s"} skipped (no match results)
              </p>
              <p className="text-fab-muted">{pasteResult.skippedEventNames.join(", ")}</p>
            </div>
          )}

          {/* Hero note */}
          {allMatches.every((m) => m.heroPlayed === "Unknown") ? (
            <div className="bg-fab-draw/10 border border-fab-draw/30 rounded-lg p-4 text-sm">
              <p className="text-fab-draw font-medium mb-1">Hero info not included</p>
              <p className="text-fab-muted">This import method can&apos;t tell which hero you played. You can use the Browser Extension to import with hero detection, or edit individual matches later.</p>
            </div>
          ) : allMatches.some((m) => m.heroPlayed === "Unknown") ? (
            <div className="bg-fab-draw/10 border border-fab-draw/30 rounded-lg p-4 text-sm">
              <p className="text-fab-draw font-medium mb-1">Some heroes couldn&apos;t be detected</p>
              <p className="text-fab-muted">You can fix these later — just tap any match on the Matches page to edit it.</p>
            </div>
          ) : null}

          {/* Clear before import option */}
          {user && (
            <label className="flex items-start gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={clearBeforeImport}
                onChange={(e) => setClearBeforeImport(e.target.checked)}
                className="mt-0.5 accent-fab-loss"
              />
              <span className="text-sm text-fab-muted">
                <span className="text-fab-loss font-medium">Clear all existing matches</span> before importing (use this if re-importing with the new extension)
              </span>
            </label>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <button onClick={handleImportClick} disabled={importing} className="flex-1 min-h-[48px] py-3 rounded-md font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light active:bg-fab-gold-light transition-colors disabled:opacity-50">
              {importing ? "Importing..." : clearBeforeImport ? `Clear & Import ${totalToImport} Matches` : `Import ${totalToImport} Matches`}
            </button>
            <button onClick={handleReset} className="px-6 min-h-[48px] py-3 rounded-md font-semibold bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text active:bg-fab-surface-hover transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Sticky bottom import bar — visible when events are ready */}
      {totalToImport > 0 && !importing && !sessionRecap && !showHeroWarning && (
        <div className="fixed bottom-0 left-0 right-0 z-40 md:bottom-0 pb-[env(safe-area-inset-bottom)] pointer-events-none">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 pointer-events-auto">
            <div className="flex items-center justify-between gap-3 bg-fab-surface/95 backdrop-blur-md border border-fab-border rounded-lg px-4 py-3 shadow-lg">
              <span className="text-sm text-fab-muted truncate">{totalToImport} match{totalToImport !== 1 ? "es" : ""} ready</span>
              <button
                onClick={handleImportClick}
                className="shrink-0 px-6 py-2 rounded-md font-semibold text-sm bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors"
              >
                {clearBeforeImport ? "Clear & Import" : "Import"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Warning Dialog */}
      {renderHeroWarningModal()}
    </div>
  );
}
