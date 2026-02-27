import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import type { FeedEvent, UserProfile, ImportSource } from "@/types";

function feedCollection() {
  return collection(db, "feedEvents");
}

export async function createImportFeedEvent(
  profile: UserProfile,
  matchCount: number,
  topHeroes: string[],
  source?: ImportSource
): Promise<void> {
  // Don't publish feed events for private profiles
  if (!profile.isPublic) return;

  const data: Omit<FeedEvent, "id"> = {
    type: "import",
    userId: profile.uid,
    username: profile.username,
    displayName: profile.displayName,
    isPublic: profile.isPublic,
    matchCount,
    source,
    createdAt: new Date().toISOString(),
  };

  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) clean[k] = v;
  }

  if (profile.photoUrl) clean.photoUrl = profile.photoUrl;
  if (topHeroes.length > 0) clean.topHeroes = topHeroes.slice(0, 3);

  await addDoc(feedCollection(), clean);
  invalidateFeedCache();
}

// ── Cached one-time fetch (replaces real-time onSnapshot subscription) ──

let cachedFeed: FeedEvent[] | null = null;
let feedCacheTimestamp = 0;
const FEED_CACHE_TTL = 3 * 60_000; // 3 minutes

export async function getFeedEvents(limitCount = 50): Promise<FeedEvent[]> {
  const now = Date.now();
  if (cachedFeed && now - feedCacheTimestamp < FEED_CACHE_TTL) {
    return cachedFeed;
  }

  try {
    const q = query(feedCollection(), where("isPublic", "==", true), orderBy("createdAt", "desc"), limit(limitCount));
    const snapshot = await getDocs(q);
    cachedFeed = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as FeedEvent[];
    feedCacheTimestamp = now;
    return cachedFeed;
  } catch (error) {
    console.error("Feed fetch error:", error);
    return cachedFeed || [];
  }
}

export function invalidateFeedCache() {
  cachedFeed = null;
  feedCacheTimestamp = 0;
}
