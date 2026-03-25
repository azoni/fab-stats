"use client";
import { useMemo, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useMatches } from "@/hooks/useMatches";
import { useFeaturedEvents } from "@/hooks/useFeaturedEvents";
import { useCreators } from "@/hooks/useCreators";
import { computeRankMap, computeEventTierMap, computeUnderlineTierMap } from "@/lib/leaderboard-ranks";
import { selectFeaturedProfiles } from "@/lib/featured-profiles";
import { computeEventStats, computePlayoffFinishes } from "@/lib/stats";
import { getUnlockedColors } from "@/lib/comment-format";
import { getActivePrediction } from "@/lib/polls";
import { getEventShowcase } from "@/lib/event-showcase";
import { ActivityFeed } from "@/components/home/ActivityFeed";
import { CommunityHighlights } from "@/components/home/CommunityHighlights";
import { FeaturedProfiles } from "@/components/home/FeaturedProfiles";
import { EventShowcase } from "@/components/home/EventShowcase";
import type { Poll, EventShowcaseConfig } from "@/types";

export default function CommunityPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { matches } = useMatches();
  const { entries: lbEntries } = useLeaderboard(true);
  const featuredEvents = useFeaturedEvents();
  const creators = useCreators();

  const [activePrediction, setActivePrediction] = useState<Poll | null>(null);
  const [showcaseConfig, setShowcaseConfig] = useState<EventShowcaseConfig | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    getActivePrediction().then(setActivePrediction);
    getEventShowcase().then(setShowcaseConfig);
  }, []);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
  }, [searchQuery, router]);

  const rankMap = useMemo(() => computeRankMap(lbEntries), [lbEntries]);
  const eventTierMap = useMemo(() => computeEventTierMap(lbEntries), [lbEntries]);
  const underlineTierMap = useMemo(() => computeUnderlineTierMap(lbEntries), [lbEntries]);
  const heroCompletionMap = useMemo(() => new Map(lbEntries.map((e) => [e.userId, e.heroCompletionPct ?? 0])), [lbEntries]);
  const featuredProfiles = useMemo(() => selectFeaturedProfiles(lbEntries), [lbEntries]);

  const eventStats = useMemo(() => computeEventStats(matches), [matches]);
  const playoffFinishes = useMemo(() => computePlayoffFinishes(eventStats), [eventStats]);
  const unlockedColors = useMemo(() => {
    if (!user) return [];
    const myLb = lbEntries.find((e) => e.userId === user.uid);
    return getUnlockedColors(
      myLb?.totalMatches ?? matches.length,
      myLb?.totalTop8s ?? 0,
      playoffFinishes
    );
  }, [user, lbEntries, matches.length, playoffFinishes]);

  return (
    <div className="relative space-y-6">
      {/* Ambient page glow */}
      <div className="pointer-events-none absolute inset-x-0 -top-24 h-72 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(201,168,76,0.06),transparent)]" />

      <h1 className="text-2xl font-bold text-fab-gold">Community</h1>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex items-center gap-2">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fab-dim pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search players..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-fab-surface border border-fab-border text-sm text-fab-text placeholder:text-fab-dim focus:outline-none focus:border-fab-gold/40 transition-colors"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-fab-gold/15 text-fab-gold text-sm font-semibold hover:bg-fab-gold/25 border border-fab-gold/30 transition-colors shrink-0"
        >
          Search
        </button>
      </form>

      {/* Activity Feed + Featured Profiles — side by side on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-6">
        {/* Feed or sign-in CTA */}
        <div className="min-w-0">
          {user ? (
            <ActivityFeed rankMap={rankMap} eventTierMap={eventTierMap} underlineTierMap={underlineTierMap} heroCompletionMap={heroCompletionMap} />
          ) : (
            <div className="rounded-xl bg-fab-surface border border-fab-border p-6 text-center space-y-3">
              <p className="text-fab-text font-semibold">See what the community is up to</p>
              <p className="text-sm text-fab-muted">Sign in to view the activity feed, follow players, and join the conversation.</p>
              <a
                href="/login"
                className="inline-block px-5 py-2 rounded-lg bg-fab-gold text-fab-bg font-semibold text-sm hover:bg-fab-gold-light transition-colors"
              >
                Sign In
              </a>
            </div>
          )}
        </div>

        {/* Spotlight sidebar */}
        {(featuredProfiles.length > 0 || creators.length > 0) && (
          <div className="min-w-0">
            <FeaturedProfiles profiles={featuredProfiles} creators={creators} rankMap={rankMap} underlineTierMap={underlineTierMap} />
          </div>
        )}
      </div>

      {/* Event Showcase */}
      {showcaseConfig?.active && (
        <EventShowcase
          config={showcaseConfig}
          activePrediction={activePrediction}
          rankMap={rankMap}
          unlockedColors={unlockedColors}
        />
      )}

      {/* Community Highlights */}
      <CommunityHighlights
        featuredEvents={featuredEvents}
        leaderboardEntries={lbEntries}
        rankMap={rankMap}
      />
    </div>
  );
}
