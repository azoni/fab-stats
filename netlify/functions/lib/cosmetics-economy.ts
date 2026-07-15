/**
 * Server-authoritative economy logic for the cosmetics system. Pure functions +
 * a Firestore transaction; imported only by the `cosmetics-wallet` Netlify
 * function (admin SDK, bypasses rules). No `@/*` imports so esbuild can bundle it.
 *
 * The wallet is MINTED here and write-locked in firestore.rules, so a client can
 * never grant itself coins. Grant is idempotent: coins owed is a pure function of
 * monotonic inputs (real match count + earned achievements); the wallet stores
 * how much was already granted; each call mints only the positive delta. Safe to
 * call from any import hook, app-load, or auto-sync, in any order, concurrently.
 */
import type { Firestore } from "firebase-admin/firestore";
import { ACHIEVEMENT_RARITY, type Rarity } from "./achievement-rarity.ts";

// ── tunable economy constants ──
export const ACHIEVEMENT_PAYOUT: Record<Rarity, number> = {
  common: 25,
  uncommon: 60,
  rare: 150,
  epic: 400,
  legendary: 1000,
};

/** Cumulative, diminishing coins for a player's TOTAL match count. Pure function
 *  of n (so `owed` only ever grows) — this is what makes the grant idempotent. */
export function coinsForMatchCount(n: number): number {
  if (n <= 0) return 0;
  let c = Math.min(n, 100) * 10; // first 100 matches: 10 each
  if (n > 100) c += Math.min(n - 100, 400) * 5; // 101–500: 5 each
  if (n > 500) c += Math.min(n - 500, 1500) * 2; // 501–2000: 2 each
  if (n > 2000) c += (n - 2000) * 1; // beyond: 1 each
  return c;
}

/** One-time payout for already-earned achievements, weighted by rarity. */
export function coinsForAchievements(ids: string[]): number {
  let total = 0;
  for (const id of ids) {
    const r = ACHIEVEMENT_RARITY[id];
    if (r) total += ACHIEVEMENT_PAYOUT[r];
  }
  return total;
}

export interface WalletDoc {
  coins: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  matchCoinsGranted: number;
  achievementCoinsGranted: number;
  grantedMatchCount: number;
  grantedAchievementCount: number;
  pullCount: number;
  pullsSinceRarePlus: number;
  schemaVersion: number;
  createdAt?: string;
  updatedAt: string;
}

export function zeroWallet(): WalletDoc {
  return {
    coins: 0,
    lifetimeEarned: 0,
    lifetimeSpent: 0,
    matchCoinsGranted: 0,
    achievementCoinsGranted: 0,
    grantedMatchCount: 0,
    grantedAchievementCount: 0,
    pullCount: 0,
    pullsSinceRarePlus: 0,
    schemaVersion: 1,
    updatedAt: "",
  };
}

/**
 * Reconcile a user's wallet: mint (owed − alreadyGranted) coins for their real
 * matches + earned achievements. Idempotent and transaction-serialized.
 */
export async function reconcileWallet(
  db: Firestore,
  uid: string,
): Promise<{ minted: number; balance: number }> {
  // Reads OUTSIDE the transaction (not part of its conflict set). The match
  // COUNT aggregation is ~1 billed read, not a full scan.
  const matchCount = (await db.collection("users").doc(uid).collection("matches").count().get()).data().count;
  const earnedSnap = await db.collection("users").doc(uid).collection("earnedAchievements").doc("main").get();
  const earnedIds: string[] = earnedSnap.exists ? ((earnedSnap.data()?.ids as string[]) ?? []) : [];

  const owedMatch = coinsForMatchCount(matchCount);
  const owedAch = coinsForAchievements(earnedIds);

  const ref = db.collection("users").doc(uid).collection("wallet").doc("main");
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const w: WalletDoc = snap.exists ? { ...zeroWallet(), ...(snap.data() as WalletDoc) } : zeroWallet();
    // Monotonic inputs guarantee delta >= 0; a concurrent grant re-reads the
    // bumped `*Granted` totals and mints 0.
    const delta = Math.max(0, owedMatch - w.matchCoinsGranted) + Math.max(0, owedAch - w.achievementCoinsGranted);
    const now = new Date().toISOString();
    if (delta > 0) {
      tx.set(
        ref,
        {
          ...w,
          coins: w.coins + delta,
          lifetimeEarned: w.lifetimeEarned + delta,
          matchCoinsGranted: Math.max(owedMatch, w.matchCoinsGranted),
          achievementCoinsGranted: Math.max(owedAch, w.achievementCoinsGranted),
          grantedMatchCount: matchCount,
          grantedAchievementCount: earnedIds.length,
          createdAt: w.createdAt || now,
          updatedAt: now,
        },
        { merge: true },
      );
    }
    return { minted: delta, balance: w.coins + delta };
  });
}

/**
 * Remove a user's economy docs (used only during account deletion). Deletes
 * inventory FIRST, then the wallet — so a partial failure leaves the items gone
 * rather than a wallet that reconcile would "refund" while items still exist.
 */
export async function purgeWallet(db: Firestore, uid: string): Promise<void> {
  await db.collection("users").doc(uid).collection("inventory").doc("main").delete();
  await db.collection("users").doc(uid).collection("wallet").doc("main").delete();
}
