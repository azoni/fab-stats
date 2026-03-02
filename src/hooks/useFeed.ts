"use client";
import { useState, useEffect } from "react";
import { getFeedEvents } from "@/lib/feed";
import type { FeedEventType } from "@/lib/feed";
import type { FeedEvent } from "@/types";

export function useFeed(typeFilter: FeedEventType = "all") {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getFeedEvents(100, typeFilter).then((data) => {
      setEvents(data);
      setLoading(false);
    });
  }, [typeFilter]);

  return { events, loading };
}
