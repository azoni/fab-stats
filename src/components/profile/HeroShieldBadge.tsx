"use client";
import { Tooltip } from "@/components/ui/tooltip";

interface HeroShieldBadgeProps {
  /** Hero data completion percentage (0-100) */
  pct: number;
  /** Size variant */
  size?: "sm" | "md";
  /** Optional: show as "X/Y" in tooltip */
  withHero?: number;
  total?: number;
}

const TIERS = [
  { min: 100, color: "text-[#fbbf24]", label: "Gold" },
  { min: 90, color: "text-[#a78bfa]", label: "Purple" },
  { min: 75, color: "text-[#f87171]", label: "Red" },
  { min: 50, color: "text-[#60a5fa]", label: "Blue" },
  { min: 35, color: "text-[#cd7f32]", label: "Bronze" },
] as const;

function getTier(pct: number) {
  for (const tier of TIERS) {
    if (pct >= tier.min) return tier;
  }
  return null;
}

export function HeroShieldBadge({ pct, size = "sm", withHero, total }: HeroShieldBadgeProps) {
  const tier = getTier(pct);
  if (!tier) return null;

  const sizeClass = size === "md" ? "w-5 h-5" : "w-3.5 h-3.5";
  const detail = withHero !== undefined && total !== undefined ? ` (${withHero}/${total} matches)` : "";
  const tip = `Hero Data ${tier.label}: ${pct}% complete${detail}`;

  return (
    <Tooltip content={tip} delayDuration={100}>
      <span className="shrink-0 inline-flex">
        <svg className={`${sizeClass} ${tier.color}`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1.5 13.5l-3.5-3.5 1.41-1.41L10.5 11.67l5.09-5.09L17 8l-6.5 6.5z" />
        </svg>
      </span>
    </Tooltip>
  );
}
