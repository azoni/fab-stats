"use client";
/**
 * Collection view: every SKU grouped by category, owned ones in full colour and
 * un-owned as low-opacity locked silhouettes (advertises what's collectible),
 * with a per-category completion meter. Reuses ShopCard so buy/equip/equipped
 * states are identical to the shop grid.
 */
import { useMemo } from "react";
import { ShopCard } from "./ShopCard";
import {
  COSMETIC_CATEGORIES,
  type CosmeticCategory,
  type CosmeticItem,
} from "@/lib/cosmetics/catalog";

const CATEGORY_LABELS: Record<CosmeticCategory, string> = {
  avatarFrame: "Frames",
  companion: "Companions",
  aura: "Auras",
  nameplate: "Nameplates",
  background: "Backgrounds",
  trophySkin: "Trophy Skins",
  cursor: "Cursors",
};

export function CollectionPanel({
  catalog,
  ownedSet,
  isEquipped,
  coins,
  busyId,
  onBuy,
  onEquip,
  onUnequip,
  onHover,
}: {
  catalog: CosmeticItem[];
  ownedSet: Set<string>;
  isEquipped: (item: CosmeticItem) => boolean;
  coins: number;
  busyId: string | null;
  onBuy: (item: CosmeticItem) => void;
  onEquip: (item: CosmeticItem) => void;
  onUnequip: (item: CosmeticItem) => void;
  onHover?: (item: CosmeticItem | null) => void;
}) {
  const byCategory = useMemo(() => {
    const map = new Map<CosmeticCategory, CosmeticItem[]>();
    for (const item of catalog) {
      if (!item.shopVisible) continue;
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return map;
  }, [catalog]);

  return (
    <div className="space-y-6">
      {COSMETIC_CATEGORIES.map((cat) => {
        const items = byCategory.get(cat);
        if (!items || items.length === 0) return null;
        const owned = items.filter((i) => ownedSet.has(i.id)).length;
        return (
          <section key={cat}>
            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="text-sm font-semibold text-fab-text">{CATEGORY_LABELS[cat]}</h3>
              <span className="text-[11px] text-fab-muted tabular-nums">
                {owned} / {items.length} collected
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {items.map((item) => (
                <ShopCard
                  key={item.id}
                  item={item}
                  owned={ownedSet.has(item.id)}
                  equipped={isEquipped(item)}
                  coins={coins}
                  busy={busyId === item.id}
                  locked
                  onBuy={onBuy}
                  onEquip={onEquip}
                  onUnequip={onUnequip}
                  onHover={onHover}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
