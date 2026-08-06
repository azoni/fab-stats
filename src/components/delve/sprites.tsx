"use client";
/**
 * The Understack bestiary + delver sprites — parameterized SVG silhouettes,
 * zero image assets (the cosmetics-engine philosophy). Each sprite is a dark
 * silhouette with glowing eyes, tinted by the zone material so new zones
 * recolor the whole cast for free.
 */
import { MATERIALS, type Material } from "@/components/cosmetics/materials";
import type { ClassId } from "@/lib/delve/types";

export function EnemySprite({
  sprite,
  palette = "bronze",
  size = 96,
  defeated = false,
}: {
  sprite: string;
  palette?: Material;
  size?: number;
  defeated?: boolean;
}) {
  const m = MATERIALS[palette];
  const body = "#211d18";
  const edge = m.mid;
  const eye = m.specular;
  const cls = defeated ? "opacity-40 grayscale" : "";
  const common = { fill: body, stroke: edge, strokeWidth: 1.4 } as const;

  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={cls} aria-hidden>
      {sprite === "rat" && (
        <g>
          <path {...common} d="M10 44 Q14 28 30 28 Q46 28 50 40 Q54 46 48 48 L14 48 Q8 48 10 44 Z" />
          <path {...common} d="M26 30 Q24 20 32 18 Q40 20 38 30 Z" />
          <path {...common} d="M28 18 L26 12 L31 16 Z M36 18 L38 12 L33 16 Z" />
          <path fill="none" stroke={edge} strokeWidth={1.6} d="M50 44 Q60 42 58 34" />
          <circle cx="29" cy="24" r="1.8" fill={eye} />
          <circle cx="35" cy="24" r="1.8" fill={eye} />
        </g>
      )}
      {sprite === "hound" && (
        <g>
          <path {...common} d="M8 46 Q10 32 22 30 L40 28 Q50 26 52 18 L56 22 Q56 32 46 36 L46 46 Q46 50 42 50 L14 50 Q8 50 8 46 Z" />
          <path {...common} d="M44 20 L42 10 L48 16 Z" />
          <circle cx="48" cy="22" r="1.8" fill={eye} />
          <path fill="none" stroke={eye} strokeWidth={1.2} d="M46 28 L52 27" opacity="0.7" />
        </g>
      )}
      {sprite === "mite" && (
        <g>
          <ellipse {...common} cx="32" cy="38" rx="18" ry="13" />
          <path {...common} d="M20 30 Q16 20 26 18 Q24 26 28 28 Z M44 30 Q48 20 38 18 Q40 26 36 28 Z" />
          <path fill="none" stroke={edge} strokeWidth={1.6} d="M18 46 L10 52 M26 50 L22 58 M38 50 L42 58 M46 46 L54 52" />
          <circle cx="27" cy="36" r="1.6" fill={eye} />
          <circle cx="37" cy="36" r="1.6" fill={eye} />
          <path fill="none" stroke={m.ink} strokeWidth={1} d="M22 42 Q32 46 42 42" opacity="0.7" />
        </g>
      )}
      {sprite === "imp" && (
        <g>
          <path {...common} d="M22 50 Q18 34 32 30 Q46 34 42 50 Q38 54 32 54 Q26 54 22 50 Z" />
          <path {...common} d="M26 32 Q22 24 30 22 Q40 20 38 30 Z" />
          <path {...common} d="M27 22 L23 14 L30 19 Z M37 21 L41 13 L34 18 Z" />
          <path fill="none" stroke={edge} strokeWidth={1.4} d="M42 44 Q52 44 50 36 L53 39" />
          <circle cx="29" cy="27" r="1.7" fill={eye} />
          <circle cx="35" cy="27" r="1.7" fill={eye} />
          <path fill="none" stroke={eye} strokeWidth={1} d="M28 32 Q32 35 36 32" opacity="0.8" />
        </g>
      )}
      {sprite === "wisp" && (
        <g>
          <path {...common} strokeDasharray="3 2" d="M32 10 Q46 16 44 32 Q42 44 32 54 Q22 44 20 32 Q18 16 32 10 Z" opacity="0.85" />
          <circle cx="28" cy="28" r="2" fill={eye} />
          <circle cx="37" cy="28" r="2" fill={eye} />
          <path fill="none" stroke={m.ink} strokeWidth={1} d="M24 40 Q32 44 40 40" opacity="0.6" />
          <path fill="none" stroke={edge} strokeWidth={1} d="M14 24 Q10 30 14 36 M50 24 Q54 30 50 36" opacity="0.5" />
        </g>
      )}
      {sprite === "acolyte" && (
        <g>
          <path {...common} d="M20 54 Q18 30 32 24 Q46 30 44 54 Z" />
          <path {...common} d="M24 28 Q22 14 32 12 Q42 14 40 28 Q36 24 32 24 Q28 24 24 28 Z" />
          <circle cx="29" cy="20" r="1.6" fill={eye} />
          <circle cx="35" cy="20" r="1.6" fill={eye} />
          <path fill="none" stroke={m.ink} strokeWidth={1.2} d="M32 34 L32 48 M26 38 L38 38" opacity="0.8" />
        </g>
      )}
      {sprite === "golem" && (
        <g>
          <path {...common} d="M14 54 L16 34 Q16 26 24 26 L28 26 L28 18 Q28 12 36 12 Q44 12 44 18 L44 26 Q52 28 52 36 L50 54 Z" />
          <path fill="none" stroke={edge} strokeWidth={1.4} d="M22 40 L30 38 M34 44 L44 42 M24 48 L32 48" opacity="0.8" />
          <circle cx="33" cy="18" r="2" fill={eye} />
          <circle cx="39" cy="18" r="2" fill={eye} />
          <path {...common} d="M10 34 L16 30 L16 40 Z M54 36 L48 32 L50 42 Z" />
        </g>
      )}
      {sprite === "overseer" && (
        <g>
          <path {...common} d="M20 54 Q16 34 32 28 Q48 34 44 54 Z" />
          <path {...common} d="M25 30 Q24 16 32 14 Q40 16 39 30 Z" />
          <path {...common} d="M22 18 L18 8 L26 14 Z M42 18 L46 8 L38 14 Z" />
          <circle cx="29" cy="22" r="1.7" fill={eye} />
          <circle cx="35" cy="22" r="1.7" fill={eye} />
          <path fill="none" stroke={edge} strokeWidth={1.6} d="M44 40 L54 34 M54 34 L52 30 M54 34 L58 36" />
          <path fill="none" stroke={m.ink} strokeWidth={1} d="M26 40 L38 40 M26 44 L36 44 M26 48 L34 48" opacity="0.6" />
        </g>
      )}
      {sprite === "foreman" && (
        <g>
          <path {...common} d="M12 56 L14 32 Q14 24 24 22 L28 22 L28 14 Q28 8 36 8 Q46 8 46 16 L46 22 Q56 24 56 34 L54 56 Z" />
          <path {...common} d="M24 22 Q20 18 24 14 L28 18 Z" />
          <circle cx="34" cy="15" r="2.2" fill={eye} />
          <circle cx="41" cy="15" r="2.2" fill={eye} />
          <path fill="none" stroke={eye} strokeWidth={1.4} d="M32 20 L44 20" opacity="0.7" />
          <path fill="none" stroke={edge} strokeWidth={1.8} d="M18 38 L30 36 M36 42 L50 40 M20 48 L34 47" opacity="0.85" />
          <path {...common} d="M8 40 L14 34 L15 44 Z M58 42 L50 36 L51 46 Z" />
          <path fill="none" stroke={m.specular} strokeWidth={1.2} d="M26 30 Q32 26 40 29" opacity="0.5" />
        </g>
      )}
      {/* Fallback blob for unknown ids */}
      {!["rat", "hound", "mite", "imp", "wisp", "acolyte", "golem", "overseer", "foreman"].includes(sprite) && (
        <g>
          <ellipse {...common} cx="32" cy="38" rx="16" ry="14" />
          <circle cx="27" cy="34" r="2" fill={eye} />
          <circle cx="37" cy="34" r="2" fill={eye} />
        </g>
      )}
    </svg>
  );
}

