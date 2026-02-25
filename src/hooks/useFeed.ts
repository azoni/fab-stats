"use client";
import { useState, useEffect } from "react";
import { subscribeFeed } from "@/lib/feed";
import type { FeedEvent } from "@/types";

export function useFeed() {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeFeed((data) => {
      setEvents(data);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return { events, loading };
}
