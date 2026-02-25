import type { HeroStats, HeroMastery, MasteryTier } from "@/types";

interface TierDef {
  tier: MasteryTier;
  minMatches: number;
  label: string;
}

const TIERS: TierDef[] = [
  { tier: "master", minMatches: 50, label: "Master" },
  { tier: "expert", minMatches: 30, label: "Expert" },
  { tier: "skilled", minMatches: 15, label: "Skilled" },
  { tier: "apprentice", minMatches: 5, label: "Apprentice" },
  { tier: "novice", minMatches: 1, label: "Novice" },
];

export function computeHeroMastery(heroStats: HeroStats[]): HeroMastery[] {
  return heroStats.map((h) => {
    const tierIndex = TIERS.findIndex((t) => h.totalMatches >= t.minMatches);
    const currentTierDef = tierIndex >= 0 ? TIERS[tierIndex] : TIERS[TIERS.length - 1];
    const nextTierDef = tierIndex > 0 ? TIERS[tierIndex - 1] : null;

    let progress = 100;
    if (nextTierDef) {
      const currentMin = currentTierDef.minMatches;
      const nextMin = nextTierDef.minMatches;
      progress = Math.min(100, Math.round(((h.totalMatches - currentMin) / (nextMin - currentMin)) * 100));
    }

    return {
      heroName: h.heroName,
      tier: currentTierDef.tier,
      matches: h.totalMatches,
      wins: h.wins,
      winRate: h.winRate,
      nextTier: nextTierDef?.tier ?? null,
      progress,
    };
  });
}

export const tierConfig: Record<MasteryTier, { label: string; color: string; bg: string; border: string }> = {
  novice: { label: "Novice", color: "text-zinc-400", bg: "bg-zinc-400/10", border: "border-zinc-400/30" },
  apprentice: { label: "Apprentice", color: "text-green-400", bg: "bg-green-400/10", border: "border-green-400/30" },
  skilled: { label: "Skilled", color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/30" },
  expert: { label: "Expert", color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/30" },
  master: { label: "Master", color: "text-fab-gold", bg: "bg-fab-gold/10", border: "border-fab-gold/30" },
};
