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
    <div className="spotlight-card spotlight-warrior bg-fab-surface border border-fab-border rounded-lg px-3 py-2 relative overflow-hidden">
      <div className="flex items-center gap-2.5">
        <HeroClassIcon heroClass={heroClass} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-fab-text truncate">{heroStats.heroName}</span>
            {tc && (
              <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${tc.bg} ${tc.color} ${tc.border} border leading-none`}>
                {tc.label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-xs font-semibold ${heroStats.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
              {heroStats.winRate.toFixed(1)}%
            </span>
            <span className="text-[10px] text-fab-muted">
              {heroStats.wins}W-{heroStats.losses}L{heroStats.draws > 0 && `-${heroStats.draws}D`}
            </span>
            <span className="text-[10px] text-fab-dim">{heroStats.totalMatches}m</span>
          </div>
        </div>
        {/* Top matchups inline */}
        {heroStats.matchups.length > 0 && (
          <div className="shrink-0 flex items-center gap-1.5">
            {heroStats.matchups.slice(0, 3).map((mu) => {
              const muInfo = getHeroByName(mu.opponentHero);
              return (
                <div key={mu.opponentHero} className="flex items-center gap-0.5">
                  <HeroClassIcon heroClass={muInfo?.classes[0]} size="sm" />
                  <span className={`text-[9px] font-medium ${mu.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
                    {mu.winRate.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
