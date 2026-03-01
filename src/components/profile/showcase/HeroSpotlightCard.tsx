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
    <div className="spotlight-card spotlight-warrior bg-fab-surface border border-fab-border rounded-lg px-4 py-3 relative overflow-hidden">
      <div className="flex items-center gap-3">
        {/* Large hero icon */}
        <div className="shrink-0">
          <HeroClassIcon heroClass={heroClass} size="lg" />
        </div>

        {/* Hero info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-fab-text truncate">{heroStats.heroName}</span>
            {tc && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${tc.bg} ${tc.color} ${tc.border} border`}>
                {tc.label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className={`text-xs font-semibold ${heroStats.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
              {heroStats.winRate.toFixed(1)}%
            </span>
            <span className="text-[10px] text-fab-muted">
              {heroStats.wins}W - {heroStats.losses}L
              {heroStats.draws > 0 && ` - ${heroStats.draws}D`}
            </span>
            <span className="text-[10px] text-fab-dim">{heroStats.totalMatches} matches</span>
          </div>

          {/* Mastery progress */}
          {mastery && mastery.nextTier && (
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex-1 h-1 bg-fab-bg rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${tc?.color?.replace("text-", "bg-") || "bg-fab-muted"}`}
                  style={{ width: `${mastery.progress}%` }}
                />
              </div>
              <span className="text-[9px] text-fab-dim">{tierConfig[mastery.nextTier].label}</span>
            </div>
          )}
        </div>
      </div>

      {/* Top matchups */}
      {heroStats.matchups.length > 0 && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-fab-border/50">
          <span className="text-[9px] text-fab-dim uppercase tracking-wider shrink-0">Matchups</span>
          <div className="flex items-center gap-2 overflow-hidden flex-1">
            {heroStats.matchups.slice(0, 4).map((mu) => {
              const muInfo = getHeroByName(mu.opponentHero);
              return (
                <div key={mu.opponentHero} className="flex items-center gap-1 shrink-0">
                  <HeroClassIcon heroClass={muInfo?.classes[0]} size="sm" />
                  <span className={`text-[10px] font-medium ${mu.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
                    {mu.winRate.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
