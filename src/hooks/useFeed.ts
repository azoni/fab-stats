"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeFeed } from "@/lib/feed";
import type { FeedEvent } from "@/types";

export function useFeed() {
  const { user } = useAuth();
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeFeed((data) => {
      setEvents(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  return { events, loading };
}
