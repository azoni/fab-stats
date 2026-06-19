"use client";
/**
 * Heraldic ornament kit — bespoke, hand-authored SVG. Pure presentational
 * components (no hooks, no effects) so they prerender under `output: 'export'`.
 *
 * Design rules baked in here:
 *  - Engraved metal, not emitted light: ornament is drawn line-art + material
 *    gradient fills. NO box-shadow glow, NO animation. This is what makes it read
 *    as "designed" rather than "AI", and it degrades cleanly under every theme.
 *  - Tiers differ by ornament density + material, not glow radius.
 *  - Every <defs> id is namespaced by `idPrefix` so multiple framed cards on one
 *    page never collide.
 */
import type { ReactNode } from "react";
import { spec, type Material } from "./materials";

// ── Shared gradient defs (one hidden svg per frame instance) ──

export function HeraldicDefs({ idPrefix, material }: { idPrefix: string; material: Material }) {
  const s = spec(material);
  const [c0, c1, c2, c3, c4] = s.stops;
  return (
    <svg width="0" height="0" aria-hidden className="absolute" style={{ position: "absolute" }}>
      <defs>
        <linearGradient id={`${idPrefix}-mv`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c0} />
          <stop offset="30%" stopColor={c1} />
          <stop offset="50%" stopColor={c2} />
          <stop offset="70%" stopColor={c3} />
          <stop offset="100%" stopColor={c4} />
        </linearGradient>
        <linearGradient id={`${idPrefix}-mh`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={c0} />
          <stop offset="50%" stopColor={c2} />
          <stop offset="100%" stopColor={c4} />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ── Corner flourish (drawn at top-left orientation; mirrored by the frame) ──

export function CornerFlourish({
  material,
  size = 40,
  finish = "engraved",
}: {
  material: Material;
  size?: number;
  finish?: "engraved" | "inlaid";
}) {
  const s = spec(material);
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      {/* 3-line chiselled bracket: edge / midtone / specular = a bevel */}
      <path d="M4,48 L4,16 Q4,4 16,4 L48,4" stroke={s.edge} strokeWidth="2.4" fill="none" />
      <path d="M7,48 L7,18 Q7,7 18,7 L48,7" stroke={s.mid} strokeWidth="1.5" fill="none" />
      <path d="M10,48 L10,20 Q10,10 20,10 L48,10" stroke={s.specular} strokeWidth="0.8" opacity="0.6" fill="none" />
      {/* scroll curl at the inner elbow */}
      <path d="M18,7 C12,7 9,11 9,17 C9,12 13,9 18,11" stroke={s.mid} strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.85" />
      {/* short vines along the arms */}
      <path d="M28,4 q6,4 12,1.5" stroke={s.mid} strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.5" />
      <path d="M4,28 q4,6 1.5,12" stroke={s.mid} strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.5" />
      {/* lozenge node at the very corner (drawn, not a rotated rect) */}
      <path
        d="M4,0.5 L7.5,4 L4,7.5 L0.5,4 Z"
        fill={finish === "inlaid" ? s.specular : s.mid}
        opacity={finish === "inlaid" ? 0.95 : 0.85}
      />
    </svg>
  );
}

// ── Crest / escutcheon (top-centre capstone) ──

export function Crest({
  idPrefix,
  material,
  size = 34,
  finish = "engraved",
  glyph = "crown",
}: {
  idPrefix: string;
  material: Material;
  size?: number;
  finish?: "engraved" | "inlaid";
  glyph?: "crown" | "star";
}) {
  const s = spec(material);
  const shield = "M18,2 L33,7 L33,18 C33,30 18,38 18,38 C18,38 3,30 3,18 L3,7 Z";
  return (
    <svg width={size} height={(size * 40) / 36} viewBox="0 0 36 40" fill="none" aria-hidden>
      {/* shield body */}
      <path
        d={shield}
        fill={finish === "inlaid" ? `url(#${idPrefix}-mv)` : "var(--color-fab-surface, #12110f)"}
        stroke={s.edge}
        strokeWidth="1.4"
      />
      <path d={shield} fill="none" stroke={s.specular} strokeWidth="0.7" opacity="0.5" transform="translate(0 1.2) scale(0.94)" />
      {/* inner motif */}
      {glyph === "crown" ? (
        <>
          <path d="M11,17 L14,12 L18,16 L22,12 L25,17 L23,23 L13,23 Z" stroke={s.specular} strokeWidth="1.1" fill="none" opacity="0.9" strokeLinejoin="round" />
          <circle cx="18" cy="14.5" r="1.3" fill={s.specular} />
        </>
      ) : (
        <path d="M18,10 l2.2,4.6 5,0.5 -3.8,3.4 1.1,5 -4.5,-2.6 -4.5,2.6 1.1,-5 -3.8,-3.4 5,-0.5 Z" stroke={s.specular} strokeWidth="1" fill="none" opacity="0.9" strokeLinejoin="round" />
      )}
    </svg>
  );
}

// ── Heraldic frame — composes inner keyline + 4 corners + crest ──

const CORNER_TRANSFORM: Record<string, string> = {
  tl: "none",
  tr: "scaleX(-1)",
  bl: "scaleY(-1)",
  br: "scale(-1,-1)",
};

export function HeraldicFrame({
  idPrefix,
  material,
  finish = "engraved",
  cornerSize = 40,
  children,
}: {
  idPrefix: string;
  material: Material;
  finish?: "engraved" | "inlaid";
  cornerSize?: number;
  children?: ReactNode;
}) {
  const s = spec(material);
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <HeraldicDefs idPrefix={idPrefix} material={material} />
      {/* chiselled inner keyline */}
      <div
        className="absolute inset-[5px] rounded-md"
        style={{ border: `1px solid ${s.mid}`, opacity: 0.4 }}
      />
      {/* corners */}
      {(["tl", "tr", "bl", "br"] as const).map((corner) => (
        <div
          key={corner}
          className="absolute"
          style={{
            top: corner.startsWith("t") ? -6 : undefined,
            bottom: corner.startsWith("b") ? -6 : undefined,
            left: corner.endsWith("l") ? -6 : undefined,
            right: corner.endsWith("r") ? -6 : undefined,
            transform: CORNER_TRANSFORM[corner],
            transformOrigin: "center",
            lineHeight: 0,
          }}
        >
          <CornerFlourish material={material} size={cornerSize} finish={finish} />
        </div>
      ))}
      {/* crest capstone */}
      <div className="absolute left-1/2" style={{ top: -17, transform: "translateX(-50%)", lineHeight: 0 }}>
        <Crest idPrefix={idPrefix} material={material} finish={finish} />
      </div>
      {children}
    </div>
  );
}

// ── Filigree underline ──

export function FiligreeUnderline({
  idPrefix,
  material,
  tier,
}: {
  idPrefix: string;
  material: Material;
  tier: number;
}) {
  const s = spec(material);
  const stroke = `url(#${idPrefix}-mh)`;

  if (tier < 4) {
    // Lower tiers: a restrained engraved rule + centre lozenge.
    return (
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20" style={{ height: 14 }}>
        <HeraldicDefs idPrefix={idPrefix} material={material} />
        <svg viewBox="0 0 400 14" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" fill="none">
          <line x1="0" y1="9" x2="170" y2="9" stroke={s.mid} strokeWidth="1.2" opacity="0.6" />
          <line x1="230" y1="9" x2="400" y2="9" stroke={s.mid} strokeWidth="1.2" opacity="0.6" />
        </svg>
        <svg viewBox="0 0 60 14" className="absolute left-1/2 top-0 h-full" style={{ width: 60, transform: "translateX(-50%)" }} fill="none">
          <path d="M18,9 q12,-6 24,0 q-12,6 -24,0 Z" fill={stroke} opacity="0.8" />
          <path d="M30,4.5 L33,9 L30,13.5 L27,9 Z" fill={s.specular} opacity="0.9" />
        </svg>
      </div>
    );
  }

  // Champion: crown banner — ported geometry, recoloured to material, static.
  return (
    <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20" style={{ height: 32 }}>
      <HeraldicDefs idPrefix={idPrefix} material={material} />
      <svg viewBox="0 0 400 32" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" fill="none">
        <line x1="0" y1="21" x2="90" y2="21" stroke={s.mid} strokeWidth="1.4" opacity="0.45" />
        <line x1="0" y1="24" x2="70" y2="24" stroke={s.mid} strokeWidth="0.7" opacity="0.25" />
        <line x1="310" y1="21" x2="400" y2="21" stroke={s.mid} strokeWidth="1.4" opacity="0.45" />
        <line x1="330" y1="24" x2="400" y2="24" stroke={s.mid} strokeWidth="0.7" opacity="0.25" />
      </svg>
      <svg viewBox="0 0 220 32" className="absolute left-1/2 top-0 h-full" style={{ width: 220, transform: "translateX(-50%)" }} fill="none">
        {/* crown */}
        <path d="M100,8 L104,4 L108,8 L112,2 L116,8 L120,4 L124,8" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M98,10 Q112,14 126,10" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <circle cx="112" cy="7" r="1.6" fill={s.specular} />
        {/* left flourish */}
        <path d="M92,20 C88,18 80,14 72,10 C64,6 56,6 52,10 C48,14 52,16 58,15 C64,14 68,12 72,14 C76,16 72,20 66,20" stroke={s.mid} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.85" />
        <path d="M90,22 C84,20 76,16 68,14 C60,12 58,16 64,17 C70,18 74,16 76,18" stroke={s.mid} strokeWidth="1.1" strokeLinecap="round" fill="none" opacity="0.5" />
        <path d="M52,10 C48,8 40,10 36,14 C32,18 28,18 24,16" stroke={s.mid} strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.4" />
        {/* right flourish */}
        <path d="M132,20 C136,18 144,14 152,10 C160,6 168,6 172,10 C176,14 172,16 166,15 C160,14 156,12 152,14 C148,16 152,20 158,20" stroke={s.mid} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.85" />
        <path d="M134,22 C140,20 148,16 156,14 C164,12 166,16 160,17 C154,18 150,16 148,18" stroke={s.mid} strokeWidth="1.1" strokeLinecap="round" fill="none" opacity="0.5" />
        <path d="M172,10 C176,8 184,10 188,14 C192,18 196,18 200,16" stroke={s.mid} strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.4" />
        {/* connectors */}
        <line x1="92" y1="20" x2="98" y2="14" stroke={s.mid} strokeWidth="1.5" opacity="0.6" />
        <line x1="132" y1="20" x2="126" y2="14" stroke={s.mid} strokeWidth="1.5" opacity="0.6" />
        {/* ornamental ring + accent lozenges */}
        <ellipse cx="112" cy="14" rx="18" ry="8" stroke={s.mid} strokeWidth="1" opacity="0.25" fill="none" />
        <path d="M24,13 L27,16 L24,19 L21,16 Z" fill={s.specular} opacity="0.55" />
        <path d="M200,13 L203,16 L200,19 L197,16 Z" fill={s.specular} opacity="0.55" />
      </svg>
    </div>
  );
}
