"use client";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { parseSingleEventPaste } from "@/lib/single-event-import";
import { importMatchesFirestore, getMatchesByUserId } from "@/lib/firestore-storage";
import { importMatchesLocal } from "@/lib/storage";
import { createImportFeedEvent } from "@/lib/feed";
import { updateLeaderboardEntry } from "@/lib/leaderboard";
import { allHeroes } from "@/lib/heroes";
import { MatchResult } from "@/types";
import type { PasteImportEvent } from "@/lib/gem-paste-import";

const VALID_HERO_NAMES = allHeroes.map((h) => h.name).sort();

interface QuickEventImportModalProps {
  open: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

type Phase = "input" | "review" | "importing" | "complete";
type InputMethod = "paste" | "screenshot";

const resultColors = {
  [MatchResult.Win]: "text-fab-win",
  [MatchResult.Loss]: "text-fab-loss",
  [MatchResult.Draw]: "text-fab-draw",
};

const resultLabels = {
  [MatchResult.Win]: "W",
  [MatchResult.Loss]: "L",
  [MatchResult.Draw]: "D",
};

export function QuickEventImportModal({ open, onClose, onImportComplete }: QuickEventImportModalProps) {
  const { user, profile, isGuest } = useAuth();

  const [phase, setPhase] = useState<Phase>("input");
  const [inputMethod, setInputMethod] = useState<InputMethod>("paste");
  const [pasteText, setPasteText] = useState("");
  const [parsedEvent, setParsedEvent] = useState<PasteImportEvent | null>(null);
  const [heroPlayed, setHeroPlayed] = useState("Unknown");
  const [error, setError] = useState("");
  const [importedCount, setImportedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [imageProcessing, setImageProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  function handleReset() {
    setPhase("input");
    setPasteText("");
    setParsedEvent(null);
    setHeroPlayed("Unknown");
    setError("");
    setImportedCount(0);
    setSkippedCount(0);
    setImageProcessing(false);
    setDragActive(false);
  }

  function handleClose() {
    handleReset();
    onClose();
  }

  function handleParse() {
    setError("");
    if (!pasteText.trim()) {
      setError("Please paste the event text.");
      return;
    }

    const result = parseSingleEventPaste(pasteText);
    if (result.error) {
      setError(result.error);
      return;
    }

    setParsedEvent(result.event);
    setPhase("review");
  }

  async function handleScreenshot(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please drop an image file.");
      return;
    }

    setError("");
    setImageProcessing(true);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/ocr-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });

      if (res.status === 501) {
        setError("Screenshot import is not available yet. Please use the text paste method.");
        setImageProcessing(false);
        return;
      }

      if (!res.ok) {
        setError("Failed to process screenshot. Please try pasting the text instead.");
        setImageProcessing(false);
        return;
      }

      const { text } = await res.json();
      const result = parseSingleEventPaste(text);

      if (result.error) {
        setError(result.error);
        setImageProcessing(false);
        return;
      }

      setParsedEvent(result.event);
      setPhase("review");
    } catch {
      setError("Screenshot import is not available yet. Please use the text paste method.");
    }

