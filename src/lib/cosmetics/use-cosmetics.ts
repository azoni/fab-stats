"use client";
/**
 * Client hooks for the cosmetics system: live wallet balance, the shop catalog,
 * and the caller's inventory. All are no-ops-friendly when signed out.
 */
import { useEffect, useState } from "react";
import { COSMETICS_ENABLED } from "./flags";
import { subscribeWallet, type Wallet } from "./wallet-client";
import { loadCosmeticCatalog, getCachedCosmeticCatalog, type CosmeticItem } from "./catalog";

export { useInventory } from "./inventory";

/** Live wallet for the signed-in user (null while loading / signed out). */
export function useWallet(uid: string | undefined | null): { wallet: Wallet | null; loading: boolean } {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!uid) {
      setWallet(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeWallet(uid, (w) => {
      setWallet(w);
      setLoading(false);
    });
    return () => unsub();
  }, [uid]);
  return { wallet, loading };
}

/** The active cosmetic catalog (cache-first, refreshed on mount). */
export function useCosmeticCatalog(): { catalog: CosmeticItem[]; loading: boolean } {
  const [catalog, setCatalog] = useState<CosmeticItem[]>(() => getCachedCosmeticCatalog());
  const [loading, setLoading] = useState(catalog.length === 0);
  useEffect(() => {
    // Dormant when the feature is off: don't fire the catalog read on every
    // profile page load (EquippedAvatar calls this hook before its flag guard).
    if (!COSMETICS_ENABLED) {
      setLoading(false);
      return;
    }
    let alive = true;
    loadCosmeticCatalog()
      .then((items) => {
        if (alive) {
          setCatalog(items);
          setLoading(false);
        }
      })
      .catch(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);
  return { catalog, loading };
}