/** The delver — a small hooded figure whose trim color is the class identity. */
export function DelverSprite({ classId, size = 72 }: { classId: ClassId; size?: number }) {
  const trim = classId === "sentinel" ? "#e0b34d" : classId === "stalker" ? "#38d3b1" : "#a78bfa";
  const body = "#2a2620";
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
      <path d="M20 56 Q18 34 32 28 Q46 34 44 56 Z" fill={body} stroke={trim} strokeWidth={1.6} />
      <path d="M24 30 Q22 16 32 14 Q42 16 40 30 Q36 26 32 26 Q28 26 24 30 Z" fill={body} stroke={trim} strokeWidth={1.6} />
      <circle cx="29" cy="22" r="1.6" fill={trim} />
      <circle cx="35" cy="22" r="1.6" fill={trim} />
      {classId === "sentinel" && <path d="M18 40 L14 36 L14 48 L18 52 Z" fill={body} stroke={trim} strokeWidth={1.4} />}
      {classId === "stalker" && <path fill="none" stroke={trim} strokeWidth={1.6} d="M44 38 L54 30 M52 34 L54 30 L50 30" />}
      {classId === "arcanist" && <circle cx="48" cy="34" r="4" fill="none" stroke={trim} strokeWidth={1.4} strokeDasharray="2 2" />}
    </svg>
  );
}
