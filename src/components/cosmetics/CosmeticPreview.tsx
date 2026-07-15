"use client";
/**
 * The single dispatcher that turns any cosmetic SKU into pixels. Because it is a
 * pure function of (previewKind, previewValue), the shop swatch and the render on
 * a stranger's public profile are byte-identical. Calls useId() ONCE and passes
 * idPrefix down to the pure leaf renderers (which have no hooks).
 *
 * context:
 *   "swatch" — standalone card preview (draws over a neutral surface puck)
 *   "avatar" — overlays the real avatar (caller supplies the relative box)
 *   "name"   — wraps the live display name (nameplate)
 */
import { useId, type ReactNode } from "react";
import type { CosmeticItem } from "@/lib/cosmetics/catalog";
import { parseFrame, parseCompanion, parseAura, parseNameplate } from "@/lib/cosmetics/preview-dsl";
import { AvatarFrameCosmetic } from "./AvatarFrameCosmetic";
import { CompanionCosmetic } from "./CompanionCosmetic";
import { AuraCosmetic } from "./AuraCosmetic";
import { NameplateCosmetic } from "./NameplateCosmetic";
import { PROFILE_BACKGROUND_OPTIONS, buildOptimizedImageUrl } from "@/lib/profile-backgrounds";
import { getCanById } from "@/lib/watering-cans";
import { renderTrophyDesign } from "@/components/profile/TrophyCase";

type Context = "swatch" | "avatar" | "name";

function PlaceholderSwatch({ size }: { size: number }) {
  return (
    <div
      className="grid place-items-center rounded-md border border-fab-border bg-fab-surface text-fab-dim"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span className="text-[10px]">n/a</span>
    </div>
  );
}

function BackgroundSwatch({ id, size }: { id: string; size: number }) {
  const opt = PROFILE_BACKGROUND_OPTIONS.find((o) => o.id === id);
  if (!opt) return <PlaceholderSwatch size={size} />;
  return (
    <img
      src={buildOptimizedImageUrl(opt.thumbnailUrl || opt.imageUrl, 240, 55)}
      alt=""
      className="rounded-md border border-fab-border object-cover"
      style={{ width: size, height: size, objectPosition: opt.focusPosition || "center" }}
      loading="lazy"
      decoding="async"
      aria-hidden
    />
  );
}

function TrophySkinSwatch({ value, idPrefix, size }: { value: string; idPrefix: string; size: number }) {
  const [eventType, idxStr] = value.split("|");
  const index = parseInt(idxStr, 10) || 0;
  return (
    <div className="grid place-items-center" style={{ width: size, height: size }} aria-hidden>
      <div style={{ width: size * 0.82, height: size * 0.82 }}>
        {renderTrophyDesign(eventType || "Other", index, "champion", `trs-${idPrefix}`, 0)}
      </div>
    </div>
  );
}

function CursorSwatch({ id, size }: { id: string; size: number }) {
  const can = getCanById(id);
  if (!can) return <PlaceholderSwatch size={size} />;
  return (
    <div
      className="grid place-items-center rounded-md border border-fab-border bg-fab-surface"
      style={{ width: size, height: size }}
      aria-hidden
      dangerouslySetInnerHTML={{ __html: can.previewSvg }}
    />
  );
}

export function CosmeticPreview({
  item,
  size = 64,
  context = "swatch",
  name = "Player",
  children,
}: {
  item: CosmeticItem;
  size?: number;
  context?: Context;
  name?: string;
  children?: ReactNode;
}) {
  const idPrefix = `cp${useId().replace(/:/g, "")}`;

  switch (item.previewKind) {
    case "avatarFrame": {
      const f = parseFrame(item.previewValue);
      const el = <AvatarFrameCosmetic idPrefix={idPrefix} {...f} size={size} />;
      if (context === "avatar") return el;
      return (
        <div className="relative rounded-full" style={{ width: size, height: size }}>
          <div className="absolute inset-[10%] rounded-full bg-fab-surface" />
          {el}
        </div>
      );
    }
    case "aura": {
      const a = parseAura(item.previewValue);
      const el = <AuraCosmetic idPrefix={idPrefix} {...a} />;
      if (context === "avatar") return el;
      return (
        <div className="relative isolate grid place-items-center" style={{ width: size, height: size }}>
          {el}
          <div className="relative z-10 rounded-full bg-fab-surface" style={{ width: size * 0.66, height: size * 0.66 }} />
        </div>
      );
    }
    case "companion": {
      const c = parseCompanion(item.previewValue);
      const cs = context === "swatch" ? Math.min(size, 40) : 30;
      const el = <CompanionCosmetic idPrefix={idPrefix} {...c} size={cs} />;
      if (context === "avatar") return el;
      return (
        <div className="grid place-items-center" style={{ width: size, height: size }}>
          {el}
        </div>
      );
    }
    case "nameplate": {
      const n = parseNameplate(item.previewValue);
      return (
        <NameplateCosmetic idPrefix={idPrefix} {...n}>
          {children ?? name}
        </NameplateCosmetic>
      );
    }
    case "background":
      return <BackgroundSwatch id={item.previewValue} size={size} />;
    case "trophySkin":
      return <TrophySkinSwatch value={item.previewValue} idPrefix={idPrefix} size={size} />;
    case "cursor":
      return <CursorSwatch id={item.previewValue} size={size} />;
    default:
      return null; // unknown kind → render nothing
  }
}
