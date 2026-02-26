"use client";
import Link from "next/link";
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
  profileUsername?: string;
}

export function CommunityHighlights({
  featuredProfiles,
  featuredEvents,
  leaderboardEntries,
  topHeroes,
  feedEvents,
  profileUsername,
}: CommunityHighlightsProps) {
  return (
    <div className="space-y-8">
      {/* Section divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-fab-border" />
        <span className="text-xs text-fab-muted uppercase tracking-wider font-medium">Community</span>
        <div className="flex-1 h-px bg-fab-border" />
      </div>

      {/* Quick link to own profile */}
      {profileUsername && (
        <Link
          href={`/player/${profileUsername}`}
          className="flex items-center gap-2 text-sm text-fab-muted hover:text-fab-gold transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
          View Your Public Profile
        </Link>
      )}

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
