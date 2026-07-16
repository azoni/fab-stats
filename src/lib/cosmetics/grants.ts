"use client";
/**
 * Resolve which LEGACY ids (profile-background option ids, trophy-design ids,
 * watering-can ids) a user has unlocked by OWNING a secondary cosmetic SKU that
 * grants them. Secondary SKUs carry `grantsId` = the legacy id; inventory holds
 * the owned SKU ids. This lets the existing background/trophy/cursor pickers
 * surface shop-purchased items without each picker knowing about the shop.
 */
import { useMemo } from "react";
import { useInventory } from "./inventory";
import { useCosmeticCatalog } from "./use-cosmetics";

export interface OwnedGrants {
  backgrounds: Set<string>;
  trophyDesigns: Set<string>;
  cans: Set<string>;
}

const EMPTY: OwnedGrants = { backgrounds: new Set(), trophyDesigns: new Set(), cans: new Set() };

/** Live owned-grant sets for a user (empty while the feature flag is off, since
 *  useInventory/useCosmeticCatalog stay dormant then). */
export function useOwnedGrants(uid: string | undefined | null): OwnedGrants {
  const { items } = useInventory(uid);
  const { catalog } = useCosmeticCatalog();
  return useMemo(() => {
    if (items.length === 0 || catalog.length === 0) return EMPTY;
    const byId = new Map(catalog.map((c) => [c.id, c]));
    const g: OwnedGrants = { backgrounds: new Set(), trophyDesigns: new Set(), cans: new Set() };
    for (const id of items) {
      const sku = byId.get(id);
      if (!sku || !sku.grantsId) continue;
      if (sku.category === "background") g.backgrounds.add(sku.grantsId);
      else if (sku.category === "trophySkin") g.trophyDesigns.add(sku.grantsId);
      else if (sku.category === "cursor") g.cans.add(sku.grantsId);
    }
    return g;
  }, [items, catalog]);
}
