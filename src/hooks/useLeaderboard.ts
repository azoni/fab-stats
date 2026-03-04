"use client";
import { useState, useEffect } from "react";
import { getLeaderboardEntries } from "@/lib/leaderboard";
import { useAuth } from "@/contexts/AuthContext";
import type { LeaderboardEntry } from "@/types";

export function useLeaderboard(includePrivate = false) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    getLeaderboardEntries(includePrivate, !!user)
      .then(setEntries)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [includePrivate, user]);

  return { entries, loading };
}
