import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { FeaturedEvent } from "@/types";

const CACHE_KEY = "fab_featured_events";
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function getEvents(): Promise<FeaturedEvent[]> {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { list, ts } = JSON.parse(cached);
      if (Date.now() - ts < CACHE_TTL) return list;
    }
  } catch {}

  try {
    const snap = await getDoc(doc(db, "admin", "featuredEvents"));
    if (!snap.exists()) return [];
    const list = (snap.data().list || []) as FeaturedEvent[];
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ list, ts: Date.now() }));
    } catch {}
    return list;
  } catch {
    return [];
  }
}

// Strip undefined values so Firestore doesn't reject the document
function stripUndefined(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(stripUndefined);
  if (obj !== null && typeof obj === "object") {
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (v !== undefined) clean[k] = stripUndefined(v);
    }
    return clean;
  }
  return obj;
}

export async function saveEvents(list: FeaturedEvent[]): Promise<void> {
  const cleaned = stripUndefined(list) as FeaturedEvent[];
  await setDoc(doc(db, "admin", "featuredEvents"), { list: cleaned });
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ list: cleaned, ts: Date.now() }));
  } catch {}
}
