"use client";
import { useState, useEffect } from "react";
import { getFeedEvents } from "@/lib/feed";
import type { FeedEvent } from "@/types";

export function useFeed() {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFeedEvents(100).then((data) => {
      setEvents(data);
      setLoading(false);
    });
  }, []);

  return { events, loading };
}
