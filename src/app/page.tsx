"use client";
import { useMemo, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMatches } from "@/hooks/useMatches";
import { useAuth } from "@/contexts/AuthContext";
import { computeOverallStats, computeHeroStats, computeEventStats, computeOpponentStats, computeBestFinish, computePlayoffFinishes, getRoundNumber } from "@/lib/stats";
import { updateLeaderboardEntry } from "@/lib/leaderboard";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { computeUserRanks, getBestRank, computeRankMap, computeEventTierMap } from "@/lib/leaderboard-ranks";
import { ShieldIcon, SwordsIcon, CalendarIcon, OpponentsIcon, TrendsIcon } from "@/components/icons/NavIcons";
import { CommunityHighlights } from "@/components/home/CommunityHighlights";
import { useFeaturedEvents } from "@/hooks/useFeaturedEvents";
import { computeMetaStats, computeTop8HeroMeta, detectActiveEventType } from "@/lib/meta-stats";
import { getWeekStart } from "@/lib/leaderboard";
import { ActivityFeed } from "@/components/home/ActivityFeed";
import { BestFinishShareModal } from "@/components/profile/BestFinishCard";
import { ProfileShareModal } from "@/components/profile/ProfileCard";
import { MetaSnapshot } from "@/components/home/MetaSnapshot";
import { OnThisDay } from "@/components/home/OnThisDay";
import { getUnlockedColors } from "@/lib/comment-format";
import { getActivePrediction } from "@/lib/polls";
import { getEventShowcase } from "@/lib/event-showcase";
import { EventShowcase } from "@/components/home/EventShowcase";
import type { Poll, EventShowcaseConfig } from "@/types";