    setImageProcessing(false);
  }

  async function handleImport() {
    if (!parsedEvent || (!user && !isGuest)) return;

    setPhase("importing");

    // Apply hero override
    const matches = parsedEvent.matches.map((m) => ({
      ...m,
      heroPlayed: heroPlayed !== "Unknown" ? heroPlayed : m.heroPlayed,
    }));

    let count: number;
    if (user) {
      count = await importMatchesFirestore(user.uid, matches);
    } else {
      count = importMatchesLocal(matches);
    }

    setImportedCount(count);
    setSkippedCount(matches.length - count);
    setPhase("complete");

    // Post to feed + update leaderboard (non-blocking)
    if (user && profile && count > 0) {
      const hero = heroPlayed !== "Unknown" ? heroPlayed : undefined;
      const topHeroes = hero ? [hero] : [];
      createImportFeedEvent(profile, count, topHeroes).catch(() => {});
      getMatchesByUserId(user.uid)
        .then((allMatches) => updateLeaderboardEntry(profile, allMatches))
        .catch(() => {});
    }

    onImportComplete();
  }

  if (!open) return null;

  const wins = parsedEvent?.matches.filter((m) => m.result === MatchResult.Win).length ?? 0;
  const losses = parsedEvent?.matches.filter((m) => m.result === MatchResult.Loss).length ?? 0;
  const draws = parsedEvent?.matches.filter((m) => m.result === MatchResult.Draw).length ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-fab-bg border border-fab-border rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-fab-gold">Quick Event Import</h2>
            <button onClick={handleClose} className="text-fab-dim hover:text-fab-text transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Input Phase */}
          {phase === "input" && (
            <>
              {/* Tabs */}
              <div className="flex bg-fab-surface border border-fab-border rounded-lg overflow-hidden mb-4">
                <button
                  onClick={() => { setInputMethod("paste"); setError(""); }}
                  className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                    inputMethod === "paste" ? "bg-fab-gold/15 text-fab-gold" : "text-fab-muted hover:text-fab-text"
                  }`}
                >
                  Paste Text
                </button>
                <span
                  className="flex-1 px-3 py-2 text-sm font-medium text-fab-dim cursor-not-allowed text-center"
                  title="Coming soon"
                >
                  Screenshot <span className="text-xs opacity-60">(Soon)</span>
                </span>
              </div>

              {inputMethod === "paste" ? (
                <>
                  <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="Paste event text from GEM here..."
                    className="w-full h-48 bg-fab-surface border border-fab-border rounded-lg px-3 py-2 text-fab-text text-sm placeholder:text-fab-dim focus:outline-none focus:border-fab-gold resize-none"
                  />
                  <p className="text-xs text-fab-dim mt-2 mb-4">
                    Go to your GEM History, click an event to expand it, select all the text and paste it here.
                  </p>
                </>
              ) : (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragActive(false);
                    const file = e.dataTransfer.files[0];
                    if (file) handleScreenshot(file);
                  }}
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "image/*";
                    input.onchange = () => {
                      const file = input.files?.[0];
                      if (file) handleScreenshot(file);
                    };
                    input.click();
                  }}
                  className={`flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    dragActive
                      ? "border-fab-gold bg-fab-gold/5"
                      : "border-fab-border hover:border-fab-gold/50"
                  }`}
                >
                  {imageProcessing ? (
                    <div className="text-center">
                      <div className="w-8 h-8 border-2 border-fab-gold border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-sm text-fab-muted">Processing screenshot...</p>
                    </div>
                  ) : (
                    <>
                      <svg className="w-8 h-8 text-fab-dim mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      <p className="text-sm text-fab-muted">Drop a screenshot here or click to browse</p>
                      <p className="text-xs text-fab-dim mt-1">Screenshot of your GEM event results</p>
                    </>
                  )}
                </div>
              )}

              {error && <p className="text-fab-loss text-sm mt-2">{error}</p>}

              {inputMethod === "paste" && (
                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={handleClose} className="px-4 py-2 rounded-lg text-sm text-fab-muted hover:text-fab-text transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={handleParse}
                    disabled={!pasteText.trim()}
                    className="px-4 py-2 rounded-lg text-sm font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors disabled:opacity-50"
                  >
                    Parse Event
                  </button>
                </div>
              )}
            </>
          )}

          {/* Review Phase */}
          {phase === "review" && parsedEvent && (
            <>
              {/* Event header */}
              <div className="bg-fab-surface border border-fab-border rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-fab-text">{parsedEvent.eventName}</span>
                  {parsedEvent.rated && (
                    <span className="px-1.5 py-0.5 rounded bg-fab-gold/15 text-fab-gold text-xs">Rated</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-fab-dim flex-wrap">
                  <span>{new Date(parsedEvent.eventDate).toLocaleDateString()}</span>
                  {parsedEvent.venue && <span>at {parsedEvent.venue}</span>}
                  <span className="px-1.5 py-0.5 rounded bg-fab-bg text-fab-dim">{parsedEvent.format}</span>
                  {parsedEvent.eventType && parsedEvent.eventType !== "Other" && (
                    <span className="px-1.5 py-0.5 rounded bg-fab-bg text-fab-dim">{parsedEvent.eventType}</span>
                  )}
                </div>
              </div>

              {/* Hero picker */}
              <div className="mb-4">
                <label className="block text-sm text-fab-muted mb-1">Hero you played (optional)</label>
                <select
                  value={heroPlayed}
                  onChange={(e) => setHeroPlayed(e.target.value)}
                  className="w-full bg-fab-surface border border-fab-border text-fab-text text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-fab-gold"
                >
                  <option value="Unknown">Select hero...</option>
                  {VALID_HERO_NAMES.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              {/* Match summary */}
              <p className="text-sm text-fab-muted mb-2">
                {parsedEvent.matches.length} match{parsedEvent.matches.length !== 1 ? "es" : ""}{" "}
                <span className="font-semibold">
                  ({wins}W-{losses}L{draws > 0 ? `-${draws}D` : ""})
                </span>
              </p>

              {/* Match table */}
              <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-fab-muted">
                      <th className="text-left px-3 py-2 font-medium w-14">Round</th>
                      <th className="text-left px-3 py-2 font-medium">Opponent</th>
                      <th className="text-right px-3 py-2 font-medium w-14">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedEvent.matches.map((match, i) => {
                      const roundNum = match.notes?.split(" | ")[1]?.replace("Round ", "") || `${i + 1}`;
                      return (
                        <tr key={i} className="border-t border-fab-border/50">
                          <td className="px-3 py-2 text-fab-dim">{roundNum}</td>
                          <td className="px-3 py-2 text-fab-text">{match.opponentName || "Unknown"}</td>
                          <td className={`px-3 py-2 text-right font-bold ${resultColors[match.result]}`}>
                            {resultLabels[match.result]}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setParsedEvent(null); setPhase("input"); setError(""); }}
                  className="px-4 py-2 rounded-lg text-sm text-fab-muted hover:text-fab-text transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleImport}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors"
                >
                  Import {parsedEvent.matches.length} Match{parsedEvent.matches.length !== 1 ? "es" : ""}
                </button>
              </div>
            </>
          )}

          {/* Importing Phase */}
          {phase === "importing" && (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-fab-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-fab-muted">Importing matches...</p>
            </div>
          )}

          {/* Complete Phase */}
          {phase === "complete" && (
            <div className="text-center py-6">
              <svg className="w-12 h-12 text-fab-win mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-lg font-semibold text-fab-text mb-1">
                {importedCount} match{importedCount !== 1 ? "es" : ""} imported
              </p>
              {skippedCount > 0 && (
                <p className="text-sm text-fab-dim">
                  {skippedCount} duplicate{skippedCount !== 1 ? "s" : ""} skipped
                </p>
              )}
              <button
                onClick={handleClose}
                className="mt-4 px-6 py-2 rounded-lg text-sm font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
