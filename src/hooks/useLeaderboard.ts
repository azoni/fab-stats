"use client";
import { useState, useEffect } from "react";
import { getLeaderboardEntries } from "@/lib/leaderboard";
import { useAuth } from "@/contexts/AuthContext";
import type { LeaderboardEntry } from "@/types";

export function useLeaderboard(includePrivate = false) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    getLeaderboardEntries(includePrivate, !!user)
      .then(setEntries)
      .catch((e) => {
        console.error("Failed to load leaderboard:", e);
        setError("Failed to load leaderboard data");
      })
      .finally(() => setLoading(false));
  }, [includePrivate, user]);

  return { entries, loading, error };
}
