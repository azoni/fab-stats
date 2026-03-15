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
import { computeOverallStats, computeHeroStats, computeOpponentStats, computeEventStats, computePlayoffFinishes, getEventName, type PlayoffFinish } from "@/lib/stats";
import { linkMatchesWithOpponents } from "@/lib/match-linking";
import { computeH2HForUser } from "@/lib/h2h";
import { updateCommunityHeroMatchups } from "@/lib/hero-matchups";
import type { GemMetadata } from "@/lib/gem-import";
import { updateLeaderboardEntry } from "@/lib/leaderboard";
import { getMatchesByUserId } from "@/lib/firestore-storage";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircleIcon, FileIcon, ChevronDownIcon, ChevronUpIcon } from "@/components/icons/NavIcons";
import { MatchResult, type MatchRecord, type Achievement } from "@/types";
import { HeroSelect } from "@/components/heroes/HeroSelect";
import { computeSessionRecap, type SessionRecap } from "@/lib/session-recap";
import { PostEventRecap } from "@/components/import/PostEventRecap";
import { getAllMatches as getLocalMatches } from "@/lib/storage";
import { detectTierUp, type BadgeTierInfo } from "@/lib/badge-tiers";

const BOOKMARKLET_HREF = `javascript:void((async function(){var els=document.querySelectorAll('a,button,summary,span,div,[role=button]');var n=0;for(var i=0;i<els.length;i++){var t=(els[i].textContent||'').trim();if(t.match(/View Results/i)&&t.length<30){els[i].click();n++;await new Promise(function(r){setTimeout(r,600)})}}alert('Expanded '+n+' events. Press Ctrl+A, Ctrl+C to copy.')})())`;

type ImportMethod = "extension" | "paste" | "csv" | null;

