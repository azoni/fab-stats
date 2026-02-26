"use client";
import { useCallback } from "react";
import Link from "next/link";
import { useMatches } from "@/hooks/useMatches";
import { useAuth } from "@/contexts/AuthContext";
import { MatchList } from "@/components/matches/MatchList";
import { updateLeaderboardEntry } from "@/lib/leaderboard";
import type { MatchRecord } from "@/types";

export default function MatchesPage() {
  const { matches, isLoaded, updateMatch } = useMatches();
  const { user, profile } = useAuth();

  const handleUpdateMatch = useCallback(
    async (id: string, updates: Partial<Omit<MatchRecord, "id" | "createdAt">>) => {
      await updateMatch(id, updates);
      if (profile && matches.length > 0) {
        const updated = matches.map((m) => m.id === id ? { ...m, ...updates } : m);
        updateLeaderboardEntry(profile, updated).catch(() => {});
      }
    },
    [updateMatch, profile, matches]
  );

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
        <div>
          <h1 className="text-2xl font-bold text-fab-gold">Match History</h1>
          {matches.length > 0 && (
            <p className="text-fab-muted text-sm mt-1">All your individual game results — tap any match to edit it</p>
          )}
        </div>
        {user && (
          <Link
            href="/matches/new"
            className="px-4 py-2 rounded-md text-sm font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors shrink-0"
          >
            + Log Match
          </Link>
        )}
      </div>

      {matches.length === 0 ? (
        <div className="text-center py-16 text-fab-dim">
          <p className="text-lg mb-2">No matches yet</p>
          <p className="text-sm mb-4">
            {user ? "Import your tournament history or log a match manually to get started" : "Sign up to track your Flesh and Blood tournament results"}
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            {user ? (
              <>
                <Link
                  href="/import"
                  className="inline-block px-6 py-3 rounded-md font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors"
                >
                  Import Matches
                </Link>
                <Link
                  href="/matches/new"
                  className="inline-block px-6 py-3 rounded-md font-semibold bg-fab-surface border border-fab-border text-fab-text hover:bg-fab-surface-hover transition-colors"
                >
                  Log Manually
                </Link>
              </>
            ) : (
              <Link
                href="/login"
                className="inline-block px-6 py-3 rounded-md font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors"
              >
                Sign Up to Get Started
              </Link>
            )}
          </div>
        </div>
      ) : (
        <MatchList matches={matches} matchOwnerUid={user?.uid} enableComments editable={!!user} onUpdateMatch={handleUpdateMatch} missingGemId={!!user && !profile?.gemId} />
      )}
    </div>
  );
}
