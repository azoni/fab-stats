import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { EventShowcaseConfig } from "@/types";

const CACHE_KEY = "fab_event_showcase";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/** Get the current event showcase config (cached) */
export async function getEventShowcase(): Promise<EventShowcaseConfig | null> {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { config, ts } = JSON.parse(cached);
      if (Date.now() - ts < CACHE_TTL) return config;
    }
  } catch {}

  try {
    const snap = await getDoc(doc(db, "admin", "eventShowcase"));
    if (!snap.exists()) return null;
    const config = snap.data() as EventShowcaseConfig;
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ config, ts: Date.now() }));
    } catch {}
    return config;
  } catch {
    return null;
  }
}

/** Save event showcase config (admin only) */
export async function saveEventShowcase(config: EventShowcaseConfig): Promise<void> {
  const cleaned = stripUndefined(config) as EventShowcaseConfig;
  await setDoc(doc(db, "admin", "eventShowcase"), cleaned);
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ config: cleaned, ts: Date.now() }));
  } catch {}
}

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
