import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { getCorrectPredictors } from "./polls";

const PREDICTION_TIERS = [
  { threshold: 1, id: "prediction_1" },
  { threshold: 3, id: "prediction_3" },
  { threshold: 5, id: "prediction_5" },
  { threshold: 10, id: "prediction_10" },
];

/**
 * Grant tiered prediction achievements to all users who voted correctly.
 * Increments each user's correctCount and awards appropriate tier achievements.
 */
export async function grantPredictionAchievements(
  pollId: string,
  correctOptionIndex: number,
): Promise<{ granted: number; alreadyHad: number }> {
  const userIds = await getCorrectPredictors(pollId, correctOptionIndex);

  let granted = 0;
  let alreadyHad = 0;

  for (const userId of userIds) {
    // Read/increment prediction stats
    const statsRef = doc(db, "users", userId, "predictions", "stats");
    const statsSnap = await getDoc(statsRef);
    const prevCount = statsSnap.exists() ? (statsSnap.data().correctCount as number) || 0 : 0;
    const newCount = prevCount + 1;
    await setDoc(statsRef, { correctCount: newCount });

    // Determine which achievement tiers are now earned
    const earnedTierIds = PREDICTION_TIERS
      .filter((t) => newCount >= t.threshold)
      .map((t) => t.id);

    if (earnedTierIds.length === 0) continue;

    // Update earnedAchievements
    const achRef = doc(db, "users", userId, "earnedAchievements", "main");
    const achSnap = await getDoc(achRef);
    const storedIds: string[] = achSnap.exists() ? (achSnap.data().ids as string[]) || [] : [];

    const newIds = earnedTierIds.filter((id) => !storedIds.includes(id));
    if (newIds.length === 0) {
      alreadyHad++;
      continue;
    }

    await setDoc(achRef, { ids: [...storedIds, ...newIds] });
    granted++;
  }

  return { granted, alreadyHad };
}
