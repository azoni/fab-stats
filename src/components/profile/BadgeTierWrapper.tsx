"use client";
import { useId } from "react";
import type { BadgeTier, TierVisual } from "@/lib/badge-tiers";
import { TIER_VISUALS } from "@/lib/badge-tiers";
import { spec } from "@/components/cosmetics/materials";

interface Props {
  tier?: BadgeTier;
  visual?: TierVisual;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

const SIZE_MAP = {
  sm: { outer: "w-6 h-6", ring: 13, r: 11.5, sw: 1.2 },
  md: { outer: "w-7 h-7", ring: 15, r: 13, sw: 1.4 },
  lg: { outer: "w-14 h-14", ring: 30, r: 27, sw: 2 },
};

export function BadgeTierWrapper({ tier, visual: visualOverride, children, size = "sm" }: Props) {
  const visual = visualOverride || TIER_VISUALS[tier || "base"];
  const s = SIZE_MAP[size];
  const rawId = useId().replace(/:/g, "");

  // No material (base tier / untiered) → bare icon, no ring.
  if (!visual.material) {
    return <div className={`relative ${s.outer} flex items-center justify-center`}>{children}</div>;
  }

  const m = spec(visual.material);
  const gid = `bt-${rawId}`;
  const c = s.ring; // centre
  const lozenge = (cx: number, cy: number, h = 1.6) =>
    `M${cx},${cy - h} L${cx + h},${cy} L${cx},${cy + h} L${cx - h},${cy} Z`;

  return (
    <div className={`relative ${s.outer} flex items-center justify-center`}>
      {/* Engraved metal ring: dark containment edge + material-gradient rim +
          inner specular keyline. No glow, no animation — degrades cleanly. */}
      <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${s.ring * 2} ${s.ring * 2}`} fill="none">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={m.stops[0]} />
            <stop offset="30%" stopColor={m.stops[1]} />
            <stop offset="50%" stopColor={m.stops[2]} />
            <stop offset="70%" stopColor={m.stops[3]} />
            <stop offset="100%" stopColor={m.stops[4]} />
          </linearGradient>
        </defs>
        {/* dark containment edge just outside the rim */}
        <circle cx={c} cy={c} r={s.r + 0.5} stroke={m.edge} strokeWidth={s.sw * 0.6} fill="none" opacity={0.9} />
        {/* material-gradient rim */}
        <circle cx={c} cy={c} r={s.r} stroke={`url(#${gid})`} strokeWidth={s.sw} fill="none" />
        {/* inner specular keyline */}
        <circle cx={c} cy={c} r={s.r - 1} stroke={m.specular} strokeWidth={0.5} fill="none" opacity={0.4} />
        {/* drawn lozenge nodes at the cardinal points (top tiers) */}
        {visual.cornerAccents && (
          <g fill={m.specular} opacity={0.85}>
            <path d={lozenge(c, 1.6)} />
            <path d={lozenge(c, s.ring * 2 - 1.6)} />
            <path d={lozenge(1.6, c)} />
            <path d={lozenge(s.ring * 2 - 1.6, c)} />
          </g>
        )}
      </svg>
      {/* Badge icon */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
