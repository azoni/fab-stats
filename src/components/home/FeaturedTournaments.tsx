"use client";
import Link from "next/link";
import { TournamentCard } from "./TournamentCard";
import type { FeaturedEvent, LeaderboardEntry } from "@/types";

interface FeaturedTournamentsProps {
  events: FeaturedEvent[];
  leaderboardEntries: LeaderboardEntry[];
}

const HOMEPAGE_LIMIT = 3;

export function FeaturedTournaments({ events, leaderboardEntries }: FeaturedTournamentsProps) {
  if (events.length === 0) return null;

  const entryMap = new Map(leaderboardEntries.map((e) => [e.username, e]));
  const displayEvents = events.slice(0, HOMEPAGE_LIMIT);

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="section-header flex items-center gap-2 flex-1">
          <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center ring-1 ring-inset ring-orange-500/20">
            <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.003 6.003 0 01-2.54.952m0 0a47.11 47.11 0 00-5.5 0" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-fab-text leading-tight">Recent Tournaments</h2>
        </div>
        <Link href="/tournaments" className="text-xs text-fab-gold hover:text-fab-gold-light transition-colors ml-3 font-semibold">
          View All
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 flex-1">
        {displayEvents.map((event, i) => (
          <TournamentCard key={`${event.name}-${i}`} event={event} entryMap={entryMap} />
        ))}
      </div>
    </div>
  );
}
