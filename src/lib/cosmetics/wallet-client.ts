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
}

async function callWallet(action: string, extra: Record<string, unknown> = {}): Promise<Record<string, unknown> | null> {
  const user = auth.currentUser;
  if (!user) return null;
  const idToken = await user.getIdToken();
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ action, ...extra }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok || payload?.ok === false) {
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
