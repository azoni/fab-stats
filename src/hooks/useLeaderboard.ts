"use client";
import { useState, useEffect, useCallback } from "react";
import { getLeaderboardEntries, invalidateLeaderboardCache } from "@/lib/leaderboard";
import { useAuth } from "@/contexts/AuthContext";
import type { LeaderboardEntry } from "@/types";

const EMPTY: LeaderboardEntry[] = [];

export interface UseLeaderboardOptions {
  /** When false the hook fetches nothing and reports loading=false — for pages
   *  that only need community data once some other gate (auth, a picked
   *  player) is satisfied. */
  enabled?: boolean;
  /** Read the compactor's snapshot (every list/rank field, none of the
   *  per-hero / per-venue arrays) — a handful of reads instead of a
   *  2,300–3,800-doc scan. Pages that use heroBreakdownDetailed,
   *  monthlyHeroBreakdown or venueBreakdown must leave this off. */
  compact?: boolean;
}

export function useLeaderboard(includePrivate = false, options: UseLeaderboardOptions = {}) {
  const enabled = options.enabled ?? true;
  const compact = options.compact ?? false;
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const { user, loading: authLoading } = useAuth();
  const isAuthenticated = !!user;

  useEffect(() => {
    // Public pages (/leaderboard, /meta, /player/*) mount before Firebase Auth
    // has restored the session. Fetching on the first render issued the GUEST
    // scan (~2,300 docs), then the signed-in scan (~3,800) once the user
    // resolved — double the reads and bytes on every cold load. Wait for auth
    // to settle; the guest query is only right once we know there is no user.
    if (!enabled || authLoading) return;
    setLoading(true);
    getLeaderboardEntries(includePrivate, isAuthenticated, { compact })
      .then((data) => {
        setEntries(data);
        setError(null);
      })
      .catch((e) => {
        console.error("Failed to load leaderboard:", e);
        setError("Failed to load leaderboard data");
      })
      .finally(() => setLoading(false));
  }, [includePrivate, isAuthenticated, attempt, authLoading, enabled, compact]);

  /** Bust the module cache and refetch — for retry buttons. */
  const reload = useCallback(() => {
    invalidateLeaderboardCache();
    setError(null);
    setAttempt((a) => a + 1);
  }, []);

  return {
    entries: enabled ? entries : EMPTY,
    loading: enabled ? authLoading || loading : false,
    error,
    reload,
  };
}
