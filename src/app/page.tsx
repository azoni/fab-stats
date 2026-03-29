"use client";
import { useMemo, useEffect, useRef, useState, useCallback, useDeferredValue } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMatches } from "@/hooks/useMatches";
import { useAuth } from "@/contexts/AuthContext";
import { computeOverallStats, computeHeroStats, computeEventStats, computeOpponentStats, computeBestFinish, computePlayoffFinishes, computeMinorEventFinishes, computeTournamentAnalytics, getRoundNumber, getEventType, formatShortLabel } from "@/lib/stats";
import { getEventTier, TIER_LABELS } from "@/lib/events";
import { updateLeaderboardEntry } from "@/lib/leaderboard";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { computeUserRanks, getBestRank, rankBorderClass } from "@/lib/leaderboard-ranks";
import { computeMetaStats } from "@/lib/meta-stats";
import { RecentEvents } from "@/components/home/RecentEvents";
import { StatCards } from "@/components/home/StatCards";
import { LatestMatches } from "@/components/home/LatestMatches";
import { DashboardInsights } from "@/components/home/DashboardInsights";
import { DashboardFilters } from "@/components/home/DashboardFilters";
import { OnThisDay } from "@/components/home/OnThisDay";
import { ExploreCTA } from "@/components/home/ExploreCTA";
import { BadgeStrip } from "@/components/profile/BadgeStrip";
import { WinRateRing } from "@/components/charts/WinRateRing";
import { getHeroByName } from "@/lib/heroes";
import { HeroImg } from "@/components/heroes/HeroImg";
import { HeroShieldBadge } from "@/components/profile/HeroShieldBadge";
import { TeamBadge } from "@/components/profile/TeamBadge";
import { useTeamOnce } from "@/hooks/useTeam";
import { MatchResult } from "@/types";
import { Tooltip } from "@/components/ui/tooltip";
import { loadKudosCounts } from "@/lib/kudos";
import { CardBorderWrapper } from "@/components/profile/CardBorderWrapper";
import type { UnderlineConfig } from "@/components/profile/CardBorderWrapper";
import { updateProfile } from "@/lib/firestore-storage";
import { LoggedOutHome } from "@/components/home/LoggedOutHome";

// Modals — lazy-loaded (only rendered when opened)
const BestFinishShareModal = dynamic(() => import("@/components/profile/BestFinishCard").then(m => ({ default: m.BestFinishShareModal })), { ssr: false });
const ProfileShareModal = dynamic(() => import("@/components/profile/ProfileCard").then(m => ({ default: m.ProfileShareModal })), { ssr: false });
const BackgroundChooser = dynamic(() => import("@/components/profile/BackgroundChooser").then(m => ({ default: m.BackgroundChooser })), { ssr: false });
const TournamentShareModal = dynamic(() => import("@/components/tournament-stats/TournamentShareCard").then(m => ({ default: m.TournamentShareModal })), { ssr: false });
const TrendsShareModal = dynamic(() => import("@/components/trends/TrendsShareCard").then(m => ({ default: m.TrendsShareModal })), { ssr: false });

