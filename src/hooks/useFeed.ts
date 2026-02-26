"use client";
import { useState, useEffect } from "react";
import { getFeedEvents } from "@/lib/feed";
import type { FeedEvent } from "@/types";

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let cachedEvents: FeedEvent[] | null = null;
let cacheTimestamp = 0;

export function useFeed() {
  const [events, setEvents] = useState<FeedEvent[]>(cachedEvents || []);
  const [loading, setLoading] = useState(!cachedEvents);

  useEffect(() => {
    const now = Date.now();
    if (cachedEvents && now - cacheTimestamp < CACHE_TTL) {
      setEvents(cachedEvents);
      setLoading(false);
      return;
    }

    getFeedEvents()
      .then((data) => {
        cachedEvents = data;
        cacheTimestamp = Date.now();
        setEvents(data);
      })
      .catch(() => {
        setEvents([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return { events, loading };
}
