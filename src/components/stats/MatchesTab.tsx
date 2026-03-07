"use client";
import { useCallback } from "react";
import Link from "next/link";
import { MatchList } from "@/components/matches/MatchList";
import { updateLeaderboardEntry } from "@/lib/leaderboard";
import { propagateHeroToOpponent } from "@/lib/match-linking";
import { adjustHeroMatchupOnEdit } from "@/lib/hero-matchups";
import { SwordsIcon } from "@/components/icons/NavIcons";
import type { MatchRecord, UserProfile } from "@/types";
import type { User } from "firebase/auth";

interface MatchesTabProps {
  matches: MatchRecord[];
  user: User | null;
  profile: UserProfile | null;
  updateMatch: (id: string, updates: Partial<Omit<MatchRecord, "id" | "createdAt">>) => Promise<void>;
}

export function MatchesTab({ matches, user, profile, updateMatch }: MatchesTabProps) {
  const handleUpdateMatch = useCallback(
    async (id: string, updates: Partial<Omit<MatchRecord, "id" | "createdAt">>) => {
      await updateMatch(id, updates);
      const isOpponentHeroOnly = Object.keys(updates).length === 1 && "opponentHero" in updates;
      if (!isOpponentHeroOnly && profile && matches.length > 0) {
        const updated = matches.map((m) => m.id === id ? { ...m, ...updates } : m);
        updateLeaderboardEntry(profile, updated).catch(() => {});
      }
      if (updates.heroPlayed && user) {
        const match = matches.find((m) => m.id === id);
        if (match) {
          propagateHeroToOpponent(user.uid, match, updates.heroPlayed).catch(() => {});
          adjustHeroMatchupOnEdit(user.uid, match, match.heroPlayed, updates.heroPlayed).catch(() => {});
        }
      }
    },
    [updateMatch, profile, matches, user]
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6 relative overflow-hidden">
        <img src="/assets/icons/swords.png" alt="" className="absolute right-0 top-1/2 -translate-y-1/2 w-20 h-20 object-contain opacity-[0.12] pointer-events-none" />
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center ring-1 ring-inset ring-red-500/20">
            <SwordsIcon className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-fab-text leading-tight">Match History</h1>
            {matches.length > 0 && (
              <p className="text-xs text-fab-muted leading-tight">All your individual game results — tap any match to edit it</p>
            )}
          </div>
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
          <img src="/assets/empty-states/no-matches.png" alt="" className="w-24 h-24 mx-auto mb-4 object-contain opacity-70" />
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
