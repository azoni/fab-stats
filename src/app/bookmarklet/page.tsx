"use client";
import { useState, useEffect } from "react";

const BOOKMARKLET_CODE = `javascript:void(function(){var s=document.createElement('script');s.id='fab-stats-bookmarklet';s.src='https://www.fabstats.net/bookmarklet.js?v=2';document.body.appendChild(s)})()`;

export default function BookmarkletPage() {
  const [copied, setCopied] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(BOOKMARKLET_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = BOOKMARKLET_CODE;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="max-w-2xl mx-auto relative z-10">
      <h1 className="text-2xl font-bold text-fab-gold mb-2">Quick Sync Bookmarklet</h1>
      <p className="text-fab-muted text-sm mb-6">
        Import your GEM match history with a single tap — no extension needed. Works on mobile and desktop.
      </p>

      {/* How it works — always first */}
      <div className="bg-fab-bg/95 backdrop-blur-sm border border-fab-border rounded-lg p-4 mb-6">
        <h2 className="text-sm font-semibold text-fab-text mb-3">How it works</h2>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="w-10 h-10 rounded-full bg-fab-gold/15 flex items-center justify-center mx-auto mb-1.5">
              <span className="text-fab-gold font-bold text-sm">1</span>
            </div>
            <p className="text-xs text-fab-muted">Set up the bookmarklet once</p>
          </div>
          <div>
            <div className="w-10 h-10 rounded-full bg-fab-gold/15 flex items-center justify-center mx-auto mb-1.5">
              <span className="text-fab-gold font-bold text-sm">2</span>
            </div>
            <p className="text-xs text-fab-muted">Go to your GEM history page</p>
          </div>
          <div>
            <div className="w-10 h-10 rounded-full bg-fab-gold/15 flex items-center justify-center mx-auto mb-1.5">
              <span className="text-fab-gold font-bold text-sm">3</span>
            </div>
            <p className="text-xs text-fab-muted">Tap the bookmark — matches sync</p>
          </div>
        </div>
      </div>

      {/* Mobile Setup — shown first on mobile */}
      <div className={`${isMobile ? "order-first" : ""}`}>
        <div className="bg-fab-bg/95 backdrop-blur-sm border border-fab-border rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-md bg-pink-400/15 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-sm font-semibold text-fab-text">Mobile Setup</h2>
          </div>

          {/* Step 1 */}
          <div className="mb-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-fab-gold/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-fab-gold text-xs font-bold">1</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-fab-text font-medium">Copy the bookmarklet code</p>
                <button
                  onClick={handleCopy}
                  className="mt-2 w-full py-2.5 rounded-md font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors text-sm"
                >
                  {copied ? "Copied!" : "Copy Bookmarklet Code"}
                </button>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="mb-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-fab-gold/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-fab-gold text-xs font-bold">2</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-fab-text font-medium">Bookmark this page</p>
                <p className="text-xs text-fab-muted mt-0.5">
                  Tap the share button and select &quot;Add Bookmark&quot; or &quot;Add to Bookmarks&quot;.
                </p>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="mb-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-fab-gold/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-fab-gold text-xs font-bold">3</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-fab-text font-medium">Edit the bookmark URL</p>
                <div className="mt-1 space-y-1.5">
                  <div className="bg-fab-surface rounded-md px-3 py-2 border border-fab-border">
                    <p className="text-xs text-fab-muted"><strong className="text-fab-text">Safari:</strong> Bookmarks tab → long-press → Edit → replace URL with copied code</p>
                  </div>
                  <div className="bg-fab-surface rounded-md px-3 py-2 border border-fab-border">
                    <p className="text-xs text-fab-muted"><strong className="text-fab-text">Chrome:</strong> ⋮ → Bookmarks → long-press → Edit → replace URL with copied code</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-fab-gold/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-fab-gold text-xs font-bold">4</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-fab-text font-medium">Open GEM and tap the bookmark</p>
                <p className="text-xs text-fab-muted mt-0.5 mb-2">
                  Navigate to your GEM history, then open bookmarks and tap &quot;FaB Stats Sync&quot;.
                </p>
                <a
                  href="https://gem.fabtcg.com/profile/history/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md font-medium bg-teal-500/15 text-teal-400 hover:bg-teal-500/25 transition-colors text-sm border border-teal-500/30"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open GEM History
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Setup */}
      <div className="bg-fab-bg/95 backdrop-blur-sm border border-fab-border rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-md bg-blue-400/15 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-sm font-semibold text-fab-text">Desktop Setup</h2>
        </div>

        <p className="text-sm text-fab-muted mb-2">
          <span className="text-fab-gold font-bold">Option 1:</span> Drag this button to your bookmarks bar:
        </p>
        <div className="flex items-center gap-3 mb-4">
          <a
            href={BOOKMARKLET_CODE}
            onClick={(e) => e.preventDefault()}
            draggable
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors text-sm cursor-grab active:cursor-grabbing"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            FaB Stats Sync
          </a>
          <span className="text-xs text-fab-muted">Drag me to your bookmarks bar</span>
        </div>

        <p className="text-sm text-fab-muted mb-2">
          <span className="text-fab-gold font-bold">Option 2:</span> Copy and paste manually:
        </p>
        <ol className="text-xs text-fab-muted space-y-1 ml-4 mb-3 list-decimal list-inside">
          <li>Right-click your bookmarks bar &rarr; &quot;Add bookmark&quot;</li>
          <li>Name it <strong className="text-fab-text">FaB Stats Sync</strong></li>
          <li>Paste the copied code as the URL</li>
        </ol>
        <button
          onClick={handleCopy}
          className="px-4 py-2 rounded-md font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors text-sm"
        >
          {copied ? "Copied!" : "Copy Bookmarklet Code"}
        </button>
      </div>

      {/* Tips */}
      <div className="bg-fab-bg/95 backdrop-blur-sm border border-fab-border rounded-lg p-4 mb-4">
        <h2 className="text-sm font-semibold text-fab-text mb-2">Tips</h2>
        <ul className="space-y-1.5 text-xs text-fab-muted">
          <li className="flex gap-2">
            <span className="text-fab-gold shrink-0">•</span>
            <span>For more history, go to page 2, 3, etc. on GEM and tap the bookmarklet again. Duplicates are automatically skipped.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-fab-gold shrink-0">•</span>
            <span>Use the <a href="https://gem.fabtcg.com/profile/player/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Player page</a> to import in-progress events (e.g. if you dropped early or the store hasn&apos;t closed the event).</span>
          </li>
          <li className="flex gap-2">
            <span className="text-fab-gold shrink-0">•</span>
            <span>The bookmarklet detects your hero automatically from your decklist on GEM.</span>
          </li>
        </ul>
      </div>

      {/* FAQ */}
      <div className="bg-fab-bg/95 backdrop-blur-sm border border-fab-border rounded-lg p-4">
        <h2 className="text-sm font-semibold text-fab-text mb-3">FAQ</h2>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-fab-muted font-medium">Is it safe?</p>
            <p className="text-xs text-fab-muted">The bookmarklet only reads your GEM page — nothing is sent to any server. Data goes directly from GEM to FaB Stats in your browser.</p>
          </div>
          <div>
            <p className="text-sm text-fab-muted font-medium">How is this different from the extension?</p>
            <p className="text-xs text-fab-muted">The browser extension auto-paginates through all your history. The bookmarklet imports one page at a time but works on mobile and requires no install.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
