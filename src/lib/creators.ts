import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { Creator } from "@/types";

const CACHE_KEY = "fab_creators";
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function getCreators(): Promise<Creator[]> {
  // Check localStorage cache first
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { list, ts } = JSON.parse(cached);
      if (Date.now() - ts < CACHE_TTL) return list;
    }
  } catch {}

  try {
    const snap = await getDoc(doc(db, "admin", "creators"));
    if (!snap.exists()) return [];
    const list = (snap.data().list || []) as Creator[];
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ list, ts: Date.now() }));
    } catch {}
    return list;
  } catch {
    return [];
  }
}

export async function saveCreators(list: Creator[]): Promise<void> {
  await setDoc(doc(db, "admin", "creators"), { list });
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ list, ts: Date.now() }));
  } catch {}
}
