"use client";
import { useState, useEffect } from "react";
import { getLeaderboardEntries } from "@/lib/leaderboard";
import type { LeaderboardEntry } from "@/types";

export function useLeaderboard(includePrivate = false) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeaderboardEntries(includePrivate)
      .then(setEntries)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [includePrivate]);

  return { entries, loading };
}
