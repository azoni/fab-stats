"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribeFavorites,
  addFavorite,
  removeFavorite,
  type FavoriteEntry,
} from "@/lib/favorites";

export function useFavorites() {
  const { user, isGuest } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (isGuest || !user) {
      setFavorites([]);
      setIsLoaded(true);
      return;
    }

    setIsLoaded(false);
    const unsubscribe = subscribeFavorites(user.uid, (favs) => {
      setFavorites(favs);
      setIsLoaded(true);
    });

    return unsubscribe;
  }, [user, isGuest]);

  const isFavorited = useCallback(
    (targetUserId: string) => favorites.some((f) => f.targetUserId === targetUserId),
    [favorites]
  );

  const toggleFavorite = useCallback(
    async (target: { uid: string; username: string; displayName: string; photoUrl?: string }) => {
      if (!user || isGuest) return;
      if (isFavorited(target.uid)) {
        await removeFavorite(user.uid, target.uid);
      } else {
        await addFavorite(user.uid, target);
      }
    },
    [user, isGuest, isFavorited]
  );

  return { favorites, isLoaded, isFavorited, toggleFavorite };
}
