/**
 * Companion cosmetic — a heraldic CHARGE (line sigil) struck on a metal backing,
 * pinned bottom-right of the avatar. Not a bespoke cartoon pet: simplified
 * heraldic charges keep the medieval idiom and the "no artwork" rule. Pure &
 * prerenderable. A surface-filled backing guarantees the sigil is legible on any
 * theme. Rarity reads as sigil + material + backing ornateness + finish.
 */
import type { ReactElement } from "react";
import { spec, type Material, type MaterialSpec } from "./materials";
import { HeraldicDefs } from "./Ornaments";
import type { Finish } from "@/lib/cosmetics/preview-dsl";

const SHIELD = "M15,3 L27,7 L27,16 C27,26 15,32 15,32 C15,32 3,26 3,16 L3,7 Z";

/** Each charge draws in the given fill (stroke color), centered ~ (15,15). */
const SIGILS: Record<string, (s: MaterialSpec, fill: string) => ReactElement> = {
  fleur: (_s, f) => (
    <g stroke={f} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15,7 C12,11 12,15 15,18 C18,15 18,11 15,7 Z" />
      <path d="M10,14 C10,19 13,19 15,18 M20,14 C20,19 17,19 15,18" />
      <path d="M15,18 L15,26 M11,22 L19,22" />
    </g>
  ),
  rose: (_s, f) => (
    <g strokeLinejoin="round">
      {[0, 72, 144, 216, 288].map((a) => (
        <path
          key={a}
          d="M15,8 C17,10 17,12.4 15,13.4 C13,12.4 13,10 15,8 Z"
          transform={`rotate(${a} 15 15)`}
          stroke={f}
          strokeWidth="1.2"
          fill="none"
        />
      ))}
      <circle cx="15" cy="15" r="1.6" fill={f} />
    </g>
  ),
  crescent: (_s, f) => (
    <path d="M18.5,7 A8.5,8.5 0 1 0 18.5,23 A6.5,6.5 0 1 1 18.5,7 Z" fill={f} />
  ),
  sun: (_s, f) => (
    <g stroke={f} strokeWidth="1.2" fill="none">
      <circle cx="15" cy="15" r="4.6" />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return (
          <line
            key={i}
            x1={15 + Math.cos(a) * 6.3}
            y1={15 + Math.sin(a) * 6.3}
            x2={15 + Math.cos(a) * 9.4}
            y2={15 + Math.sin(a) * 9.4}
            strokeWidth="1.1"
          />
        );
      })}
    </g>
  ),
  wolf: (_s, f) => (
    <path
      d="M7,24 L9,15 L13,12 L13,8 L15,12 L19,12 L21,8 L21,12 L25,15 L24,24 Z"
      stroke={f}
      strokeWidth="1.3"
      fill="none"
      strokeLinejoin="round"
    />
  ),
  stag: (_s, f) => (
    <g stroke={f} strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12,25 L12,17 Q12,13.5 15,13.5 Q18,13.5 18,17 L18,25" />
      <path d="M12,16 L8.5,11 M8.5,11 L6.5,12.5 M8.5,11 L7.5,7.5" />
      <path d="M18,16 L21.5,11 M21.5,11 L23.5,12.5 M21.5,11 L22.5,7.5" />
    </g>
  ),
  lion: (_s, f) => (
    <g stroke={f} strokeWidth="1.15" fill="none" strokeLinejoin="round">
      {Array.from({ length: 10 }).map((_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return (
          <path
            key={i}
            d={`M${15 + Math.cos(a) * 5.6},${15 + Math.sin(a) * 5.6} L${15 + Math.cos(a) * 9},${
              15 + Math.sin(a) * 9
            } L${15 + Math.cos(a + 0.28) * 5.6},${15 + Math.sin(a + 0.28) * 5.6}`}
          />
        );
      })}
      <circle cx="15" cy="15" r="5.4" />
      <circle cx="13" cy="14.4" r="0.6" fill={f} stroke="none" />
      <circle cx="17" cy="14.4" r="0.6" fill={f} stroke="none" />
      <path d="M13.5,17 Q15,18.4 16.5,17" />
    </g>
  ),
  phoenix: (_s, f) => (
    <g stroke={f} strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15,9 C14,12 14,14 15,16 C16,14 16,12 15,9 Z" />
      <path d="M15,12 C10,10 6,12 5,16 C9,14 12,15 15,16" />
      <path d="M15,12 C20,10 24,12 25,16 C21,14 18,15 15,16" />
      <path d="M15,16 L15,22 M13,20 L15,22.4 L17,20" />
      <path d="M15,9 L15,6 M13.8,7 L15,5.8 L16.2,7" />
    </g>
  ),
  dragon: (_s, f) => (
    <g stroke={f} strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7,21 C7,14.5 11.5,12 16,13.2 C13,10 18.5,6.5 20.5,9.8 C21.6,7.8 23.8,8.8 22.8,11 C25,12.2 24,15.2 21.6,15 C22.8,18.2 19.5,20.4 16,19.2 C12.5,22.4 8,22.2 7,21 Z" />
      <path d="M20.5,9.8 L22.8,7.6 M18.6,9 L19.8,6.8" />
      <circle cx="19.4" cy="11" r="0.55" fill={f} stroke="none" />
      <path d="M11,17 C13,18 15,18 17,16.6" opacity="0.7" />
    </g>
  ),
};

export function CompanionCosmetic({
  idPrefix,
  sigil,
  material,
  backing,
  finish,
  size = 30,
}: {
  idPrefix: string;
  sigil: string;
  material: Material;
  backing: string;
  finish: Finish;
  size?: number;
}) {
  const s = spec(material);
  const drawFill = finish === "inlaid" ? `url(#${idPrefix}-mv)` : s.specular;
  const draw = SIGILS[sigil] ?? SIGILS.fleur;
  return (
    <svg width={size} height={(size * 34) / 30} viewBox="0 0 30 34" fill="none" aria-hidden>
      <HeraldicDefs idPrefix={idPrefix} material={material} />
      {backing === "escutcheon" ? (
        <>
          <path d={SHIELD} fill="var(--color-fab-surface, #12110f)" stroke={s.edge} strokeWidth="1.6" />
          <path d={SHIELD} fill="none" stroke={s.specular} strokeWidth="0.7" opacity="0.5" transform="translate(0.9 1.4) scale(0.94)" />
        </>
      ) : (
        <>
          <circle cx="15" cy="15" r="13" fill="var(--color-fab-surface, #12110f)" stroke={s.edge} strokeWidth="1.6" />
          <circle cx="15" cy="15" r="11" fill="none" stroke={s.specular} strokeWidth="0.6" opacity="0.4" />
          {backing === "studded" &&
            [0, 90, 180, 270].map((a) => (
              <path key={a} d="M15,1.5 l1.8,1.8 -1.8,1.8 -1.8,-1.8 Z" fill={s.mid} transform={`rotate(${a} 15 15)`} />
            ))}
        </>
      )}
      {draw(s, drawFill)}
    </svg>
  );
}
