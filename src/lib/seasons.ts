import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { Season } from "@/types";

const CACHE_KEY = "fab_seasons";
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function getSeasons(): Promise<Season[]> {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { list, ts } = JSON.parse(cached);
      if (Date.now() - ts < CACHE_TTL) return list;
    }
  } catch {}

  try {
    const snap = await getDoc(doc(db, "admin", "seasons"));
    if (!snap.exists()) return [];
    const list = (snap.data().list || []) as Season[];
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ list, ts: Date.now() }));
    } catch {}
    return list;
  } catch {
    return [];
  }
}

export async function saveSeasons(list: Season[]): Promise<void> {
  await setDoc(doc(db, "admin", "seasons"), { list });
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ list, ts: Date.now() }));
  } catch {}
}

/** Return the first active season whose date range contains today */
export function getCurrentSeason(seasons: Season[]): Season | null {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return seasons.find((s) => s.active && s.startDate <= today && s.endDate >= today) || null;
}

/** Split a season into 7-day week chunks */
export function getSeasonWeeks(season: Season): { label: string; start: string; end: string }[] {
  const weeks: { label: string; start: string; end: string }[] = [];
  const start = new Date(season.startDate + "T00:00:00");
  const end = new Date(season.endDate + "T00:00:00");
  let weekStart = new Date(start);
  let weekNum = 1;

  while (weekStart <= end) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const actualEnd = weekEnd > end ? end : weekEnd;
    weeks.push({
      label: `Wk ${weekNum}`,
      start: weekStart.toISOString().slice(0, 10),
      end: actualEnd.toISOString().slice(0, 10),
    });
    weekNum++;
    weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() + 1);
  }

  return weeks;
}

export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
