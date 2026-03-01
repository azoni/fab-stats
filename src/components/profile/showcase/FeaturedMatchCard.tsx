"use client";
import { getHeroByName } from "@/lib/heroes";
import { HeroClassIcon } from "@/components/heroes/HeroClassIcon";
import { localDate } from "@/lib/constants";
import type { MatchRecord } from "@/types";
import { MatchResult } from "@/types";

interface FeaturedMatchCardProps {
  match: MatchRecord;
}

export function FeaturedMatchCard({ match }: FeaturedMatchCardProps) {
  const heroInfo = getHeroByName(match.heroPlayed);
  const oppInfo = getHeroByName(match.opponentHero);
  const isWin = match.result === MatchResult.Win;
  const isDraw = match.result === MatchResult.Draw;
  const eventName = match.notes?.split(" | ")[0];

  return (
    <div className="spotlight-card spotlight-streak bg-fab-surface border border-fab-border rounded-lg px-4 py-3 relative overflow-hidden">
      {/* Result accent */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${isWin ? "bg-fab-win" : isDraw ? "bg-fab-draw" : "bg-fab-loss"}`} />

      <div className="flex items-center gap-3 ml-1">
        {/* Hero icons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <HeroClassIcon heroClass={heroInfo?.classes[0]} size="sm" />
          <span className="text-fab-dim text-[10px]">vs</span>
          <HeroClassIcon heroClass={oppInfo?.classes[0]} size="sm" />
        </div>

        {/* Match info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold ${isWin ? "text-fab-win" : isDraw ? "text-fab-draw" : "text-fab-loss"}`}>
              {match.result === MatchResult.Win ? "W" : match.result === MatchResult.Loss ? "L" : "D"}
            </span>
            <span className="text-sm font-semibold text-fab-text truncate">
              vs {match.opponentName || match.opponentHero}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {eventName && (
              <span className="text-[10px] text-fab-muted truncate">{eventName}</span>
            )}
            <span className="text-[10px] text-fab-dim">
              {localDate(match.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
        </div>

        {/* Format badge */}
        <span className="text-[9px] text-fab-dim bg-fab-bg px-1.5 py-0.5 rounded shrink-0">{match.format}</span>
      </div>
    </div>
  );
}
