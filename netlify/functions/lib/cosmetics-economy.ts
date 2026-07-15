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
import { randomInt } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";
import { ACHIEVEMENT_RARITY, type Rarity } from "./achievement-rarity.ts";
import { COSMETIC_SEED } from "./cosmetic-seed.ts";

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

/** One-time payout for already-earned achievements, weighted by rarity.
 *  De-duplicates ids: earnedAchievements/main is a client-writable cache, so a
 *  user could stuff `ids` with repeats of a real (e.g. legendary) id. A Set caps
 *  the payout at the true one-time value — each real achievement counts once,
 *  unknown ids count zero. (The match-count input is bounded by the live count();
 *  a create-grant-delete of fake matches remains possible but is self-incriminating
 *  — it floods the user's own public stats/leaderboard — and the currency is
 *  cosmetic-only, so it's an accepted residual risk for now.) */
export function coinsForAchievements(ids: string[]): number {
  let total = 0;
  for (const id of new Set(ids)) {
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

export interface PurchaseResult {
  ok: boolean;
  error?: "not_found" | "inactive" | "already_owned" | "insufficient" | "price_changed";
  balance: number;
  itemId?: string;
  price?: number;
}

/**
 * Buy a cosmetic SKU: server reads the catalog doc (price + isActive are NEVER
 * trusted from the client), then in a transaction deducts coins and grants the
 * item to the inventory. Idempotent-safe: re-buying an owned item is a no-op
 * (returns already_owned), so a double-submit never double-charges.
 */
export async function purchaseCosmetic(
  db: Firestore,
  uid: string,
  itemId: string,
  expectedPrice?: number,
): Promise<PurchaseResult> {
  // Price/isActive source of truth: a Firestore cosmeticCatalog doc (admin
  // override) if present, else the bundled default seed — so purchases work
  // WITHOUT the catalog ever being seeded into the DB.
  const catSnap = await db.collection("cosmeticCatalog").doc(itemId).get();
  const catData = catSnap.exists ? catSnap.data() ?? null : null;
  const seed = COSMETIC_SEED[itemId];
  if (!catData && !seed) return { ok: false, error: "not_found", balance: -1 };
  const isActive = catData ? catData.isActive !== false : seed.isActive !== false;
  if (!isActive) return { ok: false, error: "inactive", balance: -1 };
  const price = Math.max(0, Math.round(Number(catData ? catData.price : seed.price) || 0));
  // Guard against a stale client price (cache up to 12h old vs. an admin override).
  if (typeof expectedPrice === "number" && Number.isFinite(expectedPrice) && Math.round(expectedPrice) !== price) {
    return { ok: false, error: "price_changed", balance: -1, price };
  }

  const walletRef = db.collection("users").doc(uid).collection("wallet").doc("main");
  const invRef = db.collection("users").doc(uid).collection("inventory").doc("main");

  return db.runTransaction(async (tx) => {
    const [wSnap, iSnap] = await tx.getAll(walletRef, invRef);
    const w: WalletDoc = wSnap.exists ? { ...zeroWallet(), ...(wSnap.data() as WalletDoc) } : zeroWallet();
    const items: string[] = iSnap.exists ? ((iSnap.data()?.items as string[]) ?? []) : [];

    if (items.includes(itemId)) return { ok: false, error: "already_owned", balance: w.coins, itemId };
    if (w.coins < price) return { ok: false, error: "insufficient", balance: w.coins };

    const now = new Date().toISOString();
    tx.set(
      walletRef,
      { ...w, coins: w.coins - price, lifetimeSpent: w.lifetimeSpent + price, updatedAt: now },
      { merge: true },
    );
    const invPayload: Record<string, unknown> = { items: [...items, itemId], updatedAt: now };
    if (!iSnap.exists) invPayload.createdAt = now;
    tx.set(invRef, invPayload, { merge: true });
    return { ok: true, balance: w.coins - price, itemId };
  });
}

// ── Gacha (the Reliquary) ──
// Per-pool pull cost — premium is priced near its expected value so pulling it
// isn't strictly-dominant free value over the shop / the standard pool.
export const GACHA_POOL_COST: Record<string, number> = { standard: 500, premium: 4000 };
export const GACHA_DEFAULT_PULL_COST = 500;
export function gachaPoolCost(poolId: string): number {
  return GACHA_POOL_COST[poolId] ?? GACHA_DEFAULT_PULL_COST;
}
export const GACHA_PITY_THRESHOLD = 10; // guarantee a rare+ at least every 10 pulls
export const GACHA_DUPE_REFUND_PCT = 0.4;

const RARE_PLUS = new Set<Rarity>(["rare", "epic", "legendary"]);

interface PoolEntry {
  id: string;
  rarity: Rarity;
  weight: number;
}

interface PoolFields {
  rarity: Rarity;
  isActive: boolean;
  gachaPool?: string;
  gachaWeight?: number;
}

/**
 * Build a draw pool from the bundled seed OVERLAID with Firestore cosmeticCatalog
 * overrides (doc wins by id) — the same contract purchaseCosmetic + the client
 * catalog honor, so the odds the player sees match the odds the server draws.
 */
async function buildPool(db: Firestore, poolId: string): Promise<PoolEntry[]> {
  const merged = new Map<string, PoolFields>();
  for (const [id, e] of Object.entries(COSMETIC_SEED)) {
    merged.set(id, { rarity: e.rarity as Rarity, isActive: e.isActive !== false, gachaPool: e.gachaPool, gachaWeight: e.gachaWeight });
  }
  try {
    const snap = await db.collection("cosmeticCatalog").get();
    snap.forEach((d) => {
      const data = d.data();
      const base = merged.get(d.id);
      merged.set(d.id, {
        rarity: (typeof data.rarity === "string" ? data.rarity : base?.rarity ?? "common") as Rarity,
        isActive: data.isActive !== false,
        gachaPool: typeof data.gachaPool === "string" ? data.gachaPool : base?.gachaPool,
        gachaWeight: typeof data.gachaWeight === "number" ? data.gachaWeight : base?.gachaWeight,
      });
    });
  } catch {
    /* Firestore unavailable → seed-only pool */
  }
  const out: PoolEntry[] = [];
  for (const [id, e] of merged) {
    if (e.isActive && e.gachaPool === poolId && (e.gachaWeight ?? 0) > 0) {
      out.push({ id, rarity: e.rarity, weight: e.gachaWeight ?? 0 });
    }
  }
  return out;
}

/** Cryptographically-seeded weighted pick. `randomInt(total)` ∈ [0,total). */
function weightedDraw(pool: PoolEntry[]): PoolEntry {
  const total = pool.reduce((s, p) => s + p.weight, 0);
  let r = randomInt(total);
  for (const p of pool) {
    r -= p.weight;
    if (r < 0) return p;
  }
  return pool[pool.length - 1];
}

export interface GachaResult {
  ok: boolean;
  error?: "insufficient" | "empty_pool";
  itemId?: string;
  rarity?: Rarity;
  duplicate?: boolean;
  refund?: number;
  balance: number;
  pity?: boolean;
}

/**
 * One gacha pull from `poolId`. Deducts GACHA_PULL_COST, draws a weighted SKU
 * (server RNG — client never influences odds), grants it, and on a duplicate
 * refunds GACHA_DUPE_REFUND_PCT instead. Pity: if the wallet is at the pity
 * threshold and the natural draw is below rare, redraw from the rare+ subset.
 */
export async function gachaPull(db: Firestore, uid: string, poolId: string): Promise<GachaResult> {
  const pool = await buildPool(db, poolId);
  if (pool.length === 0) return { ok: false, error: "empty_pool", balance: -1 };
  const cost = gachaPoolCost(poolId);

  const walletRef = db.collection("users").doc(uid).collection("wallet").doc("main");
  const invRef = db.collection("users").doc(uid).collection("inventory").doc("main");

  return db.runTransaction(async (tx) => {
    const [wSnap, iSnap] = await tx.getAll(walletRef, invRef);
    const w: WalletDoc = wSnap.exists ? { ...zeroWallet(), ...(wSnap.data() as WalletDoc) } : zeroWallet();
    const items: string[] = iSnap.exists ? ((iSnap.data()?.items as string[]) ?? []) : [];

    if (w.coins < cost) return { ok: false, error: "insufficient", balance: w.coins };

    let drawn = weightedDraw(pool);
    const pityTriggered = w.pullsSinceRarePlus + 1 >= GACHA_PITY_THRESHOLD && !RARE_PLUS.has(drawn.rarity);
    if (pityTriggered) {
      const rares = pool.filter((p) => RARE_PLUS.has(p.rarity));
      if (rares.length) drawn = weightedDraw(rares);
    }
    const isRarePlus = RARE_PLUS.has(drawn.rarity);
    const duplicate = items.includes(drawn.id);
    const refund = duplicate ? Math.round(cost * GACHA_DUPE_REFUND_PCT) : 0;
    const coinsAfter = w.coins - cost + refund;
    const now = new Date().toISOString();

    tx.set(
      walletRef,
      {
        ...w,
        coins: coinsAfter,
        lifetimeSpent: w.lifetimeSpent + cost,
        lifetimeEarned: w.lifetimeEarned + refund,
        pullCount: w.pullCount + 1,
        pullsSinceRarePlus: isRarePlus ? 0 : w.pullsSinceRarePlus + 1,
        updatedAt: now,
      },
      { merge: true },
    );
    if (!duplicate) {
      const invPayload: Record<string, unknown> = { items: [...items, drawn.id], updatedAt: now };
      if (!iSnap.exists) invPayload.createdAt = now;
      tx.set(invRef, invPayload, { merge: true });
    }
    return {
      ok: true,
      itemId: drawn.id,
      rarity: drawn.rarity,
      duplicate,
      refund,
      balance: coinsAfter,
      pity: pityTriggered,
    };
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
