"use client";
import { useState, useEffect, useCallback } from "react";
import { getLeaderboardEntries, invalidateLeaderboardCache } from "@/lib/leaderboard";
import { useAuth } from "@/contexts/AuthContext";
import type { LeaderboardEntry } from "@/types";

export function useLeaderboard(includePrivate = false) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const { user } = useAuth();
  const isAuthenticated = !!user;

  useEffect(() => {
    setLoading(true);
    getLeaderboardEntries(includePrivate, isAuthenticated)
      .then((data) => {
        setEntries(data);
        setError(null);
      })
      .catch((e) => {
        console.error("Failed to load leaderboard:", e);
        setError("Failed to load leaderboard data");
      })
      .finally(() => setLoading(false));
  }, [includePrivate, isAuthenticated, attempt]);

  /** Bust the module cache and refetch — for retry buttons. */
  const reload = useCallback(() => {
    invalidateLeaderboardCache();
    setError(null);
    setAttempt((a) => a + 1);
  }, []);

  return { entries, loading, error, reload };
}
