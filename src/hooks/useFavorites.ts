"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getFavorites,
  addFavorite,
  removeFavorite,
  type FavoriteEntry,
} from "@/lib/favorites";

export function useFavorites() {
  const { user, isGuest } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const fetchedForUid = useRef<string | null>(null);

  useEffect(() => {
    if (isGuest || !user) {
      setFavorites([]);
      setIsLoaded(true);
      return;
    }

    if (fetchedForUid.current === user.uid) return;
    fetchedForUid.current = user.uid;

    setIsLoaded(false);
    getFavorites(user.uid).then((favs) => {
      setFavorites(favs);
      setIsLoaded(true);
    });
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
        setFavorites((prev) => prev.filter((f) => f.targetUserId !== target.uid));
      } else {
        await addFavorite(user.uid, target);
        const newEntry: FavoriteEntry = {
          targetUserId: target.uid,
          targetUsername: target.username,
          targetDisplayName: target.displayName,
          targetPhotoUrl: target.photoUrl,
          createdAt: new Date().toISOString(),
        };
        setFavorites((prev) =>
          [...prev, newEntry].sort((a, b) => a.targetDisplayName.localeCompare(b.targetDisplayName))
        );
      }
    },
    [user, isGuest, isFavorited]
  );

  return { favorites, isLoaded, isFavorited, toggleFavorite };
}
