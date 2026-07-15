"use client";
/**
 * The Reliquary — cosmetics shop. UNLISTED + flag-gated (COSMETICS_ENABLED): no
 * nav entry, and it renders a "coming soon" gate while the flag is off, so it is
 * safe to ship dormant. Browse by category, buy with coins, equip, and try SKUs
 * on your own avatar live before buying.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { COSMETICS_ENABLED } from "@/lib/cosmetics/flags";
import { useWallet, useCosmeticCatalog, useInventory } from "@/lib/cosmetics/use-cosmetics";
import { purchaseCosmetic } from "@/lib/cosmetics/wallet-client";
import { equipCosmetic, unequipCosmetic } from "@/lib/cosmetics/equip";
import type { CosmeticItem, CosmeticCategory } from "@/lib/cosmetics/catalog";
import type { UserProfile } from "@/types";
import { CoinBalance } from "@/components/cosmetics/CoinBalance";
import { EquippedAvatar, NameWithPlate } from "@/components/cosmetics/EquippedAvatar";
import { ShopCard } from "@/components/shop/ShopCard";
import { CollectionPanel } from "@/components/shop/CollectionPanel";
import { GachaReliquary } from "@/components/shop/GachaReliquary";

type Tab = "all" | CosmeticCategory | "collection" | "reliquary";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "reliquary", label: "✦ Reliquary" },
  { key: "avatarFrame", label: "Frames" },
  { key: "companion", label: "Companions" },
  { key: "aura", label: "Auras" },
  { key: "nameplate", label: "Nameplates" },
  { key: "background", label: "Backgrounds" },
  { key: "trophySkin", label: "Trophies" },
  { key: "cursor", label: "Cursors" },
  { key: "collection", label: "My Collection" },
];

function isEquipped(profile: UserProfile, item: CosmeticItem): boolean {
  switch (item.category) {
    case "avatarFrame":
      return profile.selectedAvatarFrameId === item.id;
    case "companion":
      return profile.selectedCompanionId === item.id;
    case "aura":
      return profile.selectedAuraId === item.id;
    case "nameplate":
      return profile.selectedNameplateId === item.id;
    case "background":
      return profile.siteBackgroundId === (item.grantsId || item.previewValue);
    case "trophySkin": {
      const [ev, ix] = item.previewValue.split("|");
      return (profile.trophyDesigns?.[ev] ?? -1) === (parseInt(ix, 10) || 0);
    }
    case "cursor":
      return (profile.unlockedCans || []).includes(item.grantsId || item.previewValue);
    default:
      return false;
  }
}

/** A clone of the profile with `item` applied to its slot — for live try-on. */
function applyToProfile(profile: UserProfile, item: CosmeticItem): UserProfile {
  const p: UserProfile = { ...profile };
  switch (item.category) {
    case "avatarFrame":
      p.selectedAvatarFrameId = item.id;
      break;
    case "companion":
      p.selectedCompanionId = item.id;
      break;
    case "aura":
      p.selectedAuraId = item.id;
      break;
    case "nameplate":
      p.selectedNameplateId = item.id;
      break;
    default:
      break; // secondary categories aren't previewed on the avatar
  }
  return p;
}

export function ShopClient() {
  // Flag gate BEFORE any data hooks, so wallet/inventory/catalog listeners never
  // open in production (flag off).
  if (!COSMETICS_ENABLED) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h1 className="text-xl font-bold text-fab-gold">The Reliquary</h1>
        <p className="mt-2 text-sm text-fab-muted">Coming soon.</p>
      </div>
    );
  }
  return <ShopClientInner />;
}

