"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { getProfileByUsername, getMatchesByUserId, updateProfile, searchUsernames, getProfile } from "@/lib/firestore-storage";
import { BadgeStrip } from "@/components/profile/BadgeStrip";
import { HeroShieldBadge } from "@/components/profile/HeroShieldBadge";
import { TeamBadge } from "@/components/profile/TeamBadge";
import { useTeamOnce } from "@/hooks/useTeam";
import { EmblemDisplay } from "@/components/profile/EmblemDisplay";
import { EmblemPicker } from "@/components/profile/EmblemPicker";
import { BadgeStripPicker } from "@/components/profile/BadgeStripPicker";
import { updateLeaderboardEntry, findUserIdByStaleUsername } from "@/lib/leaderboard";
import { computeOverallStats, computeHeroStats, computeEventStats, computeOpponentStats, computeBestFinish, computePlayoffFinishes, computeMinorEventFinishes, getEventType, getRoundNumber } from "@/lib/stats";
import { getEventTier, TIER_LABELS } from "@/lib/events";
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
import { computeEloRating, getEloTier } from "@/lib/elo";
import { checkIsAdmin, getAdminUid } from "@/lib/admin";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { computeUserRanks, getBestRank, rankBorderClass } from "@/lib/leaderboard-ranks";
import { QuestionCircleIcon, LockIcon, SwordsIcon, CalendarIcon } from "@/components/icons/NavIcons";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useFavorites";
import { useFriends } from "@/hooks/useFriends";
import { getFriendCount, getFriendship } from "@/lib/friends";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { BestFinishShareModal } from "@/components/profile/BestFinishCard";
import { ProfileShareModal } from "@/components/profile/ProfileCard";
import { BackgroundChooser } from "@/components/profile/BackgroundChooser";
import { ShowcaseSection } from "@/components/profile/ShowcaseSection";
import { KudosSection } from "@/components/profile/KudosSection";
import { CardBorderWrapper, BorderPicker, UnderlinePicker } from "@/components/profile/CardBorderWrapper";
import type { BorderStyleType, BorderSelection, UnderlineConfig, UnderlineSelection } from "@/components/profile/CardBorderWrapper";
import { loadKudosCounts, loadGivenKudos, loadKudosGivenCounts } from "@/lib/kudos";
import type { MatchRecord, UserProfile, Achievement } from "@/types";
import { MatchResult } from "@/types";
import { allHeroes as knownHeroes } from "@/lib/heroes";
import { localDate } from "@/lib/constants";
import { loadUserResult, loadStats as loadFabdokuStats } from "@/lib/fabdoku/firestore";
import { loadCardStats as loadFabdokuCardStats } from "@/lib/fabdoku/card-firestore";
import { loadStats as loadCrosswordPlayerStats } from "@/lib/crossword/firestore";
import { loadStats as loadHeroGuesserStats } from "@/lib/heroguesser/firestore";
import { loadStats as loadMatchupManiaStats } from "@/lib/matchupmania/firestore";
import { loadStats as loadTriviaStats } from "@/lib/trivia/firestore";
import { loadStats as loadTimelineStats } from "@/lib/timeline/firestore";
import { loadStats as loadConnectionsStats } from "@/lib/connections/firestore";
import { loadStats as loadRampageStats } from "@/lib/rhinarsrampage/firestore";
import { loadStats as loadKnockoutStats } from "@/lib/kayosknockout/firestore";
import { loadStats as loadBrawlStats } from "@/lib/brutebrawl/firestore";
import { loadStats as loadNinjaComboStats } from "@/lib/ninjacombo/firestore";
import { loadStats as loadShadowStrikeStats } from "@/lib/shadowstrike/firestore";
import { loadStats as loadBladeDashStats } from "@/lib/bladedash/firestore";
import type { FaBdokuStats } from "@/lib/fabdoku/types";
import type { CrosswordStats } from "@/lib/crossword/types";
import type { HeroGuesserStats } from "@/lib/heroguesser/types";
import type { MatchupManiaStats } from "@/lib/matchupmania/types";
import type { TriviaStats } from "@/lib/trivia/types";
import type { TimelineStats } from "@/lib/timeline/types";
import type { ConnectionsStats } from "@/lib/connections/types";
import type { RampageStats } from "@/lib/rhinarsrampage/types";
import type { KnockoutStats } from "@/lib/kayosknockout/types";
import type { BrawlStats } from "@/lib/brutebrawl/types";
import type { NinjaComboStats } from "@/lib/ninjacombo/types";
import type { ShadowStrikeStats } from "@/lib/shadowstrike/types";
import type { BladeDashStats } from "@/lib/bladedash/types";
import { getTodayDateStr } from "@/lib/fabdoku/puzzle-generator";
import { useCreators } from "@/hooks/useCreators";
import { hasUserSubmittedFeedback } from "@/lib/feedback";
import type { Creator } from "@/types";

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
  const { isAdmin, user: currentUser, isGuest, profile: myProfile, refreshProfile } = useAuth();
  const { entries: lbEntries } = useLeaderboard();
  const { isFavorited, toggleFavorite } = useFavorites();
  const { isFriend, hasSentRequest, hasReceivedRequest, getFriendshipForUser, sendRequest, acceptRequest } = useFriends();
  const creators = useCreators();
  const [filterFormat, setFilterFormat] = useState<string>("all");
  const [filterTier, setFilterTier] = useState<string>("all");
  const [filterRated, setFilterRated] = useState<string>("all");
  const [filterHero, setFilterHero] = useState<string>("all");
  const [showRawData, setShowRawData] = useState(false);
  const [bestFinishShareOpen, setBestFinishShareOpen] = useState(false);
  const [profileShareOpen, setProfileShareOpen] = useState(false);
  const [emblemPickerMode, setEmblemPickerMode] = useState<"talent" | "class" | null>(null);
  const [showBadgePicker, setShowBadgePicker] = useState(false);
  const [achievementsExpanded, setAchievementsExpanded] = useState(false);
  const [showRecentEvents, setShowRecentEvents] = useState(false);
  const [showMajorEvents, setShowMajorEvents] = useState(true);
  const [userBadges, setUserBadges] = useState<Achievement[]>([]);
  const [assignedBadgeIds, setAssignedBadgeIds] = useState<string[]>([]);
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);
  const [savingBackground, setSavingBackground] = useState(false);
  const [friendCount, setFriendCount] = useState<number | null>(null);
  const [kudosCounts, setKudosCounts] = useState<Record<string, number>>({});
  const [kudosGivenCounts, setKudosGivenCounts] = useState<Record<string, number>>({});
  const [kudosGivenByMe, setKudosGivenByMe] = useState<Set<string>>(new Set());
  const [adminKudosGiven, setAdminKudosGiven] = useState<Set<string>>(new Set());
  const [fabdokuScore, setFabdokuScore] = useState<number | null>(null);

  // All game stats bundled into a single state to avoid 15 cascading re-renders on load
  interface GameStatsBundle {
    fabdoku: FaBdokuStats | null;
    fabdokuCard: FaBdokuStats | null;
    crossword: CrosswordStats | null;
    heroGuesser: HeroGuesserStats | null;
    matchupMania: MatchupManiaStats | null;
    trivia: TriviaStats | null;
    timeline: TimelineStats | null;
    connections: ConnectionsStats | null;
    rampage: RampageStats | null;
    knockout: KnockoutStats | null;
    brawl: BrawlStats | null;
    ninjaCombo: NinjaComboStats | null;
    shadowStrike: ShadowStrikeStats | null;
    bladeDash: BladeDashStats | null;
  }
  const [gameStats, setGameStats] = useState<GameStatsBundle | null>(null);

  // Convenience aliases for backward compatibility with downstream code
  const fabdokuFullStats = gameStats?.fabdoku ?? null;
  const fabdokuCardFullStats = gameStats?.fabdokuCard ?? null;
  const crosswordFullStats = gameStats?.crossword ?? null;
  const heroGuesserFullStats = gameStats?.heroGuesser ?? null;
  const matchupManiaFullStats = gameStats?.matchupMania ?? null;
  const triviaFullStats = gameStats?.trivia ?? null;
  const timelineFullStats = gameStats?.timeline ?? null;
  const connectionsFullStats = gameStats?.connections ?? null;
  const rampageFullStats = gameStats?.rampage ?? null;
  const knockoutFullStats = gameStats?.knockout ?? null;
  const brawlFullStats = gameStats?.brawl ?? null;
  const ninjaComboFullStats = gameStats?.ninjaCombo ?? null;
  const shadowStrikeFullStats = gameStats?.shadowStrike ?? null;
  const bladeDashFullStats = gameStats?.bladeDash ?? null;

  const [gaveFeedback, setGaveFeedback] = useState(false);
  const [previewAsVisitor, setPreviewAsVisitor] = useState(false);
  const [editingSocials, setEditingSocials] = useState(false);
  const [editingBorder, setEditingBorder] = useState(false);
  const [editingUnderline, setEditingUnderline] = useState(false);
  const [socialDraft, setSocialDraft] = useState<{ twitter: string; discord: string; fabrary: string; fabraryName: string }>({ twitter: "", discord: "", fabrary: "", fabraryName: "" });
  const [discordCopied, setDiscordCopied] = useState(false);

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
      if (filterTier !== "all" && getEventTier(getEventType(m)) !== Number(filterTier)) return false;
      if (filterRated === "rated" && m.rated !== true) return false;
      if (filterRated === "unrated" && m.rated === true) return false;
      if (filterRated !== "all" && filterRated !== "rated" && filterRated !== "unrated" && getEventType(m) !== filterRated) return false;
      if (filterHero !== "all" && m.heroPlayed !== filterHero) return false;
      return true;
    });
  }, [loadedMatches, filterFormat, filterTier, filterRated, filterHero]);

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

        // Fallback: if not found, try to resolve stale/changed username
        if (!profile) {
          // Search usernames collection by name
          const results = await searchUsernames(username, 1);
          if (results.length > 0) {
            router.replace(`/player/${results[0].username}`);
            return;
          }
          // Search leaderboard by stale username or display name
          const userId = await findUserIdByStaleUsername(username);
          if (userId) {
            profile = await getProfile(userId);
            // If the profile has a valid username, redirect to it
            if (profile && profile.username && !profile.username.includes(" ")) {
              router.replace(`/player/${profile.username}`);
              return;
            }
          }
        }

        if (cancelled) return;
        if (!profile) {
          setState({ status: "not_found" });
          return;
        }

        const isOwner = !!viewerUid && viewerUid === profile.uid;
        const viewerIsAdmin = viewerEmail ? await checkIsAdmin(viewerEmail) : false;

        // Visibility check: public → anyone, friends → friends only, private → owner only
        const visibility = profile.profileVisibility ?? (profile.isPublic ? "public" : "private");
        if (visibility === "private" && !isOwner && !viewerIsAdmin) {
          setState({ status: "private" });
          return;
        }
        if (visibility === "friends" && !isOwner && !viewerIsAdmin) {
          if (!viewerUid) {
            setState({ status: "private" });
            return;
          }
          const friendship = await getFriendship(viewerUid, profile.uid);
          if (!friendship || friendship.status !== "accepted") {
            setState({ status: "private" });
            return;
          }
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

          // Populate social link draft for owner
          if (isOwner) {
            setSocialDraft({
              twitter: profile.socialLinks?.twitter || "",
              discord: profile.socialLinks?.discord || "",
              fabrary: profile.socialLinks?.fabrary || "",
              fabraryName: profile.socialLinks?.fabraryName || "",
            });
          }

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

  // Load kudos counts + given counts + which ones the current user has given + admin kudos
  useEffect(() => {
    if (!profileUid) return;
    loadKudosCounts(profileUid).then(setKudosCounts).catch(() => {});
    loadKudosGivenCounts(profileUid).then(setKudosGivenCounts).catch(() => {});
    if (currentUser?.uid && currentUser.uid !== profileUid) {
      loadGivenKudos(currentUser.uid, profileUid).then(setKudosGivenByMe).catch(() => {});
    }
    // Load admin's kudos for this player (for special border)
    getAdminUid().then((adminUid) => {
      if (adminUid) loadGivenKudos(adminUid, profileUid).then(setAdminKudosGiven).catch(() => {});
    }).catch(() => {});
  }, [profileUid, currentUser?.uid]);

  // Load today's fabdoku score + feedback immediately; defer game stats to idle time
  useEffect(() => {
    if (!profileUid) return;
    loadUserResult(profileUid, getTodayDateStr()).then((r) => setFabdokuScore(r?.score ?? null)).catch(() => {});
    hasUserSubmittedFeedback(profileUid).then(setGaveFeedback).catch(() => {});

    // Defer 14 game-stat Firestore reads until browser is idle
    const loadGameStats = () => {
      Promise.allSettled([
        loadFabdokuStats(profileUid),
        loadFabdokuCardStats(profileUid),
        loadCrosswordPlayerStats(profileUid),
        loadHeroGuesserStats(profileUid),
        loadMatchupManiaStats(profileUid),
        loadTriviaStats(profileUid),
        loadTimelineStats(profileUid),
        loadConnectionsStats(profileUid),
        loadRampageStats(profileUid),
        loadKnockoutStats(profileUid),
        loadBrawlStats(profileUid),
        loadNinjaComboStats(profileUid),
        loadShadowStrikeStats(profileUid),
        loadBladeDashStats(profileUid),
      ]).then(([fabdoku, fabdokuCard, crossword, heroGuesser, matchupMania, trivia, timeline, connections, rampage, knockout, brawl, ninjaCombo, shadowStrike, bladeDash]) => {
        const v = <T,>(r: PromiseSettledResult<T | undefined>): T | null =>
          r.status === "fulfilled" ? r.value ?? null : null;
        setGameStats({
          fabdoku: v(fabdoku),
          fabdokuCard: v(fabdokuCard),
          crossword: v(crossword),
          heroGuesser: v(heroGuesser),
          matchupMania: v(matchupMania),
          trivia: v(trivia),
          timeline: v(timeline),
          connections: v(connections),
          rampage: v(rampage),
          knockout: v(knockout),
          brawl: v(brawl),
          ninjaCombo: v(ninjaCombo),
          shadowStrike: v(shadowStrike),
          bladeDash: v(bladeDash),
        });
      });
    };

    if ("requestIdleCallback" in window) {
      const id = requestIdleCallback(loadGameStats, { timeout: 2000 });
      return () => cancelIdleCallback(id);
    } else {
      // Fallback: defer to next frame
      const id = setTimeout(loadGameStats, 100);
      return () => clearTimeout(id);
    }
  }, [profileUid]);

  // Admin: fetch friend count for the viewed profile
  useEffect(() => {
    if (!isAdmin || !profileUid) return;
    getFriendCount(profileUid).then(setFriendCount).catch(() => {});
  }, [isAdmin, profileUid]);

  const heroCompletion = useMemo(() => {
    const nonBye = fm.filter((m) => m.result !== MatchResult.Bye);
    if (nonBye.length === 0) return null;
    const withHero = nonBye.filter((m) => m.heroPlayed && m.heroPlayed !== "Unknown").length;
    return { withHero, total: nonBye.length, pct: Math.round((withHero / nonBye.length) * 100) };
  }, [fm]);
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
  const computedAchievements = useMemo(() => evaluateAchievements(fm, overall, heroStats, opponentStats, kudosCounts, fabdokuFullStats ?? undefined, heroGuesserFullStats ?? undefined, matchupManiaFullStats ?? undefined, triviaFullStats ?? undefined, timelineFullStats ?? undefined, connectionsFullStats ?? undefined, fabdokuCardFullStats ?? undefined, rampageFullStats ?? undefined, knockoutFullStats ?? undefined, brawlFullStats ?? undefined, ninjaComboFullStats ?? undefined, crosswordFullStats ?? undefined, shadowStrikeFullStats ?? undefined, bladeDashFullStats ?? undefined), [fm, overall, heroStats, opponentStats, kudosCounts, fabdokuFullStats, heroGuesserFullStats, matchupManiaFullStats, triviaFullStats, timelineFullStats, connectionsFullStats, fabdokuCardFullStats, rampageFullStats, knockoutFullStats, brawlFullStats, ninjaComboFullStats, crosswordFullStats, shadowStrikeFullStats, bladeDashFullStats]);
  const achievements = useMemo(() => [...userBadges, ...computedAchievements], [userBadges, computedAchievements]);
  const achievementProgress = useMemo(() => getAchievementProgress(fm, overall, heroStats, opponentStats, kudosCounts, fabdokuFullStats ?? undefined, heroGuesserFullStats ?? undefined, matchupManiaFullStats ?? undefined, triviaFullStats ?? undefined, timelineFullStats ?? undefined, connectionsFullStats ?? undefined, fabdokuCardFullStats ?? undefined, rampageFullStats ?? undefined, knockoutFullStats ?? undefined, brawlFullStats ?? undefined, ninjaComboFullStats ?? undefined, crosswordFullStats ?? undefined, shadowStrikeFullStats ?? undefined, bladeDashFullStats ?? undefined), [fm, overall, heroStats, opponentStats, kudosCounts, fabdokuFullStats, heroGuesserFullStats, matchupManiaFullStats, triviaFullStats, timelineFullStats, connectionsFullStats, fabdokuCardFullStats, rampageFullStats, knockoutFullStats, brawlFullStats, ninjaComboFullStats, crosswordFullStats, shadowStrikeFullStats, bladeDashFullStats]);
  const masteries = useMemo(() => computeHeroMastery(heroStats), [heroStats]);
  const bestFinish = useMemo(() => computeBestFinish(eventStats), [eventStats]);
  const playoffFinishes = useMemo(() => computePlayoffFinishes(eventStats), [eventStats]);
  const eventBadges = useMemo(() => computeEventBadges(eventStats, playoffFinishes), [eventStats, playoffFinishes]);
  const eloRating = useMemo(() => fm.length >= 10 ? computeEloRating(fm) : null, [fm]);
  const eloTier = useMemo(() => eloRating !== null ? getEloTier(eloRating) : null, [eloRating]);
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

  const creatorInfo = useMemo(() => {
    if (state.status !== "loaded") return null;
    return creators.find((c) => c.username === state.profile.username) ?? null;
  }, [creators, state]);

  // Card border = event tier color + placement intensity
  // User can select which event+placement combo to display
  const profileObj = state.status === "loaded" ? state.profile : null;
  const { team: profileTeamData } = useTeamOnce(profileObj?.teamId || null);
  const cardBorder = useMemo(() => {
    const tierStyle: Record<string, { border: string; shadow: string; rgb: string }> = {
      "Battle Hardened": { border: "#cd7f32", shadow: "0 0 8px rgba(205,127,50,0.25)", rgb: "205,127,50" },
      "The Calling": { border: "#60a5fa", shadow: "0 0 8px rgba(96,165,250,0.3)", rgb: "96,165,250" },
      Nationals: { border: "#f87171", shadow: "0 0 10px rgba(248,113,113,0.3)", rgb: "248,113,113" },
      "Pro Tour": { border: "#a78bfa", shadow: "0 0 12px rgba(167,139,250,0.35)", rgb: "167,139,250" },
      Worlds: { border: "#fbbf24", shadow: "0 0 12px rgba(251,191,36,0.4), 0 0 24px rgba(251,191,36,0.15)", rgb: "251,191,36" },
    };
    const placementRank: Record<string, number> = { top8: 1, top4: 2, finalist: 3, champion: 4 };
    const tierRank: Record<string, number> = { "Battle Hardened": 1, "The Calling": 2, Nationals: 3, "Pro Tour": 4, Worlds: 5 };

    // Check for user-selected border
    const selEvt = profileObj?.borderEventType;
    const selPl = profileObj?.borderPlacement;
    // User explicitly chose "none"
    if (selEvt === "" && selPl === "") return null;
    if (selEvt && selPl && tierStyle[selEvt]) {
      const hasFinish = isAdmin || playoffFinishes.some(f => f.eventType === selEvt && f.type === selPl);
      if (hasFinish) {
        return { ...tierStyle[selEvt], placement: placementRank[selPl] || 0 };
      }
    }

    // Default: best event tier + best placement
    let best: string | null = null;
    let bestScore = 0;
    let bestPlacement = 0;
    for (const f of playoffFinishes) {
      const score = tierRank[f.eventType] || 0;
      if (score > bestScore) { best = f.eventType; bestScore = score; }
      const pRank = placementRank[f.type] || 0;
      if (pRank > bestPlacement) bestPlacement = pRank;
    }
    if (!best) return null;
    return { ...tierStyle[best], placement: bestPlacement };
  }, [playoffFinishes, profileObj?.borderEventType, profileObj?.borderPlacement, isAdmin]);

  // Minor event finishes (Armory/Skirmish/RTN/PQ) for underline
  const minorFinishes = useMemo(() => computeMinorEventFinishes(eventStats), [eventStats]);

  // Underline config — same pattern as cardBorder
  const underlineConfig = useMemo((): UnderlineConfig | null => {
    const underlineStyle: Record<string, { color: string; rgb: string }> = {
      Armory:              { color: "#d4975a", rgb: "212,151,90" },
      Skirmish:            { color: "#93c5fd", rgb: "147,197,253" },
      "Road to Nationals": { color: "#fca5a5", rgb: "252,165,165" },
      ProQuest:            { color: "#c4b5fd", rgb: "196,181,253" },
    };
    const placementRank: Record<string, number> = { undefeated: 1, top8: 1, top4: 2, finalist: 3, champion: 4 };
    const tierRank: Record<string, number> = { Armory: 1, Skirmish: 2, "Road to Nationals": 3, ProQuest: 4 };

    // User explicitly chose "none"
    const selEvt = profileObj?.underlineEventType;
    const selPl = profileObj?.underlinePlacement;
    if (selEvt === "" && selPl === "") return null;

    // Check for user-selected underline
    if (selEvt && selPl && underlineStyle[selEvt]) {
      const hasFinish = isAdmin || minorFinishes.some(f => f.eventType === selEvt && f.type === selPl);
      if (hasFinish) {
        return { ...underlineStyle[selEvt], placement: placementRank[selPl] || 0 };
      }
    }

    // Default: best minor event tier + best placement
    let best: string | null = null;
    let bestScore = 0;
    let bestPlacement = 0;
    for (const f of minorFinishes) {
      const score = tierRank[f.eventType] || 0;
      if (score > bestScore) { best = f.eventType; bestScore = score; }
      const pRank = placementRank[f.type] || 0;
      if (pRank > bestPlacement) bestPlacement = pRank;
    }
    if (!best) return null;
    return { ...underlineStyle[best], placement: bestPlacement };
  }, [minorFinishes, profileObj?.underlineEventType, profileObj?.underlinePlacement, isAdmin]);

  if (state.status === "loading") {
    return (
      <div className="space-y-5">
        {/* Profile card skeleton */}
        <div className="bg-fab-surface/80 border border-fab-border rounded-xl p-5">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-fab-border/50 animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              {/* Name */}
              <div className="h-6 w-40 bg-fab-border/50 rounded animate-pulse" />
              {/* Username */}
              <div className="h-4 w-24 bg-fab-border/30 rounded animate-pulse" />
              {/* Badge strip */}
              <div className="flex gap-2 mt-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-fab-border/30 animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        </div>
        {/* Stat cards skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-fab-surface/60 border border-fab-border rounded-lg p-4 space-y-2">
              <div className="h-3 w-16 bg-fab-border/30 rounded animate-pulse" />
              <div className="h-7 w-12 bg-fab-border/50 rounded animate-pulse" />
            </div>
          ))}
        </div>
        {/* Match history skeleton */}
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-fab-surface/40 border border-fab-border rounded-lg p-4 h-16 animate-pulse" />
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

  const { profile, matches, isOwner: actualIsOwner } = state;
  const isOwner = actualIsOwner && !previewAsVisitor;

  const isFiltered = filterFormat !== "all" || filterTier !== "all" || filterRated !== "all" || filterHero !== "all";
  const activeFilterLabel = (() => {
    const parts: string[] = [];
    if (filterFormat !== "all") parts.push(filterFormat === "Classic Constructed" ? "CC" : filterFormat);
    if (filterTier !== "all") parts.push(TIER_LABELS[Number(filterTier)] || `Tier ${filterTier}`);
    if (filterRated === "rated") parts.push("Rated");
    else if (filterRated === "unrated") parts.push("Unrated");
    else if (filterRated !== "all") parts.push(filterRated);
    if (filterHero !== "all") parts.push(filterHero.split(",")[0]);
    return parts.length > 0 ? parts.join(" · ") : undefined;
  })();
  const { streaks } = overall;

  if (matches.length === 0) {
    return (
      <div className="space-y-8">
        {isOwner && (profile.profileVisibility === "private" || (!profile.profileVisibility && !profile.isPublic)) && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/25">
            <LockIcon className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs font-semibold text-amber-300">Your profile is private — only you can see it.</span>
            <Link href="/settings" className="text-[10px] text-fab-gold hover:underline ml-auto shrink-0">Settings</Link>
          </div>
        )}
        {isOwner && profile.profileVisibility === "friends" && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sky-500/10 border border-sky-500/25">
            <LockIcon className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="text-xs font-semibold text-sky-300">Your profile is friends-only — only your friends can see it.</span>
            <Link href="/settings" className="text-[10px] text-fab-gold hover:underline ml-auto shrink-0">Settings</Link>
          </div>
        )}
        {isAdmin && !isOwner && !profile.isPublic && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-fab-dim/10 border border-fab-dim/20">
            <LockIcon className="w-4 h-4 text-fab-dim shrink-0" />
            <span className="text-xs font-semibold text-fab-dim">Private Profile — only visible to you (admin) and the owner</span>
          </div>
        )}
        <ProfileHeader profile={profile} isAdmin={isAdmin} isOwner={isOwner} isFavorited={!isOwner && !!currentUser && !isGuest && isFavorited(profile.uid)} onToggleFavorite={!isOwner && !!currentUser && !isGuest ? () => toggleFavorite(profile) : undefined} friendStatus={!isOwner && !!currentUser && !isGuest ? (isFriend(profile.uid) ? "friends" : hasSentRequest(profile.uid) ? "sent" : hasReceivedRequest(profile.uid) ? "received" : "none") : undefined} onFriendAction={!isOwner && !!currentUser && !isGuest ? () => { const fs = getFriendshipForUser(profile.uid); if (isFriend(profile.uid)) return; if (hasReceivedRequest(profile.uid) && fs) { acceptRequest(fs.id); } else if (!hasSentRequest(profile.uid)) { sendRequest(profile); } } : undefined} friendCount={isAdmin ? friendCount : undefined} heroCompletion={heroCompletion} />
        <div className="text-center py-16">
          <p className="text-fab-muted">This player hasn&apos;t logged any matches yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Profile + Filters (always on top) */}
      <div className="space-y-5">
        {/* Profile Header */}
        <CardBorderWrapper cardBorder={cardBorder} borderStyle={profile.borderStyle || "beam"} underline={underlineConfig} contentClassName="bg-fab-surface/80 p-5 relative">
          {/* Owner: private/friends-only profile banner */}
          {isOwner && (profile.profileVisibility === "private" || (!profile.profileVisibility && !profile.isPublic)) && (
            <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/25">
              <LockIcon className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs font-semibold text-amber-300">Your profile is private — only you can see it.</span>
              <Link href="/settings" className="text-[10px] text-fab-gold hover:underline ml-auto shrink-0">Settings</Link>
            </div>
          )}
          {isOwner && profile.profileVisibility === "friends" && (
            <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-sky-500/10 border border-sky-500/25">
              <LockIcon className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="text-xs font-semibold text-sky-300">Your profile is friends-only — only your friends can see it.</span>
              <Link href="/settings" className="text-[10px] text-fab-gold hover:underline ml-auto shrink-0">Settings</Link>
            </div>
          )}
          {/* Admin: private profile banner */}
          {isAdmin && !isOwner && !profile.isPublic && (
            <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-fab-dim/10 border border-fab-dim/20">
              <LockIcon className="w-4 h-4 text-fab-dim shrink-0" />
              <span className="text-xs font-semibold text-fab-dim">Private Profile — only visible to you (admin) and the owner</span>
            </div>
          )}
          {/* View as visitor toggle */}
          {actualIsOwner && (
            <div className={`flex items-center justify-between mb-4 px-3 py-2 rounded-lg ${previewAsVisitor ? "bg-indigo-500/10 border border-indigo-500/25" : "border border-transparent"}`}>
              {previewAsVisitor && (
                <span className="text-xs font-medium text-indigo-300">Viewing as visitor</span>
              )}
              <button
                onClick={() => setPreviewAsVisitor((v) => !v)}
                className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors ${previewAsVisitor ? "text-indigo-300 hover:text-indigo-200 ml-auto" : "text-fab-dim hover:text-fab-text ml-auto"}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  {previewAsVisitor ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  )}
                </svg>
                {previewAsVisitor ? "Back to my view" : "View as visitor"}
              </button>
            </div>
          )}
          {isOwner && (
            <div className="flex justify-end mb-3">
              <button
                onClick={() => setShowBackgroundPicker(true)}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md border border-fab-border text-fab-dim hover:text-fab-text hover:border-fab-muted transition-colors"
                title="Change profile background"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15 5.159-5.159a2.25 2.25 0 0 1 3.182 0L15 14.25m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0L21.75 15m-10.5-6h.008v.008h-.008V9Zm-8.25 9h18a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5h-18A1.5 1.5 0 0 0 1.5 6v10.5A1.5 1.5 0 0 0 3 18Z" />
                </svg>
                Change Background
              </button>
            </div>
          )}
          {/* Profile row + emblem */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <ProfileHeader profile={profile} bestRank={bestRank} isAdmin={isAdmin} isOwner={isOwner} isFavorited={!actualIsOwner && !!currentUser && !isGuest && isFavorited(profile.uid)} onToggleFavorite={!actualIsOwner && !!currentUser && !isGuest ? () => toggleFavorite(profile) : undefined} friendStatus={!actualIsOwner && !!currentUser && !isGuest ? (isFriend(profile.uid) ? "friends" : hasSentRequest(profile.uid) ? "sent" : hasReceivedRequest(profile.uid) ? "received" : "none") : undefined} onFriendAction={!actualIsOwner && !!currentUser && !isGuest ? () => { const fs = getFriendshipForUser(profile.uid); if (isFriend(profile.uid)) return; if (hasReceivedRequest(profile.uid) && fs) { acceptRequest(fs.id); } else if (!hasSentRequest(profile.uid)) { sendRequest(profile); } } : undefined} onShareCard={actualIsOwner || isAdmin ? () => setProfileShareOpen(true) : undefined} friendCount={isAdmin ? friendCount : undefined} creator={creatorInfo} heroCompletion={heroCompletion} />
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {lastUpdated && (
                  <span className="text-[10px] text-fab-dim shrink-0">
                    Updated {new Date(lastUpdated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                )}
                <BadgeStrip selectedBadgeIds={profile.selectedBadgeIds} earnedAchievementIds={achievements.map((a) => a.id)} isOwner={isOwner && !previewAsVisitor} onEdit={() => setShowBadgePicker(true)} />
              </div>
              {/* Social links — always-visible inputs for owner, display-only for visitors */}
              {isOwner && !previewAsVisitor ? (
                <div className="mt-2 space-y-1.5">
                  <p className="text-[10px] text-fab-dim uppercase tracking-wider font-medium">Links</p>
                  <div className="flex flex-wrap gap-1.5">
                    <div className="flex items-center gap-1 bg-fab-bg border border-fab-border rounded-lg px-2 py-1">
                      <svg className="w-3 h-3 text-fab-dim shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                      <input type="text" placeholder="X handle" value={socialDraft.twitter} onChange={(e) => setSocialDraft((d) => ({ ...d, twitter: e.target.value }))}
                        className="w-20 bg-transparent text-[11px] text-fab-text placeholder:text-fab-dim focus:outline-none" />
                    </div>
                    <div className="flex items-center gap-1 bg-fab-bg border border-fab-border rounded-lg px-2 py-1">
                      <svg className="w-3 h-3 text-fab-dim shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z"/></svg>
                      <input type="text" placeholder="Discord" value={socialDraft.discord} onChange={(e) => setSocialDraft((d) => ({ ...d, discord: e.target.value }))}
                        className="w-20 bg-transparent text-[11px] text-fab-text placeholder:text-fab-dim focus:outline-none" />
                    </div>
                    <div className="flex items-center gap-1 bg-fab-bg border border-fab-border rounded-lg px-2 py-1">
                      <svg className="w-3 h-3 text-fab-dim shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
                      <input type="text" placeholder="Deck URL" value={socialDraft.fabrary} onChange={(e) => setSocialDraft((d) => ({ ...d, fabrary: e.target.value }))}
                        className="w-24 bg-transparent text-[11px] text-fab-text placeholder:text-fab-dim focus:outline-none" />
                    </div>
                    {socialDraft.fabrary.trim() && (
                      <div className="flex items-center gap-1 bg-fab-bg border border-fab-border rounded-lg px-2 py-1">
                        <input type="text" placeholder="Deck name" value={socialDraft.fabraryName} onChange={(e) => setSocialDraft((d) => ({ ...d, fabraryName: e.target.value }))}
                          className="w-20 bg-transparent text-[11px] text-fab-text placeholder:text-fab-dim focus:outline-none" />
                      </div>
                    )}
                  </div>
                  {(socialDraft.twitter !== (profile.socialLinks?.twitter || "") ||
                    socialDraft.discord !== (profile.socialLinks?.discord || "") ||
                    socialDraft.fabrary !== (profile.socialLinks?.fabrary || "") ||
                    socialDraft.fabraryName !== (profile.socialLinks?.fabraryName || "")) && (
                    <button
                      onClick={async () => {
                        const links: { twitter?: string; discord?: string; fabrary?: string; fabraryName?: string } = {};
                        if (socialDraft.twitter.trim()) links.twitter = socialDraft.twitter.trim().replace(/^@/, "");
                        if (socialDraft.discord.trim()) links.discord = socialDraft.discord.trim();
                        if (socialDraft.fabrary.trim()) links.fabrary = socialDraft.fabrary.trim();
                        if (socialDraft.fabraryName.trim()) links.fabraryName = socialDraft.fabraryName.trim();
                        await updateProfile(profile.uid, { socialLinks: Object.keys(links).length > 0 ? links : undefined });
                        setState((prev) => prev.status === "loaded" ? { ...prev, profile: { ...prev.profile, socialLinks: Object.keys(links).length > 0 ? links : undefined } } : prev);
                      }}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-fab-gold/20 text-fab-gold hover:bg-fab-gold/30 transition-colors"
                    >
                      Save Links
                    </button>
                  )}
                </div>
              ) : (profile.socialLinks?.twitter || profile.socialLinks?.discord || profile.socialLinks?.fabrary) ? (
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {profile.socialLinks?.twitter && (
                    <a href={`https://x.com/${profile.socialLinks.twitter.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] text-fab-muted hover:text-fab-text transition-colors">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                      <span>@{profile.socialLinks.twitter.replace(/^@/, "")}</span>
                    </a>
                  )}
                  {profile.socialLinks?.discord && (
                    <button
                      onClick={() => { navigator.clipboard.writeText(profile.socialLinks!.discord!); setDiscordCopied(true); setTimeout(() => setDiscordCopied(false), 2000); }}
                      className="flex items-center gap-1 text-[11px] text-fab-muted hover:text-fab-text transition-colors"
                      title="Copy Discord username"
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z"/></svg>
                      <span>{discordCopied ? "Copied!" : profile.socialLinks.discord}</span>
                    </button>
                  )}
                  {profile.socialLinks?.fabrary && (
                    <a href={profile.socialLinks.fabrary.startsWith("http") ? profile.socialLinks.fabrary : `https://fabrary.net/decks/${profile.socialLinks.fabrary}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] text-fab-muted hover:text-fab-text transition-colors">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
                      <span>{profile.socialLinks.fabraryName || "Deck"}</span>
                    </a>
                  )}
                </div>
              ) : null}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {/* Kudos — received counts with given counts inline (hidden on private profiles) */}
              {profile.isPublic && (
                <KudosSection
                  recipientId={profile.uid}
                  currentUserId={currentUser?.uid}
                  currentDisplayName={currentUser?.displayName || myProfile?.username || currentUser?.email?.split("@")[0] || undefined}
                  counts={kudosCounts}
                  givenCounts={kudosGivenCounts}
                  givenByMe={kudosGivenByMe}
                  onUpdate={(newCounts, newGiven) => {
                    setKudosCounts(newCounts);
                    setKudosGivenByMe(newGiven);
                  }}
                  inline
                  adminGiven={adminKudosGiven}
                  isAdmin={isAdmin}
                />
              )}
              <EmblemDisplay talentEmblemId={profile.selectedEmblem} classEmblemId={profile.selectedClassEmblem} isOwner={isOwner} onClickTalent={() => setEmblemPickerMode("talent")} onClickClass={() => setEmblemPickerMode("class")} />
            </div>
          </div>
          {/* Score badges — bottom right */}
          <div className="absolute bottom-2 right-3 flex items-center gap-1.5 z-10">
            {(kudosCounts.total ?? 0) > 0 && (
              <Link href="/leaderboard?tab=kudos_total" className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-fab-bg/80 border border-fab-border hover:border-fab-gold/40 transition-colors group" title="Total kudos received">
                <svg className="w-3 h-3 text-fab-dim group-hover:text-fab-gold transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V2.75a.75.75 0 0 1 .75-.75 2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23H5.904m10.598-9.75H14.25M5.904 18.5c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 0 1-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 9.953 4.167 9.5 5 9.5h1.053c.472 0 .745.556.5.96a8.958 8.958 0 0 0-1.302 4.665c0 1.194.232 2.333.654 3.375Z" />
                </svg>
                <span className="text-[10px] font-bold text-fab-dim group-hover:text-fab-gold transition-colors tabular-nums">{kudosCounts.total}</span>
              </Link>
            )}
            {(fabdokuScore !== null || (fabdokuFullStats?.gamesPlayed ?? 0) > 0) && (
              <Link href="/fabdoku" className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-fab-bg/80 border border-fab-border hover:border-fab-gold/40 transition-colors group" title={fabdokuScore !== null ? "Today's FaBdoku score" : "FaBdoku games played"}>
                <svg className="w-3 h-3 text-fab-dim group-hover:text-fab-gold transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="3" y1="15" x2="21" y2="15" />
                  <line x1="9" y1="3" x2="9" y2="21" />
                  <line x1="15" y1="3" x2="15" y2="21" />
                </svg>
                <span className="text-[10px] font-bold text-fab-dim group-hover:text-fab-gold transition-colors tabular-nums">
                  {fabdokuScore !== null ? `${fabdokuScore}/9` : `${(fabdokuFullStats?.gamesPlayed ?? 0)}g`}
                </span>
              </Link>
            )}
          </div>
          {/* Border picker toggle — inside card for owner with playoff finishes (admin gets all) */}
          {isOwner && (playoffFinishes.length > 0 || isAdmin) && (
            <div className="flex flex-col items-center gap-1 mt-1">
              <button
                onClick={() => setEditingBorder((v) => !v)}
                className="flex items-center gap-1 text-fab-muted hover:text-fab-gold transition-colors"
                title="Edit border style"
              >
                <span className="text-[9px] uppercase tracking-wider font-medium">Border</span>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                </svg>
              </button>
              {editingBorder && (
                <BorderPicker
                  playoffFinishes={isAdmin ? [
                    ...playoffFinishes,
                    ...["Battle Hardened", "The Calling", "Nationals", "Pro Tour", "Worlds"].flatMap(et =>
                      (["top8", "top4", "finalist", "champion"] as const).map(pl => ({ type: pl, eventType: et, eventName: `${et} (test)`, eventDate: "", format: "" }))
                    ),
                  ] : playoffFinishes}
                  current={{
                    eventType: profile.borderEventType || (() => { const tierRank: Record<string, number> = { "Battle Hardened": 1, "The Calling": 2, Nationals: 3, "Pro Tour": 4, Worlds: 5 }; let best = ""; let bestScore = 0; for (const f of playoffFinishes) { const s = tierRank[f.eventType] || 0; if (s > bestScore) { best = f.eventType; bestScore = s; } } return best; })(),
                    placement: profile.borderPlacement || (() => { const pr: Record<string, number> = { top8: 1, top4: 2, finalist: 3, champion: 4 }; let best = "top8"; let bestR = 0; for (const f of playoffFinishes) { const r = pr[f.type] || 0; if (r > bestR) { best = f.type; bestR = r; } } return best; })(),
                    style: (profile.borderStyle || "beam") as BorderStyleType,
                  }}
                  onChange={async (sel: BorderSelection) => {
                    await updateProfile(profile.uid, { borderStyle: sel.style, borderEventType: sel.eventType, borderPlacement: sel.placement });
                    setState((prev) => prev.status === "loaded" ? { ...prev, profile: { ...prev.profile, borderStyle: sel.style, borderEventType: sel.eventType, borderPlacement: sel.placement } } : prev);
                  }}
                />
              )}
            </div>
          )}
          {/* Underline picker toggle — inside card for owner with minor event finishes (admin gets all) */}
          {isOwner && (minorFinishes.length > 0 || isAdmin) && (
            <div className="flex flex-col items-center gap-1 mt-1">
              <button
                onClick={() => setEditingUnderline((v) => !v)}
                className="flex items-center gap-1 text-fab-muted hover:text-fab-gold transition-colors"
                title="Edit underline style"
              >
                <span className="text-[9px] uppercase tracking-wider font-medium">Underline</span>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                </svg>
              </button>
              {editingUnderline && (
                <UnderlinePicker
                  minorFinishes={isAdmin ? [
                    ...minorFinishes,
                    // Admin test combos — Armory only gets "undefeated", others get full placements
                    { type: "undefeated" as const, eventType: "Armory", eventName: "Armory (test)", eventDate: "", format: "" },
                    ...["Skirmish", "Road to Nationals", "ProQuest"].flatMap(et =>
                      (["top8", "top4", "finalist", "champion"] as const).map(pl => ({ type: pl, eventType: et, eventName: `${et} (test)`, eventDate: "", format: "" }))
                    ),
                  ] : minorFinishes}
                  current={{
                    eventType: profileObj?.underlineEventType ?? (() => { const tierRank: Record<string, number> = { Armory: 1, Skirmish: 2, "Road to Nationals": 3, ProQuest: 4 }; let best = ""; let bestScore = 0; for (const f of minorFinishes) { const s = tierRank[f.eventType] || 0; if (s > bestScore) { best = f.eventType; bestScore = s; } } return best; })(),
                    placement: profileObj?.underlinePlacement ?? (() => { const pr: Record<string, number> = { undefeated: 1, top8: 1, top4: 2, finalist: 3, champion: 4 }; let best = ""; let bestR = 0; for (const f of minorFinishes) { const r = pr[f.type] || 0; if (r > bestR) { best = f.type; bestR = r; } } return best; })(),
                  }}
                  onChange={async (sel: UnderlineSelection) => {
                    await updateProfile(profile.uid, { underlineEventType: sel.eventType, underlinePlacement: sel.placement });
                    setState((prev) => prev.status === "loaded" ? { ...prev, profile: { ...prev.profile, underlineEventType: sel.eventType, underlinePlacement: sel.placement } } : prev);
                  }}
                />
              )}
            </div>
          )}
        </CardBorderWrapper>

        {/* Creator spotlight card */}
        {creatorInfo && (
          <div className="bg-gradient-to-r from-fab-surface to-fab-surface/80 border border-fab-border rounded-lg px-4 py-3 overflow-hidden relative">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-fab-gold/40 to-transparent" />
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-fab-gold/10 flex items-center justify-center ring-1 ring-inset ring-fab-gold/20 shrink-0">
                <svg className="w-4 h-4 text-fab-gold" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.5 19h19v3h-19zM22.5 7l-5 4-5.5-7-5.5 7-5-4 2 12h17z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-fab-gold">Content Creator</span>
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${
                    creatorInfo.platform === "youtube" ? "text-red-400" :
                    creatorInfo.platform === "twitch" ? "text-purple-400" :
                    creatorInfo.platform === "twitter" ? "text-sky-400" : "text-emerald-400"
                  }`}>
                    {creatorInfo.platform === "twitter" ? "X" : creatorInfo.platform}
                  </span>
                </div>
                <p className="text-xs text-fab-muted truncate">{creatorInfo.description}</p>
              </div>
              <a
                href={creatorInfo.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                  creatorInfo.platform === "youtube" ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 ring-1 ring-inset ring-red-500/20" :
                  creatorInfo.platform === "twitch" ? "bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 ring-1 ring-inset ring-purple-500/20" :
                  creatorInfo.platform === "twitter" ? "bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 ring-1 ring-inset ring-sky-500/20" :
                  "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 ring-1 ring-inset ring-emerald-500/20"
                }`}
              >
                {creatorInfo.platform === "youtube" ? (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2 31.5 31.5 0 000 12a31.5 31.5 0 00.5 5.8 3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1A31.5 31.5 0 0024 12a31.5 31.5 0 00-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z" /></svg>
                ) : creatorInfo.platform === "twitch" ? (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" /></svg>
                ) : creatorInfo.platform === "twitter" ? (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                ) : (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" /></svg>
                )}
                {creatorInfo.platform === "youtube" ? "Watch" : creatorInfo.platform === "twitch" ? "Watch" : creatorInfo.platform === "twitter" ? "Follow" : "Visit"}
              </a>
            </div>
          </div>
        )}

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
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
            className="bg-fab-surface border border-fab-border text-fab-text text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-fab-gold"
          >
            <option value="all">All Tiers</option>
            {[4, 3, 2, 1].map((t) => (
              <option key={t} value={String(t)}>{TIER_LABELS[t]}</option>
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
      </div>

      {/* Two-column grid: Showcases side by side on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Pinned */}
        <div>
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
            leaderboardRanks={userRanks}
            storageField="showcaseSecondary"
            maxPoints={12}
            label="Pinned"
          />
        </div>

        {/* Main Showcase */}
        <div>
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
            leaderboardRanks={userRanks}
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
          {playoffFinishes.length > 0 && (
            <TrophyCase
              finishes={playoffFinishes}
              trophyDesigns={profile.trophyDesigns}
              isOwner={isOwner}
              isAdmin={isAdmin}
              onDesignChange={isOwner ? async (eventType, designIndex) => {
                const current = profile.trophyDesigns || {};
                const updated = { ...current, [eventType]: designIndex };
                // Remove default selections to keep storage clean
                if (designIndex === 0) delete updated[eventType];
                await updateProfile(profile.uid, { trophyDesigns: Object.keys(updated).length > 0 ? updated : undefined });
              } : undefined}
            />
          )}
          <ArmoryGarden eventStats={eventStats} ownerProfile={profile} isOwner={isOwner} />
        </div>
      )}

      {/* Admin Raw Data Modal */}
      {showRawData && isAdmin && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60" onClick={() => setShowRawData(false)}>
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
            onClick={() => { setFilterFormat("all"); setFilterTier("all"); setFilterRated("all"); setFilterHero("all"); }}
            className="mt-4 text-fab-gold hover:underline text-sm"
          >
            Clear Filters
          </button>
        </div>
      ) : (
      <>
      {/* Leaderboard Rankings */}
      <LeaderboardCrowns ranks={userRanks} />


      {/* Profile background picker modal */}
      {showBackgroundPicker && isOwner && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowBackgroundPicker(false)}>
          <div className="bg-fab-surface border border-fab-border rounded-xl max-w-3xl w-full mx-4 overflow-hidden max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-fab-border">
              <h3 className="text-sm font-semibold text-fab-text">Change Profile Background</h3>
              <button onClick={() => setShowBackgroundPicker(false)} className="text-fab-muted hover:text-fab-text transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <p className="text-xs text-fab-dim mb-3">
                Your selection applies site-wide for your account and appears when others view your profile.
              </p>
              <BackgroundChooser
                selectedId={profile.siteBackgroundId || "none"}
                isAdmin={isAdmin}
                disabled={savingBackground}
                onSelect={async (id) => {
                  if (savingBackground) return;
                  setSavingBackground(true);
                  try {
                    await updateProfile(profile.uid, { siteBackgroundId: id });
                    setState((prev) => prev.status === "loaded" ? { ...prev, profile: { ...prev.profile, siteBackgroundId: id } } : prev);
                    await refreshProfile().catch(() => {});
                  } finally {
                    setSavingBackground(false);
                  }
                }}
              />
              <p className="text-[10px] text-fab-dim mt-2">{savingBackground ? "Saving background..." : "Tip: more controls are available in Settings."}</p>
            </div>
          </div>
        </div>
      )}

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
      {showBadgePicker && isOwner && (
        <BadgeStripPicker
          earnedAchievements={achievements}
          currentSelectedIds={profile.selectedBadgeIds || []}
          onSave={async (ids) => {
            await updateProfile(profile.uid, { selectedBadgeIds: ids });
            setState((prev) => prev.status === "loaded" ? { ...prev, profile: { ...prev.profile, selectedBadgeIds: ids } } : prev);
          }}
          onClose={() => setShowBadgePicker(false)}
        />
      )}

      {emblemPickerMode && isOwner && (
        <EmblemPicker
          mode={emblemPickerMode}
          currentEmblemId={emblemPickerMode === "talent" ? profile.selectedEmblem : profile.selectedClassEmblem}
          onSelect={async (emblemId) => {
            const val = emblemId || "";
            const field = emblemPickerMode === "talent" ? "selectedEmblem" : "selectedClassEmblem";
            await updateProfile(profile.uid, { [field]: val });
            setState((prev) => prev.status === "loaded" ? { ...prev, profile: { ...prev.profile, [field]: val || undefined } } : prev);
          }}
          onClose={() => setEmblemPickerMode(null)}
        />
      )}

      {profileShareOpen && (
        <ProfileShareModal
          data={{
            playerName: profile.displayName,
            username: profile.username,
            photoUrl: profile.photoUrl,
            talentEmblemId: profile.selectedEmblem,
            classEmblemId: profile.selectedClassEmblem,
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
            underline: underlineConfig,
            bestRank,
            playoffFinishes,
            armoryCount: eventStats.filter(e => e.eventType === "Armory").length,
            armoryUndefeated: eventStats.filter(e => e.eventType === "Armory" && e.losses === 0 && e.wins > 0).length,
            isSiteCreator: profile.username === "azoni",
            selectedBadgeIds: profile.selectedBadgeIds,
            filterLabel: activeFilterLabel,
            teamName: profileTeamData?.name,
            teamIconUrl: profileTeamData?.iconUrl,
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

function ProfileHeader({ profile, bestRank, isAdmin, isOwner, isFavorited, onToggleFavorite, friendStatus, onFriendAction, onShareCard, friendCount, creator, heroCompletion }: { profile: UserProfile; bestRank?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | null; isAdmin?: boolean; isOwner?: boolean; isFavorited?: boolean; onToggleFavorite?: () => void; friendStatus?: "none" | "sent" | "received" | "friends"; onFriendAction?: () => void; onShareCard?: () => void; friendCount?: number | null; creator?: Creator | null; heroCompletion?: { withHero: number; total: number; pct: number } | null }) {
  const [linkCopied, setLinkCopied] = useState(false);
  const ringClass = rankBorderClass(bestRank ?? null);
  const isSiteCreator = profile.username === "azoni";
  const { team: profileTeam } = useTeamOnce(profile.teamId || null);
  return (
    <div className="flex items-center gap-4 flex-1 min-w-0">
      <div className="relative shrink-0">
        {isSiteCreator && (
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
          {profileTeam && <TeamBadge teamName={profileTeam.name} teamIconUrl={profileTeam.iconUrl} teamNameLower={profileTeam.nameLower} size="sm" isPrivate={profileTeam.visibility === "private"} isSiteAdmin={isAdmin} />}
          {heroCompletion && <HeroShieldBadge pct={heroCompletion.pct} size="md" withHero={heroCompletion.withHero} total={heroCompletion.total} />}
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
        {profileTeam && (
          <Link href={`/team/${profileTeam.nameLower}`} className="inline-flex items-center gap-1.5 text-xs text-fab-muted hover:text-fab-gold transition-colors mb-1">
            <TeamBadge teamName={profileTeam.name} teamIconUrl={profileTeam.iconUrl} size="xs" linkToTeam={false} isPrivate={profileTeam.visibility === "private"} isSiteAdmin={isAdmin} />
            {profileTeam.name}
          </Link>
        )}
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


