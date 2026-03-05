"use client";
import type { BadgeTier } from "@/lib/badge-tiers";
import { TIER_VISUALS } from "@/lib/badge-tiers";

interface Props {
  tier: BadgeTier;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

const SIZE_MAP = {
  sm: { outer: "w-6 h-6", ring: 13, r: 11.5, sw: 1.2 },
  md: { outer: "w-7 h-7", ring: 15, r: 13, sw: 1.4 },
  lg: { outer: "w-14 h-14", ring: 30, r: 27, sw: 2 },
};

export function BadgeTierWrapper({ tier, children, size = "sm" }: Props) {
  const visual = TIER_VISUALS[tier];
  const s = SIZE_MAP[size];

  if (tier === "base") {
    return <div className={`relative ${s.outer} flex items-center justify-center`}>{children}</div>;
  }

  const animClass = visual.animate ? "badge-tier-animate" : "";

  return (
    <div className={`relative ${s.outer} flex items-center justify-center ${animClass}`}>
      {/* Glow layer */}
      {visual.glowOpacity > 0 && (
        <div
          className="absolute inset-0 rounded-full"
          style={{
            boxShadow: `0 0 ${visual.animate ? 8 : 4}px rgba(${hexToRgb(visual.glowColor)},${visual.glowOpacity})`,
          }}
        />
      )}
      {/* Ring */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox={`0 0 ${s.ring * 2} ${s.ring * 2}`}
        fill="none"
      >
        <circle
          cx={s.ring}
          cy={s.ring}
          r={s.r}
          stroke={visual.ringColor}
          strokeWidth={s.sw}
          fill="none"
          opacity={tier === "special" ? 0.6 : 0.8}
        />
      </svg>
      {/* Corner accents for champion tier */}
      {visual.cornerAccents && (
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox={`0 0 ${s.ring * 2} ${s.ring * 2}`}
          fill="none"
        >
          {/* 4 small diamond accents at corners */}
          <circle cx={s.ring} cy={1.5} r={1} fill={visual.ringColor} opacity={0.7} />
          <circle cx={s.ring} cy={s.ring * 2 - 1.5} r={1} fill={visual.ringColor} opacity={0.7} />
          <circle cx={1.5} cy={s.ring} r={1} fill={visual.ringColor} opacity={0.7} />
          <circle cx={s.ring * 2 - 1.5} cy={s.ring} r={1} fill={visual.ringColor} opacity={0.7} />
        </svg>
      )}
      {/* Badge icon */}
      <div className="relative z-10">{children}</div>

      {/* Inline keyframes for animated tiers */}
      {visual.animate && (
        <style jsx>{`
          .badge-tier-animate {
            animation: badge-pulse 3s ease-in-out infinite;
          }
          @keyframes badge-pulse {
            0%, 100% { filter: brightness(1); }
            50% { filter: brightness(1.15); }
          }
        `}</style>
      )}
    </div>
  );
}

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r},${g},${b}`;
}
