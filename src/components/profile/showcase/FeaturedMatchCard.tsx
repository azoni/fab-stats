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
    <div className="spotlight-card spotlight-streak bg-fab-surface border border-fab-border rounded-lg px-3 py-2 relative overflow-hidden h-full">
      <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${isWin ? "bg-fab-win" : isDraw ? "bg-fab-draw" : "bg-fab-loss"}`} />
      <div className="ml-1">
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-bold ${isWin ? "text-fab-win" : isDraw ? "text-fab-draw" : "text-fab-loss"}`}>
            {match.result === MatchResult.Win ? "W" : match.result === MatchResult.Loss ? "L" : "D"}
          </span>
          <HeroClassIcon heroClass={heroInfo?.classes[0]} size="sm" />
          <span className="text-[10px] text-fab-dim">vs</span>
          <HeroClassIcon heroClass={oppInfo?.classes[0]} size="sm" />
        </div>
        <p className="text-xs font-semibold text-fab-text truncate mt-0.5">{match.opponentName || match.opponentHero}</p>
        <p className="text-[9px] text-fab-dim truncate mt-0.5">
          {eventName && <>{eventName} · </>}
          {localDate(match.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </p>
      </div>
    </div>
  );
}
