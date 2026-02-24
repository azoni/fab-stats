"use client";
import { useState, useRef, useMemo } from "react";
import { parseGemCsv } from "@/lib/gem-import";
import { parseGemPaste, type PasteImportResult, type PasteImportEvent } from "@/lib/gem-paste-import";
import { useMatches } from "@/hooks/useMatches";
import { useRouter } from "next/navigation";
import { MatchCard } from "@/components/matches/MatchCard";
import { MatchResult, type MatchRecord } from "@/types";

type ImportMode = "paste" | "csv";

export default function ImportPage() {
  const router = useRouter();
  const { addMatch } = useMatches();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<ImportMode>("paste");
  const [dragActive, setDragActive] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteResult, setPasteResult] = useState<PasteImportResult | null>(null);
  const [csvMatches, setCsvMatches] = useState<Omit<MatchRecord, "id" | "createdAt">[] | null>(null);
  const [error, setError] = useState("");
  const [imported, setImported] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [filterFormat, setFilterFormat] = useState("all");
  const [filterEventType, setFilterEventType] = useState("all");
  const [expandedEvent, setExpandedEvent] = useState<number | null>(null);

  // Filtered events
  const filteredEvents = useMemo(() => {
    if (!pasteResult) return [];
    return pasteResult.events.filter((e) => {
      if (filterFormat !== "all" && e.format !== filterFormat) return false;
      if (filterEventType !== "all" && e.eventType !== filterEventType) return false;
      return true;
    });
  }, [pasteResult, filterFormat, filterEventType]);

  const filteredMatches = useMemo(() => {
    return filteredEvents.flatMap((e) => e.matches);
  }, [filteredEvents]);

  // Unique formats and event types for filter dropdowns
  const availableFormats = useMemo(() => {
    if (!pasteResult) return [];
    return [...new Set(pasteResult.events.map((e) => e.format))];
  }, [pasteResult]);

  const availableEventTypes = useMemo(() => {
    if (!pasteResult) return [];
    return [...new Set(pasteResult.events.map((e) => e.eventType))];
  }, [pasteResult]);

  function handleParsePaste() {
    setError("");
    setPasteResult(null);
    setCsvMatches(null);

    if (!pasteText.trim()) {
      setError("Please paste some text from your GEM History page.");
      return;
    }

    try {
      const result = parseGemPaste(pasteText);
      if (result.totalMatches === 0) {
        setError("No matches found. Make sure you Ctrl+A to select everything on the GEM History page, then Ctrl+C and paste here.");
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

    if (!file.name.endsWith(".csv")) {
      setError("Please upload a CSV file.");
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseGemCsv(text);
      if (parsed.matches.length === 0) {
        setError("No valid matches found in the CSV.");
        return;
      }
      setCsvMatches(parsed.matches);
    } catch {
      setError("Failed to parse the CSV file.");
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleImport() {
    const matches = pasteResult ? filteredMatches : csvMatches;
    if (!matches) return;
    for (const match of matches) {
      addMatch(match);
    }
    setImportedCount(matches.length);
    setImported(true);
  }

  function handleReset() {
    setPasteResult(null);
    setCsvMatches(null);
    setPasteText("");
    setError("");
    setImported(false);
    setFilterFormat("all");
    setFilterEventType("all");
    setExpandedEvent(null);
  }

  const hasResults = pasteResult || csvMatches;
  const totalToImport = pasteResult ? filteredMatches.length : (csvMatches?.length ?? 0);
  const allMatches = pasteResult ? filteredMatches : (csvMatches ?? []);

  if (imported) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-fab-gold mb-2">Import Complete!</h1>
        <p className="text-fab-muted mb-6">{importedCount} matches imported successfully.</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button onClick={() => router.push("/opponents")} className="px-6 py-3 rounded-md font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors">
            View Opponent Stats
          </button>
          <button onClick={() => router.push("/")} className="px-6 py-3 rounded-md font-semibold bg-fab-surface border border-fab-border text-fab-text hover:bg-fab-surface-hover transition-colors">
            Dashboard
          </button>
          <button onClick={handleReset} className="px-6 py-3 rounded-md font-semibold bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text transition-colors">
            Import More
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-fab-gold mb-2">Import from GEM</h1>
      <p className="text-fab-muted text-sm mb-6">
        Ctrl+A, Ctrl+C your entire{" "}
        <a href="https://gem.fabtcg.com/profile/history/" target="_blank" rel="noopener noreferrer" className="text-fab-gold hover:text-fab-gold-light underline">
          GEM History
        </a>
        {" "}page and paste it here.
      </p>

      {/* Mode toggle */}
      <div className="flex gap-1 mb-6 bg-fab-surface border border-fab-border rounded-lg p-1 w-fit">
        <button
          onClick={() => { setMode("paste"); setCsvMatches(null); setPasteResult(null); setError(""); }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === "paste" ? "bg-fab-gold/15 text-fab-gold" : "text-fab-muted hover:text-fab-text"}`}
        >
          Paste from GEM
        </button>
        <button
          onClick={() => { setMode("csv"); setCsvMatches(null); setPasteResult(null); setError(""); }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === "csv" ? "bg-fab-gold/15 text-fab-gold" : "text-fab-muted hover:text-fab-text"}`}
        >
          Upload CSV
        </button>
      </div>

      {error && (
        <div className="bg-fab-loss/10 border border-fab-loss/30 text-fab-loss rounded-md px-4 py-3 text-sm mb-4">{error}</div>
      )}

      {/* Paste mode input */}
      {mode === "paste" && !hasResults && (
        <div>
          <div className="bg-fab-surface border border-fab-border rounded-lg p-4 mb-4">
            <h2 className="text-sm font-semibold text-fab-text mb-3">How to import:</h2>
            <ol className="text-sm text-fab-muted space-y-2 list-decimal list-inside">
              <li>Go to <a href="https://gem.fabtcg.com/profile/history/" target="_blank" rel="noopener noreferrer" className="text-fab-gold hover:underline">GEM History</a> and log in</li>
              <li>Press <kbd className="px-1.5 py-0.5 rounded bg-fab-bg text-fab-gold text-xs">Ctrl+A</kbd> to select the entire page</li>
              <li>Press <kbd className="px-1.5 py-0.5 rounded bg-fab-bg text-fab-gold text-xs">Ctrl+C</kbd> to copy</li>
              <li>Paste below with <kbd className="px-1.5 py-0.5 rounded bg-fab-bg text-fab-gold text-xs">Ctrl+V</kbd> — repeat for each page of history</li>
            </ol>
          </div>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="Paste your entire GEM History page here (Ctrl+A, Ctrl+C, Ctrl+V)..."
            rows={14}
            className="w-full bg-fab-bg border border-fab-border rounded-lg px-4 py-3 text-fab-text text-sm outline-none focus:border-fab-gold/50 placeholder:text-fab-dim resize-y font-mono"
          />
          <button
            onClick={handleParsePaste}
            disabled={!pasteText.trim()}
            className="mt-4 w-full py-3 rounded-md font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Parse Matches
          </button>
        </div>
      )}

      {/* CSV mode input */}
      {mode === "csv" && !hasResults && (
        <div>
          <div className="bg-fab-surface border border-fab-border rounded-lg p-4 mb-4">
            <p className="text-sm text-fab-muted">
              Upload a <code className="text-fab-gold">match_history.csv</code> from the{" "}
              <a href="https://github.com/AltarisV/FaB-History-Scraper" target="_blank" rel="noopener noreferrer" className="text-fab-gold hover:underline">FaB History Scraper</a>.
            </p>
          </div>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${dragActive ? "border-fab-gold bg-fab-gold/5" : "border-fab-border hover:border-fab-muted"}`}
          >
            <div className="text-4xl mb-3">📄</div>
            <p className="text-fab-text font-medium mb-1">Drop your CSV here</p>
            <p className="text-fab-dim text-sm">or click to browse</p>
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>
        </div>
      )}

      {/* Results preview */}
      {hasResults && (
        <div className="space-y-6">
          {/* Summary stats */}
          <div className="bg-fab-surface border border-fab-border rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-fab-gold">{pasteResult ? filteredEvents.length : "-"}</p>
                <p className="text-xs text-fab-muted">Events</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-fab-text">{totalToImport}</p>
                <p className="text-xs text-fab-muted">Matches</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-fab-win">{allMatches.filter((m) => m.result === MatchResult.Win).length}</p>
                <p className="text-xs text-fab-muted">Wins</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-fab-loss">{allMatches.filter((m) => m.result === MatchResult.Loss).length}</p>
                <p className="text-xs text-fab-muted">Losses</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-fab-text">
                  {totalToImport > 0 ? `${((allMatches.filter((m) => m.result === MatchResult.Win).length / totalToImport) * 100).toFixed(0)}%` : "-"}
                </p>
                <p className="text-xs text-fab-muted">Win Rate</p>
              </div>
            </div>
          </div>

          {/* Filters (paste mode only) */}
          {pasteResult && (
            <div className="flex flex-wrap gap-2">
              {availableFormats.length > 1 && (
                <select
                  value={filterFormat}
                  onChange={(e) => setFilterFormat(e.target.value)}
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
                  onChange={(e) => setFilterEventType(e.target.value)}
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
                {filteredEvents.map((event, i) => {
                  const wins = event.matches.filter((m) => m.result === MatchResult.Win).length;
                  const losses = event.matches.filter((m) => m.result === MatchResult.Loss).length;
                  const isExpanded = expandedEvent === i;

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
                            <span className="text-fab-dim text-xs">{isExpanded ? "▲" : "▼"}</span>
                          </div>
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="border-t border-fab-border px-4 pb-4 space-y-2 pt-3">
                          {event.matches.map((match, j) => (
                            <MatchCard key={j} match={{ ...match, id: `preview-${i}-${j}`, createdAt: "" }} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Hero note */}
          <div className="bg-fab-draw/10 border border-fab-draw/30 rounded-lg p-4 text-sm">
            <p className="text-fab-draw font-medium mb-1">Hero data not included in GEM</p>
            <p className="text-fab-muted">Heroes will be set to &quot;Unknown&quot; — opponent names, results, formats, and event details are fully imported.</p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button onClick={handleImport} className="flex-1 py-3 rounded-md font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors">
              Import {totalToImport} Matches
            </button>
            <button onClick={handleReset} className="px-6 py-3 rounded-md font-semibold bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
