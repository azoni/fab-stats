"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { getProfileByUsername, getMatchesByUserId } from "@/lib/firestore-storage";
import { updateLeaderboardEntry } from "@/lib/leaderboard";
import { computeOverallStats, computeHeroStats, computeEventTypeStats, computeVenueStats, computeEventStats, computeOpponentStats, computeBestFinish, computePlayoffFinishes, getEventType } from "@/lib/stats";
import { evaluateAchievements, getAchievementProgress } from "@/lib/achievements";
import { computeHeroMastery } from "@/lib/mastery";
import { AchievementShowcase } from "@/components/gamification/AchievementShowcase";
import { AchievementBadges } from "@/components/gamification/AchievementShowcase";
import { HeroMasteryList } from "@/components/gamification/HeroMasteryCard";
import { EventCard } from "@/components/events/EventCard";
import { EventBadges } from "@/components/profile/EventBadges";
import { LeaderboardCrowns } from "@/components/profile/LeaderboardCrowns";
import { TrophyCase } from "@/components/profile/TrophyCase";
import { ArmoryGarden } from "@/components/profile/ArmoryGarden";
import { computeEventBadges } from "@/lib/events";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { computeUserRanks, getBestRank } from "@/lib/leaderboard-ranks";
import { QuestionCircleIcon, LockIcon } from "@/components/icons/NavIcons";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useFavorites";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { BestFinishShareModal } from "@/components/profile/BestFinishCard";
import type { MatchRecord, UserProfile, Achievement } from "@/types";
import { MatchResult } from "@/types";
import { allHeroes as knownHeroes } from "@/lib/heroes";
import { localDate } from "@/lib/constants";

const VALID_HERO_NAMES = new Set(knownHeroes.map((h) => h.name));

type PageState =
  | { status: "loading" }
  | { status: "not_found" }
  | { status: "private" }
  | { status: "error"; message?: string }
  | { status: "loaded"; profile: UserProfile; matches: MatchRecord[]; isOwner: boolean };

