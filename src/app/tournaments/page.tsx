"use client";
import Link from "next/link";
import { useFeaturedEvents } from "@/hooks/useFeaturedEvents";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { TournamentCard } from "@/components/home/TournamentCard";

export default function TournamentsPage() {
  const events = useFeaturedEvents();
  const { entries: lbEntries, loading } = useLeaderboard();

  const entryMap = new Map(lbEntries.map((e) => [e.username, e]));

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-fab-surface border border-fab-border rounded-lg p-6 h-40 animate-pulse" />
        <div className="bg-fab-surface border border-fab-border rounded-lg p-6 h-40 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-fab-text">Tournaments</h1>
        <Link href="/" className="text-sm text-fab-gold hover:text-fab-gold-light transition-colors">
          &larr; Home
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="bg-fab-surface border border-fab-border rounded-lg p-8 text-center">
          <p className="text-fab-muted">No tournaments to display yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event, i) => (
            <TournamentCard key={`${event.name}-${i}`} event={event} entryMap={entryMap} />
          ))}
        </div>
      )}
    </div>
  );
}
