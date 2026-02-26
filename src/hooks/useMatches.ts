"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getMatchesByUserId,
  addMatchFirestore,
  updateMatchFirestore,
  deleteMatchFirestore,
  batchUpdateMatchesFirestore,
  batchDeleteMatchesFirestore,
} from "@/lib/firestore-storage";
import {
  getAllMatches,
  addMatch as storageAddMatch,
  updateMatch as storageUpdateMatch,
  deleteMatch as storageDeleteMatch,
} from "@/lib/storage";
import type { MatchRecord, GameFormat } from "@/types";

// Module-level cache shared across all hook instances
let cachedMatches: MatchRecord[] | null = null;
let cachedForUid: string | null = null;
let fetchPromise: Promise<MatchRecord[]> | null = null;

function updateCache(uid: string, matches: MatchRecord[]) {
  cachedMatches = matches;
  cachedForUid = uid;
}

export function useMatches() {
  const { user, isGuest } = useAuth();
  const [matches, setMatches] = useState<MatchRecord[]>(
    () => (user && cachedForUid === user.uid && cachedMatches) ? cachedMatches : []
  );
  const [isLoaded, setIsLoaded] = useState(
    () => (user && cachedForUid === user.uid && cachedMatches != null)
  );

  // One-time Firestore fetch for authenticated users (with shared cache)
  useEffect(() => {
    if (isGuest || !user) {
      if (!isGuest) {
        setMatches([]);
        setIsLoaded(true);
      }
      return;
    }

    // Serve from cache if available for this user
    if (cachedForUid === user.uid && cachedMatches) {
      setMatches(cachedMatches);
      setIsLoaded(true);
      return;
    }

    // Deduplicate concurrent fetches
    if (!fetchPromise || cachedForUid !== user.uid) {
      fetchPromise = getMatchesByUserId(user.uid);
    }

    setIsLoaded(false);
    fetchPromise.then((data) => {
      updateCache(user.uid, data);
      fetchPromise = null;
      setMatches(data);
      setIsLoaded(true);
    });
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
      const saved = await addMatchFirestore(user.uid, match);
      const updated = [saved, ...(cachedMatches || [])];
      updateCache(user.uid, updated);
      setMatches(updated);
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
      const updated = (cachedMatches || []).filter((m) => m.id !== id);
      updateCache(user.uid, updated);
      setMatches(updated);
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
      const updated = (cachedMatches || []).map((m) => (m.id === id ? { ...m, ...updates } : m));
      updateCache(user.uid, updated);
      setMatches(updated);
    },
    [user, isGuest]
  );

  const batchUpdateHero = useCallback(
    async (matchIds: string[], heroPlayed: string) => {
      if (isGuest) {
        for (const id of matchIds) {
          storageUpdateMatch(id, { heroPlayed });
        }
        setMatches(getAllMatches());
        return;
      }
      if (!user) return;
      await batchUpdateMatchesFirestore(user.uid, matchIds, { heroPlayed });
      const idSet = new Set(matchIds);
      const updated = (cachedMatches || []).map((m) => (idSet.has(m.id) ? { ...m, heroPlayed } : m));
      updateCache(user.uid, updated);
      setMatches(updated);
    },
    [user, isGuest]
  );

  const batchUpdateFormat = useCallback(
    async (matchIds: string[], format: GameFormat) => {
      if (isGuest) {
        for (const id of matchIds) {
          storageUpdateMatch(id, { format });
        }
        setMatches(getAllMatches());
        return;
      }
      if (!user) return;
      await batchUpdateMatchesFirestore(user.uid, matchIds, { format });
      const idSet = new Set(matchIds);
      const updated = (cachedMatches || []).map((m) => (idSet.has(m.id) ? { ...m, format } : m));
      updateCache(user.uid, updated);
      setMatches(updated);
    },
    [user, isGuest]
  );

  const batchDeleteMatches = useCallback(
    async (matchIds: string[]) => {
      if (isGuest) {
        for (const id of matchIds) storageDeleteMatch(id);
        setMatches(getAllMatches());
        return;
      }
      if (!user) return;
      await batchDeleteMatchesFirestore(user.uid, matchIds);
      const idSet = new Set(matchIds);
      const updated = (cachedMatches || []).filter((m) => !idSet.has(m.id));
      updateCache(user.uid, updated);
      setMatches(updated);
    },
    [user, isGuest]
  );

  const refreshMatches = useCallback(async () => {
    if (isGuest) {
      setMatches(getAllMatches());
      return;
    }
    if (!user) return;
    const data = await getMatchesByUserId(user.uid);
    updateCache(user.uid, data);
    setMatches(data);
  }, [user, isGuest]);

  return { matches, isLoaded, addMatch, deleteMatch, updateMatch, batchUpdateHero, batchUpdateFormat, batchDeleteMatches, refreshMatches };
}
