"use client";
import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { parseGemCsv } from "@/lib/gem-import";
import { parseGemPaste, parseExtensionJson, type PasteImportResult } from "@/lib/gem-paste-import";
import { useAuth } from "@/contexts/AuthContext";
import { importMatchesFirestore, clearAllMatchesFirestore } from "@/lib/firestore-storage";
import { importMatchesLocal } from "@/lib/storage";
import { useRouter } from "next/navigation";
import { MatchCard } from "@/components/matches/MatchCard";
import { CheckCircleIcon, FileIcon, ChevronDownIcon, ChevronUpIcon } from "@/components/icons/NavIcons";
import { MatchResult, type MatchRecord } from "@/types";

const BOOKMARKLET_HREF = `javascript:void((async function(){var els=document.querySelectorAll('a,button,summary,span,div,[role=button]');var n=0;for(var i=0;i<els.length;i++){var t=(els[i].textContent||'').trim();if(t.match(/View Results/i)&&t.length<30){els[i].click();n++;await new Promise(function(r){setTimeout(r,600)})}}alert('Expanded '+n+' events. Press Ctrl+A, Ctrl+C to copy.')})())`;

type ImportMethod = "extension" | "paste" | "csv" | null;

export default function ImportPage() {
  const router = useRouter();
  const { user, isGuest } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bookmarkletRef = useCallback((node: HTMLAnchorElement | null) => {
    if (node) node.setAttribute("href", BOOKMARKLET_HREF);
  }, []);
  const [method, setMethod] = useState<ImportMethod>(null);
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
  const [skippedCount, setSkippedCount] = useState(0);
  const [importing, setImporting] = useState(false);
  const [autoDetected, setAutoDetected] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [cleared, setCleared] = useState(false);

  // Auto-detect extension data from URL hash (#ext=base64data)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith("#ext=")) {
      try {
        const encoded = hash.slice(5);
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
        }
      } catch (e) {
        console.error("Failed to parse extension data from URL:", e);
      }
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

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
      const trimmed = pasteText.trim();
      let result: PasteImportResult;

      if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
        result = parseExtensionJson(trimmed);
      } else {
        result = parseGemPaste(pasteText);
      }

      if (result.totalMatches === 0) {
        setError("No matches found. Make sure you've clicked \"View Results\" on each event on the GEM page before selecting all and copying.");
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

  async function handleImport() {
    const matches = pasteResult ? filteredMatches : csvMatches;
    if (!matches || (!user && !isGuest)) return;
    setImporting(true);
    let count: number;
    if (user) {
      count = await importMatchesFirestore(user.uid, matches);
    } else {
      count = importMatchesLocal(matches);
    }
    setImportedCount(count);
    setSkippedCount(matches.length - count);
    setImported(true);
    setImporting(false);
  }

  function handleReset() {
    setPasteResult(null);
    setCsvMatches(null);
    setPasteText("");
    setError("");
    setImported(false);
    setSkippedCount(0);
    setFilterFormat("all");
    setFilterEventType("all");
    setExpandedEvent(null);
    setMethod(null);
    setAutoDetected(false);
  }

  async function handleClearAll() {
    if (!user) return;
    setClearing(true);
    try {
      await clearAllMatchesFirestore(user.uid);
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

  // ── Import Complete Screen ─────────────────────────────────────

  if (imported) {
    return (
      <div className="text-center py-16">
        <CheckCircleIcon className="w-14 h-14 text-fab-win mb-4 mx-auto" />
        <h1 className="text-2xl font-bold text-fab-gold mb-2">Import Complete!</h1>
        <p className="text-fab-muted mb-2">{importedCount} matches imported successfully.</p>
        {skippedCount > 0 && (
          <p className="text-fab-dim text-sm mb-6">{skippedCount} duplicate{skippedCount === 1 ? "" : "s"} skipped.</p>
        )}
        {skippedCount === 0 && <div className="mb-6" />}
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

      {error && (
        <div className="bg-fab-loss/10 border border-fab-loss/30 text-fab-loss rounded-md px-4 py-3 text-sm mb-4">{error}</div>
      )}

      {/* Method Selection Cards */}
      {!hasResults && (
        <div className="space-y-3 mb-6">

          {/* ── Method 1: Chrome Extension ── */}
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
                    <h3 className="font-semibold text-fab-text">Chrome Extension</h3>
                    <span className="px-1.5 py-0.5 rounded bg-fab-gold/15 text-fab-gold text-xs font-semibold">Recommended</span>
                  </div>
                  <p className="text-sm text-fab-muted mt-0.5">One-click export with automatic hero detection. Scrapes all pages for you.</p>
                </div>
                <svg className={`w-5 h-5 text-fab-dim shrink-0 mt-1 transition-transform ${method === "extension" ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {method === "extension" && (
              <div className="border-t border-fab-border px-4 pb-4 pt-3" onClick={(e) => e.stopPropagation()}>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <a
                      href="/fab-stats-extension.zip"
                      download
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-fab-gold text-fab-bg font-semibold hover:bg-fab-gold-light transition-colors text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Extension
                    </a>
                    <span className="text-xs text-fab-dim">~5 KB zip file</span>
                  </div>

                  <div className="bg-fab-bg rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-fab-text mb-3">Setup (one time only):</h4>
                    <ol className="text-sm text-fab-muted space-y-2.5 list-decimal list-inside">
                      <li>Download and <strong className="text-fab-text">unzip</strong> the file above</li>
                      <li>
                        In Chrome, type{" "}
                        <code className="px-1.5 py-0.5 rounded bg-fab-surface text-fab-gold text-xs font-mono select-all">chrome://extensions</code>{" "}
                        in the address bar and press Enter
                      </li>
                      <li>Turn on <strong className="text-fab-text">Developer mode</strong> (top-right toggle)</li>
                      <li>
                        Click{" "}
                        <strong className="text-fab-text">&quot;Load unpacked&quot;</strong>{" "}
                        and select the unzipped folder
                      </li>
                    </ol>
                  </div>

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
                  <div className="bg-fab-bg rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-fab-text mb-3">Steps:</h4>
                    <ol className="text-sm text-fab-muted space-y-2 list-decimal list-inside">
                      <li>
                        Go to your{" "}
                        <a href="https://gem.fabtcg.com/profile/history/" target="_blank" rel="noopener noreferrer" className="text-fab-gold hover:underline">
                          GEM History page
                        </a>{" "}
                        and log in
                      </li>
                      <li>Click <strong className="text-fab-text">&quot;View Results&quot;</strong> on each event to expand it</li>
                      <li>Press <kbd className="px-1.5 py-0.5 rounded bg-fab-surface text-fab-gold text-xs font-mono">Ctrl+A</kbd> to select all, then <kbd className="px-1.5 py-0.5 rounded bg-fab-surface text-fab-gold text-xs font-mono">Ctrl+C</kbd> to copy</li>
                      <li>Paste below with <kbd className="px-1.5 py-0.5 rounded bg-fab-surface text-fab-gold text-xs font-mono">Ctrl+V</kbd></li>
                    </ol>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-fab-dim">
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

                  <div className="bg-fab-draw/10 border border-fab-draw/20 rounded-lg px-3 py-2 text-xs text-fab-dim">
                    <strong className="text-fab-draw">Note:</strong> If GEM shows multiple pages of history, import each page separately — we&apos;ll skip any duplicates automatically. This method can&apos;t detect which hero you played (use the Chrome Extension for that).
                  </div>

                  <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="Paste your GEM History page here..."
                    rows={10}
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
                  <h3 className="font-semibold text-fab-text">Upload CSV</h3>
                  <p className="text-sm text-fab-muted mt-0.5">
                    For users of the{" "}
                    <a href="https://github.com/AltarisV/FaB-History-Scraper" target="_blank" rel="noopener noreferrer" className="text-fab-gold hover:underline" onClick={(e) => e.stopPropagation()}>
                      FaB History Scraper
                    </a>{" "}
                    tool. Upload your <code className="text-fab-gold text-xs">match_history.csv</code> file.
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
                    <p className="text-fab-text font-medium mb-1">Drop your CSV here</p>
                    <p className="text-fab-dim text-sm">or click to browse</p>
                    <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
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
          <p className="text-fab-muted text-sm">Now re-import your matches using the Chrome Extension above for the best results.</p>
        </div>
      )}

      {/* ── Results Preview ─────────────────────────────────────── */}
      {hasResults && (
        <div className="space-y-6">
          {/* Auto-detected from extension */}
          {autoDetected && (
            <div className="bg-fab-gold/10 border border-fab-gold/30 rounded-lg p-4 text-sm">
              <p className="text-fab-gold font-semibold mb-1">Data received from Chrome Extension</p>
              <p className="text-fab-muted">Review your matches below and click Import when ready.</p>
            </div>
          )}

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
                            {isExpanded ? <ChevronUpIcon className="w-4 h-4 text-fab-dim" /> : <ChevronDownIcon className="w-4 h-4 text-fab-dim" />}
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
          {allMatches.every((m) => m.heroPlayed === "Unknown") ? (
            <div className="bg-fab-draw/10 border border-fab-draw/30 rounded-lg p-4 text-sm">
              <p className="text-fab-draw font-medium mb-1">Hero info not included</p>
              <p className="text-fab-muted">This import method can&apos;t tell which hero you played. You can use the Chrome Extension to import with hero detection, or edit individual matches later.</p>
            </div>
          ) : allMatches.some((m) => m.heroPlayed === "Unknown") ? (
            <div className="bg-fab-draw/10 border border-fab-draw/30 rounded-lg p-4 text-sm">
              <p className="text-fab-draw font-medium mb-1">Some heroes couldn&apos;t be detected</p>
              <p className="text-fab-muted">You can fix these later — just tap any match on the Matches page to edit it.</p>
            </div>
          ) : null}

          {/* Action buttons */}
          <div className="flex gap-3">
            <button onClick={handleImport} disabled={importing} className="flex-1 py-3 rounded-md font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors disabled:opacity-50">
              {importing ? "Importing..." : `Import ${totalToImport} Matches`}
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
