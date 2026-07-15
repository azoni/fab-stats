"use client";
/**
 * Full-screen reveal of a gacha pull. The drawn SKU is resolved from the catalog
 * and shown with a rarity-tinted glow + a single pop/flip (reduced-motion safe).
 * Duplicates show the coin refund instead of a new-unlock line.
 */
import { useEffect, useRef } from "react";
import { getCosmeticById, RARITY_LABELS } from "@/lib/cosmetics/catalog";
import { RARITY_VISUALS } from "@/lib/badge-tiers";
import { CosmeticPreview } from "@/components/cosmetics/CosmeticPreview";
import { CoinIcon } from "@/components/cosmetics/CoinBalance";
import type { GachaOutcome } from "@/lib/cosmetics/wallet-client";

export function GachaReveal({ outcome, onClose }: { outcome: GachaOutcome; onClose: () => void }) {
  const continueRef = useRef<HTMLButtonElement>(null);
  const item = getCosmeticById(outcome.itemId);

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    // Move focus into the dialog; restore it to the trigger on close.
    const prev = document.activeElement as HTMLElement | null;
    continueRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", h);
      prev?.focus?.();
    };
  }, [onClose]);

  if (!item) return null;
  const color = RARITY_VISUALS[item.rarity]?.ringColor ?? "#c9a84c";

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Gacha result: ${item.name}, ${RARITY_LABELS[item.rarity]}`}
    >
      <div
        className="gacha-reveal relative w-full max-w-xs rounded-2xl border bg-fab-surface p-6 text-center"
        style={{ borderColor: color, boxShadow: `0 0 44px ${color}55` }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color }}>
          {RARITY_LABELS[item.rarity]}
        </p>
        <div className="my-4 grid place-items-center">
          <CosmeticPreview item={item} size={112} context="swatch" name="Aa" />
        </div>
        <p className="text-base font-bold text-fab-text">{item.name}</p>
        {item.description && <p className="mt-1 text-xs text-fab-muted">{item.description}</p>}
        {outcome.duplicate ? (
          <p className="mt-3 inline-flex items-center gap-1 text-xs text-fab-muted">
            Duplicate —
            <span className="inline-flex items-center gap-1 font-semibold text-fab-gold">
              <CoinIcon size={13} />+{outcome.refund}
            </span>
            refunded
          </p>
        ) : (
          <p className="mt-3 text-xs font-semibold text-fab-gold">New relic unlocked!</p>
        )}
        {outcome.pity && <p className="mt-1 text-[10px] text-fab-dim">Pity bonus — a rare+ was guaranteed.</p>}
        <button
          ref={continueRef}
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded border border-fab-gold/40 bg-fab-gold/20 px-3 py-1.5 text-sm font-semibold text-fab-gold hover:bg-fab-gold/25 focus:outline-none focus:ring-2 focus:ring-fab-gold/50"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