function ShopClientInner() {
  const { user, profile } = useAuth();
  const { wallet } = useWallet(user?.uid);
  const { catalog, loading } = useCosmeticCatalog();
  const { items: owned } = useInventory(user?.uid);
  const [tab, setTab] = useState<Tab>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [hover, setHover] = useState<CosmeticItem | null>(null);

  const ownedSet = useMemo(() => new Set(owned), [owned]);
  const coins = wallet?.coins ?? 0;

  const visible = useMemo(
    () =>
      catalog.filter((i) => i.shopVisible && i.isActive && (tab === "all" || tab === "collection" || i.category === tab)),
    [catalog, tab],
  );

  if (!user || !profile) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h1 className="text-xl font-bold text-fab-gold">The Reliquary</h1>
        <p className="mt-2 text-sm text-fab-muted">Sign in to earn coins and collect cosmetics.</p>
        <Link
          href="/setup"
          className="mt-4 inline-block rounded border border-fab-gold/40 bg-fab-gold/20 px-4 py-2 text-sm font-semibold text-fab-gold hover:bg-fab-gold/25"
        >
          Sign in
        </Link>
      </div>
    );
  }

  async function handleBuy(item: CosmeticItem) {
    setBusyId(item.id);
    try {
      const r = await purchaseCosmetic(item.id, item.price);
      if (r.ok) toast.success(`Unlocked ${item.name}!`);
      else if (r.error === "insufficient") toast.error("Not enough coins yet.");
      else if (r.error === "already_owned") toast(`You already own ${item.name}.`);
      else if (r.error === "price_changed") toast.error(`Price changed to ${r.price?.toLocaleString()} — refresh and try again.`);
      else toast.error("Purchase failed. Try again.");
    } catch {
      toast.error("Purchase failed. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleEquip(item: CosmeticItem) {
    if (!user || !profile) return;
    setBusyId(item.id);
    try {
      await equipCosmetic(user.uid, item, profile);
      toast.success(`Equipped ${item.name}.`);
    } catch {
      toast.error("Couldn't equip. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleUnequip(item: CosmeticItem) {
    if (!user) return;
    setBusyId(item.id);
    try {
      await unequipCosmetic(user.uid, item.category);
    } catch {
      /* non-critical */
    } finally {
      setBusyId(null);
    }
  }

  const tryOnProfile = hover ? applyToProfile(profile, hover) : profile;

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-fab-border pb-3">
        <div>
          <h1 className="text-xl font-bold text-fab-gold">The Reliquary</h1>
          <p className="text-xs text-fab-muted">Spend coins earned from importing matches on profile cosmetics.</p>
        </div>
        <CoinBalance />
      </div>

      {/* Tabs */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              tab === t.key
                ? "bg-fab-gold/20 text-fab-gold border border-fab-gold/40"
                : "border border-fab-border text-fab-muted hover:text-fab-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_240px]">
        {/* Grid / collection */}
        <div>
          {loading && catalog.length === 0 ? (
            <p className="py-12 text-center text-sm text-fab-dim">Loading the Reliquary…</p>
          ) : tab === "reliquary" ? (
            <GachaReliquary catalog={catalog} wallet={wallet} />
          ) : tab === "collection" ? (
            <CollectionPanel
              catalog={catalog}
              ownedSet={ownedSet}
              isEquipped={(item) => isEquipped(profile, item)}
              coins={coins}
              busyId={busyId}
              onBuy={handleBuy}
              onEquip={handleEquip}
              onUnequip={handleUnequip}
              onHover={setHover}
            />
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
              {visible.map((item) => (
                <ShopCard
                  key={item.id}
                  item={item}
                  owned={ownedSet.has(item.id)}
                  equipped={isEquipped(profile, item)}
                  coins={coins}
                  busy={busyId === item.id}
                  onBuy={handleBuy}
                  onEquip={handleEquip}
                  onUnequip={handleUnequip}
                  onHover={setHover}
                />
              ))}
            </div>
          )}
        </div>

        {/* Live try-on */}
        <aside className="hidden lg:block">
          <div className="sticky top-4 rounded-lg border border-fab-border bg-fab-surface p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-fab-muted">
              {hover ? "Try-on" : "Your loadout"}
            </p>
            <div className="mt-4 flex flex-col items-center gap-3">
              <EquippedAvatar profile={tryOnProfile} size={88}>
                {profile.photoUrl ? (
                  <img src={profile.photoUrl} alt="" className="h-[88px] w-[88px] rounded-full" />
                ) : (
                  <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-fab-gold/20 text-3xl font-bold text-fab-gold">
                    {profile.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </EquippedAvatar>
              <NameWithPlate profile={tryOnProfile}>
                <span className="text-lg font-bold text-fab-gold">{profile.displayName}</span>
              </NameWithPlate>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
