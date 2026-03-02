"use client";
import { getHeroByName } from "@/lib/heroes";
import { HeroClassIcon } from "@/components/heroes/HeroClassIcon";
import { tierConfig } from "@/lib/mastery";
import type { HeroStats, HeroMastery } from "@/types";

interface HeroSpotlightCardProps {
  heroStats: HeroStats;
  mastery?: HeroMastery;
}

export function HeroSpotlightCard({ heroStats, mastery }: HeroSpotlightCardProps) {
  const heroInfo = getHeroByName(heroStats.heroName);
  const heroClass = heroInfo?.classes[0];
  const tc = mastery ? tierConfig[mastery.tier] : null;

  return (
    <div className="spotlight-card spotlight-warrior bg-fab-surface border border-fab-border rounded-lg px-3 py-2 relative overflow-hidden h-full min-h-[88px] flex flex-col justify-center">
      <img src="/assets/cards/bg-hero.png" alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.08] pointer-events-none" />
      <div className="relative">
      <p className="text-[10px] text-purple-400/70 uppercase tracking-wider font-medium mb-1">Hero</p>
      <div className="flex items-center gap-2">
        <HeroClassIcon heroClass={heroClass} size="sm" />
        <span className="text-sm font-bold text-fab-text truncate">{heroStats.heroName}</span>
        {tc && (
          <span className={`text-[10px] font-bold px-1 py-0.5 rounded ${tc.bg} ${tc.color} ${tc.border} border leading-none shrink-0`}>
            {tc.label}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 mt-1.5">
        <span className={`text-lg font-bold ${heroStats.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
          {heroStats.winRate.toFixed(1)}%
        </span>
        <span className="text-xs text-fab-muted">
          {heroStats.wins}W - {heroStats.losses}L{heroStats.draws > 0 ? ` - ${heroStats.draws}D` : ""}
        </span>
      </div>
      <p className="text-[11px] text-fab-dim mt-0.5">{heroStats.totalMatches} matches</p>
      </div>
    </div>
  );
}
