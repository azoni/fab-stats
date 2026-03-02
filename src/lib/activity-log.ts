import { doc, setDoc, addDoc, collection, getDocs, query, orderBy, limit, where, startAfter, getDoc, increment } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

export type ActivityAction =
  | "showcase_edit"
  | "profile_share"
  | "placement_share"
  | "bestfinish_share"
  | "event_share"
  | "rivalry_share"
  | "compare_share";

export interface ActivityEvent {
  id: string;
  action: ActivityAction;
  uid: string;
  username: string;
  ts: string;
  meta?: string;
}

// 60-second throttle per (uid, action) to prevent spam
const _lastLogged = new Map<string, number>();
const THROTTLE_MS = 60_000;

/** Fire-and-forget: log a user activity event. */
export function logActivity(action: ActivityAction, meta?: string) {
  const user = auth.currentUser;
  if (!user) return;

  const key = `${user.uid}:${action}`;
  const now = Date.now();
  if ((_lastLogged.get(key) ?? 0) + THROTTLE_MS > now) return;
  _lastLogged.set(key, now);

  const username = user.displayName || user.email?.split("@")[0] || "unknown";

  try {
    // Aggregate counter
    setDoc(doc(db, "analytics", "featureUsage"), { [action]: increment(1) }, { merge: true }).catch(() => {});

    // Detail doc
    const data: Record<string, unknown> = {
      action,
      uid: user.uid,
      username,
      ts: new Date().toISOString(),
    };
    if (meta) data.meta = meta;
    addDoc(collection(db, "adminActivity"), data).catch(() => {});
  } catch {
    // Fire and forget
  }
}

/** Admin: read feature usage counters (single doc read). */
export async function getFeatureUsageCounts(): Promise<Record<string, number>> {
  const snap = await getDoc(doc(db, "analytics", "featureUsage"));
  return (snap.data() as Record<string, number>) || {};
}

/** Admin: paginated activity feed. */
export async function getActivityFeed(
  pageSize: number = 50,
  actionFilter?: ActivityAction,
  cursor?: string,
): Promise<{ events: ActivityEvent[]; hasMore: boolean }> {
  const col = collection(db, "adminActivity");
  const constraints: Parameters<typeof query>[1][] = [];

  if (actionFilter) constraints.push(where("action", "==", actionFilter));
  constraints.push(orderBy("ts", "desc"));
  if (cursor) constraints.push(startAfter(cursor));
  constraints.push(limit(pageSize + 1));

  const snap = await getDocs(query(col, ...constraints));
  const events: ActivityEvent[] = [];
  snap.docs.slice(0, pageSize).forEach((d) => {
    const data = d.data();
    events.push({
      id: d.id,
      action: data.action,
      uid: data.uid,
      username: data.username,
      ts: data.ts,
      meta: data.meta,
    });
  });

  return { events, hasMore: snap.docs.length > pageSize };
}
