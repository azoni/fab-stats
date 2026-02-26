"use client";
import Link from "next/link";
import type { FeaturedEvent, LeaderboardEntry } from "@/types";

interface FeaturedTournamentsProps {
  events: FeaturedEvent[];
  leaderboardEntries: LeaderboardEntry[];
}

export function FeaturedTournaments({ events, leaderboardEntries }: FeaturedTournamentsProps) {
  if (events.length === 0) return null;

  const entryMap = new Map(leaderboardEntries.map((e) => [e.username, e]));

  return (
    <div>
      <h2 className="text-lg font-semibold text-fab-text mb-4">Recent Tournaments</h2>
      <div className="space-y-3">
        {events.map((event, i) => {
          const players = event.playerUsernames
            .map((u) => entryMap.get(u))
            .filter(Boolean) as LeaderboardEntry[];

          const dateStr = (() => {
            try {
              return new Date(event.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
            } catch {
              return event.date;
            }
          })();

          return (
            <div
              key={`${event.name}-${i}`}
              className="bg-fab-surface border border-fab-border rounded-lg p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-fab-text">{event.name}</p>
                  <p className="text-xs text-fab-dim mt-0.5">
                    {dateStr}
                    {event.format && <> &middot; {event.format}</>}
                  </p>
                  {event.description && (
                    <p className="text-sm text-fab-muted mt-1">{event.description}</p>
                  )}
                </div>
              </div>

              {players.length > 0 && (
                <div className="flex items-center mt-3 gap-1">
                  <div className="flex -space-x-2">
                    {players.slice(0, 8).map((p) =>
                      p.photoUrl ? (
                        <Link
                          key={p.userId}
                          href={`/player/${p.username}`}
                          className="relative hover:z-10"
                          title={p.displayName}
                        >
                          <img
                            src={p.photoUrl}
                            alt=""
                            className="w-8 h-8 rounded-full border-2 border-fab-surface hover:border-fab-gold transition-colors"
                          />
                        </Link>
                      ) : (
                        <Link
                          key={p.userId}
                          href={`/player/${p.username}`}
                          className="relative hover:z-10"
                          title={p.displayName}
                        >
                          <div className="w-8 h-8 rounded-full bg-fab-gold/20 border-2 border-fab-surface hover:border-fab-gold flex items-center justify-center text-fab-gold text-xs font-bold transition-colors">
                            {p.displayName.charAt(0).toUpperCase()}
                          </div>
                        </Link>
                      ),
                    )}
                  </div>
                  {players.length > 0 && (
                    <span className="text-xs text-fab-dim ml-2">
                      {players.map((p) => p.displayName).join(", ")}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
