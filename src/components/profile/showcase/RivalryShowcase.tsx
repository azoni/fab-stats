"use client";
import { getHeroByName } from "@/lib/heroes";
import { HeroClassIcon } from "@/components/heroes/HeroClassIcon";
import type { OpponentStats } from "@/types";
import { MatchResult } from "@/types";

interface RivalryShowcaseProps {
  opponent: OpponentStats;
}

export function RivalryShowcase({ opponent }: RivalryShowcaseProps) {
  const last10 = opponent.matches.slice(-10);
  const isWinning = opponent.winRate >= 50;

  return (
    <div className="spotlight-card spotlight-nemesis bg-fab-surface border border-fab-border rounded-lg px-4 py-3 relative overflow-hidden">
      <div className="flex items-center gap-3">
        {/* Opponent info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-red-400 font-bold uppercase tracking-wider shrink-0">Rivalry</span>
            <span className="text-sm font-bold text-fab-text truncate">{opponent.opponentName}</span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className={`text-xs font-bold ${isWinning ? "text-fab-win" : "text-fab-loss"}`}>
              {opponent.winRate.toFixed(0)}%
            </span>
            <span className="text-[10px] text-fab-muted">
              {opponent.wins}W - {opponent.losses}L
              {opponent.draws > 0 && ` - ${opponent.draws}D`}
            </span>
            <span className="text-[10px] text-fab-dim">{opponent.totalMatches} matches</span>
          </div>

          {/* Last 10 results */}
          <div className="flex items-center gap-1 mt-1.5">
            <span className="text-[9px] text-fab-dim mr-1">Last {last10.length}</span>
            {last10.map((m, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  m.result === MatchResult.Win ? "bg-fab-win" : m.result === MatchResult.Loss ? "bg-fab-loss" : m.result === MatchResult.Draw ? "bg-fab-draw" : "bg-fab-dim"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Heroes used */}
        <div className="shrink-0 flex flex-col items-end gap-1">
          <div className="flex items-center gap-1">
            {opponent.heroesPlayed.slice(0, 3).map((h) => {
              const info = getHeroByName(h);
              return <HeroClassIcon key={h} heroClass={info?.classes[0]} size="sm" />;
            })}
          </div>
          {opponent.opponentHeroes.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-fab-dim">vs</span>
              {opponent.opponentHeroes.slice(0, 3).map((h) => {
                const info = getHeroByName(h);
                return <HeroClassIcon key={h} heroClass={info?.classes[0]} size="sm" />;
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
