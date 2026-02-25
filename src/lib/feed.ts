import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  type Unsubscribe,
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

export function subscribeFeed(
  callback: (events: FeedEvent[]) => void,
  limitCount = 50
): Unsubscribe {
  const q = query(feedCollection(), orderBy("createdAt", "desc"), limit(limitCount));
  return onSnapshot(q, (snapshot) => {
    const events = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as FeedEvent[];
    callback(events);
  });
}
