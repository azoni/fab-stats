"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeLeaderboard } from "@/lib/leaderboard";
import type { LeaderboardEntry } from "@/types";

export function useLeaderboard() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const unsub = subscribeLeaderboard((data) => {
      setEntries(data);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  return { entries, loading };
}
