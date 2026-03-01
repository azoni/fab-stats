"use client";
import { memo, type ReactNode } from "react";
import { FeaturedTournaments } from "./FeaturedTournaments";
import { PollCard } from "./PollCard";
import type { FeaturedEvent, LeaderboardEntry } from "@/types";

interface CommunityHighlightsProps {
  featuredEvents: FeaturedEvent[];
  leaderboardEntries: LeaderboardEntry[];
  rankMap?: Map<string, 1 | 2 | 3 | 4 | 5>;
  /** Extra content rendered after tournaments */
  rightColumnExtra?: ReactNode;
}

export const CommunityHighlights = memo(function CommunityHighlights({
  featuredEvents,
  leaderboardEntries,
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
      {rightColumnExtra}
    </div>
  );
});
