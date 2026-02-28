"use client";
import { useState, useMemo } from "react";
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

const SCROLL_LIMIT = 20;

export function ActivityFeed({ rankMap }: { rankMap?: Map<string, 1 | 2 | 3 | 4 | 5> }) {
  const { events, loading } = useFeed();
  const { user } = useAuth();
  const { friends } = useFriends();
  const { favorites } = useFavorites();
  const [scope, setScope] = useState<ScopeTab>("community");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("placement");

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
    // "Yesterday at midnight" cutoff — exclude anything before yesterday
    const now = new Date();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const cutoff = yesterday.getTime();

    let source = events;

    // Scope filter
    if (scope === "friends") {
      source = source.filter((e) => socialUserIds.has(e.userId));
    }

    // Type filter
    if (typeFilter !== "all") {
      source = source.filter((e) => e.type === typeFilter);
    }

    // Recency filter: use eventDate for placements, createdAt for others
    source = source.filter((e) => {
      const dateStr = e.type === "placement" ? e.eventDate : e.createdAt;
      return new Date(dateStr).getTime() >= cutoff;
    });

    // Sort by the date the event happened (most recent first)
    source = [...source].sort((a, b) => {
      const dateA = a.type === "placement" ? a.eventDate : a.createdAt;
      const dateB = b.type === "placement" ? b.eventDate : b.createdAt;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    return source.slice(0, SCROLL_LIMIT);
  }, [events, scope, typeFilter, socialUserIds]);

  // Group consecutive imports for cleaner display
  const groups = useMemo(() => groupConsecutiveEvents(filteredEvents), [filteredEvents]);

  // Don't render section if no events at all
  if (!loading && events.length === 0) return null;

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-fab-text">Activity Feed</h2>
        <Link href="/search" className="text-xs text-fab-gold hover:text-fab-gold-light transition-colors">
          View All &rarr;
        </Link>
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

      {/* Scrollable feed area */}
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
        <div className="relative">
          <div className="max-h-[340px] overflow-y-auto overscroll-contain feed-scroll pr-1">
            <div className="space-y-2">
              {groups.map((group) => (
                <GroupedFeedCard key={group.events[0].id} group={group} compact rankMap={rankMap} />
              ))}
            </div>
          </div>
          {/* Fade-out at bottom when scrollable */}
          {groups.length > 5 && (
            <div className="absolute bottom-0 left-0 right-1 h-8 bg-gradient-to-t from-fab-bg to-transparent pointer-events-none rounded-b-lg" />
          )}
        </div>
      )}
    </div>
  );
}
