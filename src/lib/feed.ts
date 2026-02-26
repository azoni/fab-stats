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
import type { FeedEvent, UserProfile } from "@/types";

function feedCollection() {
  return collection(db, "feedEvents");
}

export async function createImportFeedEvent(
  profile: UserProfile,
  matchCount: number,
  topHeroes: string[]
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
    createdAt: new Date().toISOString(),
  };

  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) clean[k] = v;
  }

  if (profile.photoUrl) clean.photoUrl = profile.photoUrl;
  if (topHeroes.length > 0) clean.topHeroes = topHeroes.slice(0, 3);

  await addDoc(feedCollection(), clean);
}

export async function getFeedEvents(limitCount = 50): Promise<FeedEvent[]> {
  const q = query(feedCollection(), where("isPublic", "==", true), orderBy("createdAt", "desc"), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as FeedEvent[];
}
