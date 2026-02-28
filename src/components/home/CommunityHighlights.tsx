"use client";
import type { ReactNode } from "react";
import { FeaturedProfiles } from "./FeaturedProfiles";
import { FeaturedTournaments } from "./FeaturedTournaments";
import { MetaSnapshot } from "./MetaSnapshot";
import { LeaderboardPreview } from "./LeaderboardPreview";
import { PollCard } from "./PollCard";
import type { FeaturedProfile } from "@/lib/featured-profiles";
import type { HeroMetaStats } from "@/lib/meta-stats";
import type { FeaturedEvent, LeaderboardEntry } from "@/types";

interface CommunityHighlightsProps {
  featuredProfiles: FeaturedProfile[];
  featuredEvents: FeaturedEvent[];
  leaderboardEntries: LeaderboardEntry[];
  topHeroes: HeroMetaStats[];
  rankMap?: Map<string, 1 | 2 | 3 | 4 | 5>;
  /** Extra content rendered below MetaSnapshot in the right column */
  rightColumnExtra?: ReactNode;
}

export function CommunityHighlights({
  featuredProfiles,
  featuredEvents,
  leaderboardEntries,
  topHeroes,
  rankMap,
  rightColumnExtra,
}: CommunityHighlightsProps) {
  return (
    <div className="space-y-8">
      <FeaturedProfiles profiles={featuredProfiles} rankMap={rankMap} />
      <PollCard />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FeaturedTournaments
          events={featuredEvents}
          leaderboardEntries={leaderboardEntries}
        />

        <div className="flex flex-col gap-6">
          <MetaSnapshot topHeroes={topHeroes} />
          {rightColumnExtra || <LeaderboardPreview entries={leaderboardEntries} rankMap={rankMap} />}
        </div>
      </div>
    </div>
  );
}
