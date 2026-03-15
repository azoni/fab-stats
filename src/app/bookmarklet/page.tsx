"use client";
import { useState } from "react";

const BOOKMARKLET_CODE = `javascript:void(function(){var s=document.createElement('script');s.id='fab-stats-bookmarklet';s.src='https://www.fabstats.net/bookmarklet.js?v=2';document.body.appendChild(s)})()`;

export default function BookmarkletPage() {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(BOOKMARKLET_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
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
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-fab-gold mb-2">Quick Sync Bookmarklet</h1>
      <p className="text-fab-muted text-sm mb-6">
        Import your GEM match history with a single tap — no extension needed. Works on mobile and desktop.
      </p>

      {/* How it works */}
      <div className="bg-fab-surface border border-fab-border rounded-lg p-4 mb-6">
        <h2 className="text-sm font-semibold text-fab-text mb-3">How it works</h2>
        <ol className="space-y-2 text-sm text-fab-muted">
          <li className="flex gap-2">
            <span className="text-fab-gold font-bold shrink-0">1.</span>
            <span>Add the bookmarklet to your browser (instructions below)</span>
          </li>
          <li className="flex gap-2">
            <span className="text-fab-gold font-bold shrink-0">2.</span>
            <span>Log into <a href="https://gem.fabtcg.com/profile/history/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">gem.fabtcg.com/profile/history</a></span>
          </li>
          <li className="flex gap-2">
            <span className="text-fab-gold font-bold shrink-0">3.</span>
            <span>Tap the bookmarklet — your matches sync automatically</span>
          </li>
          <li className="flex gap-2">
            <span className="text-fab-gold font-bold shrink-0">4.</span>
            <span>For more history, navigate to page 2, 3, etc. and tap again. Duplicates are skipped.</span>
          </li>
        </ol>
      </div>

      {/* Desktop Setup */}
      <div className="bg-fab-surface border border-fab-border rounded-lg p-4 mb-4">
        <h2 className="text-sm font-semibold text-fab-text mb-3">Desktop Setup</h2>
        <p className="text-sm text-fab-muted mb-3">
          Drag this button to your bookmarks bar:
        </p>
        <div className="flex items-center gap-3">
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
          <span className="text-xs text-fab-dim">
            Drag me to your bookmarks bar
          </span>
        </div>
      </div>

      {/* Mobile Setup */}
      <div className="bg-fab-surface border border-fab-border rounded-lg p-4 mb-6">
        <h2 className="text-sm font-semibold text-fab-text mb-3">Mobile Setup</h2>

        {/* Step 1: Copy */}
        <div className="mb-4">
          <p className="text-sm text-fab-muted mb-2">
            <span className="text-fab-gold font-bold">Step 1:</span> Copy the bookmarklet code
          </p>
          <button
            onClick={handleCopy}
            className="w-full py-2.5 rounded-md font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors text-sm"
          >
            {copied ? "Copied!" : "Copy Bookmarklet Code"}
          </button>
        </div>

        {/* Step 2: Create bookmark */}
        <div className="mb-4">
          <p className="text-sm text-fab-muted mb-1">
            <span className="text-fab-gold font-bold">Step 2:</span> Bookmark any page
          </p>
          <p className="text-xs text-fab-dim">
            Bookmark this page or any other page — we&apos;ll replace the URL next.
          </p>
        </div>

        {/* Step 3: Edit bookmark */}
        <div className="mb-4">
          <p className="text-sm text-fab-muted mb-1">
            <span className="text-fab-gold font-bold">Step 3:</span> Edit the bookmark
          </p>
          <ul className="text-xs text-fab-dim space-y-1 ml-4">
            <li><strong className="text-fab-muted">Safari (iOS):</strong> Open Bookmarks, long-press the bookmark, tap Edit, replace the URL with the copied code</li>
            <li><strong className="text-fab-muted">Chrome (Android):</strong> Open Bookmarks (three dots &gt; Bookmarks), long-press the bookmark, tap Edit, replace the URL</li>
          </ul>
        </div>

        {/* Step 4: Use it */}
        <div>
          <p className="text-sm text-fab-muted mb-1">
            <span className="text-fab-gold font-bold">Step 4:</span> Navigate to GEM &amp; tap
          </p>
          <p className="text-xs text-fab-dim">
            Go to <a href="https://gem.fabtcg.com/profile/history/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">gem.fabtcg.com/profile/history</a>, then open your bookmarks and tap &quot;FaB Stats Sync&quot;.
          </p>
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-fab-surface border border-fab-border rounded-lg p-4">
        <h2 className="text-sm font-semibold text-fab-text mb-3">FAQ</h2>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-fab-muted font-medium">Does it import all my history?</p>
            <p className="text-xs text-fab-dim">It imports the current page of events. If you have multiple pages, navigate to each page and tap the bookmarklet again. Duplicates are automatically skipped.</p>
          </div>
          <div>
            <p className="text-sm text-fab-muted font-medium">Is it safe?</p>
            <p className="text-xs text-fab-dim">The bookmarklet only reads your GEM page data — it doesn&apos;t send anything to any server. Your data goes directly from GEM to FaB Stats in your browser.</p>
          </div>
          <div>
            <p className="text-sm text-fab-muted font-medium">How is this different from the extension?</p>
            <p className="text-xs text-fab-dim">The browser extension auto-paginates through all your history pages. The bookmarklet imports one page at a time but works on mobile and requires no install.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
