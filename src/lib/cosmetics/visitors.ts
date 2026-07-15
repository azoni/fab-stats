/**
 * Recent profile visitors ("who stopped by"). A viewer writes ONLY their own
 * record onto another user's profile (id pinned to their uid → repeat visits
 * overwrite, no spam); publicly readable so the row renders for everyone.
 * firestore.rules already permits this (profileVisitors block). Flag-gated +
 * throttled once-per-session-per-profile, and never tracks visits on
 * private/friends profiles.
 */
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import type { UserProfile } from "@/types";
import { COSMETICS_ENABLED } from "./flags";

export interface VisitorEntry {
  uid: string;
  username?: string;
  displayName?: string;
  photoUrl?: string;
  frameId?: string;
}

interface Viewer {
  username?: string;
  displayName?: string;
  photoUrl?: string;
  frameId?: string;
}

/** Fire-and-forget record of a visit to `profile` by the signed-in viewer. */
export function recordProfileVisit(profile: UserProfile, viewerUid: string | undefined | null, viewer: Viewer | null): void {
  if (!COSMETICS_ENABLED) return;
  if (!viewerUid || viewerUid === profile.uid) return;
  // Only track visits on genuinely public profiles.
  const visibility = profile.profileVisibility ?? (profile.isPublic ? "public" : "private");
  if (visibility !== "public") return;

  const key = `pv_${profile.uid}`;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {
    /* private mode — proceed once */
  }

  const data: Record<string, unknown> = { uid: viewerUid, ts: serverTimestamp() };
  if (viewer?.username) data.username = viewer.username.slice(0, 60);
  if (viewer?.displayName) data.displayName = viewer.displayName.slice(0, 80);
  if (viewer?.photoUrl) data.photoUrl = viewer.photoUrl.slice(0, 600);
  if (viewer?.frameId) data.frameId = viewer.frameId.slice(0, 80);

  setDoc(doc(db, "users", profile.uid, "profileVisitors", viewerUid), data, { merge: true }).catch(() => {});
}

/** Last N visitors (most recent first). Public read. */
export async function fetchRecentVisitors(profileUid: string, n = 12): Promise<VisitorEntry[]> {
  if (!profileUid) return [];
  try {
    const q = query(
      collection(db, "users", profileUid, "profileVisitors"),
      orderBy("ts", "desc"),
      limit(n),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const raw = d.data() as Record<string, unknown>;
      const entry: VisitorEntry = { uid: typeof raw.uid === "string" ? raw.uid : d.id };
      if (typeof raw.username === "string") entry.username = raw.username;
      if (typeof raw.displayName === "string") entry.displayName = raw.displayName;
      if (typeof raw.photoUrl === "string") entry.photoUrl = raw.photoUrl;
      if (typeof raw.frameId === "string") entry.frameId = raw.frameId;
      return entry;
    });
  } catch {
    return [];
  }
}
