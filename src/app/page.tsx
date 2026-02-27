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
        <div className={`rounded-lg p-5 ${
          bestRank === 1 ? "leaderboard-card-grandmaster" :
          bestRank === 2 ? "leaderboard-card-diamond" :
          bestRank === 3 ? "leaderboard-card-gold" :
          bestRank === 4 ? "leaderboard-card-silver" :
          bestRank === 5 ? "leaderboard-card-bronze" :
          "bg-fab-surface border border-fab-border"
        }`}>
          {/* Profile row */}
          <div className="flex items-center gap-4 mb-4">
            {profile ? (
              <Link href={`/player/${profile.username}`} className="relative shrink-0">
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
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-fab-bg/50 border border-fab-border text-fab-dim hover:text-fab-text hover:border-fab-muted transition-colors shrink-0"
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
          </div>

          {/* Stats body — two-column layout */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            {/* Hero stat: Win Rate + Streak */}
            <div className="flex flex-col items-center justify-center sm:border-r sm:border-fab-border/50 sm:pr-6 sm:min-w-[120px]">
              <p className={`text-4xl font-black tracking-tight ${overall.overallWinRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
                {overall.overallWinRate.toFixed(1)}%
              </p>
              <p className="text-[10px] text-fab-dim uppercase tracking-wider mt-0.5">Win Rate</p>
              {streaks.currentStreak && streaks.currentStreak.count > 0 && (
                <div className={`mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  streaks.currentStreak.type === MatchResult.Win ? "bg-fab-win/10 text-fab-win" : "bg-fab-loss/10 text-fab-loss"
                }`}>
                  {streaks.currentStreak.count}{streaks.currentStreak.type === MatchResult.Win ? "W" : "L"} streak
                </div>
              )}
            </div>

            {/* Record + Form */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-3 flex-wrap mb-2">
                <p className="text-lg font-bold">
                  <span className="text-fab-win">{overall.totalWins}W</span>
                  <span className="text-fab-dim"> - </span>
                  <span className="text-fab-loss">{overall.totalLosses}L</span>
                  {overall.totalDraws > 0 && <><span className="text-fab-dim"> - </span><span className="text-fab-draw">{overall.totalDraws}D</span></>}
                </p>
                <span className="text-xs text-fab-dim">{overall.totalMatches} matches</span>
              </div>

              {last20.length > 0 && (
                <div>
                  <p className="text-[9px] text-fab-dim uppercase tracking-wider mb-1.5">Last 20</p>
                  <div className="flex gap-1 flex-wrap">
                    {last20.map((m, i) => (
                      <div
                        key={i}
                        className={`w-2.5 h-2.5 rounded-full ${
                          m.result === MatchResult.Win ? "bg-fab-win" : m.result === MatchResult.Loss ? "bg-fab-loss" : m.result === MatchResult.Bye ? "bg-fab-muted" : "bg-fab-draw"
                        } ${i === last20.length - 1 ? "ring-2 ring-white/20 scale-110" : ""}`}
                        title={`${localDate(m.date).toLocaleDateString()} - ${m.result}`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Info pills row */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-fab-bg/50 text-xs">
              <span className="text-fab-dim">Events</span>
              <span className="font-semibold text-fab-text">{eventStats.length}</span>
            </span>
            {topHero && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-fab-bg/50 text-xs min-w-0">
                <span className="text-fab-dim shrink-0">Top Hero</span>
                <span className="font-semibold text-fab-text truncate">{topHero.heroName}</span>
              </span>
            )}
            {bestFinish && (
              <button
                onClick={() => setBestFinishShareOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-fab-gold/8 text-xs hover:bg-fab-gold/15 transition-colors min-w-0"
                title={`${bestFinish.label} — ${bestFinish.eventName}`}
              >
                <svg className="w-3 h-3 text-fab-gold shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 1c-1.828 0-3.623.149-5.371.435a.75.75 0 00-.629.74v.387c0 3.787 1.818 7.152 4.63 9.275A.5.5 0 019 12.24V16H7a.75.75 0 000 1.5h6a.75.75 0 000-1.5h-2v-3.76a.5.5 0 01.37-.483C14.182 9.764 16 6.4 16 2.612v-.387a.75.75 0 00-.629-.74A49.803 49.803 0 0010 1z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold text-fab-gold">{bestFinish.label}</span>
                <span className="text-fab-dim truncate hidden sm:inline">{bestFinish.eventName}</span>
              </button>
            )}
          </div>

          {/* View full profile */}
          {profile?.username && (
            <Link
              href={`/player/${profile.username}`}
              className="inline-flex items-center gap-1.5 text-sm text-fab-gold hover:text-fab-gold-light transition-colors font-medium"
            >
              View Full Profile
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
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
                <div className="section-header flex-1">
                  <h2 className="text-lg font-semibold text-fab-text">Your Events</h2>
                </div>
                {eventStats.length > EVENTS_PREVIEW && (
                  <Link
                    href="/events"
                    className="text-sm text-fab-gold hover:text-fab-gold-light transition-colors ml-3"
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
