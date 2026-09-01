"use client";
import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getMatchesByUserId, updateProfile } from "@/lib/firestore-storage";

/**
 * Detects the `needsRecompute` flag set by server-side auto-sync
 * and triggers leaderboard/linking recomputation on the client.
 * Runs once per session when the profile loads with the flag set.
 *
 * The recompute modules (leaderboard, match-linking, h2h → stats, heroes)
 * are imported on demand: this hook mounts in the root layout, and a static
 * import would ship all of them in every route's shared chunk for a path
 * that runs only after an admin auto-sync.
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
    Promise.all([
      getMatchesByUserId(user.uid),
      import("@/lib/leaderboard"),
      import("@/lib/match-linking"),
      import("@/lib/h2h"),
    ])
      .then(([allMatches, leaderboard, matchLinking, h2h]) => {
        // Leaderboard update
        leaderboard.updateLeaderboardEntry(profile, allMatches).catch(() => {});
        // Match linking
        matchLinking.linkMatchesWithOpponents(user.uid, allMatches).catch(() => {});
        // H2H
        h2h.computeH2HForUser(user.uid, allMatches).catch(() => {});
        // Community hero matchups deliberately NOT updated here: the counters
        // are increment-based, so re-adding the full history double-counts.
        // Auto-synced matches are folded in by the admin "Backfill hero
        // matchups" rebuild (wipe + recount) instead.
      })
      .catch(() => {});
  }, [user, profile]);
}
