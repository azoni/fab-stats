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

/** Throttle map for support clicks: "uid:source" → last click timestamp */
const supportClickThrottle = new Map<string, number>();
const SUPPORT_CLICK_COOLDOWN = 30_000; // 30 seconds per (user, source)

/** Cached admin email list for filtering support clicks (avoids circular import with admin.ts) */
let adminEmailCache: { emails: string[]; ts: number } | null = null;
const ADMIN_CACHE_TTL = 10 * 60_000;

async function isCurrentUserAdmin(): Promise<boolean> {
  const email = auth.currentUser?.email?.toLowerCase();
  if (!email) return false;
  try {
    if (adminEmailCache && Date.now() - adminEmailCache.ts < ADMIN_CACHE_TTL) {
      return adminEmailCache.emails.includes(email);
    }
    const snap = await getDoc(doc(db, "admin", "config"));
    if (!snap.exists()) return false;
    const emails = ((snap.data().adminEmails || []) as string[]).map((e) => e.toLowerCase()).filter(Boolean);
    adminEmailCache = { emails, ts: Date.now() };
    return emails.includes(email);
  } catch {
    return false;
  }
}

/** Increment a support link click counter (e.g. "tcgplayer", "github_sponsors", "kofi", "discord", "twitter") */
export function trackSupportClick(source: string) {
  if (!source) return;
  const uid = auth.currentUser?.uid;

  // Skip admin clicks
  isCurrentUserAdmin().then((admin) => {
    if (!admin) doTrackSupportClick(source, uid);
  }).catch(() => {
    doTrackSupportClick(source, uid);
  });
}

function doTrackSupportClick(source: string, uid?: string) {
  // Throttle: max 1 click per 30s per (user, source) to prevent spam
  const key = `${uid || "anon"}:${source}`;
  const now = Date.now();
  const last = supportClickThrottle.get(key) || 0;
  if (now - last < SUPPORT_CLICK_COOLDOWN) return;
  supportClickThrottle.set(key, now);

  const date = new Date();
  try {
    setDoc(doc(db, "analytics", "supportClicks"), { [source]: increment(1) }, { merge: true }).catch(() => {});
    setDoc(doc(db, "analytics", `sc_h_${hourKey(date)}`), { [source]: increment(1) }, { merge: true }).catch(() => {});
    setDoc(doc(db, "analytics", `sc_d_${dayKey(date)}`), { [source]: increment(1) }, { merge: true }).catch(() => {});
  } catch {
    // Fire and forget
  }
}

/** Update the user's "last seen" timestamp. Throttled to every 5 minutes (in-memory). */
let lastPresenceUpdate = 0;
export function trackPresence() {
  const user = auth.currentUser;
  if (!user) return;
  const now = Date.now();
  if (now - lastPresenceUpdate < 5 * 60_000) return;
  lastPresenceUpdate = now;
  try {
    setDoc(doc(db, "analytics", "userLastVisit"), { [user.uid]: new Date().toISOString() }, { merge: true }).catch(() => {});
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

/** Lightweight online/active counts from the userLastVisit doc */
export async function getOnlineStats(): Promise<{ onlineNow: number; activeToday: number }> {
  const snap = await getDoc(doc(db, "analytics", "userLastVisit"));
  const data = (snap.data() as Record<string, string>) || {};
  const now = Date.now();
  let onlineNow = 0;
  let activeToday = 0;
  for (const ts of Object.values(data)) {
    const diff = now - new Date(ts).getTime();
    if (diff < 15 * 60_000) onlineNow++;
    if (diff < 24 * 60 * 60_000) activeToday++;
  }
  return { onlineNow, activeToday };
}

// Local-timezone day key: "2026-03-12"
function localDayKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Fetch daily page view totals for the last N days (admin only).
 *  Data is stored in UTC-keyed docs, but labels use local dates for display. */
export async function getDailyPageViewTrend(days = 30): Promise<{ date: string; total: number }[]> {
  const now = new Date();
  const docIds = Array.from({ length: days }, (_, i) => {
    const d = new Date(now.getTime() - i * 86400000);
    return `pv_d_${dayKey(d)}`;
  });
  const snaps = await Promise.all(docIds.map((id) => getDoc(doc(db, "analytics", id))));
  return snaps.map((snap, i) => {
    const d = new Date(now.getTime() - i * 86400000);
    const data = snap.data() as Record<string, number> | undefined;
    const total = data ? Object.values(data).reduce((sum, v) => sum + v, 0) : 0;
    return { date: localDayKey(d), total };
  }).reverse();
}

export type AnalyticsTimeRange = "1h" | "12h" | "24h" | "7d" | "all";

/** Read analytics data, optionally filtered by time range (admin only) */
export async function getAnalytics(range: AnalyticsTimeRange = "all"): Promise<{
  pageViews: Record<string, number>;
  creatorClicks: Record<string, number>;
  supportClicks: Record<string, number>;
}> {
  if (range === "all") {
    const [pvSnap, ccSnap, scSnap] = await Promise.all([
      getDoc(doc(db, "analytics", "pageViews")),
      getDoc(doc(db, "analytics", "creatorClicks")),
      getDoc(doc(db, "analytics", "supportClicks")),
    ]);
    return {
      pageViews: (pvSnap.data() as Record<string, number>) || {},
      creatorClicks: (ccSnap.data() as Record<string, number>) || {},
      supportClicks: (scSnap.data() as Record<string, number>) || {},
    };
  }

  const now = new Date();
  const pvDocIds: string[] = [];
  const ccDocIds: string[] = [];
  const scDocIds: string[] = [];

  if (range === "1h" || range === "12h" || range === "24h") {
    const hours = range === "1h" ? 1 : range === "12h" ? 12 : 24;
    for (let i = 0; i < hours; i++) {
      const d = new Date(now.getTime() - i * 3600000);
      pvDocIds.push(`pv_h_${hourKey(d)}`);
      ccDocIds.push(`cc_h_${hourKey(d)}`);
      scDocIds.push(`sc_h_${hourKey(d)}`);
    }
  } else if (range === "7d") {
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getTime() - i * 86400000);
      pvDocIds.push(`pv_d_${dayKey(d)}`);
      ccDocIds.push(`cc_d_${dayKey(d)}`);
      scDocIds.push(`sc_d_${dayKey(d)}`);
    }
  }

  const allDocIds = [...pvDocIds, ...ccDocIds, ...scDocIds];
  const snaps = await Promise.all(allDocIds.map((id) => getDoc(doc(db, "analytics", id))));

  const pageViews: Record<string, number> = {};
  const creatorClicks: Record<string, number> = {};
  const supportClicks: Record<string, number> = {};

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

  for (let i = 0; i < scDocIds.length; i++) {
    const data = snaps[pvDocIds.length + ccDocIds.length + i].data() as Record<string, number> | undefined;
    if (data) {
      for (const [key, count] of Object.entries(data)) {
        supportClicks[key] = (supportClicks[key] || 0) + count;
      }
    }
  }

  return { pageViews, creatorClicks, supportClicks };
}

/** Track an import method usage */
export function trackImportMethod(method: string, matchCount: number) {
  if (!method) return;
  try {
    setDoc(doc(db, "analytics", "importMethods"), {
      [method]: increment(matchCount),
      [`${method}_count`]: increment(1),
    }, { merge: true }).catch(() => {});
  } catch {
    // Fire and forget
  }
}

/** Read import method stats (admin only) */
export async function getImportMethodStats(): Promise<Record<string, number>> {
  const snap = await getDoc(doc(db, "analytics", "importMethods"));
  return (snap.data() as Record<string, number>) || {};
}
