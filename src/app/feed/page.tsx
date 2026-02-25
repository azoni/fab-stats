"use client";
import { useFeed } from "@/hooks/useFeed";
import { FeedCard } from "@/components/feed/FeedCard";
import { FeedIcon } from "@/components/icons/NavIcons";

export default function FeedPage() {
  const { events, loading } = useFeed();

  return (
    <div>
      <h1 className="text-2xl font-bold text-fab-gold mb-2">Activity Feed</h1>
      <p className="text-fab-muted text-sm mb-6">
        See what the community is up to — recent imports and activity from FaB Stats players.
      </p>

      {loading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="bg-fab-surface border border-fab-border rounded-lg p-4 h-24 animate-pulse"
            />
          ))}
        </div>
      )}

      {!loading && events.length === 0 && (
        <div className="text-center py-16">
          <FeedIcon className="w-14 h-14 text-fab-muted mb-4 mx-auto" />
          <h2 className="text-lg font-semibold text-fab-text mb-2">
            No activity yet
          </h2>
          <p className="text-fab-muted text-sm">
            When players import their matches, their activity will show up here.
          </p>
        </div>
      )}

      {!loading && events.length > 0 && (
        <div className="space-y-3">
          {events.map((event) => (
            <FeedCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
