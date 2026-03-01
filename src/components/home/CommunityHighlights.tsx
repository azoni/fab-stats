"use client";
import { memo, type ReactNode } from "react";
import { FeaturedTournaments } from "./FeaturedTournaments";
import { MetaSnapshot } from "./MetaSnapshot";
import { PollCard } from "./PollCard";
import type { HeroMetaStats, Top8HeroMeta } from "@/lib/meta-stats";
import type { FeaturedEvent, LeaderboardEntry } from "@/types";

interface CommunityHighlightsProps {
  featuredEvents: FeaturedEvent[];
  leaderboardEntries: LeaderboardEntry[];
  topHeroes: HeroMetaStats[];
  top8Heroes?: Top8HeroMeta[];
  activeEventType?: string | null;
  rankMap?: Map<string, 1 | 2 | 3 | 4 | 5>;
  /** Extra content rendered below MetaSnapshot in the right column */
  rightColumnExtra?: ReactNode;
}

export const CommunityHighlights = memo(function CommunityHighlights({
  featuredEvents,
  leaderboardEntries,
  topHeroes,
  top8Heroes,
  activeEventType,
  rankMap,
  rightColumnExtra,
}: CommunityHighlightsProps) {
  return (
    <div className="space-y-8">
      <PollCard />

      <FeaturedTournaments
        events={featuredEvents}
        leaderboardEntries={leaderboardEntries}
      />

      <MetaSnapshot topHeroes={topHeroes} top8Heroes={top8Heroes} activeEventType={activeEventType} />
      {rightColumnExtra}
    </div>
  );
});
