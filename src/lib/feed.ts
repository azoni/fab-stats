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
  writeBatch,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "./firebase";
import type { FeedEvent, ImportFeedEvent, AchievementFeedEvent, PlacementFeedEvent, FaBdokuFeedEvent, FaBdokuCardFeedEvent, CrosswordFeedEvent, HeroGuesserFeedEvent, MatchupManiaFeedEvent, TriviaFeedEvent, TimelineFeedEvent, ConnectionsFeedEvent, RampageFeedEvent, KnockoutFeedEvent, BrawlFeedEvent, UserProfile, ImportSource, Achievement, MatchRecord } from "@/types";
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
  // Don't publish feed events for private or feed-hidden profiles
  if (!profile.isPublic || profile.hideFromFeed) return;

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
  if (!profile.isPublic || profile.hideFromFeed || achievements.length === 0) return;

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
  if (!profile.isPublic || profile.hideFromFeed) return;

  // Dedup: skip if this user already has a placement event for this event+date
  const dupCheck = query(
    feedCollection(),
    where("userId", "==", profile.uid),
    where("type", "==", "placement"),
    where("eventDate", "==", finish.eventDate),
    where("eventName", "==", finish.eventName),
    limit(1),
  );
  const existing = await getDocs(dupCheck);
  if (!existing.empty) return;

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

export async function createFaBdokuFeedEvent(
  profile: UserProfile,
  subtype: "completed" | "shared",
  puzzleDate: string,
  won: boolean,
  correctCount: number,
  guessesUsed: number,
  grid: ("correct" | "wrong" | "empty")[][],
  uniquenessScore?: number,
): Promise<void> {
  if (!profile.isPublic || profile.hideFromFeed) return;

  // Dedup: don't post multiple events for the same puzzle+subtype
  const dupCheck = query(
    feedCollection(),
    where("userId", "==", profile.uid),
    where("type", "==", "fabdoku"),
    where("date", "==", puzzleDate),
    where("subtype", "==", subtype),
    limit(1),
  );
  const existing = await getDocs(dupCheck);
  if (!existing.empty) return;

  const data: Omit<FaBdokuFeedEvent, "id"> = {
    type: "fabdoku",
    subtype,
    userId: profile.uid,
    username: profile.username,
    displayName: profile.displayName,
    isPublic: profile.isPublic,
    date: puzzleDate,
    won,
    correctCount,
    guessesUsed,
    grid: grid.flat(),
    createdAt: new Date().toISOString(),
  };

  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) clean[k] = v;
  }
  if (profile.photoUrl) clean.photoUrl = profile.photoUrl;
  if (uniquenessScore !== undefined) clean.uniquenessScore = uniquenessScore;

  await addDoc(feedCollection(), clean);
  invalidateFeedCache();
}

