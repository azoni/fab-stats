"use client";
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export function GuestBanner() {
  const { isGuest } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  if (!isGuest || dismissed) return null;

  return (
    <div className="bg-fab-draw/10 border border-fab-draw/30 rounded-lg px-4 py-3 mb-4 flex items-center justify-between gap-3">
      <p className="text-sm text-fab-muted">
        <span className="text-fab-draw font-medium">Guest mode</span> — Your data is stored in this browser only.{" "}
        <Link href="/login" className="text-fab-gold hover:text-fab-gold-light underline">
          Sign up
        </Link>{" "}
        to save across devices.
      </p>
      <button
        onClick={() => setDismissed(true)}
        className="text-fab-dim hover:text-fab-text transition-colors shrink-0 text-lg leading-none"
        aria-label="Dismiss"
      >
        &times;
      </button>
    </div>
  );
}