export default function Dashboard() {
  const { matches, isLoaded } = useMatches();
  const { user, profile } = useAuth();
  const { entries: lbEntries } = useLeaderboard();
  const featuredEvents = useFeaturedEvents();
  const [shareCopied, setShareCopied] = useState(false);
  const [bestFinishShareOpen, setBestFinishShareOpen] = useState(false);
  const [profileShareOpen, setProfileShareOpen] = useState(false);
  const [activePrediction, setActivePrediction] = useState<Poll | null>(null);
  const [showcaseConfig, setShowcaseConfig] = useState<EventShowcaseConfig | null>(null);
  const leaderboardUpdated = useRef(false);

  // Fetch active prediction + event showcase config
  useEffect(() => {
    getActivePrediction().then(setActivePrediction);
    getEventShowcase().then(setShowcaseConfig);
  }, []);

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
  const allOpponentStats = useMemo(() => computeOpponentStats(matches), [matches]);
  const bestFinish = useMemo(() => computeBestFinish(eventStats), [eventStats]);
  const userRanks = useMemo(() => user ? computeUserRanks(lbEntries, user.uid) : [], [user, lbEntries]);
  const bestRank = useMemo(() => getBestRank(userRanks), [userRanks]);
  const topHero = useMemo(() => {
    const known = heroStats.filter((h) => h.heroName !== "Unknown");
    return known.length > 0 ? known[0] : null;
  }, [heroStats]);

  const sortedByDateDesc = useMemo(() =>
    [...matches].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      || getRoundNumber(b) - getRoundNumber(a)
      || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [matches]
  );
  const last30 = useMemo(() => sortedByDateDesc.slice(0, 30).reverse(), [sortedByDateDesc]);
  const playoffFinishes = useMemo(() => computePlayoffFinishes(eventStats), [eventStats]);
  const cardBorder = useMemo(() => {
    const tierRank: Record<string, number> = {
      "Battle Hardened": 1,
      "The Calling": 2,
      Nationals: 3,
      "Pro Tour": 4,
      Worlds: 5,
    };
    const tierStyle: Record<string, { border: string; shadow: string }> = {
      "Battle Hardened": { border: "#cd7f32", shadow: "0 0 8px rgba(205,127,50,0.25)" },
      "The Calling": { border: "#60a5fa", shadow: "0 0 8px rgba(96,165,250,0.3)" },
      Nationals: { border: "#f87171", shadow: "0 0 10px rgba(248,113,113,0.3)" },
      "Pro Tour": { border: "#a78bfa", shadow: "0 0 12px rgba(167,139,250,0.35)" },
      Worlds: { border: "#fbbf24", shadow: "0 0 12px rgba(251,191,36,0.4), 0 0 24px rgba(251,191,36,0.15)" },
    };
    let best: string | null = null;
    let bestScore = 0;
    for (const f of playoffFinishes) {
      const score = tierRank[f.eventType] || 0;
      if (score > bestScore) {
        best = f.eventType;
        bestScore = score;
      }
    }
    return best ? tierStyle[best] : null;
  }, [playoffFinishes]);

  // Community section data
  const activeEventType = useMemo(() => detectActiveEventType(lbEntries), [lbEntries]);
  const communityMeta = useMemo(() => {
    // During event weekends, show all-time stats; otherwise show weekly armory CC if data exists
    if (activeEventType) return computeMetaStats(lbEntries);
    const weekly = computeMetaStats(lbEntries, "Classic Constructed", "Armory", "weekly");
    return weekly.heroStats.length > 0 ? weekly : computeMetaStats(lbEntries);
  }, [lbEntries, activeEventType]);
  const communityTopHeroes = useMemo(() => communityMeta.heroStats.slice(0, 5), [communityMeta]);
  const top8Heroes = useMemo(() => {
    if (!activeEventType) return [];
    return computeTop8HeroMeta(lbEntries, activeEventType, undefined, getWeekStart());
  }, [lbEntries, activeEventType]);
  const rankMap = useMemo(() => computeRankMap(lbEntries), [lbEntries]);
  const eventTierMap = useMemo(() => computeEventTierMap(lbEntries), [lbEntries]);
  const unlockedColors = useMemo(() => {
    if (!user) return [];
    const myLb = lbEntries.find((e) => e.userId === user.uid);
    return getUnlockedColors(
      myLb?.totalMatches ?? matches.length,
      myLb?.totalTop8s ?? 0,
      playoffFinishes
    );
  }, [user, lbEntries, matches.length, playoffFinishes]);


  if (!isLoaded) {
    return <DashboardSkeleton />;
  }

  const hasMatches = matches.length > 0;
  const { streaks } = overall;

  return (
    <div className="space-y-8">
      {/* Full-width nav bar (logged-in users with matches) */}
      {hasMatches && (
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
          <Link href="/matches" className="nav-btn nav-btn-matches group inline-flex items-center gap-2 px-4 py-2.5 bg-fab-surface border border-fab-border rounded-xl shrink-0 hover:border-fab-muted transition-colors">
            <SwordsIcon className="nav-icon w-5 h-5 text-red-400/60 group-hover:text-red-400 shrink-0" />
            <span className="text-xs font-semibold text-fab-muted group-hover:text-fab-text transition-colors">Matches</span>
            {(overall.totalMatches + overall.totalByes) > 0 && (
              <span className="text-[10px] text-fab-dim font-medium">{overall.totalMatches + overall.totalByes}</span>
            )}
          </Link>
          <Link href="/events" className="nav-btn nav-btn-events group inline-flex items-center gap-2 px-4 py-2.5 bg-fab-surface border border-fab-border rounded-xl shrink-0 hover:border-fab-muted transition-colors">
            <CalendarIcon className="nav-icon w-5 h-5 text-blue-400/60 group-hover:text-blue-400 shrink-0" />
            <span className="text-xs font-semibold text-fab-muted group-hover:text-fab-text transition-colors">Events</span>
            {eventStats.length > 0 && (
              <span className="text-[10px] text-fab-dim font-medium">{eventStats.length}</span>
            )}
          </Link>
          <Link href="/opponents" className="nav-btn nav-btn-opponents group inline-flex items-center gap-2 px-4 py-2.5 bg-fab-surface border border-fab-border rounded-xl shrink-0 hover:border-fab-muted transition-colors">
            <OpponentsIcon className="nav-icon w-5 h-5 text-purple-400/60 group-hover:text-purple-400 shrink-0" />
            <span className="text-xs font-semibold text-fab-muted group-hover:text-fab-text transition-colors">Opponents</span>
            {allOpponentStats.length > 0 && (
              <span className="text-[10px] text-fab-dim font-medium">{allOpponentStats.length}</span>
            )}
          </Link>
          <Link href="/trends" className="nav-btn nav-btn-trends group inline-flex items-center gap-2 px-4 py-2.5 bg-fab-surface border border-fab-border rounded-xl shrink-0 hover:border-fab-muted transition-colors">
            <TrendsIcon className="nav-icon w-5 h-5 text-emerald-400/60 group-hover:text-emerald-400 shrink-0" />
            <span className="text-xs font-semibold text-fab-muted group-hover:text-fab-text transition-colors">Trends</span>
          </Link>
          <Link href="/compare" className="nav-btn nav-btn-versus group inline-flex items-center gap-2 px-4 py-2.5 bg-fab-surface border border-fab-border rounded-xl shrink-0 hover:border-fab-muted transition-colors">
            <svg className="nav-icon w-5 h-5 text-violet-400/60 group-hover:text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <span className="text-xs font-semibold text-fab-muted group-hover:text-fab-text transition-colors">Versus</span>
          </Link>
          <Link href="/events?import=1" className="nav-btn nav-btn-log group inline-flex items-center gap-2 px-4 py-2.5 bg-fab-surface border border-fab-border border-dashed rounded-xl shrink-0 hover:border-fab-muted transition-colors">
            <svg className="nav-icon w-5 h-5 text-fab-gold/60 group-hover:text-fab-gold shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-xs font-semibold text-fab-muted group-hover:text-fab-text transition-colors">Log</span>
          </Link>
        </div>
      )}

      {/* No matches: welcome card + meta */}
      {!hasMatches && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="flex flex-col gap-6">
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
            {user && <ActivityFeed rankMap={rankMap} eventTierMap={eventTierMap} />}
          </div>
          <MetaSnapshot topHeroes={communityTopHeroes} top8Heroes={top8Heroes} activeEventType={activeEventType} />
        </div>
      )}

      {/* Has matches: minimal profile + activity feed | meta snapshot */}
      {hasMatches && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="flex flex-col gap-6">
            {/* Minimal profile card */}
            <div
              className="bg-fab-surface border border-fab-border rounded-lg px-4 py-3"
              style={cardBorder ? { borderColor: cardBorder.border, boxShadow: cardBorder.shadow } : undefined}
            >
              <div className="flex items-center gap-3">
                {profile ? (
                  <Link href={`/player/${profile.username}`} className="relative shrink-0">
                    {profile.username === "azoni" && (
                      <svg className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-6 h-6 text-fab-gold drop-shadow-[0_0_6px_rgba(201,168,76,0.6)] z-10" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M2.5 19h19v3h-19zM22.5 7l-5 4-5.5-7-5.5 7-5-4 2 12h17z" />
                      </svg>
                    )}
                    {profile.photoUrl ? (
                      <img src={profile.photoUrl} alt="" className={`w-12 h-12 rounded-full ${bestRank === 1 ? "rank-border-grandmaster" : bestRank === 2 ? "rank-border-diamond" : bestRank === 3 ? "rank-border-gold" : bestRank === 4 ? "rank-border-silver" : bestRank === 5 ? "rank-border-bronze" : ""}`} />
                    ) : (
                      <div className={`w-12 h-12 rounded-full bg-fab-gold/20 flex items-center justify-center text-fab-gold text-lg font-bold ${bestRank === 1 ? "rank-border-grandmaster" : bestRank === 2 ? "rank-border-diamond" : bestRank === 3 ? "rank-border-gold" : bestRank === 4 ? "rank-border-silver" : bestRank === 5 ? "rank-border-bronze" : ""}`}>
                        {profile.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </Link>
                ) : null}
                <div className="flex-1 min-w-0">
                  <Link href={profile?.username ? `/player/${profile.username}` : "#"} className="hover:opacity-80 transition-opacity">
                    <h1 className="text-lg font-bold text-fab-gold truncate">
                      {profile?.displayName || "My Profile"}
                    </h1>
                  </Link>
                  {profile?.username && (
                    <p className="text-xs text-fab-dim">@{profile.username}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
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
                      className="p-1.5 rounded-md transition-colors hover:bg-fab-bg"
                      title="Copy profile link"
                    >
                      {shareCopied ? (
                        <svg className="w-3.5 h-3.5 text-fab-win" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5 text-fab-dim hover:text-fab-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-fab-bg border border-fab-border text-fab-dim hover:text-fab-text hover:border-fab-muted transition-colors"
                      title="Share on X"
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                      <span className="text-[10px] font-semibold">Post</span>
                    </button>
                  )}
                  {profile?.username && (
                    <button
                      onClick={() => setProfileShareOpen(true)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-fab-bg border border-fab-border text-fab-dim hover:text-fab-text hover:border-fab-muted transition-colors"
                      title="Share profile card"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                      </svg>
                      <span className="text-[10px] font-semibold">Card</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
            {/* Activity feed */}
            {user && <ActivityFeed rankMap={rankMap} eventTierMap={eventTierMap} />}
          </div>
          <MetaSnapshot topHeroes={communityTopHeroes} top8Heroes={top8Heroes} activeEventType={activeEventType} />
        </div>
      )}

      {/* On This Day */}
      {hasMatches && <OnThisDay matches={matches} />}

      {/* Event Showcase (admin-configurable) */}
      {showcaseConfig?.active && (
        <EventShowcase
          config={showcaseConfig}
          activePrediction={activePrediction}
          rankMap={rankMap}
          unlockedColors={unlockedColors}
        />
      )}

      {/* Community content */}
      <CommunityHighlights
        featuredEvents={featuredEvents}
        leaderboardEntries={lbEntries}
        rankMap={rankMap}
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

      {profileShareOpen && profile && (
        <ProfileShareModal
          data={{
            playerName: profile.displayName,
            username: profile.username,
            photoUrl: profile.photoUrl,
            wins: overall.totalWins,
            losses: overall.totalLosses,
            draws: overall.totalDraws,
            byes: overall.totalByes,
            winRate: overall.overallWinRate,
            events: eventStats.length,
            totalMatches: overall.totalMatches + overall.totalByes,
            topHero: topHero?.heroName || null,
            currentStreak: streaks.currentStreak,
            bestFinish: bestFinish?.label || null,
            bestFinishEvent: bestFinish?.eventName || null,
            recentResults: last30.map(m => m.result),
            cardBorder,
            bestRank,
            playoffFinishes,
            armoryCount: eventStats.filter(e => e.eventType === "Armory").length,
            armoryUndefeated: eventStats.filter(e => e.eventType === "Armory" && e.losses === 0 && e.wins > 0).length,
          }}
          onClose={() => setProfileShareOpen(false)}
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
