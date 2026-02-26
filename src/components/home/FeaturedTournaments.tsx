"use client";
import Link from "next/link";
import { TournamentCard } from "./TournamentCard";
import type { FeaturedEvent, LeaderboardEntry } from "@/types";

interface FeaturedTournamentsProps {
  events: FeaturedEvent[];
  leaderboardEntries: LeaderboardEntry[];
}

const HOMEPAGE_LIMIT = 2;

export function FeaturedTournaments({ events, leaderboardEntries }: FeaturedTournamentsProps) {
  if (events.length === 0) return null;

  const entryMap = new Map(leaderboardEntries.map((e) => [e.username, e]));
  const displayEvents = events.slice(0, HOMEPAGE_LIMIT);

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-fab-text">Recent Tournaments</h2>
        <Link href="/tournaments" className="text-sm text-fab-gold hover:text-fab-gold-light transition-colors">
          View All
        </Link>
      </div>
      <div className="space-y-3 flex-1">
        {displayEvents.map((event, i) => (
          <TournamentCard key={`${event.name}-${i}`} event={event} entryMap={entryMap} />
        ))}
      </div>
    </div>
  );
}
