"use client";
import { useState } from "react";
import { useMatches } from "@/hooks/useMatches";
import { computeHeroStats } from "@/lib/stats";
import { ChevronUpIcon, ChevronDownIcon } from "@/components/icons/NavIcons";

export default function HeroesPage() {
  const { matches, isLoaded } = useMatches();
  const [sortBy, setSortBy] = useState<"matches" | "winRate" | "name">("matches");
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!isLoaded) {
    return <div className="h-8 w-48 bg-fab-surface rounded animate-pulse" />;
  }

  const heroStats = computeHeroStats(matches).filter((h) => h.heroName !== "Unknown");
  const sorted = [...heroStats].sort((a, b) => {
    if (sortBy === "winRate") return b.winRate - a.winRate;
    if (sortBy === "name") return a.heroName.localeCompare(b.heroName);
    return b.totalMatches - a.totalMatches;
  });

  if (sorted.length === 0) {
    return (
      <div className="text-center py-16 text-fab-dim">
        <p className="text-lg mb-1">No hero data yet</p>
        <p className="text-sm">GEM imports don&apos;t include hero data. Log matches manually with hero selections to track hero stats.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-fab-gold mb-6">Hero Win Rates</h1>

      <div className="flex gap-2 mb-4">
        {(["matches", "winRate", "name"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSortBy(s)}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
              sortBy === s
                ? "bg-fab-gold/15 text-fab-gold"
                : "text-fab-muted hover:text-fab-text"
            }`}
          >
            {s === "matches" ? "Most Played" : s === "winRate" ? "Win Rate" : "Name"}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {sorted.map((hero) => {
          const realMatchups = hero.matchups.filter((mu) => mu.opponentHero !== "Unknown");
          return (
            <div key={hero.heroName} className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === hero.heroName ? null : hero.heroName)}
                className="w-full p-4 text-left hover:bg-fab-surface-hover transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-fab-text">{hero.heroName}</span>
                    <span className="ml-3 text-sm text-fab-dim">
                      {hero.totalMatches} matches
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-fab-muted">
                      {hero.wins}W - {hero.losses}L{hero.draws > 0 ? ` - ${hero.draws}D` : ""}
                    </span>
                    <div className="flex items-center gap-2 w-32">
                      <div className="flex-1 h-2 bg-fab-bg rounded-full overflow-hidden">
                        <div
                          className="h-full bg-fab-win rounded-full"
                          style={{ width: `${hero.winRate}%` }}
                        />
                      </div>
                      <span className={`text-sm font-bold w-12 text-right ${hero.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
                        {hero.winRate.toFixed(0)}%
                      </span>
                    </div>
                    {expanded === hero.heroName ? <ChevronUpIcon className="w-4 h-4 text-fab-dim" /> : <ChevronDownIcon className="w-4 h-4 text-fab-dim" />}
                  </div>
                </div>
              </button>

              {expanded === hero.heroName && realMatchups.length > 0 && (
                <div className="border-t border-fab-border px-4 pb-4">
                  <p className="text-xs text-fab-muted py-3">Matchups</p>
                  <div className="space-y-1">
                    {realMatchups.map((mu) => (
                      <div key={mu.opponentHero} className="flex items-center justify-between text-sm py-1">
                        <span className="text-fab-text">vs {mu.opponentHero}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-fab-dim">
                            {mu.wins}W - {mu.losses}L ({mu.totalMatches})
                          </span>
                          <span className={`font-semibold w-12 text-right ${mu.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
                            {mu.winRate.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
