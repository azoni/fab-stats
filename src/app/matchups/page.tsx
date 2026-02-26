"use client";
import { useMatches } from "@/hooks/useMatches";
import { computeHeroStats } from "@/lib/stats";
import { getHeroByName } from "@/lib/heroes";

export default function MatchupsPage() {
  const { matches, isLoaded } = useMatches();

  if (!isLoaded) {
    return <div className="h-8 w-48 bg-fab-surface rounded animate-pulse" />;
  }

  const heroStats = computeHeroStats(matches).filter((h) => getHeroByName(h.heroName));
  const allOpponents = [...new Set(matches.map((m) => m.opponentHero).filter((h) => h !== "Unknown"))].sort();

  if (heroStats.length === 0 || allOpponents.length === 0) {
    return (
      <div className="text-center py-16 text-fab-dim">
        <p className="text-lg mb-1">No matchup data yet</p>
        <p className="text-sm">GEM imports don&apos;t include hero data. Log matches manually with hero selections to see hero vs hero analysis.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-fab-gold mb-2">Matchup Analysis</h1>
      <p className="text-fab-muted text-sm mb-6">Win rates for your heroes against opponent heroes</p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left p-2 text-fab-muted font-medium border-b border-fab-border sticky left-0 bg-fab-bg">
                Your Hero ↓ / Opp →
              </th>
              {allOpponents.map((opp) => (
                <th
                  key={opp}
                  className="p-2 text-fab-muted font-medium border-b border-fab-border text-center min-w-[100px]"
                >
                  <span className="text-xs">{opp}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {heroStats.map((hero) => (
              <tr key={hero.heroName}>
                <td className="p-2 font-semibold text-fab-text border-b border-fab-border/50 sticky left-0 bg-fab-bg whitespace-nowrap">
                  {hero.heroName}
                  <span className="ml-2 text-xs text-fab-dim">({hero.totalMatches})</span>
                </td>
                {allOpponents.map((opp) => {
                  const mu = hero.matchups.find((m) => m.opponentHero === opp);
                  if (!mu) {
                    return (
                      <td key={opp} className="p-2 text-center border-b border-fab-border/50 text-fab-dim">
                        -
                      </td>
                    );
                  }
                  const bgColor =
                    mu.winRate >= 60
                      ? "bg-fab-win/20"
                      : mu.winRate >= 45
                        ? "bg-fab-draw/10"
                        : "bg-fab-loss/20";
                  const textColor =
                    mu.winRate >= 60
                      ? "text-fab-win"
                      : mu.winRate >= 45
                        ? "text-fab-draw"
                        : "text-fab-loss";

                  return (
                    <td
                      key={opp}
                      className={`p-2 text-center border-b border-fab-border/50 ${bgColor}`}
                    >
                      <div className={`font-bold ${textColor}`}>
                        {mu.winRate.toFixed(0)}%
                      </div>
                      <div className="text-xs text-fab-dim">
                        {mu.wins}-{mu.losses}
                        {mu.draws > 0 ? `-${mu.draws}` : ""}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
