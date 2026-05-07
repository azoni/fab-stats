"use client";

import Link from "next/link";
import { Search as SearchIcon } from "lucide-react";

export function MobileTopHeader() {
  return (
    <header className="md:hidden fixed top-0 inset-x-0 z-40 bg-fab-bg/95 backdrop-blur border-b border-fab-border pt-[env(safe-area-inset-top)]">
      <div className="flex items-center justify-between h-14 px-4">
        <Link href="/" className="flex items-center gap-2 min-w-0">
          <svg className="w-7 h-7 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="5" y="2" width="14" height="20" rx="2" stroke="#D9A05B" strokeWidth="2" />
            <rect x="7.5" y="13" width="2" height="3" fill="#E53935" />
            <rect x="11" y="10" width="2" height="6" fill="#FBC02D" />
            <rect x="14.5" y="6" width="2" height="10" fill="#1E88E5" />
          </svg>
          <span className="text-fab-gold font-bold text-base tracking-tight truncate">FaB Stats</span>
        </Link>
        <Link
          href="/search"
          aria-label="Search"
          className="flex items-center justify-center w-11 h-11 rounded-md text-fab-muted hover:text-fab-text hover:bg-fab-surface-hover transition-colors"
        >
          <SearchIcon className="w-5 h-5" />
        </Link>
      </div>
    </header>
  );
}
