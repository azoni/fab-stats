"use client";
import { useMemo, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMatches } from "@/hooks/useMatches";
import { useAuth } from "@/contexts/AuthContext";
import { computeOverallStats, computeHeroStats, computeEventStats, computeOpponentStats, computeBestFinish, computePlayoffFinishes } from "@/lib/stats";
import { evaluateAchievements } from "@/lib/achievements";
import { AchievementBadges } from "@/components/gamification/AchievementShowcase";
import { updateLeaderboardEntry } from "@/lib/leaderboard";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { computeUserRanks, getBestRank, computeRankMap } from "@/lib/leaderboard-ranks";
import { ShieldIcon, SwordsIcon, CalendarIcon, OpponentsIcon, TrendsIcon } from "@/components/icons/NavIcons";
import { MatchResult } from "@/types";
import { CommunityHighlights } from "@/components/home/CommunityHighlights";
import { useFeaturedEvents } from "@/hooks/useFeaturedEvents";
import { computeMetaStats } from "@/lib/meta-stats";
import { ActivityFeed } from "@/components/home/ActivityFeed";
import { FeaturedProfiles } from "@/components/home/FeaturedProfiles";
import { selectFeaturedProfiles } from "@/lib/featured-profiles";
import { BestFinishShareModal } from "@/components/profile/BestFinishCard";
import { ProfileShareModal } from "@/components/profile/ProfileCard";
import { OnThisDay } from "@/components/home/OnThisDay";
import { localDate } from "@/lib/constants";

