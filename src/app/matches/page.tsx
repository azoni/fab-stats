"use client";
import Link from "next/link";
import { useMatches } from "@/hooks/useMatches";
import { MatchList } from "@/components/matches/MatchList";

export default function MatchesPage() {
  const { matches, isLoaded, deleteMatch } = useMatches();

  if (!isLoaded) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-fab-surface rounded animate-pulse" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-fab-surface rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-fab-gold">Match History</h1>
        <Link
          href="/matches/new"
          className="px-4 py-2 rounded-md text-sm font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors"
        >
          + Log Match
        </Link>
      </div>

      {matches.length === 0 ? (
        <div className="text-center py-16 text-fab-dim">
          <p className="text-lg mb-2">No matches yet</p>
          <p className="text-sm mb-4">Start tracking your Flesh and Blood games</p>
          <Link
            href="/matches/new"
            className="inline-block px-6 py-3 rounded-md font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors"
          >
            Log Your First Match
          </Link>
        </div>
      ) : (
        <MatchList matches={matches} onDelete={deleteMatch} />
      )}
    </div>
  );
}
