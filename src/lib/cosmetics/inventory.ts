/**
 * Owned-cosmetics inventory (`users/{uid}/inventory/main` = { items: string[] }).
 * PUBLIC-readable (firestore.rules) so a viewer can see which SKUs another player
 * owns; server-written only (the cosmetics-wallet function grants on purchase/gacha).
 */
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, onSnapshot, type Unsubscribe } from "firebase/firestore";

export interface Inventory {
  items: string[];
}

function parseInventory(data: unknown): Inventory {
  const items = (data as { items?: unknown })?.items;
  return { items: Array.isArray(items) ? items.filter((x): x is string => typeof x === "string") : [] };
}

/** One-shot read of a user's owned SKU ids. */
export async function fetchInventory(uid: string): Promise<Inventory> {
  try {
    const snap = await getDoc(doc(db, "users", uid, "inventory", "main"));
    return snap.exists() ? parseInventory(snap.data()) : { items: [] };
  } catch {
    return { items: [] };
  }
}

/** Live subscription to a user's inventory (any user — inventory is public-read). */
export function subscribeInventory(uid: string, cb: (inv: Inventory) => void): Unsubscribe {
  return onSnapshot(
    doc(db, "users", uid, "inventory", "main"),
    (snap) => cb(snap.exists() ? parseInventory(snap.data()) : { items: [] }),
    () => cb({ items: [] }),
  );
}

/** React hook: live inventory + a Set for O(1) ownership checks. */
export function useInventory(uid: string | undefined | null): {
  items: string[];
  owns: (id: string) => boolean;
  loading: boolean;
} {
  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!uid) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeInventory(uid, (inv) => {
      setItems(inv.items);
      setLoading(false);
    });
    return () => unsub();
  }, [uid]);
  const set = new Set(items);
  return { items, owns: (id: string) => set.has(id), loading };
}
