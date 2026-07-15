/**
 * Nameplate cosmetic — a chiselled banner rendered BEHIND the display name.
 * Legibility by construction: (1) the plate fill is var(--color-fab-surface) at
 * ≤0.55 opacity — a scrim so the name keeps contrast on daylight; (2) interior
 * patterns are clipped and drawn only in the FLANKS, leaving a clear channel
 * under the glyphs. Pure & prerenderable. Biggest SKU multiplier (shape × material × pattern).
 */
import type { ReactNode, ReactElement } from "react";
import { spec, type Material, type MaterialSpec } from "./materials";
import { HeraldicDefs, CornerFlourish, Crest } from "./Ornaments";
import type { Finish } from "@/lib/cosmetics/preview-dsl";

const SHAPE: Record<string, string> = {
  plate: "M8,3 H292 a6,6 0 0 1 6,6 V35 a6,6 0 0 1 -6,6 H8 a6,6 0 0 1 -6,-6 V9 a6,6 0 0 1 6,-6 Z",
  banner: "M0,5 L20,22 L0,39 H280 L300,22 L280,5 Z",
  scroll: "M4,8 h292 a4,10 0 0 1 0,28 H4 a4,10 0 0 1 0,-28 Z",
  tablet: "M6,4 H294 L298,10 V34 L294,40 H6 L2,34 V10 Z",
  rule: "M2,20 H298",
};

/** Flank motif drawn once at left (x≈18–88) then mirrored to the right flank. */
function flankPattern(pattern: string, s: MaterialSpec): ReactElement | null {
  switch (pattern) {
    case "runes":
      return (
        <g stroke={s.mid} strokeWidth="1" opacity="0.55" fill="none">
          {[28, 42, 56, 70].map((x) => (
            <path key={x} d={`M${x},15 v14 M${x - 3},19 h6 M${x - 2},24 h4`} />
          ))}
        </g>
      );
    case "diamonds":
      return (
        <g fill={s.mid} opacity="0.6">
          {[26, 40, 54, 68, 82].map((x) => (
            <path key={x} d={`M${x},22 l3,-3 3,3 -3,3 Z`} />
          ))}
        </g>
      );
    case "guilloche":
      return (
        <g stroke={s.mid} strokeWidth="0.8" opacity="0.5" fill="none">
          <path d="M18,22 q8,-6 16,0 t16,0 t16,0 t16,0" />
          <path d="M18,22 q8,6 16,0 t16,0 t16,0 t16,0" />
        </g>
      );
    case "laurel":
    case "crownlaurel":
      return (
        <g stroke={s.mid} strokeWidth="1" opacity="0.6" fill="none" strokeLinecap="round">
          <path d="M22,22 q11,-3 24,0" />
          {[27, 34, 41].map((x) => (
            <path key={`u${x}`} d={`M${x},21 q2,-3 5,-2`} />
          ))}
          {[27, 34, 41].map((x) => (
            <path key={`l${x}`} d={`M${x},23 q2,3 5,2`} />
          ))}
        </g>
      );
    case "filigree":
      return (
        <g stroke={s.mid} strokeWidth="1" opacity="0.55" fill="none" strokeLinecap="round">
          <path d="M22,22 C22,17 28,17 28,21 C28,24.5 24,24.5 24,22 M31,22 C35,18 41,20 43,24" />
        </g>
      );
    default:
      return null; // plain
  }
}

export function NameplateCosmetic({
  idPrefix,
  shape,
  material,
  pattern,
  finish,
  children,
}: {
  idPrefix: string;
  shape: string;
  material: Material;
  pattern: string;
  finish: Finish;
  children: ReactNode;
}) {
  const s = spec(material);
  const d = SHAPE[shape] ?? SHAPE.plate;
  const isRule = shape === "rule";
  const flank = flankPattern(pattern, s);
  const ornate = pattern === "laurel" || pattern === "crownlaurel";

  return (
    <span className="relative isolate inline-flex items-center px-5 py-0.5">
      <svg
        className="absolute inset-0 h-full w-full -z-10"
        viewBox="0 0 300 44"
        preserveAspectRatio="none"
        aria-hidden
        fill="none"
      >
        <HeraldicDefs idPrefix={idPrefix} material={material} />
        <defs>
          <clipPath id={`${idPrefix}-np`}>
            <path d={d} />
          </clipPath>
        </defs>
        {!isRule && (
          <path d={d} fill="var(--color-fab-surface, #12110f)" fillOpacity="0.55" stroke={s.edge} strokeWidth="1.4" />
        )}
        <path d={d} fill="none" stroke={`url(#${idPrefix}-mh)`} strokeWidth={isRule ? 1.2 : 2} />
        {isRule && <path d="M150,15 L156,22 L150,29 L144,22 Z" fill={`url(#${idPrefix}-mh)`} />}
        {!isRule && flank && (
          <g clipPath={`url(#${idPrefix}-np)`}>
            {flank}
            <g transform="translate(300,0) scale(-1,1)">{flank}</g>
          </g>
        )}
      </svg>
      {!isRule && (
        <>
          <span className="absolute left-0 top-1/2 -translate-y-1/2" style={{ lineHeight: 0 }}>
            <CornerFlourish material={material} size={22} finish={finish} ornate={ornate} />
          </span>
          <span className="absolute right-0 top-1/2 -translate-y-1/2 scale-x-[-1]" style={{ lineHeight: 0 }}>
            <CornerFlourish material={material} size={22} finish={finish} ornate={ornate} />
          </span>
        </>
      )}
      {pattern === "crownlaurel" && (
        <span className="absolute left-1/2 -top-3 -translate-x-1/2" style={{ lineHeight: 0 }}>
          <Crest idPrefix={idPrefix} material={material} size={20} glyph="crown" finish={finish} />
        </span>
      )}
      <span className="relative z-10 text-fab-gold">{children}</span>
    </span>
  );
}
