"use client";
import { useState, useEffect } from "react";
import { subscribeToMutedUsers } from "@/lib/mute-service";

export function useMutedUsers() {
  const [mutedUserIds, setMutedUserIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToMutedUsers((ids) => {
      setMutedUserIds(new Set(ids));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { mutedUserIds, loading };
}
