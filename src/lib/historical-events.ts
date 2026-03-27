import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import type { HistoricalEvent } from "@/types";

const CACHE_KEY = "fab_historical_events";
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export async function getHistoricalEvents(): Promise<HistoricalEvent[]> {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { list, ts } = JSON.parse(cached);
      if (Date.now() - ts < CACHE_TTL) return list;
    }
  } catch {}

  try {
    const snap = await getDocs(collection(db, "historical-events"));
    const list = snap.docs.map((d) => d.data() as HistoricalEvent);
    list.sort((a, b) => b.date.localeCompare(a.date));
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ list, ts: Date.now() }));
    } catch {}
    return list;
  } catch {
    return [];
  }
}
