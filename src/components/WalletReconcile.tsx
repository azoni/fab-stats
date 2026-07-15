"use client";
import { useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { COSMETICS_ENABLED } from "@/lib/cosmetics/flags";
import { reconcileWallet } from "@/lib/cosmetics/wallet-client";

/**
 * Silent, once-per-session coin reconcile for signed-in users. Mints any coins
 * owed for their matches + achievements (idempotent server grant), giving
 * existing users a retroactive day-1 balance. No-op while the cosmetics feature
 * flag is off, so it's completely dormant until the system is revealed.
 */
export function WalletReconcile() {
  const { user } = useAuth();
  useEffect(() => {
    if (!COSMETICS_ENABLED || !user) return;
    const key = `wallet_reconciled_${user.uid}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* private mode — proceed once */
    }
    reconcileWallet()
      .then((r) => {
        if (r && r.minted > 0) toast.success(`+${r.minted.toLocaleString()} coins earned!`);
      })
      .catch(() => {});
  }, [user]);
  return null;
}
