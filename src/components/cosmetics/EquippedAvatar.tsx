"use client";
/**
 * Composition wrappers that decorate a player's avatar + display name with their
 * EQUIPPED cosmetics, resolved purely from the public profile doc (`selected*Id`)
 * + the public catalog — no private reads, so it renders on any stranger's
 * profile. Flag-gated: with COSMETICS_ENABLED off it renders the bare avatar/name
 * unchanged, so the shipped profile is untouched until the system is revealed.
 *
 * Catalog-miss discipline: `byId.get(id)` returns undefined for any unknown or
 * inactive id → that slot renders nothing (bare avatar/name). Combined with the
 * total DSL parser, a stale or tampered equipped-id can never throw or break layout.
 */
import { useMemo, type ReactNode } from "react";
import type { UserProfile } from "@/types";
import { COSMETICS_ENABLED } from "@/lib/cosmetics/flags";
import { useCosmeticCatalog } from "@/lib/cosmetics/use-cosmetics";
import { CosmeticPreview } from "./CosmeticPreview";

function useCatalogById() {
  const { catalog } = useCosmeticCatalog();
  return useMemo(() => new Map(catalog.map((c) => [c.id, c])), [catalog]);
}

export function EquippedAvatar({
  profile,
  size = 80,
  children,
}: {
  profile: UserProfile;
  size?: number;
  children: ReactNode;
}) {
  const byId = useCatalogById();
  if (!COSMETICS_ENABLED) {
    return (
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        {children}
      </div>
    );
  }
  const aura = byId.get(profile.selectedAuraId ?? "");
  const frame = byId.get(profile.selectedAvatarFrameId ?? "");
  const comp = byId.get(profile.selectedCompanionId ?? "");
  return (
    // `isolate` forms a stacking context so the aura's -z-10 backdrop paints
    // behind the photo but ABOVE the profile card's opaque background.
    <div className="relative isolate shrink-0" style={{ width: size, height: size }}>
      {aura && <CosmeticPreview item={aura} context="avatar" size={size} />}
      <div className="relative z-10">{children}</div>
      {frame && <CosmeticPreview item={frame} context="avatar" size={size} />}
      {comp && (
        <div className="absolute -bottom-1 -right-1 z-30" style={{ lineHeight: 0 }}>
          <CosmeticPreview item={comp} context="avatar" />
        </div>
      )}
    </div>
  );
}

export function NameWithPlate({ profile, children }: { profile: UserProfile; children: ReactNode }) {
  const byId = useCatalogById();
  if (!COSMETICS_ENABLED) return <>{children}</>;
  const plate = byId.get(profile.selectedNameplateId ?? "");
  return plate ? (
    <CosmeticPreview item={plate} context="name">
      {children}
    </CosmeticPreview>
  ) : (
    <>{children}</>
  );
}
