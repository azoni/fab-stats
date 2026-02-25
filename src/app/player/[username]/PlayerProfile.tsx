"use client";
import { useState, useEffect, useMemo, Fragment } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { getProfileByUsername, getMatchesByUserId } from "@/lib/firestore-storage";
import { updateLeaderboardEntry } from "@/lib/leaderboard";
import { computeOverallStats, computeHeroStats, computeEventTypeStats, computeVenueStats, computeEventStats, computeOpponentStats, computeBestFinish, computePlayoffFinishes } from "@/lib/stats";
import { evaluateAchievements } from "@/lib/achievements";
import { computeHeroMastery } from "@/lib/mastery";
import { AchievementShowcase } from "@/components/gamification/AchievementShowcase";
import { AchievementBadges } from "@/components/gamification/AchievementShowcase";
import { HeroMasteryList } from "@/components/gamification/HeroMasteryCard";
import { MatchCard } from "@/components/matches/MatchCard";
import { EventCard } from "@/components/events/EventCard";
import { EventBadges } from "@/components/profile/EventBadges";
import { LeaderboardCrowns } from "@/components/profile/LeaderboardCrowns";
import { computeEventBadges } from "@/lib/events";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { computeUserRanks, getBestRank } from "@/lib/leaderboard-ranks";
import { QuestionCircleIcon, LockIcon } from "@/components/icons/NavIcons";
import { useAuth } from "@/contexts/AuthContext";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import type { MatchRecord, UserProfile, Achievement } from "@/types";
import { MatchResult } from "@/types";
import { allHeroes as knownHeroes } from "@/lib/heroes";

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
  const { isAdmin } = useAuth();
  const { entries: lbEntries } = useLeaderboard();
  const [filterFormat, setFilterFormat] = useState<string>("all");
  const [filterRated, setFilterRated] = useState<string>("all");
  const [filterHero, setFilterHero] = useState<string>("all");

  const loadedMatches = state.status === "loaded" ? state.matches : [];

  const allFormats = useMemo(() => {
    const formats = new Set(loadedMatches.map((m) => m.format));
    return Array.from(formats).sort();
  }, [loadedMatches]);

  const allEventTypes = useMemo(() => {
    const types = new Set(loadedMatches.map((m) => m.eventType).filter(Boolean));
    return Array.from(types).sort() as string[];
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
      if (filterRated !== "all" && filterRated !== "rated" && filterRated !== "unrated" && m.eventType !== filterRated) return false;
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

        if (!profile.isPublic) {
          setState({ status: "private" });
          return;
        }

        // Load matches separately — show profile even if matches fail
        let matches: MatchRecord[] = [];
        try {
          matches = await getMatchesByUserId(profile.uid);
        } catch (matchErr) {
          console.error("Failed to load matches for public profile:", matchErr);
        }

        if (!cancelled) {
          const isOwner = !!viewerUid && viewerUid === profile.uid;
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

  if (matches.length === 0) {
    return (
      <div className="space-y-8">
        <ProfileHeader profile={profile} isAdmin={isAdmin} isOwner={isOwner} />
        <div className="text-center py-16">
          <p className="text-fab-muted">This player hasn&apos;t logged any matches yet.</p>
        </div>
      </div>
    );
  }

  const overall = computeOverallStats(fm);
  const heroStats = computeHeroStats(fm);
  const opponentStats = computeOpponentStats(fm).filter((o) => o.totalMatches >= 3);
  const allOpponentStats = computeOpponentStats(fm);
  const eventTypeStats = computeEventTypeStats(fm);
  const venueStats = computeVenueStats(fm).filter((v) => v.venue !== "Unknown");
  const eventStats = computeEventStats(fm);
  const recentEvents = eventStats.slice(0, 5);
  const recentMatches = [...fm]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);
  const { streaks } = overall;
  const achievements = evaluateAchievements(fm, overall, heroStats, opponentStats);
  const masteries = computeHeroMastery(heroStats);
  const nemesis = opponentStats.length > 0
    ? opponentStats.reduce((worst, o) => (o.winRate < worst.winRate ? o : worst))
    : null;
  const bestFriend = allOpponentStats.length > 0
    ? allOpponentStats.reduce((most, o) => (o.totalMatches > most.totalMatches ? o : most))
    : null;
  const bestFinish = computeBestFinish(eventStats);
  const playoffFinishes = computePlayoffFinishes(eventStats);
  const eventBadges = computeEventBadges(eventStats);
  const userRanks = computeUserRanks(lbEntries, profile.uid);
  const bestRank = getBestRank(userRanks);

  const last30 = [...fm]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 30)
    .reverse();

  return (
    <div className="space-y-8">
      {/* Profile Header + Streak */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <ProfileHeader profile={profile} achievements={achievements} bestRank={bestRank} isAdmin={isAdmin} isOwner={isOwner} />
        {/* Compact Streak */}
        <div className={`rounded-lg px-5 py-4 border ${
          streaks.currentStreak?.type === MatchResult.Win
            ? "bg-fab-win/8 border-fab-win/30"
            : streaks.currentStreak?.type === MatchResult.Loss
              ? "bg-fab-loss/8 border-fab-loss/30"
              : "bg-fab-surface border-fab-border"
        }`}>
          <div className="flex items-center gap-5">
            <div>
              <p className="text-xs text-fab-muted uppercase tracking-wider">Streak</p>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-3xl font-black ${
                  streaks.currentStreak?.type === MatchResult.Win
                    ? "text-fab-win"
                    : streaks.currentStreak?.type === MatchResult.Loss
                      ? "text-fab-loss"
                      : "text-fab-dim"
                }`}>
                  {streaks.currentStreak ? streaks.currentStreak.count : 0}
                </span>
                <span className={`text-base font-bold ${
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
              </div>
            </div>
            <div className="flex gap-4 text-center">
              <div>
                <p className="text-base font-bold text-fab-win">{streaks.longestWinStreak}</p>
                <p className="text-[10px] text-fab-dim">Best</p>
              </div>
              <div>
                <p className="text-base font-bold text-fab-loss">{streaks.longestLossStreak}</p>
                <p className="text-[10px] text-fab-dim">Worst</p>
              </div>
            </div>
          </div>
          <div className="mt-2.5 flex gap-0.5 flex-wrap">
            {last30.map((m, i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full ${
                  m.result === MatchResult.Win ? "bg-fab-win" : m.result === MatchResult.Loss ? "bg-fab-loss" : "bg-fab-draw"
                }`}
                title={`${new Date(m.date).toLocaleDateString()} - ${m.result}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <select
          value={filterFormat}
          onChange={(e) => setFilterFormat(e.target.value)}
          className="bg-fab-surface border border-fab-border text-fab-text text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-fab-gold"
        >
          <option value="all">All Formats</option>
          {allFormats.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        <select
          value={filterRated}
          onChange={(e) => setFilterRated(e.target.value)}
          className="bg-fab-surface border border-fab-border text-fab-text text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-fab-gold"
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
            className="bg-fab-surface border border-fab-border text-fab-text text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-fab-gold"
          >
            <option value="all">All Heroes</option>
            {allHeroes.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        )}
        {isFiltered && (
          <span className="text-sm text-fab-dim">
            Showing {fm.length} of {matches.length} matches
          </span>
        )}
      </div>

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

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Matches" value={overall.totalMatches} />
        <StatCard
          label="Win Rate"
          value={`${overall.overallWinRate.toFixed(1)}%`}
          color={overall.overallWinRate >= 50 ? "text-fab-win" : "text-fab-loss"}
        />
        <StatCard label="Record" value={`${overall.totalWins}W - ${overall.totalLosses}L - ${overall.totalDraws}D`} />
        {bestFinish ? (
          <StatCard
            label="Best Finish"
            value={bestFinish.label}
            subtext={bestFinish.eventName}
            color="text-fab-gold"
          />
        ) : (
          <StatCard label="Events" value={eventStats.length} />
        )}
        {profile.earnings ? (
          <StatCard
            label="Earnings"
            value={`$${profile.earnings.toLocaleString()}`}
            color="text-fab-gold"
          />
        ) : null}
      </div>

      {/* Playoff Finishes */}
      {playoffFinishes.length > 0 && <PlayoffFinishes finishes={playoffFinishes} />}

      {/* Achievements */}
      <AchievementShowcase earned={achievements} />

      {/* Hero Mastery */}
      <HeroMasteryList masteries={masteries} />

      {/* Major Event Badges */}
      <EventBadges badges={eventBadges} />

      {/* Nemesis + Best Friend */}
      {(nemesis || bestFriend) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {nemesis && (
            <div className="bg-fab-loss/8 border border-fab-loss/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-fab-loss" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 9l2 2M14 9l2 2" />
                  <path d="M8 16c1.5-1.5 4.5-1.5 6 0" fill="none" />
                </svg>
                <span className="text-xs text-fab-muted uppercase tracking-wider">Nemesis</span>
              </div>
              <p className="font-bold text-fab-loss truncate">{nemesis.opponentName}</p>
              <p className="text-xs text-fab-dim mt-1">
                {nemesis.wins}W-{nemesis.losses}L{nemesis.draws > 0 ? `-${nemesis.draws}D` : ""} ({nemesis.winRate.toFixed(0)}%)
              </p>
            </div>
          )}
          {bestFriend && (
            <div className="bg-fab-gold/5 border border-fab-gold/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-fab-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 00-4-4H8a4 4 0 00-4-4v2" />
                  <circle cx="10" cy="7" r="4" />
                  <path d="M20 8v6M23 11h-6" />
                </svg>
                <span className="text-xs text-fab-muted uppercase tracking-wider">Best Friend</span>
              </div>
              <p className="font-bold text-fab-text truncate">{bestFriend.opponentName}</p>
              <p className="text-xs text-fab-dim mt-1">
                {bestFriend.totalMatches} matches ({bestFriend.wins}W-{bestFriend.losses}L{bestFriend.draws > 0 ? `-${bestFriend.draws}D` : ""})
              </p>
            </div>
          )}
        </div>
      )}

      {/* Recent Events */}
      {recentEvents.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-fab-text mb-4">Recent Events</h2>
          <div className="space-y-2">
            {recentEvents.map((event) => (
              <EventCard key={`${event.eventName}-${event.eventDate}`} event={event} obfuscateOpponents={!isOwner && !isAdmin} />
            ))}
          </div>
        </div>
      )}

      {/* Event Type Breakdown */}
      {eventTypeStats.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-fab-text mb-4">Win Rate by Event Type</h2>
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

      {/* Venue Breakdown */}
      {venueStats.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-fab-text mb-4">Win Rate by Venue</h2>
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

      {/* Recent Matches */}
      <div>
        <h2 className="text-lg font-semibold text-fab-text mb-4">Recent Matches</h2>
        <div className="space-y-2">
          {recentMatches.map((match) => (
            <MatchCard key={match.id} match={match} matchOwnerUid={profile.uid} enableComments obfuscateOpponents={!isOwner} />
          ))}
        </div>
      </div>
      </>
      )}
    </div>
  );
}

function ProfileHeader({ profile, achievements, bestRank, isAdmin, isOwner }: { profile: UserProfile; achievements?: Achievement[]; bestRank?: 1 | 2 | 3 | 4 | 5 | null; isAdmin?: boolean; isOwner?: boolean }) {
  const ringClass = bestRank === 1 ? "rank-border-grandmaster" : bestRank === 2 ? "rank-border-diamond" : bestRank === 3 ? "rank-border-gold" : bestRank === 4 ? "rank-border-silver" : bestRank === 5 ? "rank-border-bronze" : "";
  const isCreator = profile.username === "azoni";
  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0">
        {isCreator && (
          <svg className="absolute -top-4 left-1/2 -translate-x-1/2 w-7 h-7 text-fab-gold drop-shadow-[0_0_6px_rgba(201,168,76,0.6)] z-10" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.5 19h19v3h-19zM22.5 7l-5 4-5.5-7-5.5 7-5-4 2 12h17z" />
          </svg>
        )}
        {profile.photoUrl ? (
          <img src={profile.photoUrl} alt="" className={`w-16 h-16 rounded-full ${ringClass}`} />
        ) : (
          <div className={`w-16 h-16 rounded-full bg-fab-gold/20 flex items-center justify-center text-fab-gold text-2xl font-bold ${ringClass}`}>
            {profile.displayName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div>
        <h1 className="text-2xl font-bold text-fab-gold">{profile.displayName}</h1>
        <p className="text-sm text-fab-dim mb-1">@{profile.username}</p>
        {achievements && achievements.length > 0 && <AchievementBadges earned={achievements} max={4} />}
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

import type { PlayoffFinish } from "@/lib/stats";

const PLAYOFF_TIER_GROUPS = [
  { label: "PQ / RTN", types: ["ProQuest", "Road to Nationals", "Skirmish"] },
  { label: "BH / Calling", types: ["Battle Hardened", "The Calling"] },
  { label: "PT / Nats / Worlds", types: ["Pro Tour", "Nationals", "Worlds"] },
];

function PlayoffFinishes({ finishes }: { finishes: PlayoffFinish[] }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const tierData = useMemo(() => {
    const result: { label: string; finishes: PlayoffFinish[]; top8: number; top4: number; finals: number; wins: number; total: number }[] = [];
    const categorized = new Set<string>();

    for (const group of PLAYOFF_TIER_GROUPS) {
      const tierFinishes = finishes.filter((f) => group.types.includes(f.eventType));
      if (tierFinishes.length === 0) continue;
      group.types.forEach((t) => categorized.add(t));
      result.push({
        label: group.label,
        finishes: tierFinishes,
        top8: tierFinishes.filter((f) => f.type === "top8").length,
        top4: tierFinishes.filter((f) => f.type === "top4").length,
        finals: tierFinishes.filter((f) => f.type === "finalist").length,
        wins: tierFinishes.filter((f) => f.type === "champion").length,
        total: tierFinishes.length,
      });
    }

    const otherFinishes = finishes.filter((f) => !categorized.has(f.eventType));
    if (otherFinishes.length > 0) {
      result.push({
        label: "Other",
        finishes: otherFinishes,
        top8: otherFinishes.filter((f) => f.type === "top8").length,
        top4: otherFinishes.filter((f) => f.type === "top4").length,
        finals: otherFinishes.filter((f) => f.type === "finalist").length,
        wins: otherFinishes.filter((f) => f.type === "champion").length,
        total: otherFinishes.length,
      });
    }

    return result;
  }, [finishes]);

  if (tierData.length === 0) return null;

  const totals = {
    top8: finishes.filter((f) => f.type === "top8").length,
    top4: finishes.filter((f) => f.type === "top4").length,
    finals: finishes.filter((f) => f.type === "finalist").length,
    wins: finishes.filter((f) => f.type === "champion").length,
    total: finishes.length,
  };

  const toggle = (label: string) => setExpanded((prev) => ({ ...prev, [label]: !prev[label] }));

  const finishLabel = (type: string) => {
    switch (type) {
      case "champion": return "Winner";
      case "finalist": return "Finals";
      case "top4": return "Top 4";
      case "top8": return "Top 8";
      default: return type;
    }
  };

  const finishColor = (type: string) => {
    switch (type) {
      case "champion": return "text-fab-gold";
      case "finalist": return "text-gray-300";
      case "top4": return "text-amber-600";
      case "top8": return "text-blue-400";
      default: return "text-fab-dim";
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-fab-text">Playoff Finishes</h2>
        <span className="text-sm text-fab-dim">{finishes.length} total</span>
      </div>
      <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-fab-border">
              <th className="text-left px-4 py-2.5 text-xs text-fab-muted font-medium uppercase tracking-wider">Tier</th>
              <th className="text-center px-2 py-2.5 text-xs text-blue-400 font-medium">Top 8</th>
              <th className="text-center px-2 py-2.5 text-xs text-amber-600 font-medium">Top 4</th>
              <th className="text-center px-2 py-2.5 text-xs text-gray-300 font-medium">Finals</th>
              <th className="text-center px-2 py-2.5 text-xs text-fab-gold font-medium">Wins</th>
              <th className="text-center px-2 py-2.5 text-xs text-fab-muted font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {tierData.map((tier) => (
              <Fragment key={tier.label}>
                <tr
                  className="border-b border-fab-border/50 hover:bg-fab-bg/50 cursor-pointer transition-colors"
                  onClick={() => toggle(tier.label)}
                >
                  <td className="px-4 py-2.5 font-medium text-fab-text">
                    <span className="flex items-center gap-2">
                      <svg className={`w-3 h-3 text-fab-dim transition-transform ${expanded[tier.label] ? "rotate-90" : ""}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6 4l8 6-8 6V4z" />
                      </svg>
                      {tier.label}
                    </span>
                  </td>
                  <td className="text-center px-2 py-2.5 text-blue-400">{tier.top8 || <span className="text-fab-dim">-</span>}</td>
                  <td className="text-center px-2 py-2.5 text-amber-600">{tier.top4 || <span className="text-fab-dim">-</span>}</td>
                  <td className="text-center px-2 py-2.5 text-gray-300">{tier.finals || <span className="text-fab-dim">-</span>}</td>
                  <td className="text-center px-2 py-2.5 text-fab-gold">{tier.wins || <span className="text-fab-dim">-</span>}</td>
                  <td className="text-center px-2 py-2.5 font-bold text-fab-text">{tier.total}</td>
                </tr>
                {expanded[tier.label] && tier.finishes.map((f) => (
                  <tr key={`${f.eventName}-${f.eventDate}`} className="border-b border-fab-border/30 bg-fab-bg/30">
                    <td className="px-4 pl-9 py-1.5 text-xs text-fab-dim truncate max-w-[200px]" title={f.eventName}>
                      {f.eventName}
                    </td>
                    <td colSpan={4} className="text-center px-2 py-1.5">
                      <span className={`text-xs font-medium ${finishColor(f.type)}`}>{finishLabel(f.type)}</span>
                    </td>
                    <td />
                  </tr>
                ))}
              </Fragment>
            ))}
            <tr className="bg-fab-bg/50">
              <td className="px-4 py-2.5 font-semibold text-fab-muted text-xs uppercase tracking-wider">Total</td>
              <td className="text-center px-2 py-2.5 text-blue-400 font-bold">{totals.top8 || "-"}</td>
              <td className="text-center px-2 py-2.5 text-amber-600 font-bold">{totals.top4 || "-"}</td>
              <td className="text-center px-2 py-2.5 text-gray-300 font-bold">{totals.finals || "-"}</td>
              <td className="text-center px-2 py-2.5 text-fab-gold font-bold">{totals.wins || "-"}</td>
              <td className="text-center px-2 py-2.5 font-black text-fab-text">{totals.total}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, color = "text-fab-text", subtext }: { label: string; value: string | number; color?: string; subtext?: string }) {
  return (
    <div className="bg-fab-surface border border-fab-border rounded-lg p-4">
      <p className="text-xs text-fab-muted mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {subtext && <p className="text-[10px] text-fab-dim mt-0.5 truncate">{subtext}</p>}
    </div>
  );
}
