import { doc, getDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MatchResult, type MatchRecord } from "@/types";

export interface H2HRecord {
  p1: string;
  p2: string;
  p1Wins: number;
  p2Wins: number;
  draws: number;
  total: number;
  updatedAt: string;
}

function getH2HDocId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join("_");
}

/** Read a precomputed H2H record between two users. */
export async function getH2H(uid1: string, uid2: string): Promise<H2HRecord | null> {
  try {
    const snap = await getDoc(doc(db, "h2h", getH2HDocId(uid1, uid2)));
    if (!snap.exists()) return null;
    return snap.data() as H2HRecord;
  } catch {
    return null;
  }
}

/**
 * Compute and save H2H records for a user against all their FabStats opponents.
 * For each opponent that has a GEM ID registered in the gemIds collection (meaning
 * they are a FabStats user), compute W/L/D from this user's matches and write to
 * the h2h collection for instant lookup on the compare page.
 *
 * Call this after match import/sync.
 */
export async function computeH2HForUser(userId: string, matches: MatchRecord[]): Promise<void> {
  // Group matches by opponentGemId
  const byGemId = new Map<string, MatchRecord[]>();
  for (const m of matches) {
    if (m.opponentGemId) {
      const arr = byGemId.get(m.opponentGemId) || [];
      arr.push(m);
      byGemId.set(m.opponentGemId, arr);
    }
  }

  if (byGemId.size === 0) return;

  // Look up which opponent GEM IDs belong to FabStats users via the gemIds collection
  const gemIdEntries = Array.from(byGemId.entries());
  const lookups = await Promise.all(
    gemIdEntries.map(([gemId]) =>
      getDoc(doc(db, "gemIds", gemId)).catch(() => null)
    )
  );

  // Compute and batch-write H2H docs
  const batch = writeBatch(db);
  let batchCount = 0;

  for (let i = 0; i < gemIdEntries.length; i++) {
    const snap = lookups[i];
    if (!snap || !snap.exists()) continue;

    const opponentUid = (snap.data() as { userId: string }).userId;
    if (opponentUid === userId) continue;

    const oppMatches = gemIdEntries[i][1];
    let myWins = 0, myLosses = 0, draws = 0;
    for (const m of oppMatches) {
      if (m.result === MatchResult.Win) myWins++;
      else if (m.result === MatchResult.Loss) myLosses++;
      else if (m.result === MatchResult.Draw) draws++;
    }

    const total = myWins + myLosses + draws;
    if (total === 0) continue;

    const sorted = [userId, opponentUid].sort();
    const docId = sorted.join("_");
    const isP1 = userId === sorted[0];

    batch.set(doc(db, "h2h", docId), {
      p1: sorted[0],
      p2: sorted[1],
      p1Wins: isP1 ? myWins : myLosses,
      p2Wins: isP1 ? myLosses : myWins,
      draws,
      total,
      updatedAt: new Date().toISOString(),
    });

    batchCount++;
    if (batchCount >= 400) break; // Stay under Firestore batch limit
  }

  if (batchCount > 0) {
    await batch.commit();
  }
}
