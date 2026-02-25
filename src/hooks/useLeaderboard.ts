"use client";
import { useState, useEffect } from "react";
import { getLeaderboardEntries } from "@/lib/leaderboard";
import type { LeaderboardEntry } from "@/types";

export function useLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeaderboardEntries()
      .then(setEntries)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { entries, loading };
}
