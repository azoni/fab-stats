import type { Material } from "@/components/cosmetics/materials";

export type BadgeTier = "base" | "bronze" | "silver" | "gold" | "diamond" | "master" | "champion" | "special";

export interface BadgeTierInfo {
  tier: BadgeTier;
  level: number;
  label: string;
  threshold: number;
  nextThreshold: number | null;
}

interface TierDef {
  tier: BadgeTier;
  label: string;
  threshold: number;
}

const GAME_TIERS: TierDef[] = [
  { tier: "base", label: "Base", threshold: 1 },
  { tier: "bronze", label: "Bronze", threshold: 25 },
  { tier: "silver", label: "Silver", threshold: 50 },
  { tier: "gold", label: "Gold", threshold: 100 },
  { tier: "diamond", label: "Diamond", threshold: 250 },
  { tier: "master", label: "Master", threshold: 500 },
  { tier: "champion", label: "Champion", threshold: 1000 },
];

const MATCH_TIERS: TierDef[] = [
  { tier: "base", label: "Base", threshold: 1 },
  { tier: "bronze", label: "Bronze", threshold: 25 },
  { tier: "silver", label: "Silver", threshold: 100 },
  { tier: "gold", label: "Gold", threshold: 250 },
  { tier: "diamond", label: "Diamond", threshold: 500 },
  { tier: "master", label: "Master", threshold: 1000 },
  { tier: "champion", label: "Champion", threshold: 5000 },
];

const SPECIAL_BADGES = new Set(["content-creator", "feedback-contributor"]);
const MATCH_BADGE = "first-match";

function getTiersForBadge(badgeId: string): TierDef[] {
  if (badgeId === MATCH_BADGE) return MATCH_TIERS;
  return GAME_TIERS;
}

export function getBadgeTier(badgeId: string, count: number): BadgeTierInfo {
  if (SPECIAL_BADGES.has(badgeId)) {
    return { tier: "special", level: 1, label: "Special", threshold: 1, nextThreshold: null };
  }

  const tiers = getTiersForBadge(badgeId);
  let matched = tiers[0];
  for (const t of tiers) {
    if (count >= t.threshold) matched = t;
    else break;
  }

  const idx = tiers.indexOf(matched);
  const nextThreshold = idx < tiers.length - 1 ? tiers[idx + 1].threshold : null;

  return {
    tier: matched.tier,
    level: idx + 1,
    label: matched.label,
    threshold: matched.threshold,
    nextThreshold,
  };
}

/** Check if going from oldCount to newCount crosses a tier boundary */
export function detectTierUp(badgeId: string, oldCount: number, newCount: number): BadgeTierInfo | null {
  if (SPECIAL_BADGES.has(badgeId)) return null;

  const oldTier = oldCount >= 1 ? getBadgeTier(badgeId, oldCount) : null;
  const newTier = getBadgeTier(badgeId, newCount);

  if (newCount < 1) return null;
  // First time earning the badge
  if (!oldTier || oldCount < 1) return newTier;
  // Tier level increased
  if (newTier.level > oldTier.level) return newTier;

  return null;
}

/** Tier visual config for rendering.
 *  `ringColor`/`glowColor` are kept as the badge's accent color (read by the
 *  tier-up popup, badge strips, recap, etc.) but now point at the heraldic
 *  material palette. `material` drives the engraved metal ring in
 *  BadgeTierWrapper. `glowOpacity`/`animate` are retained for back-compat but
 *  the wrapper no longer emits glow or pulse — engraved metal, not light. */
export interface TierVisual {
  ringColor: string;
  glowColor: string;
  glowOpacity: number;
  animate: boolean;
  cornerAccents: boolean;
  material?: Material;
}

export const TIER_VISUALS: Record<BadgeTier, TierVisual> = {
  base: { ringColor: "transparent", glowColor: "transparent", glowOpacity: 0, animate: false, cornerAccents: false },
  bronze: { ringColor: "#a9712f", glowColor: "#a9712f", glowOpacity: 0, animate: false, cornerAccents: false, material: "bronze" },
  silver: { ringColor: "#9aa3b1", glowColor: "#9aa3b1", glowOpacity: 0, animate: false, cornerAccents: false, material: "silver" },
  gold: { ringColor: "#c2902f", glowColor: "#c2902f", glowOpacity: 0, animate: false, cornerAccents: false, material: "gold" },
  diamond: { ringColor: "#7da3bf", glowColor: "#7da3bf", glowOpacity: 0, animate: false, cornerAccents: false, material: "silver" },
  master: { ringColor: "#7b5fc8", glowColor: "#7b5fc8", glowOpacity: 0, animate: false, cornerAccents: false, material: "mythic" },
  champion: { ringColor: "#e0b34e", glowColor: "#e0b34e", glowOpacity: 0, animate: false, cornerAccents: true, material: "gold" },
  special: { ringColor: "#9a7fd8", glowColor: "#9a7fd8", glowOpacity: 0, animate: false, cornerAccents: false, material: "mythic" },
};

/** Map achievement rarity to visual styling for badge strip */
export const RARITY_VISUALS: Record<string, TierVisual> = {
  common:    { ringColor: "#a9712f", glowColor: "#a9712f", glowOpacity: 0, animate: false, cornerAccents: false, material: "bronze" },
  uncommon:  { ringColor: "#9aa3b1", glowColor: "#9aa3b1", glowOpacity: 0, animate: false, cornerAccents: false, material: "silver" },
  rare:      { ringColor: "#c2902f", glowColor: "#c2902f", glowOpacity: 0, animate: false, cornerAccents: false, material: "gold" },
  epic:      { ringColor: "#7b5fc8", glowColor: "#7b5fc8", glowOpacity: 0, animate: false, cornerAccents: false, material: "mythic" },
  legendary: { ringColor: "#e0b34e", glowColor: "#e0b34e", glowOpacity: 0, animate: false, cornerAccents: true,  material: "gold" },
};