export default function ImportPage() {
  const router = useRouter();
  const { user, profile, isGuest, isAdmin } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  const [importing, setImporting] = useState(false);
  const [autoDetected, setAutoDetected] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [heroOverrides, setHeroOverrides] = useState<Record<number, string>>({});
  const [opponentHeroOverrides, setOpponentHeroOverrides] = useState<Record<string, string>>({});
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
  const [showOtherBrowsers, setShowOtherBrowsers] = useState(false);
  const [visibleEventCount, setVisibleEventCount] = useState(10);

  // Detect mobile viewport
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Auto-expand paste method on mobile (Browser Extension not available on phones)
  useEffect(() => {
    if (isMobile && method === null && !pasteResult && !csvMatches && !autoDetected) {
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
          if (user) {
            existing = await getMatchesByUserId(user.uid);
          } else {
            existing = getLocalMatches();
          }
          const fps = new Set(existing.map((m) =>
            `${m.date}|${(m.opponentName || "").toLowerCase()}|${m.notes ? normalizeNotes(m.notes) : ""}|${m.result}`
          ));
          setExistingFingerprints(fps);
        } catch {
          setExistingFingerprints(new Set());
        }
        setQuickPreviewReady(true);
      })();
    }
  }, [quickMode, pasteResult, user, isGuest]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const filteredMatches = useMemo(() => {
    return filteredEvents.flatMap(({ event, origIdx }) =>
      event.matches.map((m, matchIdx) => {
        const hero = heroOverrides[origIdx];
        const oppHeroKey = `${origIdx}-${matchIdx}`;
        const oppHero = opponentHeroOverrides[oppHeroKey];
        let updated = m;
        if (hero) updated = { ...updated, heroPlayed: hero };
        if (oppHero) updated = { ...updated, opponentHero: oppHero };
        return updated;
      })
    );
  }, [filteredEvents, heroOverrides, opponentHeroOverrides]);

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

  // Quick mode: filter events to only those with at least one non-duplicate match
  const quickFilteredEvents = useMemo(() => {
    if (!quickMode || !existingFingerprints) return filteredEvents;
    return filteredEvents.filter(({ event }) =>
      event.matches.some((m) => {
        const fp = `${m.date}|${(m.opponentName || "").toLowerCase()}|${m.notes ? normalizeNotes(m.notes) : ""}|${m.result}`;
        return !existingFingerprints.has(fp);
      })
    );
  }, [quickMode, existingFingerprints, filteredEvents]);

  // In quick mode, use the filtered (non-duplicate) events for display
  const displayEvents = quickMode ? quickFilteredEvents : filteredEvents;

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
    const matches = pasteResult ? filteredMatches : csvMatches;
    if (!matches) return;
    const hasMissingHeroes = matches.some((m) => m.heroPlayed === "Unknown");
    if (hasMissingHeroes) {
      setShowHeroWarning(true);
    } else {
      handleImport();
    }
  }

  async function handleImport() {
    const matches = pasteResult ? filteredMatches : csvMatches;
    if (!matches || (!user && !isGuest)) return;
    setImporting(true);

    // Clear existing data first if requested
    if (clearBeforeImport && user) {
      await clearAllMatchesFirestore(user.uid);
      await deleteAllFeedEventsForUser(user.uid);
    }

    // Capture matches before import for recap
    let beforeMatches: MatchRecord[] = [];
    try {
      if (user) {
        beforeMatches = await getMatchesByUserId(user.uid);
      } else {
        beforeMatches = getLocalMatches();
      }
    } catch {
      // If we can't get before matches, recap will still work with empty array
    }

    let count: number;
    if (user) {
      count = await importMatchesFirestore(user.uid, matches);
    } else {
      count = importMatchesLocal(matches);
    }
    setImportedCount(count);
    setSkippedCount(matches.length - count);

    // Compute session recap + achievements + placements before showing results
    let afterMatches: MatchRecord[] = [];
    let newlyImported: MatchRecord[] = [];
    let detectedNew: Achievement[] = [];
    let freshFinishes: PlayoffFinish[] = [];

    if (count > 0) {
      try {
        if (user) {
          afterMatches = await getMatchesByUserId(user.uid);
        } else {
          afterMatches = getLocalMatches();
        }
        const beforeIds = new Set(beforeMatches.map((m) => m.id));
        newlyImported = afterMatches.filter((m) => !beforeIds.has(m.id));
        const recap = computeSessionRecap(beforeMatches, afterMatches, newlyImported);
        setSessionRecap(recap);

        // Detect match badge tier-up
        const tierUp = detectTierUp("first-match", beforeMatches.length, afterMatches.length);
        if (tierUp) setMatchBadgeTierUp({ tier: tierUp, count: afterMatches.length });
      } catch {
        // Recap computation failed — will fall back to basic completion screen
      }

      // Compute achievements & placements (only for signed-in users with profile)
      if (user && profile && afterMatches.length > 0) {
        try {
          const overall = computeOverallStats(afterMatches);
          const heroStats = computeHeroStats(afterMatches);
          const oppStats = computeOpponentStats(afterMatches);
          const earned = evaluateAchievements(afterMatches, overall, heroStats, oppStats);
          detectedNew = await detectNewAchievements(user.uid, earned);
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
    }

    // Now show the results
    setImported(true);
    setImporting(false);

    // Post to activity feed + update leaderboard (non-blocking, only for signed-in users with a profile)
    if (user && profile && count > 0) {
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

  function handleReset() {
    setPasteResult(null);
    setCsvMatches(null);
    setCsvMetadata(null);
    setPasteText("");
    setError("");
    setImported(false);
    setSkippedCount(0);
    setFilterFormat("all");
    setFilterEventType("all");
    setExpandedEvent(null);
    setMethod(null);
    setAutoDetected(false);
    setHeroOverrides({});
    setSessionRecap(null);
    setNewAchievements([]);
    setNewPlacements([]);
    setMatchBadgeTierUp(null);
  }

  async function handleClearAll() {
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
  const totalToImport = pasteResult ? filteredMatches.length : (csvMatches?.length ?? 0);
  const allMatches = pasteResult ? filteredMatches : (csvMatches ?? []);

  // ── Quick Mode Preview Screen ──────────────────────────────────

  if (quickMode && !imported) {
    // Still loading fingerprints
    if (!quickPreviewReady || importing) {
      return (
        <div className="text-center py-16">
          <div className="w-12 h-12 border-4 border-fab-border border-t-fab-gold rounded-full animate-spin mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-fab-gold mb-2">{importing ? "Importing..." : "Quick Syncing..."}</h1>
          <p className="text-fab-muted">
            {importing ? `Importing ${filteredMatches.length} matches` : "Checking for new events"}
          </p>
        </div>
      );
    }

    // No new events
    if (quickFilteredEvents.length === 0) {
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
    const quickNewMatchCount = quickFilteredEvents.reduce((sum, { event }) => sum + event.matches.length, 0);
    const quickHasMissingHeroes = quickFilteredEvents.some(({ event }) =>
      event.matches.every((m) => m.heroPlayed === "Unknown") && !heroOverrides[quickFilteredEvents.indexOf(quickFilteredEvents.find(e => e.event === event)!)]
    );

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-fab-gold mb-1">Quick Sync</h1>
          <p className="text-fab-muted text-sm">
            {quickFilteredEvents.length} new event{quickFilteredEvents.length === 1 ? "" : "s"} found ({quickNewMatchCount} matches). Review and confirm.
          </p>
        </div>

        {/* Hero warning */}
        {quickFilteredEvents.some(({ event, origIdx }) =>
          !heroOverrides[origIdx] && event.matches.every((m) => m.heroPlayed === "Unknown")
        ) && (
          <div className="bg-fab-draw/10 border border-fab-draw/30 rounded-lg p-4 text-sm">
            <p className="text-fab-draw font-medium mb-1">Some events are missing hero info</p>
            <p className="text-fab-muted">Expand events below to set your hero. You can also edit after importing.</p>
          </div>
        )}

        {/* Events list */}
        <div className="space-y-2">
          {quickFilteredEvents.map(({ event, origIdx }, i) => {
            const wins = event.matches.filter((m) => m.result === MatchResult.Win).length;
            const losses = event.matches.filter((m) => m.result === MatchResult.Loss).length;
            const isExpanded = expandedEvent === i;
            const heroValue = heroOverrides[origIdx] || event.matches[0]?.heroPlayed || "";
            const needsHero = !heroOverrides[origIdx] && event.matches.every((m) => m.heroPlayed === "Unknown");

            return (
              <div key={i} className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedEvent(isExpanded ? null : i)}
                  className="w-full p-4 text-left hover:bg-fab-surface-hover transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-fab-text">{event.eventName}</span>
                        {event.rated && <span className="px-1.5 py-0.5 rounded bg-fab-gold/15 text-fab-gold text-xs">Rated</span>}
                        {needsHero && <span className="px-1.5 py-0.5 rounded bg-fab-draw/15 text-fab-draw text-xs">Missing Hero</span>}
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
                    {/* Hero selection */}
                    <div onClick={(e) => e.stopPropagation()}>
                      <HeroSelect
                        value={heroValue === "Unknown" ? "" : heroValue}
                        onChange={(val) => {
                          setHeroOverrides((prev) => val && val !== "Unknown" ? { ...prev, [origIdx]: val } : (() => { const { [origIdx]: _, ...rest } = prev; return rest; })());
                        }}
                        label="Your Hero"
                        format={event.format}
                        allowClear
                      />
                    </div>
                    {/* Matches with opponent hero editing */}
                    <div className="space-y-2">
                      {event.matches.map((match, j) => {
                        const oppKey = `${origIdx}-${j}`;
                        const oppHero = opponentHeroOverrides[oppKey] || match.opponentHero || "";
                        const roundInfo = match.notes?.split(" | ")[1]?.trim() || "";
                        const style = match.result === MatchResult.Win ? "border-l-fab-win bg-fab-win/[0.03]" :
                                      match.result === MatchResult.Loss ? "border-l-fab-loss bg-fab-loss/[0.03]" :
                                      match.result === MatchResult.Draw ? "border-l-fab-draw bg-fab-draw/[0.03]" :
                                      "border-l-fab-dim bg-fab-muted/[0.02]";
                        return (
                          <div key={j} className={`border-l-2 ${style} rounded-r-lg px-3 py-2`}>
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
                              <div className="mt-1.5" onClick={(e) => e.stopPropagation()}>
                                <HeroSelect
                                  value={oppHero === "Unknown" ? "" : oppHero}
                                  onChange={(val) => {
                                    setOpponentHeroOverrides((prev) => val && val !== "Unknown" ? { ...prev, [oppKey]: val } : (() => { const { [oppKey]: _, ...rest } = prev; return rest; })());
                                  }}
                                  label="Opp Hero"
                                  format={event.format}
                                  allowClear
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

        {/* Light opponent hero warning */}
        {quickConfirmImport && (
          <div className="bg-fab-surface border border-fab-draw/30 rounded-lg p-3 text-sm flex items-start gap-2">
            <svg className="w-4 h-4 text-fab-draw shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <p className="text-fab-muted">
              Some opponent heroes are unknown. They&apos;ll auto-fill when matches link with opponents who use FaB Stats.
            </p>
          </div>
        )}

        {/* Import button */}
        <div className="flex gap-3">
          <button
            onClick={() => {
              const hasUnknownOpp = quickFilteredEvents.some(({ event }) =>
                event.matches.some(m => m.result !== "bye" && (!m.opponentHero || m.opponentHero === "Unknown") && !opponentHeroOverrides[`${quickFilteredEvents.indexOf(quickFilteredEvents.find(e => e.event === event)!)}-${event.matches.indexOf(m)}`])
              );
              if (hasUnknownOpp && !quickConfirmImport) {
                setQuickConfirmImport(true);
                return;
              }
              handleImport();
            }}
            disabled={importing}
            className="flex-1 py-3 rounded-md font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors disabled:opacity-50"
          >
            {importing ? "Importing..." : quickConfirmImport ? `Import Anyway (${quickNewMatchCount})` : `Import ${quickNewMatchCount} Matches`}
          </button>
        </div>
      </div>
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
          <p className="text-fab-dim text-sm mb-6">{skippedCount} duplicate{skippedCount === 1 ? "" : "s"} skipped.</p>
        )}
        {skippedCount === 0 && <div className="mb-6" />}
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

  return (
    <div>
      <h1 className="text-2xl font-bold text-fab-gold mb-2">Import Your Matches</h1>
      <p className="text-fab-muted text-sm mb-6">
        Pull in your match history from{" "}
        <a href="https://gem.fabtcg.com/profile/history/" target="_blank" rel="noopener noreferrer" className="text-fab-gold hover:text-fab-gold-light underline">
          GEM
        </a>
        {" "}— the official Flesh and Blood tournament site where your event results are recorded. Pick a method below to get started.
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

                  {/* Firefox fallback */}
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
                      <ol className="text-sm text-fab-muted space-y-2.5 list-decimal list-inside">
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
                      <p className="text-xs text-fab-dim">Temporary add-ons reset when Firefox restarts — you&apos;ll need to reload each session.</p>
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

          {/* ── Method 2: Copy & Paste ── */}
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
                  const heroValue = heroOverrides[origIdx] || event.matches[0]?.heroPlayed || "";
                  const needsHero = !heroOverrides[origIdx] && event.matches.every((m) => m.heroPlayed === "Unknown");

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
                    <div key={i} className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedEvent(isExpanded ? null : i)}
                        className="w-full p-4 text-left hover:bg-fab-surface-hover transition-colors"
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
                                setHeroOverrides((prev) => val && val !== "Unknown" ? { ...prev, [origIdx]: val } : (() => { const { [origIdx]: _, ...rest } = prev; return rest; })());
                              }}
                              label={needsHero ? "Hero (optional)" : "Hero"}
                              format={event.format}
                              allowClear
                            />
                          </div>
                          <div className="space-y-2">
                            {event.matches.map((match, j) => {
                              const oppKey = `${origIdx}-${j}`;
                              const oppHero = opponentHeroOverrides[oppKey] || match.opponentHero || "";
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
                                    <div className="mt-1.5" onClick={(e) => e.stopPropagation()}>
                                      <HeroSelect
                                        value={oppHero === "Unknown" ? "" : oppHero}
                                        onChange={(val) => {
                                          setOpponentHeroOverrides((prev) => val && val !== "Unknown" ? { ...prev, [oppKey]: val } : (() => { const { [oppKey]: _, ...rest } = prev; return rest; })());
                                        }}
                                        label="Opp Hero"
                                        format={event.format}
                                        allowClear
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

      {/* Hero Warning Dialog */}
      {showHeroWarning && (
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
            <p className="text-sm text-fab-muted mb-2">
              {(() => {
                if (pasteResult) {
                  const missingCount = filteredEvents.filter(({ event, origIdx }) =>
                    !heroOverrides[origIdx] && event.matches.every((m) => m.heroPlayed === "Unknown")
                  ).length;
                  return `${missingCount} of your ${filteredEvents.length} event${filteredEvents.length !== 1 ? "s" : ""} ${missingCount === 1 ? "is" : "are"} missing hero information.`;
                }
                return "Your matches are missing hero information.";
              })()}
            </p>
            <p className="text-sm text-fab-muted mb-2">
              Without heroes, your stats will be incomplete and your placements will show without a hero on the feed.
            </p>
            <p className="text-sm text-fab-muted mb-5">
              Set heroes per event in the preview above, or use the Browser Extension for automatic detection.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { setShowHeroWarning(false); setConfirmSkipHero(false); }}
                className="w-full min-h-[44px] py-2.5 rounded-lg font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors text-sm"
              >
                Go Back &amp; Add Heroes
              </button>
              {!confirmSkipHero ? (
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
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
