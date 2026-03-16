"use client";
import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getMatchesByUserId, updateProfile } from "@/lib/firestore-storage";
import { updateLeaderboardEntry } from "@/lib/leaderboard";
import { linkMatchesWithOpponents } from "@/lib/match-linking";
import { computeH2HForUser } from "@/lib/h2h";
import { updateCommunityHeroMatchups } from "@/lib/hero-matchups";

/**
 * Detects the `needsRecompute` flag set by server-side auto-sync
 * and triggers leaderboard/linking recomputation on the client.
 * Runs once per session when the profile loads with the flag set.
 */
export function useAutoSyncRecompute() {
  const { user, profile } = useAuth();
  const ranRef = useRef(false);

  useEffect(() => {
    if (!user || !profile || ranRef.current) return;
    if (!profile.needsRecompute) return;

    ranRef.current = true;

    // Clear the flag first to prevent re-runs
    updateProfile(user.uid, { needsRecompute: false }).catch(() => {});

    // Trigger full recomputation in the background
    getMatchesByUserId(user.uid)
      .then((allMatches) => {
        // Leaderboard update
        updateLeaderboardEntry(profile, allMatches).catch(() => {});
        // Match linking
        linkMatchesWithOpponents(user.uid, allMatches).catch(() => {});
        // H2H
        computeH2HForUser(user.uid, allMatches).catch(() => {});
        // Community hero matchups
        updateCommunityHeroMatchups(user.uid, allMatches).catch(() => {});
      })
      .catch(() => {});
  }, [user, profile]);
}
