"use client";
/**
 * Owner-only cosmetics manager ON the profile — the "reason to edit your profile":
 * see your coins + owned relics and equip/unequip them without going to the shop.
 * Flag-gated (renders nothing when off). Additive — touches no existing profile
 * section. Equip writes go through the shared equip.ts helpers.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { UserProfile } from "@/types";
import { COSMETICS_ENABLED } from "@/lib/cosmetics/flags";
import { useCosmeticCatalog, useInventory, useWallet } from "@/lib/cosmetics/use-cosmetics";
import { equipCosmetic, unequipCosmetic, isCosmeticEquipped } from "@/lib/cosmetics/equip";
import { COSMETIC_CATEGORIES, type CosmeticCategory, type CosmeticItem } from "@/lib/cosmetics/catalog";
import { CoinBalance } from "@/components/cosmetics/CoinBalance";
import { ShopCard } from "@/components/shop/ShopCard";

const CATEGORY_LABELS: Record<CosmeticCategory, string> = {
  avatarFrame: "Frames",
  companion: "Companions",
  aura: "Auras",
  nameplate: "Nameplates",
  background: "Backgrounds",
  trophySkin: "Trophy Skins",
  cursor: "Cursors",
};

export function ProfileCosmeticsPanel({ profile }: { profile: UserProfile }) {
  const { catalog } = useCosmeticCatalog();
  const { items: owned } = useInventory(profile.uid);
  const { wallet } = useWallet(profile.uid);
  const [busyId, setBusyId] = useState<string | null>(null);

  const ownedSet = useMemo(() => new Set(owned), [owned]);
  const ownedItems = useMemo(() => catalog.filter((c) => ownedSet.has(c.id)), [catalog, ownedSet]);
  const byCategory = useMemo(() => {
    const map = new Map<CosmeticCategory, CosmeticItem[]>();
    for (const item of ownedItems) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return map;
  }, [ownedItems]);

  if (!COSMETICS_ENABLED) return null;

  async function equip(item: CosmeticItem) {
    setBusyId(item.id);
    try {
      await equipCosmetic(profile.uid, item, profile);
      toast.success(`Equipped ${item.name}.`);
    } catch {
      toast.error("Couldn't equip. Try again.");
    } finally {
      setBusyId(null);
    }
  }
  async function unequip(item: CosmeticItem) {
    setBusyId(item.id);
    try {
      await unequipCosmetic(profile.uid, item.category);
    } catch {
      /* non-critical */
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="rounded-lg border border-fab-border bg-fab-surface/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-fab-text">Cosmetics</h3>
          <CoinBalance size="sm" />
        </div>
        <Link href="/shop" className="text-xs font-semibold text-fab-gold hover:underline">
          Open shop →
        </Link>
      </div>

      {ownedItems.length === 0 ? (
        <p className="mt-3 text-xs text-fab-muted">
          No relics yet. Earn coins by importing matches, then unlock cosmetics in the{" "}
          <Link href="/shop" className="text-fab-gold hover:underline">
            Reliquary
          </Link>
          .
        </p>
      ) : (
        <div className="mt-3 space-y-4">
          {COSMETIC_CATEGORIES.map((cat) => {
            const items = byCategory.get(cat);
            if (!items || items.length === 0) return null;
            return (
              <section key={cat}>
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-fab-dim">{CATEGORY_LABELS[cat]}</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {items.map((item) => (
                    <ShopCard
                      key={item.id}
                      item={item}
                      owned
                      equipped={isCosmeticEquipped(profile, item)}
                      coins={wallet?.coins ?? 0}
                      busy={busyId === item.id}
                      onBuy={() => {}}
                      onEquip={equip}
                      onUnequip={unequip}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
