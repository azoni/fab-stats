import { doc, getDoc, setDoc, addDoc, collection, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getBadgeById, getBadgesForIds } from "@/lib/badges";
import type { Achievement } from "@/types";

const BADGES_DOC = doc(db, "admin", "badges");

export async function getUserBadges(userId: string): Promise<Achievement[]> {
  const snap = await getDoc(BADGES_DOC);
  if (!snap.exists()) return [];
  const data = snap.data() as Record<string, string[]>;
  const ids = data[userId];
  if (!ids || ids.length === 0) return [];
  return getBadgesForIds(ids);
}

export async function assignBadge(userId: string, badgeId: string, notify = false): Promise<void> {
  await setDoc(BADGES_DOC, { [userId]: arrayUnion(badgeId) }, { merge: true });
  if (notify) {
    const badge = getBadgeById(badgeId);
    if (badge) {
      await addDoc(collection(db, "users", userId, "notifications"), {
        type: "badge",
        badgeId: badge.id,
        badgeName: badge.name,
        badgeRarity: badge.rarity,
        createdAt: new Date().toISOString(),
        read: false,
      });
    }
  }
}

export async function revokeBadge(userId: string, badgeId: string): Promise<void> {
  await setDoc(BADGES_DOC, { [userId]: arrayRemove(badgeId) }, { merge: true });
}

export async function getAllBadgeAssignments(): Promise<Record<string, string[]>> {
  const snap = await getDoc(BADGES_DOC);
  if (!snap.exists()) return {};
  return snap.data() as Record<string, string[]>;
}
