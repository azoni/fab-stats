import { doc, getDoc, setDoc, onSnapshot, arrayUnion, arrayRemove, type Unsubscribe } from "firebase/firestore";
import { db } from "@/lib/firebase";

const MUTED_DOC = doc(db, "admin", "mutedWallUsers");

/** Get list of muted user IDs (one-time read) */
export async function getMutedUserIds(): Promise<string[]> {
  const snap = await getDoc(MUTED_DOC);
  if (!snap.exists()) return [];
  return (snap.data().userIds as string[]) || [];
}

/** Subscribe to muted user list in real-time */
export function subscribeToMutedUsers(
  callback: (userIds: string[]) => void
): Unsubscribe {
  return onSnapshot(
    MUTED_DOC,
    (snap) => {
      if (!snap.exists()) {
        callback([]);
        return;
      }
      callback((snap.data().userIds as string[]) || []);
    },
    () => callback([])
  );
}

/** Mute a user (admin only — add to muted list) */
export async function muteUser(userId: string): Promise<void> {
  await setDoc(MUTED_DOC, { userIds: arrayUnion(userId) }, { merge: true });
}

/** Unmute a user (admin only — remove from muted list) */
export async function unmuteUser(userId: string): Promise<void> {
  await setDoc(MUTED_DOC, { userIds: arrayRemove(userId) }, { merge: true });
}
