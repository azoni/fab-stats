"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribeToMatches,
  addMatchFirestore,
  updateMatchFirestore,
  deleteMatchFirestore,
} from "@/lib/firestore-storage";
import {
  getAllMatches,
  addMatch as storageAddMatch,
  updateMatch as storageUpdateMatch,
  deleteMatch as storageDeleteMatch,
} from "@/lib/storage";
import type { MatchRecord } from "@/types";

export function useMatches() {
  const { user, isGuest } = useAuth();
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Firestore subscription for authenticated users
  useEffect(() => {
    if (isGuest || !user) {
      if (!isGuest) {
        setMatches([]);
        setIsLoaded(true);
      }
      return;
    }

    setIsLoaded(false);
    const unsubscribe = subscribeToMatches(user.uid, (newMatches) => {
      setMatches(newMatches);
      setIsLoaded(true);
    });

    return unsubscribe;
  }, [user, isGuest]);

  // localStorage read for guest users
  useEffect(() => {
    if (!isGuest) return;
    setMatches(getAllMatches());
    setIsLoaded(true);
  }, [isGuest]);

  const addMatch = useCallback(
    async (match: Omit<MatchRecord, "id" | "createdAt">) => {
      if (isGuest) {
        storageAddMatch(match);
        setMatches(getAllMatches());
        return;
      }
      if (!user) return;
      await addMatchFirestore(user.uid, match);
    },
    [user, isGuest]
  );

  const deleteMatch = useCallback(
    async (id: string) => {
      if (isGuest) {
        storageDeleteMatch(id);
        setMatches(getAllMatches());
        return;
      }
      if (!user) return;
      await deleteMatchFirestore(user.uid, id);
    },
    [user, isGuest]
  );

  const updateMatch = useCallback(
    async (id: string, updates: Partial<Omit<MatchRecord, "id" | "createdAt">>) => {
      if (isGuest) {
        storageUpdateMatch(id, updates);
        setMatches(getAllMatches());
        return;
      }
      if (!user) return;
      await updateMatchFirestore(user.uid, id, updates);
    },
    [user, isGuest]
  );

  return { matches, isLoaded, addMatch, deleteMatch, updateMatch };
}
