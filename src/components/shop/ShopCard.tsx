"use client";
/**
 * A single cosmetic SKU card. Rarity is felt structurally (material-tinted border
 * + rarity dot), not via neon. States: buy / can't-afford / owned / equipped.
 * Presentational — the shop owns wallet/inventory/profile and passes callbacks.
 */
import { CosmeticPreview } from "@/components/cosmetics/CosmeticPreview";
import { CoinIcon } from "@/components/cosmetics/CoinBalance";
import { RARITY_LABELS, type CosmeticItem } from "@/lib/cosmetics/catalog";
import { materialForRarity } from "@/lib/cosmetics/preview-dsl";
import { spec } from "@/components/cosmetics/materials";
import { RARITY_VISUALS } from "@/lib/badge-tiers";

export function ShopCard({
  item,
  owned,
  equipped,
  coins,
  busy,
  locked = false,
  onBuy,
  onEquip,
  onUnequip,
  onHover,
}: {
  item: CosmeticItem;
  owned: boolean;
  equipped: boolean;
  coins: number;
  busy: boolean;
  locked?: boolean;
  onBuy: (item: CosmeticItem) => void;
  onEquip: (item: CosmeticItem) => void;
  onUnequip: (item: CosmeticItem) => void;
  onHover?: (item: CosmeticItem | null) => void;
}) {
  const s = spec(materialForRarity(item.rarity));
  const rarity = RARITY_VISUALS[item.rarity];
  const affordable = coins >= item.price;
  const shortfall = item.price - coins;

  return (
    <div
      className="relative flex flex-col rounded-lg border bg-fab-surface p-2.5"
      style={{ borderColor: equipped ? s.mid : s.edge }}
      onMouseEnter={() => onHover?.(item)}
      onMouseLeave={() => onHover?.(null)}
    >
      {/* Preview */}
      <div className="grid h-24 place-items-center overflow-hidden rounded-md bg-fab-bg/40">
        <div className={locked && !owned ? "opacity-25 grayscale" : ""}>
          <CosmeticPreview item={item} size={72} context="swatch" name="Aa" />
        </div>
        {locked && !owned && (
          <svg className="absolute h-5 w-5 text-fab-dim" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 1a5 5 0 00-5 5v3H6a2 2 0 00-2 2v9a2 2 0 002 2h12a2 2 0 002-2v-9a2 2 0 00-2-2h-1V6a5 5 0 00-5-5zm3 8H9V6a3 3 0 016 0v3z" />
          </svg>
        )}
      </div>

      {/* Name + rarity */}
      <div className="mt-2 min-w-0">
        <p className="truncate text-xs font-semibold text-fab-text" title={item.name}>
          {item.name}
        </p>
        <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-fab-muted">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: rarity?.ringColor ?? s.mid }} />
          {RARITY_LABELS[item.rarity]}
        </span>
      </div>

      {/* Action row */}
      <div className="mt-2">
        {equipped ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onUnequip(item)}
            className="flex w-full items-center justify-center gap-1 rounded border border-fab-gold/50 bg-fab-gold/15 px-2 py-1 text-xs font-semibold text-fab-gold disabled:opacity-50"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Equipped
          </button>
        ) : owned ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onEquip(item)}
            className="w-full rounded border border-fab-border bg-fab-bg px-2 py-1 text-xs font-semibold text-fab-text hover:border-fab-gold disabled:opacity-50"
          >
            Equip
          </button>
        ) : affordable ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onBuy(item)}
            className="flex w-full items-center justify-center gap-1 rounded border border-fab-gold/40 bg-fab-gold/20 px-2 py-1 text-xs font-semibold text-fab-gold hover:bg-fab-gold/25 disabled:opacity-50"
          >
            <CoinIcon size={13} /> {item.price.toLocaleString()}
          </button>
        ) : (
          <div className="w-full rounded border border-fab-border px-2 py-1 text-center">
            <span className="flex items-center justify-center gap-1 text-xs font-semibold text-fab-dim">
              <CoinIcon size={13} /> {item.price.toLocaleString()}
            </span>
            <span className="text-[10px] text-fab-dim">Need {shortfall.toLocaleString()} more</span>
          </div>
        )}
      </div>
    </div>
  );
}
