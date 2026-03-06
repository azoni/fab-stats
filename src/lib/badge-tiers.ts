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

/** Tier visual config for rendering */
export interface TierVisual {
  ringColor: string;
  glowColor: string;
  glowOpacity: number;
  animate: boolean;
  cornerAccents: boolean;
}

export const TIER_VISUALS: Record<BadgeTier, TierVisual> = {
  base: { ringColor: "transparent", glowColor: "transparent", glowOpacity: 0, animate: false, cornerAccents: false },
  bronze: { ringColor: "#CD7F32", glowColor: "#CD7F32", glowOpacity: 0.15, animate: false, cornerAccents: false },
  silver: { ringColor: "#C0C0C0", glowColor: "#C0C0C0", glowOpacity: 0.2, animate: false, cornerAccents: false },
  gold: { ringColor: "#FFD700", glowColor: "#FFD700", glowOpacity: 0.3, animate: false, cornerAccents: false },
  diamond: { ringColor: "#B9F2FF", glowColor: "#B9F2FF", glowOpacity: 0.4, animate: true, cornerAccents: false },
  master: { ringColor: "#E040FB", glowColor: "#E040FB", glowOpacity: 0.45, animate: true, cornerAccents: false },
  champion: { ringColor: "#FF6D00", glowColor: "#FF6D00", glowOpacity: 0.5, animate: true, cornerAccents: true },
  special: { ringColor: "#ec4899", glowColor: "#ec4899", glowOpacity: 0.25, animate: false, cornerAccents: false },
};

/** Map achievement rarity to visual styling for badge strip */
export const RARITY_VISUALS: Record<string, TierVisual> = {
  common:    { ringColor: "#fde68a", glowColor: "#fde68a", glowOpacity: 0.1,  animate: false, cornerAccents: false },
  uncommon:  { ringColor: "#4ade80", glowColor: "#4ade80", glowOpacity: 0.2,  animate: false, cornerAccents: false },
  rare:      { ringColor: "#60a5fa", glowColor: "#60a5fa", glowOpacity: 0.3,  animate: false, cornerAccents: false },
  epic:      { ringColor: "#c084fc", glowColor: "#c084fc", glowOpacity: 0.4,  animate: true,  cornerAccents: false },
  legendary: { ringColor: "#C9A84C", glowColor: "#C9A84C", glowOpacity: 0.5,  animate: true,  cornerAccents: true  },
};
