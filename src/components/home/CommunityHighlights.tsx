"use client";
import { FeaturedProfiles } from "./FeaturedProfiles";
import { FeaturedTournaments } from "./FeaturedTournaments";
import { MetaSnapshot } from "./MetaSnapshot";
import { RecentActivity } from "./RecentActivity";
import type { FeaturedProfile } from "@/lib/featured-profiles";
import type { HeroMetaStats } from "@/lib/meta-stats";
import type { FeaturedEvent, FeedEvent, LeaderboardEntry } from "@/types";

interface CommunityHighlightsProps {
  featuredProfiles: FeaturedProfile[];
  featuredEvents: FeaturedEvent[];
  leaderboardEntries: LeaderboardEntry[];
  topHeroes: HeroMetaStats[];
  feedEvents: FeedEvent[];
}

export function CommunityHighlights({
  featuredProfiles,
  featuredEvents,
  leaderboardEntries,
  topHeroes,
  feedEvents,
}: CommunityHighlightsProps) {
  return (
    <div className="space-y-8">
      <FeaturedProfiles profiles={featuredProfiles} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FeaturedTournaments
          events={featuredEvents}
          leaderboardEntries={leaderboardEntries}
        />

        <MetaSnapshot topHeroes={topHeroes} />
      </div>

      <RecentActivity events={feedEvents} />
    </div>
  );
}
