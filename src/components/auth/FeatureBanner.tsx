"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

const STORAGE_KEY = "fab-dismissed-banner-quick-import";

export function FeatureBanner() {
  const { user, isGuest } = useAuth();
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash

  useEffect(() => {
    setDismissed(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  if (dismissed || (!user && !isGuest)) return null;

  function dismiss() {
    setDismissed(true);
    localStorage.setItem(STORAGE_KEY, "1");
  }

  return (
    <div className="bg-fab-gold/10 border border-fab-gold/25 rounded-lg px-4 py-3 mb-4 flex items-center justify-between gap-3">
      <p className="text-sm text-fab-muted">
        <span className="text-fab-gold font-medium">New</span> — Quick import from mobile: paste GEM results or snap a screenshot.
        Plus, set different heroes &amp; formats per round for multi-format events.{" "}
        <Link href="/events?import=1" className="text-fab-gold hover:text-fab-gold-light underline">
          Try it
        </Link>
      </p>
      <button
        onClick={dismiss}
        className="text-fab-dim hover:text-fab-text transition-colors shrink-0 text-lg leading-none"
        aria-label="Dismiss"
      >
        &times;
      </button>
    </div>
  );
}
