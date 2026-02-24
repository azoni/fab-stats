"use client";
import { useState, useEffect, useCallback } from "react";
import * as storage from "@/lib/storage";
import type { MatchRecord } from "@/types";

export function useMatches() {
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setMatches(storage.getAllMatches());
    setIsLoaded(true);
  }, []);

  const addMatch = useCallback(
    (match: Omit<MatchRecord, "id" | "createdAt">) => {
      const newMatch = storage.addMatch(match);
      setMatches((prev) => [...prev, newMatch]);
      return newMatch;
    },
    []
  );

  const deleteMatch = useCallback((id: string) => {
    storage.deleteMatch(id);
    setMatches((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const updateMatch = useCallback(
    (id: string, updates: Partial<Omit<MatchRecord, "id" | "createdAt">>) => {
      const updated = storage.updateMatch(id, updates);
      if (updated) {
        setMatches((prev) => prev.map((m) => (m.id === id ? updated : m)));
      }
    },
    []
  );

  return { matches, isLoaded, addMatch, deleteMatch, updateMatch };
}