export default function Dashboard() {
  const { matches, isLoaded } = useMatches();
  const { user, profile } = useAuth();
  const { entries: lbEntries } = useLeaderboard();
  const featuredEvents = useFeaturedEvents();
  const [shareCopied, setShareCopied] = useState(false);
  const [bestFinishShareOpen, setBestFinishShareOpen] = useState(false);
  const [profileShareOpen, setProfileShareOpen] = useState(false);
  const [videoExpanded, setVideoExpanded] = useState(false);
  const router = useRouter();
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
  const communityMeta = useMemo(() => computeMetaStats(lbEntries), [lbEntries]);
  const communityTopHeroes = useMemo(() => communityMeta.heroStats.slice(0, 5), [communityMeta]);
  const featuredProfiles = useMemo(() => selectFeaturedProfiles(lbEntries), [lbEntries]);
  const rankMap = useMemo(() => computeRankMap(lbEntries), [lbEntries]);


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
              <p className="text-lg font-bold text-fab-dim">0W - 0L</p>
            </div>
            <div>
              <p className="text-[10px] text-fab-dim uppercase tracking-wider">Events</p>
              <p className="text-lg font-bold text-fab-dim">0</p>
            </div>
            <div>
              <p className="text-[10px] text-fab-dim uppercase tracking-wider">Top Hero</p>
              <p className="text-lg font-bold text-fab-dim">&mdash;</p>
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
        <div
          className="bg-fab-surface border border-fab-border rounded-lg p-5"
          style={cardBorder ? { borderColor: cardBorder.border, boxShadow: cardBorder.shadow } : undefined}
        >
          {/* Profile row */}
          <div className="flex items-center gap-4 mb-4">
            {profile ? (
              <Link href={`/player/${profile.username}`} className="relative shrink-0">
                {profile.username === "azoni" && (
                  <svg className="absolute -top-4 left-1/2 -translate-x-1/2 w-7 h-7 text-fab-gold drop-shadow-[0_0_6px_rgba(201,168,76,0.6)] z-10" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2.5 19h19v3h-19zM22.5 7l-5 4-5.5-7-5.5 7-5-4 2 12h17z" />
                  </svg>
                )}
                {profile.photoUrl ? (
                  <img src={profile.photoUrl} alt="" className={`w-20 h-20 rounded-full ${bestRank === 1 ? "rank-border-grandmaster" : bestRank === 2 ? "rank-border-diamond" : bestRank === 3 ? "rank-border-gold" : bestRank === 4 ? "rank-border-silver" : bestRank === 5 ? "rank-border-bronze" : ""}`} />
                ) : (
                  <div className={`w-20 h-20 rounded-full bg-fab-gold/20 flex items-center justify-center text-fab-gold text-3xl font-bold ${bestRank === 1 ? "rank-border-grandmaster" : bestRank === 2 ? "rank-border-diamond" : bestRank === 3 ? "rank-border-gold" : bestRank === 4 ? "rank-border-silver" : bestRank === 5 ? "rank-border-bronze" : ""}`}>
                    {profile.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </Link>
            ) : null}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-fab-gold truncate">
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
                    className="p-1 rounded transition-colors hover:bg-fab-surface"
                    title="Copy profile link"
                  >
                    {shareCopied ? (
                      <svg className="w-4 h-4 text-fab-win" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-fab-dim hover:text-fab-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-fab-surface border border-fab-border text-fab-dim hover:text-fab-text hover:border-fab-muted transition-colors"
                    title="Share on X"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    <span className="text-xs font-semibold">Post</span>
                  </button>
                )}
                {profile?.username && (
                  <button
                    onClick={() => setProfileShareOpen(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-fab-surface border border-fab-border text-fab-dim hover:text-fab-text hover:border-fab-muted transition-colors"
                    title="Share profile card"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                    </svg>
                    <span className="text-xs font-semibold">Card</span>
                  </button>
                )}
              </div>
              {profile?.username && (
                <p className="text-sm text-fab-dim mb-1">@{profile.username}</p>
              )}
              {achievements.length > 0 && <AchievementBadges earned={achievements} max={4} mobileMax={2} onShowMore={profile?.username ? () => router.push(`/player/${profile.username}#achievements`) : undefined} />}
            </div>
            {/* Streak mini */}
            <div className="shrink-0 ml-auto text-right">
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
                <div className="flex gap-2 text-center ml-2">
                  <div>
                    <p className="text-sm font-bold text-fab-win">{streaks.longestWinStreak}</p>
                    <p className="text-[10px] text-fab-dim">Best</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-fab-loss">{streaks.longestLossStreak}</p>
                    <p className="text-[10px] text-fab-dim">Worst</p>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-fab-dim">streak</p>
              <div className="mt-1 flex gap-0.5 flex-wrap justify-end max-w-[120px] sm:max-w-[200px] ml-auto">
                {last30.map((m, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full ${
                      m.result === MatchResult.Win ? "bg-fab-win" : m.result === MatchResult.Loss ? "bg-fab-loss" : m.result === MatchResult.Bye ? "bg-fab-muted" : "bg-fab-draw"
                    }`}
                    title={`${localDate(m.date).toLocaleDateString()} - ${m.result}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Quick stats row */}
          <div className={`grid grid-cols-2 ${bestFinish ? "sm:grid-cols-6" : "sm:grid-cols-5"} gap-3 mb-4`}>
            <div>
              <p className="text-[10px] text-fab-dim uppercase tracking-wider">Win Rate</p>
              <p className={`text-lg font-bold ${overall.overallWinRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
                {overall.overallWinRate.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-[10px] text-fab-dim uppercase tracking-wider">Record</p>
              <p className="text-lg font-bold">
                <span className="text-fab-win">{overall.totalWins}W</span>
                <span className="text-fab-dim"> - </span>
                <span className="text-fab-loss">{overall.totalLosses}L</span>
              </p>
              {(overall.totalDraws > 0 || overall.totalByes > 0) && (
                <p className="text-[10px] text-fab-dim">
                  {[
                    overall.totalDraws > 0 ? `${overall.totalDraws} draw${overall.totalDraws !== 1 ? "s" : ""}` : "",
                    overall.totalByes > 0 ? `${overall.totalByes} bye${overall.totalByes !== 1 ? "s" : ""}` : "",
                  ].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
            <div>
              <p className="text-[10px] text-fab-dim uppercase tracking-wider">Matches</p>
              <p className="text-lg font-bold text-fab-text">{overall.totalMatches + overall.totalByes}</p>
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

          {/* Quick Nav */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            <Link href="/matches" className="nav-btn nav-btn-matches group flex items-center gap-2 bg-fab-surface border border-fab-border rounded-lg px-2.5 py-2">
              <SwordsIcon className="nav-icon w-4 h-4 text-fab-muted group-hover:text-red-400 shrink-0" />
              <span className="text-xs font-semibold text-fab-muted group-hover:text-fab-text transition-colors">Matches</span>
            </Link>
            <Link href="/events" className="nav-btn nav-btn-events group flex items-center gap-2 bg-fab-surface border border-fab-border rounded-lg px-2.5 py-2">
              <CalendarIcon className="nav-icon w-4 h-4 text-fab-muted group-hover:text-blue-400 shrink-0" />
              <span className="text-xs font-semibold text-fab-muted group-hover:text-fab-text transition-colors">Events</span>
            </Link>
            <Link href="/opponents" className="nav-btn nav-btn-opponents group flex items-center gap-2 bg-fab-surface border border-fab-border rounded-lg px-2.5 py-2">
              <OpponentsIcon className="nav-icon w-4 h-4 text-fab-muted group-hover:text-purple-400 shrink-0" />
              <span className="text-xs font-semibold text-fab-muted group-hover:text-fab-text transition-colors">Opponents</span>
            </Link>
            <Link href="/trends" className="nav-btn nav-btn-trends group flex items-center gap-2 bg-fab-surface border border-fab-border rounded-lg px-2.5 py-2">
              <TrendsIcon className="nav-icon w-4 h-4 text-fab-muted group-hover:text-emerald-400 shrink-0" />
              <span className="text-xs font-semibold text-fab-muted group-hover:text-fab-text transition-colors">Trends</span>
            </Link>
            <Link href="/compare" className="nav-btn nav-btn-versus group flex items-center gap-2 bg-fab-surface border border-fab-border rounded-lg px-2.5 py-2">
              <svg className="nav-icon w-4 h-4 text-fab-muted group-hover:text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              <span className="text-xs font-semibold text-fab-muted group-hover:text-fab-text transition-colors">Versus</span>
            </Link>
            <Link href="/events?import=1" className="nav-btn nav-btn-log group flex items-center gap-2 bg-fab-surface border border-fab-border border-dashed rounded-lg px-2.5 py-2">
              <svg className="nav-icon w-4 h-4 text-fab-muted group-hover:text-fab-gold shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-xs font-semibold text-fab-muted group-hover:text-fab-text transition-colors">Log</span>
            </Link>
          </div>
        </div>
      )}

      {/* On This Day */}
      {hasMatches && <OnThisDay matches={matches} />}

      {/* Calling Montreal + Activity Feed + Player Spotlight (logged-in only) */}
      {user && (
        <>
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-fab-text">Calling Montreal Day 1</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setVideoExpanded((v) => !v)}
                  className="text-xs text-fab-muted hover:text-fab-gold transition-colors cursor-pointer"
                >
                  {videoExpanded ? "Minimize" : "Expand"} Stream
                </button>
                <a href="https://www.youtube.com/live/DFWOlXB0YXc?si=-Kj27AY5o4L4ubE5" target="_blank" rel="noopener noreferrer" className="text-xs text-fab-gold hover:text-fab-gold-light transition-colors">
                  Watch Stream &rarr;
                </a>
              </div>
            </div>
            {videoExpanded && (
              <div className="overflow-hidden rounded-lg border border-fab-border aspect-video mb-4">
                <iframe
                  src="https://www.youtube.com/embed/DFWOlXB0YXc"
                  title="Calling Montreal Day 1 Stream"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <a
                href="https://www.youtube.com/live/DFWOlXB0YXc?si=-Kj27AY5o4L4ubE5"
                target="_blank"
                rel="noopener noreferrer"
                className="block overflow-hidden rounded-lg border border-fab-border hover:border-fab-gold/50 transition-colors group"
              >
                <img
                  src="/montreal.png"
                  alt="Calling Montreal Day 1 Metagame — 282 Players"
                  className="w-full h-auto group-hover:brightness-110 transition-all"
                />
              </a>
              {!videoExpanded && (
                <div className="overflow-hidden rounded-lg border border-fab-border aspect-video">
                  <iframe
                    src="https://www.youtube.com/embed/DFWOlXB0YXc"
                    title="Calling Montreal Day 1 Stream"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ActivityFeed rankMap={rankMap} />
            <FeaturedProfiles profiles={featuredProfiles} rankMap={rankMap} />
          </div>
        </>
      )}

      {/* Montreal metagame for logged-out users */}
      {!user && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-fab-text">Calling Montreal Day 1</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setVideoExpanded((v) => !v)}
                className="text-xs text-fab-muted hover:text-fab-gold transition-colors cursor-pointer"
              >
                {videoExpanded ? "Minimize" : "Expand"} Stream
              </button>
              <a href="https://www.youtube.com/live/DFWOlXB0YXc?si=-Kj27AY5o4L4ubE5" target="_blank" rel="noopener noreferrer" className="text-xs text-fab-gold hover:text-fab-gold-light transition-colors">
                Watch Stream &rarr;
              </a>
            </div>
          </div>
          {videoExpanded && (
            <div className="overflow-hidden rounded-lg border border-fab-border aspect-video mb-4">
              <iframe
                src="https://www.youtube.com/embed/DFWOlXB0YXc"
                title="Calling Montreal Day 1 Stream"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a
              href="https://www.youtube.com/live/DFWOlXB0YXc?si=-Kj27AY5o4L4ubE5"
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden rounded-lg border border-fab-border hover:border-fab-gold/50 transition-colors group"
            >
              <img
                src="/montreal.png"
                alt="Calling Montreal Day 1 Metagame — 282 Players"
                className="w-full h-auto group-hover:brightness-110 transition-all"
              />
            </a>
            {!videoExpanded && (
              <div className="overflow-hidden rounded-lg border border-fab-border aspect-video">
                <iframe
                  src="https://www.youtube.com/embed/DFWOlXB0YXc"
                  title="Calling Montreal Day 1 Stream"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Community content */}
      <CommunityHighlights
        featuredEvents={featuredEvents}
        leaderboardEntries={lbEntries}
        topHeroes={communityTopHeroes}
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
