"use client";
import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useFeed } from "@/hooks/useFeed";
import { useFriends } from "@/hooks/useFriends";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/contexts/AuthContext";
import { groupConsecutiveEvents, GroupedFeedCard } from "@/components/feed/FeedCard";
import type { FeedEvent } from "@/types";

type ScopeTab = "community" | "friends";
type TypeFilter = "all" | "import" | "achievement" | "placement";

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "import", label: "Imports" },
  { value: "achievement", label: "Achievements" },
  { value: "placement", label: "Placements" },
];

const PAGE_SIZE = 5;
const SCOPE_KEY = "fab-feed-scope";
const TYPE_KEY = "fab-feed-type";

function readStored<T extends string>(key: string, valid: T[], fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const v = localStorage.getItem(key) as T | null;
  return v && valid.includes(v) ? v : fallback;
}

export function ActivityFeed({ rankMap }: { rankMap?: Map<string, 1 | 2 | 3 | 4 | 5> }) {
  const router = useRouter();
  const { events, loading } = useFeed();
  const { user } = useAuth();
  const { friends } = useFriends();
  const { favorites } = useFavorites();
  const [scope, _setScope] = useState<ScopeTab>(() => readStored(SCOPE_KEY, ["community", "friends"], "community"));
  const [typeFilter, _setTypeFilter] = useState<TypeFilter>(() => readStored(TYPE_KEY, ["all", "import", "achievement", "placement"], "placement"));

  const [page, setPage] = useState(0);

  const setScope = useCallback((v: ScopeTab) => { _setScope(v); setPage(0); localStorage.setItem(SCOPE_KEY, v); }, []);
  const setTypeFilter = useCallback((v: TypeFilter) => { _setTypeFilter(v); setPage(0); localStorage.setItem(TYPE_KEY, v); }, []);

  // Build set of friend/favorite user IDs
  const socialUserIds = useMemo(() => {
    const ids = new Set<string>();
    for (const f of friends) {
      for (const p of f.participants) {
        if (p !== user?.uid) ids.add(p);
      }
    }
    for (const fav of favorites) {
      ids.add(fav.targetUserId);
    }
    return ids;
  }, [friends, favorites, user?.uid]);

  const filteredEvents: FeedEvent[] = useMemo(() => {
    // Imports: yesterday-at-midnight cutoff
    // Achievements & placements: show everything since app launch (Feb 24 2026)
    const now = new Date();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const importCutoff = yesterday.getTime();
    const appLaunch = new Date("2026-02-24").getTime();

    let source = events;

    // Scope filter
    if (scope === "friends") {
      source = source.filter((e) => socialUserIds.has(e.userId));
    }

    // Type filter
    if (typeFilter !== "all") {
      source = source.filter((e) => e.type === typeFilter);
    }

    // Recency filter: tight for imports, loose for achievements/placements
    source = source.filter((e) => {
      const dateStr = e.type === "placement" ? e.eventDate : e.createdAt;
      const ts = new Date(dateStr).getTime();
      if (e.type === "import") return ts >= importCutoff;
      return ts >= appLaunch;
    });

    // Sort by the date the event happened (most recent first)
    source = [...source].sort((a, b) => {
      const dateA = a.type === "placement" ? a.eventDate : a.createdAt;
      const dateB = b.type === "placement" ? b.eventDate : b.createdAt;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    return source;
  }, [events, scope, typeFilter, socialUserIds]);

  // Group consecutive imports for cleaner display
  const allGroups = useMemo(() => groupConsecutiveEvents(filteredEvents), [filteredEvents]);
  const totalPages = Math.max(1, Math.ceil(allGroups.length / PAGE_SIZE));
  const groups = allGroups.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Don't render section if no events at all
  if (!loading && events.length === 0) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-fab-text">Activity Feed</h2>
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {/* Type filters */}
        <div className="flex gap-0.5 bg-fab-bg rounded-lg p-0.5 border border-fab-border">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                typeFilter === f.value
                  ? "bg-fab-surface text-fab-text shadow-sm"
                  : "text-fab-dim hover:text-fab-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Scope toggle */}
        {user && (
          <div className="flex gap-0.5 bg-fab-bg rounded-lg p-0.5 border border-fab-border ml-auto">
            <button
              onClick={() => setScope("community")}
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                scope === "community"
                  ? "bg-fab-surface text-fab-text shadow-sm"
                  : "text-fab-dim hover:text-fab-muted"
              }`}
            >
              Community
            </button>
            <button
              onClick={() => setScope("friends")}
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                scope === "friends"
                  ? "bg-fab-surface text-fab-text shadow-sm"
                  : "text-fab-dim hover:text-fab-muted"
              }`}
            >
              Friends
            </button>
          </div>
        )}
      </div>

      {/* Feed list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-fab-surface border border-fab-border rounded-lg p-3 h-12 animate-pulse" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-fab-surface border border-fab-border rounded-lg p-4 text-center">
          <p className="text-xs text-fab-dim">
            {scope === "friends"
              ? "No recent activity from friends yet."
              : "No recent activity yet. Import some matches to get started!"}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {groups.map((group) => (
              <div
                key={group.events[0].id}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest("a")) return;
                  router.push(`/search?type=${group.events[0].type}`);
                }}
                className="cursor-pointer"
              >
                <GroupedFeedCard group={group} compact rankMap={rankMap} />
              </div>
            ))}
            {/* Invisible spacers to maintain consistent height on partial pages */}
            {groups.length < PAGE_SIZE && Array.from({ length: PAGE_SIZE - groups.length }, (_, i) => (
              <div key={`spacer-${i}`} className="h-[52px]" aria-hidden="true" />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text transition-colors disabled:opacity-30 disabled:pointer-events-none"
              >
                &larr; Prev
              </button>
              <span className="text-[10px] text-fab-dim">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text transition-colors disabled:opacity-30 disabled:pointer-events-none"
              >
                Next &rarr;
              </button>
            </div>
          )}

          {/* Discover CTA */}
          <Link
            href="/search"
            className="flex items-center justify-center gap-2 mt-4 py-2.5 rounded-lg border border-fab-border bg-fab-surface hover:bg-fab-surface-hover hover:border-fab-gold/30 transition-all group"
          >
            <span className="text-xs font-semibold text-fab-muted group-hover:text-fab-gold transition-colors">
              See more on Discover
            </span>
            <svg className="w-3.5 h-3.5 text-fab-dim group-hover:text-fab-gold transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </>
      )}
    </div>
  );
}
