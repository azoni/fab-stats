import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { Achievement } from "@/types";

/**
 * Detect newly earned achievements by comparing against stored IDs.
 * First run bootstraps (stores all current IDs, returns []) to prevent flood.
 */
export async function detectNewAchievements(
  userId: string,
  currentAchievements: Achievement[],
): Promise<Achievement[]> {
  const ref = doc(db, "users", userId, "earnedAchievements", "main");
  const snap = await getDoc(ref);

  const currentIds = currentAchievements.map((a) => a.id);

  if (!snap.exists()) {
    // Bootstrap: store all current IDs, return nothing (no flood)
    await setDoc(ref, { ids: currentIds });
    return [];
  }

  const storedIds = new Set<string>((snap.data().ids as string[]) || []);
  const newAchievements = currentAchievements.filter((a) => !storedIds.has(a.id));

  if (newAchievements.length > 0) {
    // Update stored set with new IDs
    const merged = [...storedIds, ...newAchievements.map((a) => a.id)];
    await setDoc(ref, { ids: merged });
  }

  return newAchievements;
}
