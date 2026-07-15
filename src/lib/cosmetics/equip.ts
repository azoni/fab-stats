/**
 * Equip / unequip a cosmetic. Equip writes the matching profile field via
 * updateProfile (owner-writable): the 4 new categories use their `selected*Id`
 * slots; secondary categories write the legacy fields they reuse. Ownership is
 * enforced by the caller (the shop only offers Equip on owned SKUs); a tampered
 * equipped-id is purely cosmetic on the user's own profile and renders via the
 * total DSL parser, so it can never break anything.
 */
import { updateProfile } from "@/lib/firestore-storage";
import type { CosmeticItem, CosmeticCategory } from "./catalog";
import type { UserProfile } from "@/types";

export async function equipCosmetic(uid: string, item: CosmeticItem, profile: UserProfile): Promise<void> {
  switch (item.category) {
    case "avatarFrame":
      return updateProfile(uid, { selectedAvatarFrameId: item.id });
    case "companion":
      return updateProfile(uid, { selectedCompanionId: item.id });
    case "aura":
      return updateProfile(uid, { selectedAuraId: item.id });
    case "nameplate":
      return updateProfile(uid, { selectedNameplateId: item.id });
    case "background":
      return updateProfile(uid, { siteBackgroundId: item.grantsId || item.previewValue });
    case "trophySkin": {
      const [eventType, idxStr] = item.previewValue.split("|");
      const index = parseInt(idxStr, 10) || 0;
      const trophyDesigns = { ...(profile.trophyDesigns || {}), [eventType]: index };
      return updateProfile(uid, { trophyDesigns });
    }
    case "cursor": {
      const canId = item.grantsId || item.previewValue;
      const unlockedCans = Array.from(new Set([...(profile.unlockedCans || []), canId]));
      return updateProfile(uid, { unlockedCans });
    }
  }
}

/** Clear an equipped slot (the 4 new categories). Secondary categories are
 *  managed via their existing selectors, so unequip is a no-op for them. */
export async function unequipCosmetic(uid: string, category: CosmeticCategory): Promise<void> {
  switch (category) {
    case "avatarFrame":
      return updateProfile(uid, { selectedAvatarFrameId: "" });
    case "companion":
      return updateProfile(uid, { selectedCompanionId: "" });
    case "aura":
      return updateProfile(uid, { selectedAuraId: "" });
    case "nameplate":
      return updateProfile(uid, { selectedNameplateId: "" });
    default:
      return;
  }
}

/** The equipped SKU id for a category (for owned/equipped state in the shop). */
export function equippedIdFor(profile: UserProfile, category: CosmeticCategory): string | undefined {
  switch (category) {
    case "avatarFrame":
      return profile.selectedAvatarFrameId;
    case "companion":
      return profile.selectedCompanionId;
    case "aura":
      return profile.selectedAuraId;
    case "nameplate":
      return profile.selectedNameplateId;
    default:
      return undefined;
  }
}

/** Whether a specific SKU is the one currently equipped in its slot. Shared by
 *  the shop and the profile cosmetics panel so their "equipped" state agrees. */
export function isCosmeticEquipped(profile: UserProfile, item: CosmeticItem): boolean {
  switch (item.category) {
    case "avatarFrame":
    case "companion":
    case "aura":
    case "nameplate":
      return equippedIdFor(profile, item.category) === item.id;
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
