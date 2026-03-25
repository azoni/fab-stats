import type { HeroStats, HeroMastery, MasteryTier } from "@/types";
import { getHeroByName } from "./heroes";

interface TierDef {
  tier: MasteryTier;
  minMatches: number;
  label: string;
}

const TIERS: TierDef[] = [
  { tier: "mythic", minMatches: 150, label: "Mythic" },
  { tier: "legend", minMatches: 100, label: "Legend" },
  { tier: "grandmaster", minMatches: 75, label: "Grandmaster" },
  { tier: "master", minMatches: 50, label: "Master" },
  { tier: "expert", minMatches: 30, label: "Expert" },
  { tier: "skilled", minMatches: 15, label: "Skilled" },
  { tier: "apprentice", minMatches: 5, label: "Apprentice" },
  { tier: "novice", minMatches: 1, label: "Novice" },
];

export function computeHeroMastery(heroStats: HeroStats[]): HeroMastery[] {
  const validHeroes = heroStats.filter((h) => getHeroByName(h.heroName));
  return validHeroes.map((h) => {
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
  apprentice: { label: "Apprentice", color: "text-[#4ade80]", bg: "bg-[#4ade80]/10", border: "border-[#4ade80]/30" },
  skilled: { label: "Skilled", color: "text-[#2dd4bf]", bg: "bg-[#2dd4bf]/10", border: "border-[#2dd4bf]/30" },
  expert: { label: "Expert", color: "text-[#cd7f32]", bg: "bg-[#cd7f32]/10", border: "border-[#cd7f32]/30" },
  master: { label: "Master", color: "text-[#60a5fa]", bg: "bg-[#60a5fa]/10", border: "border-[#60a5fa]/30" },
  grandmaster: { label: "Grandmaster", color: "text-[#f87171]", bg: "bg-[#f87171]/10", border: "border-[#f87171]/30" },
  legend: { label: "Legend", color: "text-[#a78bfa]", bg: "bg-[#a78bfa]/10", border: "border-[#a78bfa]/30" },
  mythic: { label: "Mythic", color: "text-[#fbbf24]", bg: "bg-[#fbbf24]/10", border: "border-[#fbbf24]/30" },
};
