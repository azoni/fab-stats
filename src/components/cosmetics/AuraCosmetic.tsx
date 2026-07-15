/**
 * Aura cosmetic — the ONE sanctioned "light" exception, kept on-kit by four hard
 * constraints rather than by banning color:
 *   1. hues derive ONLY from spec(material) stops — never a raw neon map, no mix-blend.
 *   2. rendered behind the opaque photo (-z-10); a radial mask keeps the center
 *      (0–42%) transparent so rays live in the 42–60% annulus and never touch the face.
 *   3. opacity hard-capped by intensity.
 *   4. motion is a single gated CSS rule on legendary only; default is fully static
 *      (screenshot/OG-identical).
 */
import { spec, type Material } from "./materials";
import type { Finish } from "@/lib/cosmetics/preview-dsl";

const CAP = [0.28, 0.36, 0.5];

export function AuraCosmetic({
  idPrefix,
  motif,
  material,
  intensity,
  finish,
}: {
  idPrefix: string;
  motif: string;
  material: Material;
  intensity: number;
  finish: Finish;
}) {
  const s = spec(material);
  const cap = CAP[intensity - 1] ?? 0.28;

  if (motif === "halo") {
    // Rendered in an oversized (150%) centered box so the ring band falls
    // OUTSIDE the opaque avatar photo (r≈40%) instead of hiding beneath it.
    return (
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 grid place-items-center">
        <div
          className="rounded-full"
          style={{
            width: "150%",
            height: "150%",
            background: `radial-gradient(circle at 50% 50%, transparent 58%, color-mix(in srgb, ${s.specular} ${Math.round(
              cap * 100,
            )}%, transparent) 72%, transparent 90%)`,
          }}
        />
      </div>
    );
  }

  if (motif === "motes") {
    // Static lozenge scatter in the annulus (no motion, no glow).
    const motes = Array.from({ length: 12 }).map((_, i) => {
      const a = (i / 12) * Math.PI * 2 + (i % 2 ? 0.26 : 0);
      const r = i % 2 ? 84 : 74;
      return { x: 100 + Math.cos(a) * r, y: 100 + Math.sin(a) * r, k: i };
    });
    return (
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 grid place-items-center">
        <svg viewBox="0 0 200 200" style={{ width: "150%", height: "150%" }} fill="none">
          <g opacity={cap}>
            {motes.map((m) => (
              <path
                key={m.k}
                transform={`translate(${m.x - 2} ${m.y - 2})`}
                d="M2,0 L4,2 L2,4 L0,2 Z"
                fill={finish === "inlaid" ? s.specular : s.mid}
              />
            ))}
          </g>
        </svg>
      </div>
    );
  }

  const rays = motif === "sunburst" ? 24 : 16;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 grid place-items-center">
      <svg
        viewBox="0 0 200 200"
        className={finish === "inlaid" ? "aura-spin" : ""}
        style={{ width: "150%", height: "150%" }}
        fill="none"
      >
        <defs>
          <radialGradient id={`${idPrefix}-af`}>
            <stop offset="42%" stopColor="#fff" stopOpacity="0" />
            <stop offset="60%" stopColor="#fff" stopOpacity="1" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <mask id={`${idPrefix}-am`}>
            <rect width="200" height="200" fill={`url(#${idPrefix}-af)`} />
          </mask>
        </defs>
        <g mask={`url(#${idPrefix}-am)`} opacity={cap}>
          {Array.from({ length: rays }).map((_, i) => {
            const len = motif === "sunburst" && i % 2 === 0 ? 96 : 78;
            return (
              <path
                key={i}
                transform={`rotate(${(i / rays) * 360} 100 100)`}
                d={`M100,100 L97,${100 - len} L103,${100 - len} Z`}
                fill={finish === "inlaid" ? s.specular : s.mid}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}