export default function Dashboard() {
  const router = useRouter();
  const { matches, isLoaded } = useMatches();
  const { user, profile, isAdmin, refreshProfile } = useAuth();
  const { team: myTeam } = useTeamOnce(profile?.teamId || null);
  const { entries: lbEntries } = useLeaderboard(true);
  const [shareCopied, setShareCopied] = useState(false);
  const [bestFinishShareOpen, setBestFinishShareOpen] = useState(false);
  const [profileShareOpen, setProfileShareOpen] = useState(false);
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);
  const [savingBackground, setSavingBackground] = useState(false);
  const [kudosTotal, setKudosTotal] = useState<number | null>(null);
  const [tournamentShareOpen, setTournamentShareOpen] = useState(false);
  const [statsShareOpen, setStatsShareOpen] = useState(false);
  const [filterFormat, setFilterFormat] = useState("all");
  const [filterEventType, setFilterEventType] = useState("all");
  const [filterTier, setFilterTier] = useState("all");
  const [filterHero, setFilterHero] = useState("all");
  const leaderboardUpdated = useRef(false);

  // Load kudos total for the current user
  useEffect(() => {
    if (!user) return;
    loadKudosCounts(user.uid).then((c) => setKudosTotal(c.total > 0 ? c.total : null)).catch(() => {});
  }, [user]);

  // Sync leaderboard entry when matches are loaded (throttled to every 10 min)
  useEffect(() => {
    if (!isLoaded || !profile || matches.length === 0 || leaderboardUpdated.current) return;
    const lastSync = localStorage.getItem("fab_lb_sync");
    if (lastSync && Date.now() - Number(lastSync) < 10 * 60 * 1000) return;
    leaderboardUpdated.current = true;
    updateLeaderboardEntry(profile, matches)
      .then(() => localStorage.setItem("fab_lb_sync", String(Date.now())))
      .catch(() => {});
  }, [isLoaded, profile, matches]);

  // Filtered matches
  const filteredMatches = useMemo(() => {
    let filtered = matches;
    if (filterFormat !== "all") filtered = filtered.filter((m) => m.format === filterFormat);
    if (filterEventType !== "all") filtered = filtered.filter((m) => getEventType(m) === filterEventType);
    if (filterTier !== "all") filtered = filtered.filter((m) => getEventTier(getEventType(m)) === Number(filterTier));
    if (filterHero !== "all") filtered = filtered.filter((m) => m.heroPlayed === filterHero);
    return filtered;
  }, [matches, filterFormat, filterEventType, filterTier, filterHero]);

  // Filter options — single pass: compute all three cross-filtered option lists at once
  const { allFormats, allEventTypes, allHeroes } = useMemo(() => {
    const formats = new Set<string>();
    const eventTypes = new Set<string>();
    const heroes = new Set<string>();

    for (const m of matches) {
      const matchFormat = m.format;
      const matchEventType = getEventType(m);
      const matchTier = getEventTier(matchEventType);
      const matchHero = m.heroPlayed;

      const passFormat = filterFormat === "all" || matchFormat === filterFormat;
      const passEventType = filterEventType === "all" || matchEventType === filterEventType;
      const passTier = filterTier === "all" || matchTier === Number(filterTier);
      const passHero = filterHero === "all" || matchHero === filterHero;

      // For each filter option list, include if all OTHER filters pass
      if (passEventType && passTier && passHero && matchFormat) formats.add(matchFormat);
      if (passFormat && passTier && passHero && matchEventType !== "Unknown") eventTypes.add(matchEventType);
      if (passFormat && passEventType && passTier && matchHero && matchHero !== "Unknown") heroes.add(matchHero);
    }

    return {
      allFormats: [...formats].sort(),
      allEventTypes: [...eventTypes].sort(),
      allHeroes: [...heroes].sort(),
    };
  }, [matches, filterFormat, filterEventType, filterTier, filterHero]);

  // Reset filters whose selected value is no longer available
  useEffect(() => {
    if (filterFormat !== "all" && !(allFormats as string[]).includes(filterFormat)) setFilterFormat("all");
    if (filterEventType !== "all" && !allEventTypes.includes(filterEventType)) setFilterEventType("all");
    if (filterHero !== "all" && !allHeroes.includes(filterHero)) setFilterHero("all");
  }, [allFormats, allEventTypes, allHeroes, filterFormat, filterEventType, filterHero]);

  // Defer heavy stat computations so the profile card renders immediately
  const deferredMatches = useDeferredValue(filteredMatches);
  const isStatsStale = deferredMatches !== filteredMatches;

  // Stats (filtered — uses deferred matches for lower-priority computation)
  const activeFilterLabel = useMemo(() => {
    const parts: string[] = [];
    if (filterFormat !== "all") parts.push(filterFormat === "Classic Constructed" ? "CC" : filterFormat);
    if (filterTier !== "all") parts.push(TIER_LABELS[Number(filterTier)] || `Tier ${filterTier}`);
    if (filterEventType !== "all") parts.push(filterEventType);
    if (filterHero !== "all") parts.push(filterHero.split(",")[0]);
    return parts.length > 0 ? parts.join(" · ") : undefined;
  }, [filterFormat, filterTier, filterEventType, filterHero]);

  const overall = useMemo(() => computeOverallStats(deferredMatches), [deferredMatches]);
  const heroStats = useMemo(() => computeHeroStats(deferredMatches), [deferredMatches]);
  const opponentStats = useMemo(() => computeOpponentStats(deferredMatches), [deferredMatches]);

  // Event stats (uses deferred matches for profile card borders, best finish)
  const filteredEventStats = useMemo(() => computeEventStats(deferredMatches), [deferredMatches]);
  const bestFinish = useMemo(() => computeBestFinish(filteredEventStats), [filteredEventStats]);
  const userRanks = useMemo(() => user ? computeUserRanks(lbEntries, user.uid) : [], [user, lbEntries]);
  const bestRank = useMemo(() => getBestRank(userRanks), [userRanks]);
  const heroCompletion = useMemo(() => {
    const nonBye = deferredMatches.filter((m) => m.result !== MatchResult.Bye);
    if (nonBye.length === 0) return null;
    const withHero = nonBye.filter((m) => m.heroPlayed && m.heroPlayed !== "Unknown").length;
    return { withHero, total: nonBye.length, pct: Math.round((withHero / nonBye.length) * 100) };
  }, [deferredMatches]);
  const topHero = useMemo(() => {
    const known = heroStats.filter((h) => h.heroName !== "Unknown");
    return known.length > 0 ? known[0] : null;
  }, [heroStats]);

  const sortedByDateDesc = useMemo(() =>
    [...deferredMatches].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      || getRoundNumber(b) - getRoundNumber(a)
      || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [deferredMatches]
  );
  const last30 = useMemo(() => sortedByDateDesc.slice(0, 30).reverse(), [sortedByDateDesc]);
  const latestMatches = useMemo(() => sortedByDateDesc.slice(0, 6), [sortedByDateDesc]);
  const playoffFinishes = useMemo(() => computePlayoffFinishes(filteredEventStats), [filteredEventStats]);
  const cardBorder = useMemo(() => {
    const tierRank: Record<string, number> = { "Battle Hardened": 1, "The Calling": 2, Nationals: 3, "Pro Tour": 4, Worlds: 5 };
    const tierStyle: Record<string, { border: string; shadow: string; rgb: string }> = {
      "Battle Hardened": { border: "#cd7f32", shadow: "0 0 8px rgba(205,127,50,0.25)", rgb: "205,127,50" },
      "The Calling": { border: "#60a5fa", shadow: "0 0 8px rgba(96,165,250,0.3)", rgb: "96,165,250" },
      Nationals: { border: "#f87171", shadow: "0 0 10px rgba(248,113,113,0.3)", rgb: "248,113,113" },
      "Pro Tour": { border: "#a78bfa", shadow: "0 0 12px rgba(167,139,250,0.35)", rgb: "167,139,250" },
      Worlds: { border: "#fbbf24", shadow: "0 0 12px rgba(251,191,36,0.4), 0 0 24px rgba(251,191,36,0.15)", rgb: "251,191,36" },
    };
    const placementRank: Record<string, number> = { top8: 1, top4: 2, finalist: 3, champion: 4 };

    // Check for user-selected border
    const selEvt = profile?.borderEventType;
    const selPl = profile?.borderPlacement;
    if (selEvt && selPl && tierStyle[selEvt]) {
      const hasFinish = playoffFinishes.some(f => f.eventType === selEvt && f.type === selPl);
      if (hasFinish) return { ...tierStyle[selEvt], placement: placementRank[selPl] || 0 };
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
  }, [playoffFinishes, profile?.borderEventType, profile?.borderPlacement]);

  // Minor event finishes (Armory/Skirmish/RTN/PQ) for underline
  const minorFinishes = useMemo(() => computeMinorEventFinishes(filteredEventStats), [filteredEventStats]);
  const underlineConfig = useMemo((): UnderlineConfig | null => {
    const underlineStyle: Record<string, { color: string; rgb: string }> = {
      Armory:              { color: "#d4975a", rgb: "212,151,90" },
      Skirmish:            { color: "#93c5fd", rgb: "147,197,253" },
      "Road to Nationals": { color: "#fca5a5", rgb: "252,165,165" },
      ProQuest:            { color: "#c4b5fd", rgb: "196,181,253" },
    };
    const placementRank: Record<string, number> = { undefeated: 1, top8: 1, top4: 2, finalist: 3, champion: 4 };
    const tierRank: Record<string, number> = { Armory: 1, Skirmish: 2, "Road to Nationals": 3, ProQuest: 4 };

    const selEvt = profile?.underlineEventType;
    const selPl = profile?.underlinePlacement;
    if (selEvt === "" && selPl === "") return null;

    if (selEvt && selPl && underlineStyle[selEvt]) {
      const hasFinish = minorFinishes.some(f => f.eventType === selEvt && f.type === selPl);
      if (hasFinish) return { ...underlineStyle[selEvt], placement: placementRank[selPl] || 0 };
    }

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
  }, [minorFinishes, profile?.underlineEventType, profile?.underlinePlacement]);

  // Tournament analytics (from filtered rated events)
  const tournamentAnalytics = useMemo(() => {
    const ratedEvents = filteredEventStats.filter(e => e.rated);
    return ratedEvents.length > 0 ? computeTournamentAnalytics(ratedEvents) : null;
  }, [filteredEventStats]);

  // Community meta (compact — top 3 heroes for mini widget)
  const communityMeta = useMemo(() => computeMetaStats(lbEntries), [lbEntries]);


  if (!isLoaded) {
    return <DashboardSkeleton />;
  }

  const hasMatches = matches.length > 0;
  const { streaks } = overall;

  return (
    <div className="relative space-y-8">
      {/* Ambient page glow — subtle gold atmosphere at the top */}
      <div className="pointer-events-none absolute inset-x-0 -top-24 h-72 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(201,168,76,0.06),transparent)]" />

      {/* No matches: logged-out / new user landing page */}
      {!hasMatches && (
        <LoggedOutHome user={user} communityMeta={communityMeta} lbEntries={lbEntries} />
      )}


      {/* On This Day — above profile card */}
      {hasMatches && <OnThisDay matches={matches} />}

      {/* Has matches: profile + stats */}
      {hasMatches && (
        <div className="flex flex-col gap-6">
          {/* Filters */}
          <div className="section-reveal" style={{ '--stagger': 0 } as React.CSSProperties}>
          <DashboardFilters
            formats={allFormats}
            eventTypes={allEventTypes}
            heroes={allHeroes}
            filterFormat={filterFormat}
            filterEventType={filterEventType}
            filterTier={filterTier}
            filterHero={filterHero}
            onFormatChange={setFilterFormat}
            onEventTypeChange={setFilterEventType}
            onTierChange={setFilterTier}
            onHeroChange={setFilterHero}
          />
          </div>

          {/* Profile Card + My Stats — side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 section-reveal" style={{ '--stagger': 1 } as React.CSSProperties}>
            {/* Profile Card */}
            <CardBorderWrapper cardBorder={cardBorder} borderStyle={profile?.borderStyle || "beam"} underline={underlineConfig} contentClassName="bg-fab-surface rounded-lg overflow-hidden">
              <div className="cursor-pointer" onClick={() => { if (profile?.username) router.push(`/player/${profile.username}`); }}>
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-fab-border/50">
                <p className="text-sm font-semibold text-fab-text">My Profile</p>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {profile?.username && (
                    <button onClick={() => setProfileShareOpen(true)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-fab-gold border border-fab-gold/30 hover:bg-fab-gold/10 hover:border-fab-gold/50 px-2.5 py-1 rounded-md transition-colors">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                      </svg>
                      Share
                    </button>
                  )}
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-3">
                  {profile ? (
                    <div className="relative shrink-0">
                      {profile.username === "azoni" && (
                        <svg className="absolute -top-3 left-1/2 -translate-x-1/2 w-5 h-5 text-fab-gold drop-shadow-[0_0_6px_rgba(201,168,76,0.6)] z-10" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M2.5 19h19v3h-19zM22.5 7l-5 4-5.5-7-5.5 7-5-4 2 12h17z" />
                        </svg>
                      )}
                      {profile.photoUrl ? (
                        <img src={profile.photoUrl} alt="" className={`w-12 h-12 rounded-full ${rankBorderClass(bestRank ?? null)}`} />
                      ) : (
                        <div className={`w-12 h-12 rounded-full bg-fab-gold/20 flex items-center justify-center text-fab-gold text-lg font-bold ${rankBorderClass(bestRank ?? null)}`}>
                          {profile.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  ) : null}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-base font-bold text-fab-gold truncate">{profile?.displayName || "My Profile"}</p>
                      {myTeam && <TeamBadge teamName={myTeam.name} teamIconUrl={myTeam.iconUrl} teamNameLower={myTeam.nameLower} size="xs" />}
                      {heroCompletion && <HeroShieldBadge pct={heroCompletion.pct} withHero={heroCompletion.withHero} total={heroCompletion.total} />}
                    </div>
                    <BadgeStrip selectedBadgeIds={profile?.selectedBadgeIds} className="mt-1" />
                  </div>
                  {topHero && (
                    <div className="flex items-center gap-2 shrink-0">
                      <HeroImg name={topHero.heroName} size="md" />
                      <div className="text-right">
                        <p className="text-xs font-semibold text-fab-text">{topHero.heroName.split(",")[0]}</p>
                        <p className={`text-xs font-bold ${topHero.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>{topHero.winRate.toFixed(0)}%</p>
                      </div>
                    </div>
                  )}
                </div>
                {heroCompletion && heroCompletion.total > 0 && (
                  <Tooltip content={`${heroCompletion.withHero} of ${heroCompletion.total} matches have hero data — click to view matches`} delayDuration={100}>
                  <Link
                    href="/matches"
                    onClick={(e) => e.stopPropagation()}
                    className="mt-2 flex items-center gap-2 group/hc"
                  >
                    <div className="flex-1 h-1.5 rounded-full bg-fab-bg overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${heroCompletion.pct === 100 ? "bg-fab-win" : heroCompletion.pct >= 75 ? "bg-fab-gold" : "bg-fab-loss"}`}
                        style={{ width: `${heroCompletion.pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-fab-dim group-hover/hc:text-fab-muted whitespace-nowrap tabular-nums transition-colors">
                      {heroCompletion.withHero}/{heroCompletion.total} ({heroCompletion.pct}%)
                    </span>
                  </Link>
                  </Tooltip>
                )}
              </div>
              </div>
            </CardBorderWrapper>

            {/* My Stats */}
            <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden cursor-pointer hover:border-fab-gold/20 transition-colors" onClick={() => router.push("/trends")}>
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-fab-border/50">
                <Link href="/trends" onClick={(e) => e.stopPropagation()} className="text-sm font-semibold text-fab-text hover:text-fab-gold transition-colors">
                  My Stats <span className="text-fab-dim">&rarr;</span>
                </Link>
                {profile && (
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setStatsShareOpen(true)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-fab-gold border border-fab-gold/30 hover:bg-fab-gold/10 hover:border-fab-gold/50 px-2.5 py-1 rounded-md transition-colors">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                      </svg>
                      Share
                    </button>
                    <Link href="/trends" onClick={(e) => e.stopPropagation()} className="text-xs font-semibold text-fab-gold border border-fab-gold/30 hover:bg-fab-gold/10 hover:border-fab-gold/50 px-2.5 py-1 rounded-md transition-colors">
                      My Stats &rarr;
                    </Link>
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                  {/* Win Rate — large */}
                  <div className="text-center">
                    <p className={`text-3xl font-black tabular-nums ${overall.overallWinRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
                      {overall.overallWinRate.toFixed(1)}%
                    </p>
                    <p className="text-[10px] text-fab-text/50 uppercase tracking-wider font-semibold">Win Rate</p>
                  </div>
                  {/* Record */}
                  <div className="text-center">
                    <p className="text-lg font-bold tabular-nums text-fab-text">
                      <span className="text-fab-win">{overall.totalWins}</span>
                      <span className="text-fab-dim">-</span>
                      <span className="text-fab-loss">{overall.totalLosses}</span>
                      {overall.totalDraws > 0 && <><span className="text-fab-dim">-</span><span className="text-fab-muted">{overall.totalDraws}</span></>}
                    </p>
                    <p className="text-[10px] text-fab-text/50 uppercase tracking-wider font-semibold">Record</p>
                  </div>
                  {/* Matches */}
                  <div className="text-center">
                    <p className="text-lg font-black tabular-nums text-fab-text">{overall.totalMatches + overall.totalByes}</p>
                    <p className="text-[10px] text-fab-text/50 uppercase tracking-wider font-semibold">Matches</p>
                  </div>
                  {/* Byes */}
                  {overall.totalByes > 0 && (
                    <div className="text-center">
                      <p className="text-lg font-black tabular-nums text-fab-text">{overall.totalByes}</p>
                      <p className="text-[10px] text-fab-text/50 uppercase tracking-wider font-semibold">Byes</p>
                    </div>
                  )}
                  {/* Events */}
                  <div className="text-center">
                    <p className="text-lg font-black tabular-nums text-fab-text">{filteredEventStats.length}</p>
                    <p className="text-[10px] text-fab-text/50 uppercase tracking-wider font-semibold">Events</p>
                  </div>
                  {/* Best Finish */}
                  {bestFinish && (
                    <div className="text-center">
                      <p className="text-lg font-black text-fab-gold">{bestFinish.label}</p>
                      <p className="text-[10px] text-fab-text/50 uppercase tracking-wider font-semibold">Best Finish</p>
                    </div>
                  )}
                  {/* Streak */}
                  {streaks.currentStreak && streaks.currentStreak.count >= 2 && (
                    <div className="text-center">
                      <p className={`text-lg font-black ${streaks.currentStreak.type === "win" ? "text-fab-win" : "text-fab-loss"}`}>
                        {streaks.currentStreak.count}{streaks.currentStreak.type === "win" ? "W" : "L"}
                      </p>
                      <p className="text-[10px] text-fab-text/50 uppercase tracking-wider font-semibold">Streak</p>
                    </div>
                  )}
                </div>
              {/* Recent form dots */}
              {last30.length > 0 && (
                <div className="flex items-center gap-0.5 mt-3">
                  <span className="text-[9px] text-fab-dim uppercase tracking-wider font-semibold mr-2">Recent</span>
                  {last30.slice(-15).map((m, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full ${
                        m.result === "win" ? "bg-fab-win" : m.result === "loss" ? "bg-fab-loss" : m.result === "draw" ? "bg-fab-draw" : "bg-fab-dim"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
          </div>

          {/* Tournament Stats Card */}
          {tournamentAnalytics && tournamentAnalytics.totalEvents >= 3 && (
            <div className="section-reveal" style={{ '--stagger': 2 } as React.CSSProperties}>
              <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden cursor-pointer hover:border-fab-gold/20 transition-colors" onClick={() => router.push("/tournament-stats")}>
                <Link href="/tournament-stats" className="flex items-center justify-between px-4 py-2.5 border-b border-fab-border/50 hover:bg-fab-surface-hover transition-colors">
                  <p className="text-sm font-semibold text-fab-text">Tournament Stats</p>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setTournamentShareOpen(true); }}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-fab-gold/15 text-fab-gold text-xs font-semibold hover:bg-fab-gold/25 transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                      </svg>
                      Share
                    </button>
                    <span className="text-xs font-semibold text-fab-gold border border-fab-gold/30 hover:bg-fab-gold/10 hover:border-fab-gold/50 px-2.5 py-1 rounded-md transition-colors">
                      Tournament stats &rarr;
                    </span>
                  </div>
                </Link>
                <div className="p-4 flex flex-col sm:flex-row items-center gap-4 sm:gap-5">
                  {/* R1 Win Rate Ring */}
                  <Link href="/tournament-stats" className="shrink-0 text-center hover:opacity-80 transition-opacity" title="Your win rate in Round 1 of rated events">
                    <WinRateRing value={tournamentAnalytics.r1WinRate} size={56} strokeWidth={5} label={`${Math.round(tournamentAnalytics.r1WinRate)}%`} />
                    <p className="text-[10px] text-fab-muted font-medium mt-1">Win R1</p>
                  </Link>
                  {/* Key stats */}
                  <div className="flex-1 w-full grid grid-cols-3 sm:grid-cols-6 gap-x-3 gap-y-2.5 text-center sm:text-left">
                    {/* Row 1: Overview */}
                    <div title="Total rated events played">
                      <p className="text-lg font-bold text-fab-text tabular-nums">{tournamentAnalytics.totalEvents}</p>
                      <p className="text-[10px] text-fab-muted">Events</p>
                    </div>
                    <div title={`${tournamentAnalytics.totalMatches} matches across all rated events`}>
                      <p className={`text-lg font-bold tabular-nums ${tournamentAnalytics.overallWinRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>{tournamentAnalytics.overallWinRate.toFixed(1)}%</p>
                      <p className="text-[10px] text-fab-muted">Win Rate</p>
                    </div>
                    <div title="Tournament wins (champion)">
                      <p className="text-lg font-bold text-fab-gold tabular-nums">{tournamentAnalytics.championCount || <span className="text-fab-dim">N/A</span>}</p>
                      <p className="text-[10px] text-fab-muted">Wins</p>
                    </div>
                    <div title="Events where you reached the finals">
                      <p className="text-lg font-bold text-fab-text tabular-nums">{tournamentAnalytics.finalistCount || <span className="text-fab-dim">N/A</span>}</p>
                      <p className="text-[10px] text-fab-muted">Finals</p>
                    </div>
                    <div title="Top 4 finishes">
                      <p className="text-lg font-bold text-fab-text tabular-nums">{tournamentAnalytics.top4Count || <span className="text-fab-dim">N/A</span>}</p>
                      <p className="text-[10px] text-fab-muted">Top 4s</p>
                    </div>
                    <div title={`Made top 8 in ${tournamentAnalytics.top8Count} of ${tournamentAnalytics.totalEvents} events (${Math.round(tournamentAnalytics.top8Rate)}%)`}>
                      <p className="text-lg font-bold text-fab-text tabular-nums">{tournamentAnalytics.top8Count}</p>
                      <p className="text-[10px] text-fab-muted">Top 8s</p>
                    </div>
                    {/* Row 2: Deep stats */}
                    <div title="Most consecutive match wins across all events">
                      <p className="text-lg font-bold text-fab-text tabular-nums">{tournamentAnalytics.longestCrossEventWinStreak || <span className="text-fab-dim">N/A</span>}</p>
                      <p className="text-[10px] text-fab-muted">Best Win Streak</p>
                    </div>
                    <div title={`Went undefeated through swiss ${tournamentAnalytics.undefeatedSwissCount} time${tournamentAnalytics.undefeatedSwissCount === 1 ? "" : "s"}`}>
                      <p className={`text-lg font-bold tabular-nums ${tournamentAnalytics.undefeatedSwissCount > 0 ? "text-fab-win" : "text-fab-dim"}`}>{tournamentAnalytics.undefeatedSwissCount || <span className="text-fab-dim">N/A</span>}</p>
                      <p className="text-[10px] text-fab-muted">Undefeated Swiss</p>
                    </div>
                    <div title="Lost Round 1 but still made top 8">
                      <p className="text-lg font-bold text-fab-text tabular-nums">{tournamentAnalytics.submarineCount || <span className="text-fab-dim">N/A</span>}</p>
                      <p className="text-[10px] text-fab-muted">Submarines</p>
                    </div>
                    <div title="Most consecutive events making top 8">
                      <p className="text-lg font-bold text-fab-text tabular-nums">{tournamentAnalytics.consecutiveTop8s || <span className="text-fab-dim">N/A</span>}</p>
                      <p className="text-[10px] text-fab-muted">Consec. Top 8s</p>
                    </div>
                    <div title="Most consecutive tournament wins (champion)">
                      <p className="text-lg font-bold text-fab-gold tabular-nums">{tournamentAnalytics.consecutiveEventWins || <span className="text-fab-dim">N/A</span>}</p>
                      <p className="text-[10px] text-fab-muted">Consec. Wins</p>
                    </div>
                    <div title={`You make top 8 in ${Math.round(tournamentAnalytics.top8Rate)}% of your events`}>
                      <p className="text-lg font-bold text-fab-text tabular-nums">{Math.round(tournamentAnalytics.top8Rate)}%</p>
                      <p className="text-[10px] text-fab-muted">Top 8 Rate</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* RecentEvents + Opponents */}
          <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-4 section-reveal" style={{ '--stagger': 3 } as React.CSSProperties}>
            <RecentEvents eventStats={filteredEventStats} playerName={profile?.displayName} />
            <DashboardInsights heroStats={heroStats} opponentStats={opponentStats} matches={filteredMatches} />
          </div>

          <div className="section-reveal" style={{ '--stagger': 5 } as React.CSSProperties}>
            <ExploreCTA />
          </div>
        </div>
      )}

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
            talentEmblemId: profile.selectedEmblem,
            classEmblemId: profile.selectedClassEmblem,
            wins: overall.totalWins,
            losses: overall.totalLosses,
            draws: overall.totalDraws,
            byes: overall.totalByes,
            winRate: overall.overallWinRate,
            events: filteredEventStats.length,
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
            armoryCount: filteredEventStats.filter(e => e.eventType === "Armory").length,
            armoryUndefeated: filteredEventStats.filter(e => e.eventType === "Armory" && e.losses === 0 && e.wins > 0).length,
            isSiteCreator: profile.username === "azoni",
            selectedBadgeIds: profile?.selectedBadgeIds,
            filterLabel: activeFilterLabel,
            teamName: myTeam?.name,
            teamIconUrl: myTeam?.iconUrl,
          }}
          onClose={() => setProfileShareOpen(false)}
        />
      )}

      {showBackgroundPicker && user && profile && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowBackgroundPicker(false)}>
          <div className="bg-fab-surface border border-fab-border rounded-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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
                This is the background others will see when they visit your profile.
              </p>
              <BackgroundChooser
                selectedId={profile.siteBackgroundId || "none"}
                isAdmin={isAdmin}
                disabled={savingBackground}
                onSelect={async (id) => {
                  if (savingBackground) return;
                  setSavingBackground(true);
                  try {
                    await updateProfile(user.uid, { siteBackgroundId: id });
                    await refreshProfile().catch(() => {});
                  } finally {
                    setSavingBackground(false);
                  }
                }}
              />
              <p className="text-[10px] text-fab-dim mt-2">{savingBackground ? "Saving background..." : "Tip: this applies site-wide for your own account view too."}</p>
            </div>
          </div>
        </div>
      )}

      {tournamentShareOpen && tournamentAnalytics && profile && (
        <TournamentShareModal
          data={{
            playerName: profile.displayName,
            totalEvents: tournamentAnalytics.totalEvents,
            totalMatches: tournamentAnalytics.totalMatches,
            overallWinRate: tournamentAnalytics.overallWinRate,
            r1WinRate: tournamentAnalytics.r1WinRate,
            r1Wins: tournamentAnalytics.r1Wins,
            r1Losses: tournamentAnalytics.r1Losses,
            top8Count: tournamentAnalytics.top8Count,
            top8Rate: tournamentAnalytics.top8Rate,
            undefeatedSwissCount: tournamentAnalytics.undefeatedSwissCount,
            longestCrossEventWinStreak: tournamentAnalytics.longestCrossEventWinStreak,
            consecutiveTop8s: tournamentAnalytics.consecutiveTop8s,
            consecutiveEventWins: tournamentAnalytics.consecutiveEventWins,
            championCount: tournamentAnalytics.championCount,
            finalistCount: tournamentAnalytics.finalistCount,
            top4Count: tournamentAnalytics.top4Count,
            submarineCount: tournamentAnalytics.submarineCount,
            filterLabel: activeFilterLabel,
            heroCompletionPct: heroCompletion?.pct,
          }}
          onClose={() => setTournamentShareOpen(false)}
        />
      )}

      {statsShareOpen && profile && (
        <TrendsShareModal
          data={{
            playerName: profile.displayName,
            totalMatches: overall.totalMatches + overall.totalByes,
            winRate: Math.round(overall.overallWinRate),
            wins: overall.totalWins,
            losses: overall.totalLosses,
            draws: overall.totalDraws,
            byes: overall.totalByes,
            longestWinStreak: overall.streaks.longestWinStreak,
            eventsPlayed: filteredEventStats.length,
            uniqueHeroes: heroStats.filter(h => h.heroName !== "Unknown").length,
            topHero: topHero ? { name: topHero.heroName, winRate: Math.round(topHero.winRate), matches: topHero.totalMatches } : undefined,
            filterLabel: activeFilterLabel,
            heroCompletionPct: heroCompletion?.pct,
            teamName: myTeam?.name,
            teamIconUrl: myTeam?.iconUrl,
          }}
          onClose={() => setStatsShareOpen(false)}
        />
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="relative space-y-8">
      <div className="pointer-events-none absolute inset-x-0 -top-24 h-72 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(201,168,76,0.06),transparent)]" />
      <div className="relative bg-fab-surface border border-fab-border rounded-lg p-5 h-48 animate-pulse overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-fab-gold/20 to-transparent" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="relative bg-fab-surface border border-fab-border rounded-lg p-4 h-20 animate-pulse overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-fab-gold/10 to-transparent" />
          </div>
        ))}
      </div>
    </div>
  );
}
