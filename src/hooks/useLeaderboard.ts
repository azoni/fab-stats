"use client";
import { useState, useEffect } from "react";
import { subscribeLeaderboard } from "@/lib/leaderboard";
import type { LeaderboardEntry } from "@/types";

export function useLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeLeaderboard((data) => {
      setEntries(data);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  return { entries, loading };
}
