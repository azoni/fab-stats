import { useState, useEffect } from "react";
import { getHistoricalEvents } from "@/lib/historical-events";
import type { HistoricalEvent } from "@/types";

export function useHistoricalEvents() {
  const [events, setEvents] = useState<HistoricalEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHistoricalEvents()
      .then(setEvents)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { events, loading };
}