export async function createCrosswordFeedEvent(
  profile: UserProfile,
  subtype: "completed" | "shared",
  puzzleDate: string,
  won: boolean,
  wordsFound: number,
  totalWords: number,
  elapsedSeconds: number,
  checksUsed: number,
  revealsUsed: number,
): Promise<void> {
  if (!profile.isPublic || profile.hideFromFeed) return;

  // Dedup: don't post multiple events for the same puzzle+subtype
  const dupCheck = query(
    feedCollection(),
    where("userId", "==", profile.uid),
    where("type", "==", "crossword"),
    where("date", "==", puzzleDate),
    where("subtype", "==", subtype),
    limit(1),
  );
  const existing = await getDocs(dupCheck);
  if (!existing.empty) return;

  const data: Omit<CrosswordFeedEvent, "id"> = {
    type: "crossword",
    subtype,
    userId: profile.uid,
    username: profile.username,
    displayName: profile.displayName,
    isPublic: profile.isPublic,
    date: puzzleDate,
    won,
    wordsFound,
    totalWords,
    elapsedSeconds,
    checksUsed,
    revealsUsed,
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

export async function createHeroGuesserFeedEvent(
  profile: UserProfile,
  subtype: "completed" | "shared",
  puzzleDate: string,
  won: boolean,
  guessCount: number,
  maxGuesses: number,
): Promise<void> {
  if (!profile.isPublic || profile.hideFromFeed) return;

  // Dedup: don't post multiple events for the same puzzle+subtype
  const dupCheck = query(
    feedCollection(),
    where("userId", "==", profile.uid),
    where("type", "==", "heroguesser"),
    where("date", "==", puzzleDate),
    where("subtype", "==", subtype),
    limit(1),
  );
  const existing = await getDocs(dupCheck);
  if (!existing.empty) return;

  const data: Omit<HeroGuesserFeedEvent, "id"> = {
    type: "heroguesser",
    subtype,
    userId: profile.uid,
    username: profile.username,
    displayName: profile.displayName,
    isPublic: profile.isPublic,
    date: puzzleDate,
    won,
    guessCount,
    maxGuesses,
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

export async function createMatchupManiaFeedEvent(
  profile: UserProfile,
  subtype: "completed" | "shared",
  puzzleDate: string,
  won: boolean,
  score: number,
  totalRounds: number,
): Promise<void> {
  if (!profile.isPublic || profile.hideFromFeed) return;

  const dupCheck = query(
    feedCollection(),
    where("userId", "==", profile.uid),
    where("type", "==", "matchupmania"),
    where("date", "==", puzzleDate),
    where("subtype", "==", subtype),
    limit(1),
  );
  const existing = await getDocs(dupCheck);
  if (!existing.empty) return;

  const data: Omit<MatchupManiaFeedEvent, "id"> = {
    type: "matchupmania",
    subtype,
    userId: profile.uid,
    username: profile.username,
    displayName: profile.displayName,
    isPublic: profile.isPublic,
    date: puzzleDate,
    won,
    score,
    totalRounds,
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

export async function createTriviaFeedEvent(
  profile: UserProfile,
  subtype: "completed" | "shared",
  puzzleDate: string,
  won: boolean,
  score: number,
  totalQuestions: number,
): Promise<void> {
  if (!profile.isPublic || profile.hideFromFeed) return;

  const dupCheck = query(
    feedCollection(),
    where("userId", "==", profile.uid),
    where("type", "==", "trivia"),
    where("date", "==", puzzleDate),
    where("subtype", "==", subtype),
    limit(1),
  );
  const existing = await getDocs(dupCheck);
  if (!existing.empty) return;

  const data: Omit<TriviaFeedEvent, "id"> = {
    type: "trivia",
    subtype,
    userId: profile.uid,
    username: profile.username,
    displayName: profile.displayName,
    isPublic: profile.isPublic,
    date: puzzleDate,
    won,
    score,
    totalQuestions,
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

export async function createTimelineFeedEvent(
  profile: UserProfile,
  subtype: "completed" | "shared",
  puzzleDate: string,
  won: boolean,
  livesRemaining: number,
  totalItems: number,
): Promise<void> {
  if (!profile.isPublic || profile.hideFromFeed) return;

  const dupCheck = query(
    feedCollection(),
    where("userId", "==", profile.uid),
    where("type", "==", "timeline"),
    where("date", "==", puzzleDate),
    where("subtype", "==", subtype),
    limit(1),
  );
  const existing = await getDocs(dupCheck);
  if (!existing.empty) return;

  const data: Omit<TimelineFeedEvent, "id"> = {
    type: "timeline",
    subtype,
    userId: profile.uid,
    username: profile.username,
    displayName: profile.displayName,
    isPublic: profile.isPublic,
    date: puzzleDate,
    won,
    livesRemaining,
    totalItems,
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

export async function createConnectionsFeedEvent(
  profile: UserProfile,
  subtype: "completed" | "shared",
  puzzleDate: string,
  won: boolean,
  groupsFound: number,
  mistakesUsed: number,
): Promise<void> {
  if (!profile.isPublic || profile.hideFromFeed) return;

  const dupCheck = query(
    feedCollection(),
    where("userId", "==", profile.uid),
    where("type", "==", "connections"),
    where("date", "==", puzzleDate),
    where("subtype", "==", subtype),
    limit(1),
  );
  const existing = await getDocs(dupCheck);
  if (!existing.empty) return;

  const data: Omit<ConnectionsFeedEvent, "id"> = {
    type: "connections",
    subtype,
    userId: profile.uid,
    username: profile.username,
    displayName: profile.displayName,
    isPublic: profile.isPublic,
    date: puzzleDate,
    won,
    groupsFound,
    mistakesUsed,
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

/** Post a FaBdoku feed event for a guest (no profile required). */
export async function createGuestFaBdokuFeedEvent(
  puzzleDate: string,
  won: boolean,
  correctCount: number,
  guessesUsed: number,
  grid: ("correct" | "wrong" | "empty")[][],
  uniquenessScore?: number,
): Promise<void> {
  // Dedup: only one guest event per puzzle date
  const dupCheck = query(
    feedCollection(),
    where("userId", "==", "guest"),
    where("type", "==", "fabdoku"),
    where("date", "==", puzzleDate),
    limit(1),
  );
  const existing = await getDocs(dupCheck);
  if (!existing.empty) return;

  const data: Record<string, unknown> = {
    type: "fabdoku",
    subtype: "completed",
    userId: "guest",
    username: "guest",
    displayName: "Guest",
    isPublic: true,
    date: puzzleDate,
    won,
    correctCount,
    guessesUsed,
    grid: grid.flat(),
    createdAt: new Date().toISOString(),
  };
  if (uniquenessScore !== undefined) data.uniquenessScore = uniquenessScore;

  await addDoc(feedCollection(), data);
  invalidateFeedCache();
}

/** Delete all FaBdoku feed events for a user on a given date (used by admin reset). */
export async function deleteFaBdokuFeedEvents(
  userId: string,
  puzzleDate: string,
): Promise<void> {
  const q = query(
    feedCollection(),
    where("userId", "==", userId),
    where("type", "==", "fabdoku"),
    where("date", "==", puzzleDate),
  );
  const snap = await getDocs(q);
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  invalidateFeedCache();
}

export async function createFaBdokuCardFeedEvent(
  profile: UserProfile,
  subtype: "completed" | "shared",
  puzzleDate: string,
  won: boolean,
  correctCount: number,
  guessesUsed: number,
  grid: ("correct" | "wrong" | "empty")[][],
  uniquenessScore?: number,
): Promise<void> {
  if (!profile.isPublic || profile.hideFromFeed) return;

  const dupCheck = query(
    feedCollection(),
    where("userId", "==", profile.uid),
    where("type", "==", "fabdoku-cards"),
    where("date", "==", puzzleDate),
    where("subtype", "==", subtype),
    limit(1),
  );
  const existing = await getDocs(dupCheck);
  if (!existing.empty) return;

  const data: Omit<FaBdokuCardFeedEvent, "id"> = {
    type: "fabdoku-cards",
    subtype,
    userId: profile.uid,
    username: profile.username,
    displayName: profile.displayName,
    isPublic: profile.isPublic,
    date: puzzleDate,
    won,
    correctCount,
    guessesUsed,
    grid: grid.flat(),
    createdAt: new Date().toISOString(),
  };

  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) clean[k] = v;
  }
  if (profile.photoUrl) clean.photoUrl = profile.photoUrl;
  if (uniquenessScore !== undefined) clean.uniquenessScore = uniquenessScore;

  await addDoc(feedCollection(), clean);
  invalidateFeedCache();
}

export async function createGuestFaBdokuCardFeedEvent(
  puzzleDate: string,
  won: boolean,
  correctCount: number,
  guessesUsed: number,
  grid: ("correct" | "wrong" | "empty")[][],
  uniquenessScore?: number,
): Promise<void> {
  const dupCheck = query(
    feedCollection(),
    where("userId", "==", "guest"),
    where("type", "==", "fabdoku-cards"),
    where("date", "==", puzzleDate),
    limit(1),
  );
  const existing = await getDocs(dupCheck);
  if (!existing.empty) return;

  const data: Record<string, unknown> = {
    type: "fabdoku-cards",
    subtype: "completed",
    userId: "guest",
    username: "guest",
    displayName: "Guest",
    isPublic: true,
    date: puzzleDate,
    won,
    correctCount,
    guessesUsed,
    grid: grid.flat(),
    createdAt: new Date().toISOString(),
  };
  if (uniquenessScore !== undefined) data.uniquenessScore = uniquenessScore;

  await addDoc(feedCollection(), data);
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

const feedCache = new Map<string, { events: FeedEvent[]; timestamp: number }>();
const FEED_CACHE_TTL = 5 * 60_000; // 5 minutes

export async function getFeedEvents(limitCount = 50, typeFilter: FeedEventType = "all"): Promise<FeedEvent[]> {
  const now = Date.now();
  const cached = feedCache.get(typeFilter);
  if (cached && now - cached.timestamp < FEED_CACHE_TTL) {
    return cached.events;
  }

  try {
    const constraints: QueryConstraint[] = [
      where("isPublic", "==", true),
      orderBy("createdAt", "desc"),
      limit(limitCount),
    ];
    if (typeFilter !== "all") {
      constraints.push(where("type", "==", typeFilter));
    }
    const q = query(feedCollection(), ...constraints);
    const snapshot = await getDocs(q);
    const events = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as FeedEvent[];
    feedCache.set(typeFilter, { events, timestamp: now });
    return events;
  } catch (error) {
    console.error("Feed fetch error:", error);
    return cached?.events || [];
  }
}

export function invalidateFeedCache() {
  feedCache.clear();
}

export type FeedEventType = "all" | "import" | "achievement" | "placement" | "fabdoku" | "crossword" | "heroguesser" | "matchupmania" | "trivia" | "timeline" | "connections";

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

/** Delete a single feed event by ID. */
export async function deleteFeedEvent(eventId: string): Promise<void> {
  await deleteDoc(doc(db, "feedEvents", eventId));
  invalidateFeedCache();
}

/** Sync a user's feed events when their profile visibility changes.
 *  - Flips `isPublic` on all existing feed event docs
 *  - If going public: creates any missing placement feed events from their matches
 */
export async function syncFeedEventsVisibility(
  profile: UserProfile,
  matches: MatchRecord[],
): Promise<void> {
  const isPublic = profile.isPublic && !profile.hideFromFeed;

  // 1. Batch-update isPublic on all existing feed events for this user
  const q = query(feedCollection(), where("userId", "==", profile.uid));
  const snapshot = await getDocs(q);
  if (snapshot.docs.length > 0) {
    const batchSize = 500;
    for (let i = 0; i < snapshot.docs.length; i += batchSize) {
      const batch = writeBatch(db);
      snapshot.docs.slice(i, i + batchSize).forEach((d) => {
        batch.update(d.ref, { isPublic });
      });
      await batch.commit();
    }
  }

  // 2. If going public, create any missing placement feed events
  if (isPublic && matches.length > 0) {
    const { computeEventStats, computePlayoffFinishes } = await import("./stats");
    const eventStats = computeEventStats(matches);
    const finishes = computePlayoffFinishes(eventStats);
    for (const finish of finishes) {
      const hero = finish.hero;
      await createPlacementFeedEvent(profile, finish, hero).catch(() => {});
    }
  }

  invalidateFeedCache();
}

/** Delete ALL feed events for a user (used when clearing all matches or deleting account). */
export async function deleteAllFeedEventsForUser(userId: string): Promise<void> {
  const q = query(feedCollection(), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  if (snapshot.docs.length === 0) return;

  const batchSize = 500;
  for (let i = 0; i < snapshot.docs.length; i += batchSize) {
    const batch = writeBatch(db);
    snapshot.docs.slice(i, i + batchSize).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  invalidateFeedCache();
}

// ── Reactions ──

export async function createRampageFeedEvent(
  profile: UserProfile,
  subtype: "completed" | "shared",
  puzzleDate: string,
  won: boolean,
  score: number,
  targetHP: number,
): Promise<void> {
  if (!profile.isPublic || profile.hideFromFeed) return;

  const dupCheck = query(
    feedCollection(),
    where("userId", "==", profile.uid),
    where("type", "==", "rampage"),
    where("date", "==", puzzleDate),
    where("subtype", "==", subtype),
    limit(1),
  );
  const existing = await getDocs(dupCheck);
  if (!existing.empty) return;

  const data: Omit<RampageFeedEvent, "id"> = {
    type: "rampage",
    subtype,
    userId: profile.uid,
    username: profile.username,
    displayName: profile.displayName,
    isPublic: profile.isPublic,
    date: puzzleDate,
    won,
    score,
    targetHP,
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

export async function createKnockoutFeedEvent(
  profile: UserProfile,
  subtype: "completed" | "shared",
  puzzleDate: string,
  won: boolean,
  score: number,
  targetHP: number,
): Promise<void> {
  if (!profile.isPublic || profile.hideFromFeed) return;

  const dupCheck = query(
    feedCollection(),
    where("userId", "==", profile.uid),
    where("type", "==", "kayosknockout"),
    where("date", "==", puzzleDate),
    where("subtype", "==", subtype),
    limit(1),
  );
  const existing = await getDocs(dupCheck);
  if (!existing.empty) return;

  const data: Omit<KnockoutFeedEvent, "id"> = {
    type: "kayosknockout",
    subtype,
    userId: profile.uid,
    username: profile.username,
    displayName: profile.displayName,
    isPublic: profile.isPublic,
    date: puzzleDate,
    won,
    score,
    targetHP,
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

export async function createBrawlFeedEvent(
  profile: UserProfile,
  subtype: "completed" | "shared",
  puzzleDate: string,
  won: boolean,
  totalDamage: number,
  targetDamage: number,
  defenderName: string,
  difficulty: string,
): Promise<void> {
  if (!profile.isPublic || profile.hideFromFeed) return;

  const dupCheck = query(
    feedCollection(),
    where("userId", "==", profile.uid),
    where("type", "==", "brutebrawl"),
    where("date", "==", puzzleDate),
    where("subtype", "==", subtype),
    limit(1),
  );
  const existing = await getDocs(dupCheck);
  if (!existing.empty) return;

  const data: Omit<BrawlFeedEvent, "id"> = {
    type: "brutebrawl",
    subtype,
    userId: profile.uid,
    username: profile.username,
    displayName: profile.displayName,
    isPublic: profile.isPublic,
    date: puzzleDate,
    won,
    totalDamage,
    targetDamage,
    defenderName,
    difficulty,
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
