"use client";
import { useMemo, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMatches } from "@/hooks/useMatches";
import { useAuth } from "@/contexts/AuthContext";
import { computeOverallStats, computeHeroStats, computeEventStats, computeOpponentStats, computeBestFinish } from "@/lib/stats";
import { evaluateAchievements } from "@/lib/achievements";
import { AchievementBadges } from "@/components/gamification/AchievementShowcase";
import { updateLeaderboardEntry } from "@/lib/leaderboard";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { computeUserRanks, getBestRank } from "@/lib/leaderboard-ranks";
import { ShieldIcon } from "@/components/icons/NavIcons";
import { MatchResult } from "@/types";
import { CommunityHighlights } from "@/components/home/CommunityHighlights";
import { useFeaturedEvents } from "@/hooks/useFeaturedEvents";
import { useFeed } from "@/hooks/useFeed";
import { computeMetaStats } from "@/lib/meta-stats";
import { selectFeaturedProfiles } from "@/lib/featured-profiles";
import { BestFinishShareModal } from "@/components/profile/BestFinishCard";
import { EventCard } from "@/components/events/EventCard";
import { localDate } from "@/lib/constants";

const EVENTS_PREVIEW = 5;

export default function Dashboard() {
  const { matches, isLoaded } = useMatches();
  const { user, profile } = useAuth();
  const { entries: lbEntries } = useLeaderboard();
  const featuredEvents = useFeaturedEvents();
  const { events: feedEvents } = useFeed();
  const [shareCopied, setShareCopied] = useState(false);
  const [bestFinishShareOpen, setBestFinishShareOpen] = useState(false);

  const leaderboardUpdated = useRef(false);

  // Sync leaderboard entry when matches are loaded
  useEffect(() => {
    if (!isLoaded || !profile || matches.length === 0 || leaderboardUpdated.current) return;
    leaderboardUpdated.current = true;
    updateLeaderboardEntry(profile, matches).catch(() => {});
  }, [isLoaded, profile, matches]);

  // Stats for snapshot (unfiltered)
  const overall = useMemo(() => computeOverallStats(matches), [matches]);
  const heroStats = useMemo(() => computeHeroStats(matches), [matches]);
  const eventStats = useMemo(() => computeEventStats(matches), [matches]);
  const opponentStats = useMemo(() => computeOpponentStats(matches).filter((o) => o.totalMatches >= 3), [matches]);
  const achievements = useMemo(() => evaluateAchievements(matches, overall, heroStats, opponentStats), [matches, overall, heroStats, opponentStats]);
  const bestFinish = useMemo(() => computeBestFinish(eventStats), [eventStats]);
  const userRanks = useMemo(() => user ? computeUserRanks(lbEntries, user.uid) : [], [user, lbEntries]);
  const bestRank = useMemo(() => getBestRank(userRanks), [userRanks]);
  const topHero = useMemo(() => {
    const known = heroStats.filter((h) => h.heroName !== "Unknown");
    return known.length > 0 ? known[0] : null;
  }, [heroStats]);

  const sortedByDateDesc = useMemo(() =>
    [...matches].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [matches]
  );
  const last20 = useMemo(() => sortedByDateDesc.slice(0, 20).reverse(), [sortedByDateDesc]);

  // Community section data
  const communityMeta = useMemo(() => computeMetaStats(lbEntries), [lbEntries]);
  const communityTopHeroes = useMemo(() => communityMeta.heroStats.slice(0, 5), [communityMeta]);
  const featuredProfiles = useMemo(() => selectFeaturedProfiles(lbEntries), [lbEntries]);


  if (!isLoaded) {
    return <DashboardSkeleton />;
  }

  const hasMatches = matches.length > 0;
  const { streaks } = overall;

  return (
    <div className="space-y-8">
      {/* Welcome card — matches the logged-in profile card style */}
      {!hasMatches && (
        <div className="bg-fab-surface border border-fab-border rounded-lg p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-full bg-fab-gold/20 flex items-center justify-center shrink-0">
              <ShieldIcon className="w-7 h-7 text-fab-gold" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-fab-gold">FaB Stats</h1>
              <p className="text-xs text-fab-dim">Track your Flesh and Blood tournament history</p>
            </div>
          </div>

          <p className="text-sm text-fab-muted mb-4">
            Import your matches to see your win rate, streaks, opponent stats, and more — all in one place.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div>
              <p className="text-[10px] text-fab-dim uppercase tracking-wider">Win Rate</p>
              <p className="text-lg font-bold text-fab-dim">&mdash;</p>
            </div>
            <div>
              <p className="text-[10px] text-fab-dim uppercase tracking-wider">Record</p>
              <p className="text-lg font-bold text-fab-dim">&mdash;</p>
            </div>
            <div>
              <p className="text-[10px] text-fab-dim uppercase tracking-wider">Top Hero</p>
              <p className="text-lg font-bold text-fab-dim">&mdash;</p>
            </div>
            <div>
              <p className="text-[10px] text-fab-dim uppercase tracking-wider">Matches</p>
              <p className="text-lg font-bold text-fab-dim">0</p>
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            {user ? (
              <Link
                href="/import"
                className="px-5 py-2 rounded-md text-sm font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors"
              >
                Import Your Matches
              </Link>
            ) : (
              <Link
                href="/login"
                className="px-5 py-2 rounded-md text-sm font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors"
              >
                Sign Up to Get Started
              </Link>
            )}
            <Link
              href="/leaderboard"
              className="px-5 py-2 rounded-md text-sm font-semibold bg-fab-bg border border-fab-border text-fab-text hover:bg-fab-surface-hover transition-colors"
            >
              Browse Leaderboard
            </Link>
          </div>
        </div>
      )}

      {/* Player snapshot for logged-in users with matches */}
      {hasMatches && (
        <div className="bg-fab-surface border border-fab-border rounded-lg p-5">
          {/* Profile row */}
          <div className="flex items-center gap-4 mb-4">
            {profile ? (
              <Link href={`/player/${profile.username}`} className="relative shrink-0">
                {profile.username === "azoni" && (
                  <svg className="absolute -top-4 left-1/2 -translate-x-1/2 w-6 h-6 text-fab-gold drop-shadow-[0_0_6px_rgba(201,168,76,0.6)] z-10" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2.5 19h19v3h-19zM22.5 7l-5 4-5.5-7-5.5 7-5-4 2 12h17z" />
                  </svg>
                )}
                {profile.photoUrl ? (
                  <img src={profile.photoUrl} alt="" className={`w-14 h-14 rounded-full ${bestRank === 1 ? "rank-border-grandmaster" : bestRank === 2 ? "rank-border-diamond" : bestRank === 3 ? "rank-border-gold" : bestRank === 4 ? "rank-border-silver" : bestRank === 5 ? "rank-border-bronze" : ""}`} />
                ) : (
                  <div className={`w-14 h-14 rounded-full bg-fab-gold/20 flex items-center justify-center text-fab-gold text-xl font-bold ${bestRank === 1 ? "rank-border-grandmaster" : bestRank === 2 ? "rank-border-diamond" : bestRank === 3 ? "rank-border-gold" : bestRank === 4 ? "rank-border-silver" : bestRank === 5 ? "rank-border-bronze" : ""}`}>
                    {profile.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </Link>
            ) : null}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-fab-gold truncate">
                  {profile?.displayName || "My Profile"}
                </h1>
                {profile?.username && (
                  <button
                    onClick={async () => {
                      const url = `${window.location.origin}/player/${profile.username}`;
                      try {
                        await navigator.clipboard.writeText(url);
                        setShareCopied(true);
                        setTimeout(() => setShareCopied(false), 2000);
                      } catch {}
                    }}
                    className="text-fab-dim hover:text-fab-gold transition-colors shrink-0"
                    title="Copy profile link"
                  >
                    {shareCopied ? (
                      <svg className="w-3.5 h-3.5 text-fab-win" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0-3l-3-3m0 0l-3 3m3-3v11.25" />
                      </svg>
                    )}
                  </button>
                )}
                {profile?.username && (
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/player/${profile.username}`;
                      const text = `Check out my Flesh and Blood stats on FaB Stats (Beta)!\n\n${url}`;
                      window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-fab-bg border border-fab-border text-fab-dim hover:text-fab-text hover:border-fab-muted transition-colors shrink-0"
                    title="Share on X"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    <span className="text-xs font-semibold">Post</span>
                  </button>
                )}
              </div>
              {profile?.username && (
                <p className="text-xs text-fab-dim">@{profile.username}</p>
              )}
              {achievements.length > 0 && <AchievementBadges earned={achievements} max={4} />}
            </div>
            {/* Streak mini */}
            <div className="shrink-0 text-right">
              <div className="flex items-baseline gap-1 justify-end">
                <span className={`text-2xl font-black ${
                  streaks.currentStreak?.type === MatchResult.Win
                    ? "text-fab-win"
                    : streaks.currentStreak?.type === MatchResult.Loss
                      ? "text-fab-loss"
                      : "text-fab-dim"
                }`}>
                  {streaks.currentStreak ? streaks.currentStreak.count : 0}
                </span>
                <span className={`text-sm font-bold ${
                  streaks.currentStreak?.type === MatchResult.Win
                    ? "text-fab-win"
                    : streaks.currentStreak?.type === MatchResult.Loss
                      ? "text-fab-loss"
                      : "text-fab-dim"
                }`}>
                  {streaks.currentStreak
                    ? streaks.currentStreak.type === MatchResult.Win ? "W" : "L"
                    : "—"}
                </span>
              </div>
              <p className="text-[10px] text-fab-dim">streak</p>
            </div>
          </div>

          {/* Last 20 match dots */}
          {last20.length > 0 && (
            <div className="flex gap-0.5 flex-wrap mb-4">
              {last20.map((m, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${
                    m.result === MatchResult.Win ? "bg-fab-win" : m.result === MatchResult.Loss ? "bg-fab-loss" : m.result === MatchResult.Bye ? "bg-fab-muted" : "bg-fab-draw"
                  }`}
                  title={`${localDate(m.date).toLocaleDateString()} - ${m.result}`}
                />
              ))}
            </div>
          )}

          {/* Quick stats row */}
          <div className={`grid grid-cols-3 ${bestFinish ? "sm:grid-cols-6" : "sm:grid-cols-5"} gap-3 mb-4`}>
            <div>
              <p className="text-[10px] text-fab-dim uppercase tracking-wider">Win Rate</p>
              <p className={`text-lg font-bold ${overall.overallWinRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
                {overall.overallWinRate.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-[10px] text-fab-dim uppercase tracking-wider">Matches</p>
              <p className="text-lg font-bold text-fab-text">{overall.totalMatches}</p>
            </div>
            <div>
              <p className="text-[10px] text-fab-dim uppercase tracking-wider">Record</p>
              <p className="text-lg font-bold text-fab-text">
                {overall.totalWins}W-{overall.totalLosses}L{overall.totalDraws > 0 ? `-${overall.totalDraws}D` : ""}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-fab-dim uppercase tracking-wider">Events</p>
              <p className="text-lg font-bold text-fab-text">{eventStats.length}</p>
            </div>
            <div>
              <p className="text-[10px] text-fab-dim uppercase tracking-wider">Top Hero</p>
              <p className="text-lg font-bold text-fab-text truncate">{topHero?.heroName || "—"}</p>
            </div>
            {bestFinish && (
              <div className="relative">
                <p className="text-[10px] text-fab-dim uppercase tracking-wider">Best Finish</p>
                <p className="text-lg font-bold text-fab-gold truncate">{bestFinish.label}</p>
                <p className="text-[10px] text-fab-dim truncate">{bestFinish.eventName}</p>
                <button
                  onClick={() => setBestFinishShareOpen(true)}
                  className="absolute top-0 right-0 flex items-center gap-1 px-1.5 py-0.5 rounded-md text-fab-dim hover:text-fab-gold hover:bg-fab-gold/10 transition-colors"
                  title="Share best finish"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0-3l-3-3m0 0l-3 3m3-3v11.25" />
                  </svg>
                  <span className="text-[9px] font-semibold">Share</span>
                </button>
              </div>
            )}
          </div>

          {/* View full profile link */}
          {profile?.username && (
            <Link
              href={`/player/${profile.username}`}
              className="text-sm text-fab-gold hover:text-fab-gold-light transition-colors"
            >
              View Full Profile &rarr;
            </Link>
          )}
        </div>
      )}

      {/* Community content */}
      <CommunityHighlights
        featuredProfiles={featuredProfiles}
        featuredEvents={featuredEvents}
        leaderboardEntries={lbEntries}
        topHeroes={communityTopHeroes}
        feedEvents={feedEvents}
        rightColumnExtra={
          hasMatches && eventStats.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-fab-text">Your Events</h2>
                {eventStats.length > EVENTS_PREVIEW && (
                  <Link
                    href="/events"
                    className="text-sm text-fab-gold hover:text-fab-gold-light transition-colors"
                  >
                    View all {eventStats.length}
                  </Link>
                )}
              </div>
              <div className="space-y-2">
                {eventStats.slice(0, EVENTS_PREVIEW).map((event) => (
                  <EventCard key={`${event.eventName}-${event.eventDate}`} event={event} />
                ))}
              </div>
            </div>
          ) : undefined
        }
      />

      {/* Best Finish share modal */}
      {bestFinishShareOpen && bestFinish && profile && (
        <BestFinishShareModal
          playerName={profile.displayName}
          bestFinish={bestFinish}
          totalMatches={overall.totalMatches}
          winRate={overall.overallWinRate}
          topHero={topHero?.heroName}
          onClose={() => setBestFinishShareOpen(false)}
        />
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="bg-fab-surface border border-fab-border rounded-lg p-5 h-48 animate-pulse" />
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-fab-surface border border-fab-border rounded-lg p-4 h-20 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
