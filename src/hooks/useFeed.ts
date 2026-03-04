"use client";
import { useState, useEffect, useRef } from "react";
import { getFeedEvents } from "@/lib/feed";
import type { FeedEventType } from "@/lib/feed";
import type { FeedEvent } from "@/types";

export function useFeed(typeFilter: FeedEventType = "all") {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const prevFilter = useRef(typeFilter);

  useEffect(() => {
    // Only show full loading state on initial load, not filter changes
    const isInitial = prevFilter.current === typeFilter && events.length === 0;
    if (isInitial) setLoading(true);
    prevFilter.current = typeFilter;

    getFeedEvents(100, typeFilter).then((data) => {
      setEvents(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [typeFilter]);

  return { events, loading };
}