export default function PlayerProfile() {
  const pathname = usePathname();
  const username = pathname.split("/").pop() || "";
  const [state, setState] = useState<PageState>({ status: "loading" });
  const { isAdmin, user: currentUser, isGuest } = useAuth();
  const { entries: lbEntries } = useLeaderboard();
  const { isFavorited, toggleFavorite } = useFavorites();
  const [filterFormat, setFilterFormat] = useState<string>("all");
  const [filterRated, setFilterRated] = useState<string>("all");
  const [filterHero, setFilterHero] = useState<string>("all");
  const [showRawData, setShowRawData] = useState(false);
  const [showVenues, setShowVenues] = useState(false);
  const [showEventTypes, setShowEventTypes] = useState(false);
  const [bestFinishShareOpen, setBestFinishShareOpen] = useState(false);
  const [achievementsExpanded, setAchievementsExpanded] = useState(false);

  // Auto-expand achievements if navigated with #achievements hash
  useEffect(() => {
    if (state.status === "loaded" && window.location.hash === "#achievements") {
      setAchievementsExpanded(true);
      setTimeout(() => document.getElementById("achievements")?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
    }
  }, [state.status]);

  // Build set of opponent display names that have opted in to being visible
  const visibleOpponents = useMemo(() => {
    const names = new Set<string>();
    for (const entry of lbEntries) {
      if (entry.showNameOnProfiles) {
        names.add(entry.displayName);
      }
    }
    return names;
  }, [lbEntries]);

  const loadedMatches = state.status === "loaded" ? state.matches : [];

  const allFormats = useMemo(() => {
    const formats = new Set(loadedMatches.map((m) => m.format));
    return Array.from(formats).sort();
  }, [loadedMatches]);

  const allEventTypes = useMemo(() => {
    const types = new Set(loadedMatches.map((m) => getEventType(m)).filter((t) => t !== "Other"));
    return Array.from(types).sort();
  }, [loadedMatches]);

  const allHeroes = useMemo(() => {
    const heroes = new Set(loadedMatches.map((m) => m.heroPlayed).filter((h) => h && VALID_HERO_NAMES.has(h)));
    return Array.from(heroes).sort();
  }, [loadedMatches]);

  const fm = useMemo(() => {
    return loadedMatches.filter((m) => {
      if (filterFormat !== "all" && m.format !== filterFormat) return false;
      if (filterRated === "rated" && m.rated !== true) return false;
      if (filterRated === "unrated" && m.rated === true) return false;
      if (filterRated !== "all" && filterRated !== "rated" && filterRated !== "unrated" && getEventType(m) !== filterRated) return false;
      if (filterHero !== "all" && m.heroPlayed !== filterHero) return false;
      return true;
    });
  }, [loadedMatches, filterFormat, filterRated, filterHero]);

  // Update tab title and OG meta tags from generic pre-rendered values to actual username
  useEffect(() => {
    if (!username || username === "_") return;
    document.title = `${username}'s FaB Stats | FaB Stats`;
    const desc = `View ${username}'s Flesh and Blood match history, win rates, and tournament results on FaB Stats.`;
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDesc = document.querySelector('meta[property="og:description"]');
    const twTitle = document.querySelector('meta[name="twitter:title"]');
    const twDesc = document.querySelector('meta[name="twitter:description"]');
    if (ogTitle) ogTitle.setAttribute("content", `${username}'s FaB Stats | FaB Stats`);
    if (ogDesc) ogDesc.setAttribute("content", desc);
    if (twTitle) twTitle.setAttribute("content", `${username}'s FaB Stats | FaB Stats`);
    if (twDesc) twDesc.setAttribute("content", desc);
  }, [username]);

  useEffect(() => {
    if (!username) return;

    let cancelled = false;

    // Wait for Firebase Auth to settle before reading Firestore
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      unsubscribe();
      if (!cancelled) load(currentUser?.uid);
    });

    async function load(viewerUid?: string) {
      setState({ status: "loading" });

      try {
        const profile = await getProfileByUsername(username);
        if (cancelled) return;
        if (!profile) {
          setState({ status: "not_found" });
          return;
        }

        const isOwner = !!viewerUid && viewerUid === profile.uid;

        if (!profile.isPublic && !isOwner) {
          setState({ status: "private" });
          return;
        }

        // Load matches separately — show profile even if matches fail
        let matches: MatchRecord[] = [];
        try {
          matches = await getMatchesByUserId(profile.uid);
        } catch (matchErr) {
          console.error("Failed to load matches for profile:", matchErr);
        }

        if (!cancelled) {
          setState({ status: "loaded", profile, matches, isOwner });

          // Sync leaderboard entry when the owner views their profile
          if (isOwner && matches.length > 0) {
            updateLeaderboardEntry(profile, matches).catch(() => {});
          }
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
        if (!cancelled) {
          setState({ status: "error", message: err instanceof Error ? err.message : undefined });
        }
      }
    }

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [username]);

  const profileUid = state.status === "loaded" ? state.profile.uid : "";

  const overall = useMemo(() => computeOverallStats(fm), [fm]);
  const heroStats = useMemo(() => computeHeroStats(fm), [fm]);
  const allOpponentStats = useMemo(() => computeOpponentStats(fm), [fm]);
  const opponentStats = useMemo(() => allOpponentStats.filter((o) => o.totalMatches >= 3), [allOpponentStats]);
  const eventTypeStats = useMemo(() => computeEventTypeStats(fm), [fm]);
  const venueStats = useMemo(() => computeVenueStats(fm).filter((v) => v.venue !== "Unknown"), [fm]);
  const eventStats = useMemo(() => computeEventStats(fm), [fm]);
  const recentEvents = useMemo(() => eventStats.slice(0, 10), [eventStats]);
  const sortedByDateDesc = useMemo(() =>
    [...fm].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [fm]
  );
  const achievements = useMemo(() => evaluateAchievements(fm, overall, heroStats, opponentStats), [fm, overall, heroStats, opponentStats]);
  const achievementProgress = useMemo(() => getAchievementProgress(fm, overall, heroStats, opponentStats), [fm, overall, heroStats, opponentStats]);
  const masteries = useMemo(() => computeHeroMastery(heroStats), [heroStats]);
  const bestFinish = useMemo(() => computeBestFinish(eventStats), [eventStats]);
  const playoffFinishes = useMemo(() => computePlayoffFinishes(eventStats), [eventStats]);
  const eventBadges = useMemo(() => computeEventBadges(eventStats, playoffFinishes), [eventStats, playoffFinishes]);
  const userRanks = useMemo(() => profileUid ? computeUserRanks(lbEntries, profileUid) : [], [lbEntries, profileUid]);
  const bestRank = useMemo(() => getBestRank(userRanks), [userRanks]);
  const last30 = useMemo(() => sortedByDateDesc.slice(0, 30).reverse(), [sortedByDateDesc]);
  const topHero = useMemo(() => {
    const known = heroStats.filter((h) => h.heroName !== "Unknown");
    return known.length > 0 ? known[0] : null;
  }, [heroStats]);

  // Card border = highest event tier where the player made playoffs
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


  if (state.status === "loading") {
    return (
      <div className="space-y-8">
        <div className="h-8 w-48 bg-fab-surface rounded animate-pulse" />
        <div className="bg-fab-surface border border-fab-border rounded-xl p-6 h-32 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-fab-surface border border-fab-border rounded-lg p-4 h-20 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (state.status === "not_found") {
    return (
      <div className="text-center py-24">
        <QuestionCircleIcon className="w-14 h-14 text-fab-muted mb-4 mx-auto" />
        <h1 className="text-2xl font-bold text-fab-text mb-2">Player Not Found</h1>
        <p className="text-fab-muted mb-6">No player with the username &quot;{username}&quot; exists.</p>
        <Link href="/search" className="text-fab-gold hover:text-fab-gold-light">
          Search for players
        </Link>
      </div>
    );
  }

  if (state.status === "private") {
    return (
      <div className="text-center py-24">
        <LockIcon className="w-14 h-14 text-fab-muted mb-4 mx-auto" />
        <h1 className="text-2xl font-bold text-fab-text mb-2">Private Profile</h1>
        <p className="text-fab-muted mb-6">This player&apos;s profile is set to private.</p>
        <Link href="/search" className="text-fab-gold hover:text-fab-gold-light">
          Search for players
        </Link>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="text-center py-24">
        <QuestionCircleIcon className="w-14 h-14 text-fab-muted mb-4 mx-auto" />
        <h1 className="text-2xl font-bold text-fab-text mb-2">Something Went Wrong</h1>
        <p className="text-fab-muted mb-6">Could not load this profile. You may need to sign in first.</p>
        <Link href="/search" className="text-fab-gold hover:text-fab-gold-light">
          Search for players
        </Link>
      </div>
    );
  }

  const { profile, matches, isOwner } = state;

  const isFiltered = filterFormat !== "all" || filterRated !== "all" || filterHero !== "all";
  const { streaks } = overall;

  if (matches.length === 0) {
    return (
      <div className="space-y-8">
        <ProfileHeader profile={profile} isAdmin={isAdmin} isOwner={isOwner} isFavorited={!isOwner && !!currentUser && !isGuest && isFavorited(profile.uid)} onToggleFavorite={!isOwner && !!currentUser && !isGuest ? () => toggleFavorite(profile) : undefined} />
        <div className="text-center py-16">
          <p className="text-fab-muted">This player hasn&apos;t logged any matches yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Hero Card */}
      <div
        className="bg-fab-surface border border-fab-border rounded-lg p-5"
        style={cardBorder ? { borderColor: cardBorder.border, boxShadow: cardBorder.shadow } : undefined}
      >
        {/* Profile row */}
        <div className="flex items-center gap-4 mb-4">
          <ProfileHeader profile={profile} achievements={achievements} bestRank={bestRank} isAdmin={isAdmin} isOwner={isOwner} isFavorited={!isOwner && !!currentUser && !isGuest && isFavorited(profile.uid)} onToggleFavorite={!isOwner && !!currentUser && !isGuest ? () => toggleFavorite(profile) : undefined} onShowMoreAchievements={() => { setAchievementsExpanded(true); setTimeout(() => document.getElementById("achievements")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); }} />
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
                  : "\u2014"}
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
            <div className="mt-1 flex gap-0.5 flex-wrap justify-end max-w-[200px] ml-auto">
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
        <div className={`grid grid-cols-3 ${bestFinish ? "sm:grid-cols-6" : "sm:grid-cols-5"} gap-3`}>
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
            <p className="text-lg font-bold">
              <span className="text-fab-win">{overall.totalWins}W</span>
              <span className="text-fab-dim">-</span>
              <span className="text-fab-loss">{overall.totalLosses}L</span>
              {overall.totalDraws > 0 && <><span className="text-fab-dim">-</span><span className="text-fab-text">{overall.totalDraws}D</span></>}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-fab-dim uppercase tracking-wider">Events</p>
            <p className="text-lg font-bold text-fab-text">{eventStats.length}</p>
          </div>
          <div>
            <p className="text-[10px] text-fab-dim uppercase tracking-wider">Top Hero</p>
            <p className="text-lg font-bold text-fab-text truncate">{topHero?.heroName || "\u2014"}</p>
          </div>
          {bestFinish && (
            <div className="relative">
              <p className="text-[10px] text-fab-dim uppercase tracking-wider">Best Finish</p>
              <p className="text-lg font-bold text-fab-gold truncate">{bestFinish.label}</p>
              <p className="text-[10px] text-fab-dim truncate">{bestFinish.eventName}</p>
              {isOwner && (
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
              )}
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <select
          value={filterFormat}
          onChange={(e) => setFilterFormat(e.target.value)}
          className="bg-fab-surface border border-fab-border text-fab-text text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-fab-gold"
        >
          <option value="all">All Formats</option>
          {allFormats.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        <select
          value={filterRated}
          onChange={(e) => setFilterRated(e.target.value)}
          className="bg-fab-surface border border-fab-border text-fab-text text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-fab-gold"
          title="Filter by rated status or event type"
        >
          <option value="all">All</option>
          <option value="rated">Rated Only</option>
          <option value="unrated">Unrated Only</option>
          {allEventTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        {allHeroes.length > 1 && (
          <select
            value={filterHero}
            onChange={(e) => setFilterHero(e.target.value)}
            className="bg-fab-surface border border-fab-border text-fab-text text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-fab-gold"
          >
            <option value="all">All Heroes</option>
            {allHeroes.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        )}
        {isAdmin && (
          <button
            onClick={() => setShowRawData(true)}
            className="text-xs px-2 py-1 rounded bg-fab-surface border border-fab-border text-fab-dim hover:text-fab-text transition-colors"
          >
            Raw Data
          </button>
        )}
        {isFiltered && (
          <span className="text-xs text-fab-dim">
            Showing {fm.length} of {matches.length} matches
          </span>
        )}
      </div>

      {/* Trophy Case + Armory Garden */}
      {(playoffFinishes.length > 0 || eventStats.some(e => e.eventType === "Armory")) && (
        <div className={playoffFinishes.length > 0 && eventStats.some(e => e.eventType === "Armory")
          ? "grid grid-cols-1 md:grid-cols-2 gap-3"
          : ""
        }>
          {playoffFinishes.length > 0 && <TrophyCase finishes={playoffFinishes} />}
          <ArmoryGarden eventStats={eventStats} ownerProfile={profile} isOwner={isOwner} />
        </div>
      )}

      {/* Admin Raw Data Modal */}
      {showRawData && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowRawData(false)}>
          <div className="bg-fab-surface border border-fab-border rounded-lg w-[90vw] max-w-4xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-fab-border">
              <h3 className="text-sm font-semibold text-fab-text">{profile.displayName} — {matches.length} matches</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { navigator.clipboard.writeText(JSON.stringify(matches, null, 2)); }}
                  className="text-xs px-3 py-1 rounded bg-fab-gold text-fab-bg font-semibold hover:bg-fab-gold-light transition-colors"
                >
                  Copy JSON
                </button>
                <button onClick={() => setShowRawData(false)} className="text-fab-dim hover:text-fab-text text-lg px-2">&times;</button>
              </div>
            </div>
            <pre className="flex-1 overflow-auto p-4 text-xs text-fab-dim font-mono whitespace-pre-wrap">
              {JSON.stringify(matches, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {fm.length === 0 && isFiltered ? (
        <div className="text-center py-16">
          <p className="text-fab-muted text-lg">No matches found for this filter.</p>
          <button
            onClick={() => { setFilterFormat("all"); setFilterRated("all"); setFilterHero("all"); }}
            className="mt-4 text-fab-gold hover:underline text-sm"
          >
            Clear Filters
          </button>
        </div>
      ) : (
      <>
      {/* Leaderboard Rankings */}
      <LeaderboardCrowns ranks={userRanks} />

      {/* Best finish share modal */}
      {bestFinishShareOpen && bestFinish && (
        <BestFinishShareModal
          playerName={profile.displayName}
          bestFinish={bestFinish}
          totalMatches={overall.totalMatches}
          winRate={overall.overallWinRate}
          topHero={bestFinish.hero}
          onClose={() => setBestFinishShareOpen(false)}
        />
      )}

      {/* Major Event Badges */}
      <EventBadges badges={eventBadges} />

      {/* Achievements */}
      <AchievementShowcase earned={achievements} progress={achievementProgress} forceExpanded={achievementsExpanded} />

      {/* Hero Mastery — collapsible (built into HeroMasteryList) */}
      <HeroMasteryList masteries={masteries} />

      {/* Event Type Breakdown — collapsible */}
      {eventTypeStats.length > 0 && (
        <div className="bg-fab-surface/50 border border-fab-border rounded-lg overflow-hidden">
          <button
            onClick={() => setShowEventTypes(!showEventTypes)}
            className="w-full flex items-center justify-between px-4 py-3 group hover:bg-fab-surface/80 transition-colors"
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" /></svg>
              <h2 className="text-sm font-semibold text-fab-text">Win Rate by Event Type</h2>
              <span className="text-xs text-fab-dim">{eventTypeStats.length} type{eventTypeStats.length !== 1 ? "s" : ""}</span>
            </div>
            <svg
              className={`w-4 h-4 text-fab-muted group-hover:text-fab-text transition-transform ${showEventTypes ? "rotate-180" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
          {showEventTypes && (
            <div className="px-4 pb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {eventTypeStats.map((et) => (
                  <div key={et.eventType} className="bg-fab-surface border border-fab-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-fab-text">{et.eventType}</span>
                      <span className="text-xs text-fab-dim">{et.totalMatches} matches</span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex-1 h-3 bg-fab-bg rounded-full overflow-hidden">
                        <div className="h-full bg-fab-win rounded-full" style={{ width: `${et.winRate}%` }} />
                      </div>
                      <span className={`text-sm font-bold w-12 text-right ${et.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
                        {et.winRate.toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-xs text-fab-dim">{et.wins}W - {et.losses}L{et.draws > 0 ? ` - ${et.draws}D` : ""}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Venue Breakdown — collapsible */}
      {venueStats.length > 0 && (
        <div className="bg-fab-surface/50 border border-fab-border rounded-lg overflow-hidden">
          <button
            onClick={() => setShowVenues(!showVenues)}
            className="w-full flex items-center justify-between px-4 py-3 group hover:bg-fab-surface/80 transition-colors"
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>
              <h2 className="text-sm font-semibold text-fab-text">Win Rate by Venue</h2>
              <span className="text-xs text-fab-dim">{venueStats.length} venue{venueStats.length !== 1 ? "s" : ""}</span>
            </div>
            <svg
              className={`w-4 h-4 text-fab-muted group-hover:text-fab-text transition-transform ${showVenues ? "rotate-180" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
          {showVenues && (
            <div className="px-4 pb-4">
              <div className="space-y-2">
                {venueStats.map((v) => (
                  <div key={v.venue} className="bg-fab-surface border border-fab-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-fab-text">{v.venue}</span>
                      <span className="text-xs text-fab-dim">{v.totalMatches} matches</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-3 bg-fab-bg rounded-full overflow-hidden">
                        <div className="h-full bg-fab-win rounded-full" style={{ width: `${v.winRate}%` }} />
                      </div>
                      <span className={`text-sm font-bold w-12 text-right ${v.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
                        {v.winRate.toFixed(0)}%
                      </span>
                      <span className="text-xs text-fab-dim w-20 text-right">
                        {v.wins}W-{v.losses}L{v.draws > 0 ? `-${v.draws}D` : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Events — always open, at bottom */}
      {recentEvents.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-fab-text mb-4">Recent Events</h2>
          <div className="space-y-2">
            {recentEvents.map((event) => (
              <EventCard key={`${event.eventName}-${event.eventDate}`} event={event} obfuscateOpponents={!isOwner && !isAdmin} visibleOpponents={visibleOpponents} />
            ))}
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}

function ProfileHeader({ profile, achievements, bestRank, isAdmin, isOwner, isFavorited, onToggleFavorite, onShowMoreAchievements }: { profile: UserProfile; achievements?: Achievement[]; bestRank?: 1 | 2 | 3 | 4 | 5 | null; isAdmin?: boolean; isOwner?: boolean; isFavorited?: boolean; onToggleFavorite?: () => void; onShowMoreAchievements?: () => void }) {
  const [linkCopied, setLinkCopied] = useState(false);
  const ringClass = bestRank === 1 ? "rank-border-grandmaster" : bestRank === 2 ? "rank-border-diamond" : bestRank === 3 ? "rank-border-gold" : bestRank === 4 ? "rank-border-silver" : bestRank === 5 ? "rank-border-bronze" : "";
  const isCreator = profile.username === "azoni";
  return (
    <div className="flex items-center gap-4 flex-1 min-w-0">
      <div className="relative shrink-0">
        {isCreator && (
          <svg className="absolute -top-4 left-1/2 -translate-x-1/2 w-7 h-7 text-fab-gold drop-shadow-[0_0_6px_rgba(201,168,76,0.6)] z-10" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.5 19h19v3h-19zM22.5 7l-5 4-5.5-7-5.5 7-5-4 2 12h17z" />
          </svg>
        )}
        {profile.photoUrl ? (
          <img src={profile.photoUrl} alt="" className={`w-20 h-20 rounded-full ${ringClass}`} />
        ) : (
          <div className={`w-20 h-20 rounded-full bg-fab-gold/20 flex items-center justify-center text-fab-gold text-3xl font-bold ${ringClass}`}>
            {profile.displayName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-fab-gold">{profile.displayName}</h1>
          {onToggleFavorite && (
            <button
              onClick={onToggleFavorite}
              className="p-1 rounded transition-colors hover:bg-fab-surface"
              title={isFavorited ? "Remove from favorites" : "Add to favorites"}
            >
              <svg className={`w-5 h-5 ${isFavorited ? "text-fab-gold" : "text-fab-dim hover:text-fab-gold"}`} viewBox="0 0 24 24" fill={isFavorited ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
            </button>
          )}
          <button
            onClick={async () => {
              const url = `${window.location.origin}/player/${profile.username}`;
              try {
                await navigator.clipboard.writeText(url);
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 2000);
              } catch {}
            }}
            className="p-1 rounded transition-colors hover:bg-fab-surface"
            title="Copy profile link"
          >
            {linkCopied ? (
              <svg className="w-4 h-4 text-fab-win" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-fab-dim hover:text-fab-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0-3l-3-3m0 0l-3 3m3-3v11.25" />
              </svg>
            )}
          </button>
          {isOwner && (
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
        </div>
        <p className="text-sm text-fab-dim mb-1">@{profile.username}</p>
        {achievements && achievements.length > 0 && <AchievementBadges earned={achievements} max={4} onShowMore={onShowMoreAchievements} />}
        {isAdmin && !isOwner && (
          <Link
            href={`/inbox/${profile.uid}`}
            className="inline-flex items-center gap-1.5 mt-1 text-xs text-fab-gold hover:text-fab-gold-light transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Message
          </Link>
        )}
      </div>
    </div>
  );
}


