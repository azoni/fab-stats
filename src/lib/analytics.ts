import { doc, setDoc, getDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/firebase";

// UTC hour key: "2026-02-27-14"
function hourKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 13).replace("T", "-");
}

// UTC day key: "2026-02-27"
function dayKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** Increment a page view counter for the given route path */
export function trackPageView(path: string) {
  if (!auth.currentUser) return;
  // Sanitize path to be a valid Firestore field name (replace / with _)
  const field = path === "/" ? "_home" : path.replace(/\//g, "_").replace(/^_/, "");
  const now = new Date();
  try {
    setDoc(doc(db, "analytics", "pageViews"), { [field]: increment(1) }, { merge: true }).catch(() => {});
    setDoc(doc(db, "analytics", `pv_h_${hourKey(now)}`), { [field]: increment(1) }, { merge: true }).catch(() => {});
    setDoc(doc(db, "analytics", `pv_d_${dayKey(now)}`), { [field]: increment(1) }, { merge: true }).catch(() => {});
  } catch {
    // Fire and forget — don't block UI
  }
}

/** Increment a creator click counter */
export function trackCreatorClick(creatorName: string) {
  if (!creatorName || !auth.currentUser) return;
  const now = new Date();
  try {
    setDoc(doc(db, "analytics", "creatorClicks"), { [creatorName]: increment(1) }, { merge: true }).catch(() => {});
    setDoc(doc(db, "analytics", `cc_h_${hourKey(now)}`), { [creatorName]: increment(1) }, { merge: true }).catch(() => {});
    setDoc(doc(db, "analytics", `cc_d_${dayKey(now)}`), { [creatorName]: increment(1) }, { merge: true }).catch(() => {});
  } catch {
    // Fire and forget
  }
}

/** Track a unique daily visit for the current user. Throttled to once per day via localStorage. */
export function trackVisit() {
  const user = auth.currentUser;
  if (!user) return;

  const today = dayKey();
  const storageKey = "fab_last_visit_date";
  try {
    if (typeof window !== "undefined" && localStorage.getItem(storageKey) === today) return;
  } catch {
    // localStorage unavailable
  }

  try {
    setDoc(doc(db, "analytics", "userVisits"), { [user.uid]: increment(1) }, { merge: true }).catch(() => {});
    setDoc(doc(db, "analytics", "userLastVisit"), { [user.uid]: new Date().toISOString() }, { merge: true }).catch(() => {});
  } catch {
    // Fire and forget
  }

  try {
    if (typeof window !== "undefined") localStorage.setItem(storageKey, today);
  } catch {
    // localStorage unavailable
  }
}

/** Get per-user visit data (admin only) */
export async function getUserVisitData(): Promise<{
  visits: Record<string, number>;
  lastVisit: Record<string, string>;
}> {
  const [visitsSnap, lastVisitSnap] = await Promise.all([
    getDoc(doc(db, "analytics", "userVisits")),
    getDoc(doc(db, "analytics", "userLastVisit")),
  ]);
  return {
    visits: (visitsSnap.data() as Record<string, number>) || {},
    lastVisit: (lastVisitSnap.data() as Record<string, string>) || {},
  };
}

export type AnalyticsTimeRange = "1h" | "12h" | "24h" | "7d" | "all";

/** Read analytics data, optionally filtered by time range (admin only) */
export async function getAnalytics(range: AnalyticsTimeRange = "all"): Promise<{
  pageViews: Record<string, number>;
  creatorClicks: Record<string, number>;
}> {
  if (range === "all") {
    const [pvSnap, ccSnap] = await Promise.all([
      getDoc(doc(db, "analytics", "pageViews")),
      getDoc(doc(db, "analytics", "creatorClicks")),
    ]);
    return {
      pageViews: (pvSnap.data() as Record<string, number>) || {},
      creatorClicks: (ccSnap.data() as Record<string, number>) || {},
    };
  }

  const now = new Date();
  const pvDocIds: string[] = [];
  const ccDocIds: string[] = [];

  if (range === "1h" || range === "12h" || range === "24h") {
    const hours = range === "1h" ? 1 : range === "12h" ? 12 : 24;
    for (let i = 0; i < hours; i++) {
      const d = new Date(now.getTime() - i * 3600000);
      pvDocIds.push(`pv_h_${hourKey(d)}`);
      ccDocIds.push(`cc_h_${hourKey(d)}`);
    }
  } else if (range === "7d") {
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getTime() - i * 86400000);
      pvDocIds.push(`pv_d_${dayKey(d)}`);
      ccDocIds.push(`cc_d_${dayKey(d)}`);
    }
  }

  const allDocIds = [...pvDocIds, ...ccDocIds];
  const snaps = await Promise.all(allDocIds.map((id) => getDoc(doc(db, "analytics", id))));

  const pageViews: Record<string, number> = {};
  const creatorClicks: Record<string, number> = {};

  for (let i = 0; i < pvDocIds.length; i++) {
    const data = snaps[i].data() as Record<string, number> | undefined;
    if (data) {
      for (const [key, count] of Object.entries(data)) {
        pageViews[key] = (pageViews[key] || 0) + count;
      }
    }
  }

  for (let i = 0; i < ccDocIds.length; i++) {
    const data = snaps[pvDocIds.length + i].data() as Record<string, number> | undefined;
    if (data) {
      for (const [key, count] of Object.entries(data)) {
        creatorClicks[key] = (creatorClicks[key] || 0) + count;
      }
    }
  }

  return { pageViews, creatorClicks };
}
