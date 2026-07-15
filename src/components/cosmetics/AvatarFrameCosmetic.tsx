/**
 * Avatar frame cosmetic — an engraved metal ring that lives ONLY in the r40–49
 * annulus of a circular avatar, so it never touches the face (legible on every
 * theme). Pure & prerenderable: no hooks, colors only from spec(material). Rarity
 * reads as material + ornament density (studs) + finish, never a bigger glow.
 */
import { spec, type Material } from "./materials";
import { HeraldicDefs, Crest } from "./Ornaments";
import type { Finish } from "@/lib/cosmetics/preview-dsl";

export function AvatarFrameCosmetic({
  idPrefix,
  pattern,
  material,
  tier,
  finish,
  size = 80,
}: {
  idPrefix: string;
  pattern: string;
  material: Material;
  tier: number;
  finish: Finish;
  size?: number;
}) {
  const s = spec(material);
  const studs = tier >= 4 ? 12 : tier >= 3 ? 8 : tier >= 2 ? 4 : 0;
  const inlaid = finish === "inlaid";
  const jewel = inlaid ? spec("mythic").specular : null; // legendary's single violet accent

  return (
    <div className="pointer-events-none absolute inset-0 z-20" style={{ lineHeight: 0 }}>
      <HeraldicDefs idPrefix={idPrefix} material={material} />
      <svg viewBox="0 0 100 100" width={size} height={size} fill="none" aria-hidden>
        {/* 3-stroke bevel bent into concentric circles (edge → gradient → specular) */}
        <circle cx="50" cy="50" r="48" stroke={s.edge} strokeWidth="3.2" />
        <circle cx="50" cy="50" r="48" stroke={`url(#${idPrefix}-mv)`} strokeWidth="2" />
        <circle cx="50" cy="50" r="45.4" stroke={s.specular} strokeWidth="0.7" opacity="0.5" />
        {pattern === "rope" && (
          <circle cx="50" cy="50" r="48" stroke={s.mid} strokeWidth="2" strokeDasharray="3 3" opacity="0.7" />
        )}
        {pattern === "laurel" && (
          <circle cx="50" cy="50" r="46.6" stroke={s.mid} strokeWidth="1" strokeDasharray="1.5 4.5" opacity="0.6" />
        )}
        {pattern === "runic" && (
          <circle cx="50" cy="50" r="46.6" stroke={s.mid} strokeWidth="1.4" strokeDasharray="0.5 7.5" opacity="0.7" />
        )}
        {pattern === "filigree" && (
          <circle cx="50" cy="50" r="46.8" stroke={s.mid} strokeWidth="0.9" strokeDasharray="6 3" opacity="0.5" />
        )}
        {Array.from({ length: studs }).map((_, i) => {
          const a = (i / studs) * Math.PI * 2 - Math.PI / 2;
          const x = 50 + Math.cos(a) * 48;
          const y = 50 + Math.sin(a) * 48;
          return (
            <path
              key={i}
              transform={`translate(${x - 4} ${y - 4})`}
              d="M4,0.5 L7.5,4 L4,7.5 L0.5,4 Z"
              fill={inlaid ? s.specular : s.mid}
              opacity={inlaid ? 0.95 : 0.85}
            />
          );
        })}
        {jewel && <circle cx="50" cy="2" r="2" fill={jewel} />}
      </svg>
      {tier >= 3 && (
        <div className="absolute left-1/2 -top-2 -translate-x-1/2" style={{ lineHeight: 0 }}>
          <Crest
            idPrefix={idPrefix}
            material={material}
            finish={finish}
            size={tier >= 4 ? 26 : 20}
            glyph={tier >= 4 ? "crown" : "star"}
          />
        </div>
      )}
    </div>
  );
}
