import { useState, useEffect } from "react";
import { getEvents } from "@/lib/featured-events";
import type { FeaturedEvent } from "@/types";

export function useFeaturedEvents() {
  const [events, setEvents] = useState<FeaturedEvent[]>([]);

  useEffect(() => {
    getEvents().then(setEvents).catch(() => {});
  }, []);

  return events;
}
