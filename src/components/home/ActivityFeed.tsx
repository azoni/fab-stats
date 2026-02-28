"use client";
import { useState, useMemo } from "react";
import { useFeed } from "@/hooks/useFeed";
import { useFriends } from "@/hooks/useFriends";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/contexts/AuthContext";
import { FeedCard } from "@/components/feed/FeedCard";
import type { FeedEvent } from "@/types";

type FeedTab = "community" | "friends";

export function ActivityFeed({ rankMap }: { rankMap?: Map<string, 1 | 2 | 3 | 4 | 5> }) {
  const { events, loading } = useFeed();
  const { user } = useAuth();
  const { friends } = useFriends();
  const { favorites } = useFavorites();
  const [tab, setTab] = useState<FeedTab>("community");

  // Filter out import events — only show achievements and placements
  const activityEvents = useMemo(
    () => events.filter((e) => e.type === "achievement" || e.type === "placement"),
    [events],
  );

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
    const source = tab === "friends"
      ? activityEvents.filter((e) => socialUserIds.has(e.userId))
      : activityEvents;
    return source.slice(0, 15);
  }, [tab, activityEvents, socialUserIds]);

  // Don't render section if no activity events at all
  if (!loading && activityEvents.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-fab-text">Activity Feed</h2>
        {user && (
          <div className="flex gap-1 bg-fab-bg rounded-lg p-0.5 border border-fab-border">
            <button
              onClick={() => setTab("community")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                tab === "community"
                  ? "bg-fab-surface text-fab-text shadow-sm"
                  : "text-fab-dim hover:text-fab-muted"
              }`}
            >
              Community
            </button>
            <button
              onClick={() => setTab("friends")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                tab === "friends"
                  ? "bg-fab-surface text-fab-text shadow-sm"
                  : "text-fab-dim hover:text-fab-muted"
              }`}
            >
              Friends
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-fab-surface border border-fab-border rounded-lg p-4 h-16 animate-pulse" />
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="bg-fab-surface border border-fab-border rounded-lg p-6 text-center">
          <p className="text-sm text-fab-dim">
            {tab === "friends"
              ? "No recent activity from friends yet."
              : "No recent activity yet. Achievements and tournament placements will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map((event) => (
            <FeedCard key={event.id} event={event} rankMap={rankMap} />
          ))}
        </div>
      )}
    </div>
  );
}
