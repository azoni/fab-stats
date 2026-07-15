/**
 * Client access to the server-authoritative cosmetics wallet. The client never
 * writes coins/inventory — it calls the write-locked `cosmetics-wallet` Netlify
 * function (which mints via the admin SDK) and reads the wallet doc directly.
 */
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";

const FN_URL = "/.netlify/functions/cosmetics-wallet";

export interface Wallet {
  coins: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  pullCount: number;
  pullsSinceRarePlus: number;
}

async function callWallet(
  action: string,
  extra: Record<string, unknown> = {},
  opts: { allowFalse?: boolean } = {},
): Promise<Record<string, unknown> | null> {
  const user = auth.currentUser;
  if (!user) return null;
  const idToken = await user.getIdToken();
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ action, ...extra }),
  });
  const payload = await res.json().catch(() => ({}));
  // HTTP errors always throw. `ok:false` is a soft outcome (e.g. "insufficient")
  // that some actions (purchase) want to handle instead of throw.
  if (!res.ok || (!opts.allowFalse && payload?.ok === false)) {
    throw new Error(typeof payload?.error === "string" ? payload.error : "wallet request failed");
  }
  return payload;
}

/** Mint any coins owed for the user's matches + achievements. Idempotent —
 *  safe to call after every import and once on app-load. */
export async function reconcileWallet(): Promise<{ minted: number; balance: number } | null> {
  const r = await callWallet("grant");
  if (!r) return null;
  return { minted: Number(r.minted ?? 0), balance: Number(r.balance ?? 0) };
}

export interface PurchaseOutcome {
  ok: boolean;
  error?: "not_found" | "inactive" | "already_owned" | "insufficient" | "invalid_item" | "price_changed";
  balance: number;
  itemId?: string;
  price?: number;
}

/** Buy a cosmetic SKU. The server reads price/isActive from the catalog and
 *  deducts coins + grants inventory in one transaction (never trusts the client).
 *  `expectedPrice` (what the shop displayed) guards against a stale client price. */
export async function purchaseCosmetic(itemId: string, expectedPrice?: number): Promise<PurchaseOutcome> {
  const r = await callWallet("purchase", { itemId, expectedPrice }, { allowFalse: true });
  if (!r) return { ok: false, error: "invalid_item", balance: -1 };
  return {
    ok: r.ok === true,
    error: r.error as PurchaseOutcome["error"],
    balance: Number(r.balance ?? -1),
    itemId: typeof r.itemId === "string" ? r.itemId : undefined,
    price: typeof r.price === "number" ? r.price : undefined,
  };
}

// Gacha config (mirrors the server constants in cosmetics-economy.ts).
export const GACHA_POOL_COST: Record<string, number> = { standard: 500, premium: 4000 };
export const GACHA_DEFAULT_PULL_COST = 500;
export function gachaPoolCost(poolId: string): number {
  return GACHA_POOL_COST[poolId] ?? GACHA_DEFAULT_PULL_COST;
}
export const GACHA_PITY_THRESHOLD = 10;
export const GACHA_DUPE_REFUND_PCT = 0.4;

export interface GachaOutcome {
  ok: boolean;
  error?: "insufficient" | "empty_pool" | "invalid_pool";
  itemId?: string;
  rarity?: "common" | "uncommon" | "rare" | "epic" | "legendary";
  duplicate?: boolean;
  refund?: number;
  balance: number;
  pity?: boolean;
}

/** One gacha pull from a pool. Server draws + grants; the client only reveals. */
export async function gachaPull(poolId: string): Promise<GachaOutcome> {
  const r = await callWallet("gacha", { poolId }, { allowFalse: true });
  if (!r) return { ok: false, error: "invalid_pool", balance: -1 };
  return {
    ok: r.ok === true,
    error: r.error as GachaOutcome["error"],
    itemId: typeof r.itemId === "string" ? r.itemId : undefined,
    rarity: r.rarity as GachaOutcome["rarity"],
    duplicate: r.duplicate === true,
    refund: Number(r.refund ?? 0),
    balance: Number(r.balance ?? -1),
    pity: r.pity === true,
  };
}

/** Purge the caller's wallet + inventory (account-deletion cleanup). Best-effort:
 *  the economy docs are write-locked, so only the server can remove them. */
export async function purgeWalletOnDelete(): Promise<void> {
  await callWallet("deleteAccount");
}

/** Live subscription to the caller's own wallet doc (owner-readable). */
export function subscribeWallet(uid: string, cb: (w: Wallet | null) => void): Unsubscribe {
  return onSnapshot(
    doc(db, "users", uid, "wallet", "main"),
    (snap) => cb(snap.exists() ? (snap.data() as Wallet) : null),
    () => cb(null),
  );
}
