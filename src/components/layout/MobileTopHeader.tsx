"use client";

import Link from "next/link";
import { Search as SearchIcon } from "lucide-react";

export function MobileTopHeader() {
  return (
    <header className="md:hidden fixed top-0 inset-x-0 z-40 bg-fab-bg/95 backdrop-blur border-b border-fab-border pt-[env(safe-area-inset-top)]">
      <div className="flex items-center justify-between h-14 px-4">
        <Link href="/" className="flex items-center gap-2 min-w-0">
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
