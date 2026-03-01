import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  query,
  orderBy,
  limit,
  where,
  startAfter,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "./firebase";
import type { FeedEvent, ImportFeedEvent, AchievementFeedEvent, PlacementFeedEvent, UserProfile, ImportSource, Achievement } from "@/types";
import type { PlayoffFinish } from "./stats";

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

  const data: Omit<ImportFeedEvent, "id"> = {
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

export async function createAchievementFeedEvent(
  profile: UserProfile,
  achievements: Achievement[],
): Promise<void> {
  if (!profile.isPublic || achievements.length === 0) return;

  const data: Omit<AchievementFeedEvent, "id"> = {
    type: "achievement",
    userId: profile.uid,
    username: profile.username,
    displayName: profile.displayName,
    isPublic: profile.isPublic,
    achievements: achievements.map((a) => ({
      id: a.id,
      name: a.name,
      icon: a.icon,
      rarity: a.rarity,
    })),
    createdAt: new Date().toISOString(),
  };

  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) clean[k] = v;
  }
  if (profile.photoUrl) clean.photoUrl = profile.photoUrl;

  await addDoc(feedCollection(), clean);
  invalidateFeedCache();
}

export async function createPlacementFeedEvent(
  profile: UserProfile,
  finish: PlayoffFinish,
  hero?: string,
): Promise<void> {
  if (!profile.isPublic) return;

  const data: Omit<PlacementFeedEvent, "id"> = {
    type: "placement",
    userId: profile.uid,
    username: profile.username,
    displayName: profile.displayName,
    isPublic: profile.isPublic,
    placementType: finish.type,
    eventName: finish.eventName,
    eventDate: finish.eventDate,
    eventType: finish.eventType,
    createdAt: new Date().toISOString(),
  };

  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) clean[k] = v;
  }
  if (profile.photoUrl) clean.photoUrl = profile.photoUrl;
  if (hero && hero !== "Unknown") clean.hero = hero;

  await addDoc(feedCollection(), clean);
  invalidateFeedCache();
}

/** Delete all placement feed events for a specific event (used when an event is deleted). */
export async function deleteFeedEventsForEvent(
  userId: string,
  eventName: string,
  eventDate: string,
): Promise<void> {
  // Single-field query (auto-indexed) + client-side filter to avoid needing a composite index
  const q = query(
    feedCollection(),
    where("userId", "==", userId),
  );
  const snapshot = await getDocs(q);
  const matching = snapshot.docs.filter((d) => {
    const data = d.data();
    return data.type === "placement" && data.eventName === eventName && data.eventDate === eventDate;
  });
  if (matching.length === 0) return;
  await Promise.all(matching.map((d) => deleteDoc(d.ref)));
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

export type FeedEventType = "all" | "import" | "achievement" | "placement";

export interface PaginatedFeedResult {
  events: FeedEvent[];
  hasMore: boolean;
  /** ISO timestamp of the last event — pass as `cursor` to load the next page */
  lastTimestamp: string | null;
}

/** Paginated feed fetch for the Discover page. Not cached — always hits Firestore. */
export async function getFeedEventsPaginated(
  pageSize: number,
  typeFilter: FeedEventType = "all",
  cursor?: string,
): Promise<PaginatedFeedResult> {
  const constraints: QueryConstraint[] = [
    where("isPublic", "==", true),
    orderBy("createdAt", "desc"),
  ];

  if (typeFilter !== "all") {
    constraints.push(where("type", "==", typeFilter));
  }

  if (cursor) {
    constraints.push(startAfter(cursor));
  }

  constraints.push(limit(pageSize + 1)); // fetch one extra to check hasMore

  const q = query(feedCollection(), ...constraints);
  const snapshot = await getDocs(q);
  const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as FeedEvent[];

  const hasMore = docs.length > pageSize;
  const events = hasMore ? docs.slice(0, pageSize) : docs;
  const lastTimestamp = events.length > 0 ? events[events.length - 1].createdAt : null;

  return { events, hasMore, lastTimestamp };
}

// ── Reactions ──

export const FEED_REACTIONS = [
  { key: "gg", label: "GG" },
  { key: "goagain", label: "Go Again" },
  { key: "majestic", label: "Majestic" },
  { key: "dominate", label: "Dominate" },
] as const;

export type FeedReactionKey = (typeof FEED_REACTIONS)[number]["key"];

export async function addFeedReaction(eventId: string, reactionKey: string, userId: string): Promise<void> {
  const docRef = doc(db, "feedEvents", eventId);
  await updateDoc(docRef, {
    [`reactions.${reactionKey}`]: arrayUnion(userId),
  });
  invalidateFeedCache();
}

export async function removeFeedReaction(eventId: string, reactionKey: string, userId: string): Promise<void> {
  const docRef = doc(db, "feedEvents", eventId);
  await updateDoc(docRef, {
    [`reactions.${reactionKey}`]: arrayRemove(userId),
  });
  invalidateFeedCache();
}
