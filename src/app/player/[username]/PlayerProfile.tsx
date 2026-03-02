"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { getProfileByUsername, getMatchesByUserId, updateProfile, searchUsernames, getProfile } from "@/lib/firestore-storage";
import { BadgeStrip } from "@/components/profile/BadgeStrip";
import { EmblemDisplay } from "@/components/profile/EmblemDisplay";
import { EmblemPicker } from "@/components/profile/EmblemPicker";
import { updateLeaderboardEntry, findUserIdByDisplayName } from "@/lib/leaderboard";
import { computeOverallStats, computeHeroStats, computeEventStats, computeOpponentStats, computeBestFinish, computePlayoffFinishes, getEventType, getRoundNumber } from "@/lib/stats";
import { evaluateAchievements, getAchievementProgress } from "@/lib/achievements";
import { getUserBadgeIds } from "@/lib/badge-service";
import { AdminBadgePanel } from "@/components/gamification/AdminBadgePanel";
import { getBadgesForIds } from "@/lib/badges";
import { computeHeroMastery } from "@/lib/mastery";
import { AchievementShowcase } from "@/components/gamification/AchievementShowcase";
import { HeroMasteryList } from "@/components/gamification/HeroMasteryCard";
import { EventCard } from "@/components/events/EventCard";
import { EventBadges } from "@/components/profile/EventBadges";
import { LeaderboardCrowns } from "@/components/profile/LeaderboardCrowns";
import { TrophyCase } from "@/components/profile/TrophyCase";
import { ArmoryGarden } from "@/components/profile/ArmoryGarden";
import { computeEventBadges } from "@/lib/events";
import { checkIsAdmin } from "@/lib/admin";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { computeUserRanks, getBestRank } from "@/lib/leaderboard-ranks";
import { QuestionCircleIcon, LockIcon, SwordsIcon, CalendarIcon } from "@/components/icons/NavIcons";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useFavorites";
import { useFriends } from "@/hooks/useFriends";
import { getFriendCount } from "@/lib/friends";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { BestFinishShareModal } from "@/components/profile/BestFinishCard";
import { ProfileShareModal } from "@/components/profile/ProfileCard";
import { ShowcaseSection } from "@/components/profile/ShowcaseSection";
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
  const router = useRouter();
  const username = decodeURIComponent(pathname.split("/").pop() || "");
  const [state, setState] = useState<PageState>({ status: "loading" });
  const { isAdmin, user: currentUser, isGuest } = useAuth();
  const { entries: lbEntries } = useLeaderboard();
  const { isFavorited, toggleFavorite } = useFavorites();
  const { isFriend, hasSentRequest, hasReceivedRequest, getFriendshipForUser, sendRequest, acceptRequest } = useFriends();
  const [filterFormat, setFilterFormat] = useState<string>("all");
  const [filterRated, setFilterRated] = useState<string>("all");
  const [filterHero, setFilterHero] = useState<string>("all");
  const [showRawData, setShowRawData] = useState(false);
  const [bestFinishShareOpen, setBestFinishShareOpen] = useState(false);
  const [profileShareOpen, setProfileShareOpen] = useState(false);
  const [emblemPickerOpen, setEmblemPickerOpen] = useState(false);
  const [achievementsExpanded, setAchievementsExpanded] = useState(false);
  const [showRecentEvents, setShowRecentEvents] = useState(false);
  const [showMajorEvents, setShowMajorEvents] = useState(true);
  const [userBadges, setUserBadges] = useState<Achievement[]>([]);
  const [assignedBadgeIds, setAssignedBadgeIds] = useState<string[]>([]);
  const [friendCount, setFriendCount] = useState<number | null>(null);

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
      if (!cancelled) load(currentUser?.uid, currentUser?.email);
    });

    async function load(viewerUid?: string, viewerEmail?: string | null) {
      setState({ status: "loading" });

      try {
        let profile = await getProfileByUsername(username);

        // Fallback: if not found and looks like a display name (has spaces), try to resolve
        if (!profile && username.includes(" ")) {
          // Try username search first (matches searchName field)
          const results = await searchUsernames(username, 1);
          if (results.length > 0) {
            router.replace(`/player/${results[0].username}`);
            return;
          }
          // Try leaderboard display name lookup
          const userId = await findUserIdByDisplayName(username);
          if (userId) {
            profile = await getProfile(userId);
          }
        }

        if (cancelled) return;
        if (!profile) {
          setState({ status: "not_found" });
          return;
        }

        const isOwner = !!viewerUid && viewerUid === profile.uid;
        const viewerIsAdmin = viewerEmail ? await checkIsAdmin(viewerEmail) : false;

        if (!profile.isPublic && !isOwner && !viewerIsAdmin) {
          setState({ status: "private" });
          return;
        }

        // Hide from guests: if hideFromGuests is true and viewer is not logged in
        if (profile.hideFromGuests && !viewerUid && !viewerIsAdmin) {
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
          // Firestore permission-denied means the profile exists but is private
          const code = (err as { code?: string })?.code;
          if (code === "permission-denied") {
            setState({ status: "private" });
          } else {
            setState({ status: "error", message: err instanceof Error ? err.message : undefined });
          }
        }
      }
    }

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [username]);

  const profileUid = state.status === "loaded" ? state.profile.uid : "";

  useEffect(() => {
    if (!profileUid) return;
    getUserBadgeIds(profileUid).then((ids) => {
      setAssignedBadgeIds(ids);
      setUserBadges(getBadgesForIds(ids));
    }).catch(() => {});
  }, [profileUid]);

  // Admin: fetch friend count for the viewed profile
  useEffect(() => {
    if (!isAdmin || !profileUid) return;
    getFriendCount(profileUid).then(setFriendCount).catch(() => {});
  }, [isAdmin, profileUid]);

  const overall = useMemo(() => computeOverallStats(fm), [fm]);
  const heroStats = useMemo(() => computeHeroStats(fm), [fm]);
  const allOpponentStats = useMemo(() => computeOpponentStats(fm), [fm]);
  const opponentStats = useMemo(() => allOpponentStats.filter((o) => o.totalMatches >= 3), [allOpponentStats]);
  const eventStats = useMemo(() => computeEventStats(fm), [fm]);
  const recentEvents = useMemo(() => eventStats.slice(0, 5), [eventStats]);
  const sortedByDateDesc = useMemo(() =>
    [...fm].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      || getRoundNumber(b) - getRoundNumber(a)
      || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [fm]
  );
  const computedAchievements = useMemo(() => evaluateAchievements(fm, overall, heroStats, opponentStats), [fm, overall, heroStats, opponentStats]);
  const achievements = useMemo(() => [...userBadges, ...computedAchievements], [userBadges, computedAchievements]);
  const achievementProgress = useMemo(() => getAchievementProgress(fm, overall, heroStats, opponentStats), [fm, overall, heroStats, opponentStats]);
  const masteries = useMemo(() => computeHeroMastery(heroStats), [heroStats]);
  const bestFinish = useMemo(() => computeBestFinish(eventStats), [eventStats]);
  const playoffFinishes = useMemo(() => computePlayoffFinishes(eventStats), [eventStats]);
  const eventBadges = useMemo(() => computeEventBadges(eventStats, playoffFinishes), [eventStats, playoffFinishes]);
  const userRanks = useMemo(() => profileUid ? computeUserRanks(lbEntries, profileUid) : [], [lbEntries, profileUid]);
  const bestRank = useMemo(() => getBestRank(userRanks), [userRanks]);
  const lastUpdated = useMemo(() => {
    if (loadedMatches.length === 0) return null;
    let latest = loadedMatches[0].createdAt;
    for (const m of loadedMatches) {
      if (m.createdAt > latest) latest = m.createdAt;
    }
    return latest;
  }, [loadedMatches]);
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
        {isAdmin && !profile.isPublic && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-fab-dim/10 border border-fab-dim/20">
            <LockIcon className="w-4 h-4 text-fab-dim shrink-0" />
            <span className="text-xs font-semibold text-fab-dim">Private Profile — only visible to you (admin) and the owner</span>
          </div>
        )}
        <ProfileHeader profile={profile} isAdmin={isAdmin} isOwner={isOwner} isFavorited={!isOwner && !!currentUser && !isGuest && isFavorited(profile.uid)} onToggleFavorite={!isOwner && !!currentUser && !isGuest ? () => toggleFavorite(profile) : undefined} friendStatus={!isOwner && !!currentUser && !isGuest ? (isFriend(profile.uid) ? "friends" : hasSentRequest(profile.uid) ? "sent" : hasReceivedRequest(profile.uid) ? "received" : "none") : undefined} onFriendAction={!isOwner && !!currentUser && !isGuest ? () => { const fs = getFriendshipForUser(profile.uid); if (isFriend(profile.uid)) return; if (hasReceivedRequest(profile.uid) && fs) { acceptRequest(fs.id); } else if (!hasSentRequest(profile.uid)) { sendRequest(profile); } } : undefined} friendCount={isAdmin ? friendCount : undefined} />
        <div className="text-center py-16">
          <p className="text-fab-muted">This player hasn&apos;t logged any matches yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Two-column grid: Profile + Secondary Showcase (left) | Main Showcase (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left column */}
        <div className="flex flex-col gap-5 order-2 lg:order-1">
          {/* Profile Header */}
          <div
            className="bg-fab-surface border border-fab-border rounded-lg p-5"
            style={cardBorder ? { borderColor: cardBorder.border, boxShadow: cardBorder.shadow } : undefined}
          >
            {/* Admin: private profile banner */}
            {isAdmin && !profile.isPublic && (
              <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-fab-dim/10 border border-fab-dim/20">
                <LockIcon className="w-4 h-4 text-fab-dim shrink-0" />
                <span className="text-xs font-semibold text-fab-dim">Private Profile — only visible to you (admin) and the owner</span>
              </div>
            )}
            {/* Profile row + emblem */}
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <ProfileHeader profile={profile} bestRank={bestRank} isAdmin={isAdmin} isOwner={isOwner} isFavorited={!isOwner && !!currentUser && !isGuest && isFavorited(profile.uid)} onToggleFavorite={!isOwner && !!currentUser && !isGuest ? () => toggleFavorite(profile) : undefined} friendStatus={!isOwner && !!currentUser && !isGuest ? (isFriend(profile.uid) ? "friends" : hasSentRequest(profile.uid) ? "sent" : hasReceivedRequest(profile.uid) ? "received" : "none") : undefined} onFriendAction={!isOwner && !!currentUser && !isGuest ? () => { const fs = getFriendshipForUser(profile.uid); if (isFriend(profile.uid)) return; if (hasReceivedRequest(profile.uid) && fs) { acceptRequest(fs.id); } else if (!hasSentRequest(profile.uid)) { sendRequest(profile); } } : undefined} onShareCard={isOwner || isAdmin ? () => setProfileShareOpen(true) : undefined} friendCount={isAdmin ? friendCount : undefined} />
                </div>
                <BadgeStrip matchCount={matches.length} />
              </div>
              <EmblemDisplay emblemId={profile.selectedEmblem} isOwner={isOwner} onClick={() => setEmblemPickerOpen(true)} />
            </div>

            {/* Last updated */}
            {lastUpdated && (
              <p className="text-[10px] text-fab-dim mt-3 pt-3 border-t border-fab-border/50">
                Last updated {new Date(lastUpdated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            )}
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

          {/* Secondary Showcase (below profile card) */}
          <div className="flex-1">
            <ShowcaseSection
              profile={profile}
              isOwner={isOwner}
              matches={fm}
              heroStats={heroStats}
              masteries={masteries}
              eventStats={eventStats}
              playoffFinishes={playoffFinishes}
              opponentStats={allOpponentStats}
              overall={overall}
              achievements={achievements}
              storageField="showcaseSecondary"
              maxPoints={8}
              label="Pinned"
            />
          </div>
        </div>

        {/* Right column — Main Showcase */}
        <div className="order-1 lg:order-2">
          <ShowcaseSection
            profile={profile}
            isOwner={isOwner}
            matches={fm}
            heroStats={heroStats}
            masteries={masteries}
            eventStats={eventStats}
            playoffFinishes={playoffFinishes}
            opponentStats={allOpponentStats}
            overall={overall}
            achievements={achievements}
            storageField="showcase"
            maxPoints={12}
            label="Showcase"
          />
        </div>
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

      {/* Profile share card modal */}
      {emblemPickerOpen && isOwner && (
        <EmblemPicker
          currentEmblemId={profile.selectedEmblem}
          onSelect={async (emblemId) => {
            const val = emblemId || "";
            await updateProfile(profile.uid, { selectedEmblem: val });
            setState((prev) => prev.status === "loaded" ? { ...prev, profile: { ...prev.profile, selectedEmblem: val || undefined } } : prev);
          }}
          onClose={() => setEmblemPickerOpen(false)}
        />
      )}

      {profileShareOpen && (
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

      {/* Major Event Badges — collapsible */}
      {eventBadges.length > 0 && (
        <div className="bg-fab-surface/50 border border-fab-border rounded-lg overflow-hidden">
          <button
            onClick={() => setShowMajorEvents(!showMajorEvents)}
            className="w-full flex items-center justify-between px-4 py-3 group hover:bg-fab-surface/80 transition-colors"
          >
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-semibold text-fab-text">Major Events</h2>
              <span className="text-xs text-fab-dim">{eventBadges.length} event{eventBadges.length !== 1 ? "s" : ""}</span>
            </div>
            <svg
              className={`w-4 h-4 text-fab-muted group-hover:text-fab-text transition-transform ${showMajorEvents ? "rotate-180" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
          {showMajorEvents && (
            <div className="px-4 pb-4">
              <EventBadges badges={eventBadges} inline />
            </div>
          )}
        </div>
      )}

      {/* Admin badge management panel */}
      {isAdmin && !isOwner && profileUid && (
        <AdminBadgePanel
          userId={profileUid}
          assignedBadgeIds={assignedBadgeIds}
          onBadgeChange={(newIds) => {
            setAssignedBadgeIds(newIds);
            setUserBadges(getBadgesForIds(newIds));
          }}
        />
      )}

      {/* Achievements */}
      <AchievementShowcase earned={achievements} progress={achievementProgress} forceExpanded={achievementsExpanded} />

      {/* Hero Mastery — collapsible (built into HeroMasteryList) */}
      <HeroMasteryList masteries={masteries} />

      {/* Recent Events — collapsible */}
      {recentEvents.length > 0 && (
        <div className="bg-fab-surface/50 border border-fab-border rounded-lg overflow-hidden">
          <button
            onClick={() => setShowRecentEvents(!showRecentEvents)}
            className="w-full flex items-center justify-between px-4 py-3 group hover:bg-fab-surface/80 transition-colors"
          >
            <div className="flex items-center gap-2">
              <SwordsIcon className="w-4 h-4 text-red-400" />
              <h2 className="text-sm font-semibold text-fab-text">Recent Events</h2>
              <span className="text-xs text-fab-dim">{recentEvents.length} event{recentEvents.length !== 1 ? "s" : ""}</span>
            </div>
            <svg
              className={`w-4 h-4 text-fab-muted group-hover:text-fab-text transition-transform ${showRecentEvents ? "rotate-180" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
          {showRecentEvents && (
            <div className="px-4 pb-4 space-y-2">
              {recentEvents.map((event) => (
                <EventCard key={`${event.eventName}-${event.eventDate}`} event={event} playerName={username} obfuscateOpponents={!isOwner && !isAdmin} visibleOpponents={visibleOpponents} />
              ))}
            </div>
          )}
        </div>
      )}
      </>
      )}
    </div>
  );
}

function ProfileHeader({ profile, bestRank, isAdmin, isOwner, isFavorited, onToggleFavorite, friendStatus, onFriendAction, onShareCard, friendCount }: { profile: UserProfile; bestRank?: 1 | 2 | 3 | 4 | 5 | null; isAdmin?: boolean; isOwner?: boolean; isFavorited?: boolean; onToggleFavorite?: () => void; friendStatus?: "none" | "sent" | "received" | "friends"; onFriendAction?: () => void; onShareCard?: () => void; friendCount?: number | null }) {
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
        <div className="flex items-center gap-2 flex-wrap">
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
          {friendStatus && onFriendAction && (
            friendStatus === "friends" ? (
              <span className="p-1 text-fab-gold" title="Friends">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={0}>
                  <path d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </span>
            ) : friendStatus === "sent" ? (
              <span className="p-1 text-fab-dim cursor-default" title="Friend request sent">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
            ) : friendStatus === "received" ? (
              <button
                onClick={onFriendAction}
                className="p-1 rounded transition-colors hover:bg-fab-surface"
                title="Accept friend request"
              >
                <svg className="w-5 h-5 text-fab-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                </svg>
              </button>
            ) : (
              <button
                onClick={onFriendAction}
                className="p-1 rounded transition-colors hover:bg-fab-surface"
                title="Add friend"
              >
                <svg className="w-5 h-5 text-fab-dim hover:text-fab-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                </svg>
              </button>
            )
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
          {onShareCard && (
            <button
              onClick={onShareCard}
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
        <p className="text-sm text-fab-dim mb-1">
          @{profile.username}
          {!profile.isPublic && <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded bg-fab-dim/10 text-fab-dim">Private</span>}
        </p>
        {isAdmin && !isOwner && (
          <div className="flex items-center gap-3 mt-1">
            <Link
              href={`/inbox/${profile.uid}`}
              className="inline-flex items-center gap-1.5 text-xs text-fab-gold hover:text-fab-gold-light transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Message
            </Link>
            {friendCount !== null && friendCount !== undefined && (
              <span className="inline-flex items-center gap-1 text-xs text-fab-dim">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
                {friendCount} friend{friendCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


