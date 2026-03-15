"use client";
import { useMemo, useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMatches } from "@/hooks/useMatches";
import { useAuth } from "@/contexts/AuthContext";
import { computeOverallStats, computeHeroStats, computeEventStats, computeOpponentStats, computeBestFinish, computePlayoffFinishes, computeMinorEventFinishes, computeTournamentAnalytics, getRoundNumber, getEventType } from "@/lib/stats";
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
import { loadKudosCounts } from "@/lib/kudos";
import { CardBorderWrapper } from "@/components/profile/CardBorderWrapper";
import type { UnderlineConfig } from "@/components/profile/CardBorderWrapper";
import { updateProfile } from "@/lib/firestore-storage";
import { LoggedOutHome } from "@/components/home/LoggedOutHome";

// Modals — lazy-loaded (only rendered when opened)
const BestFinishShareModal = dynamic(() => import("@/components/profile/BestFinishCard").then(m => ({ default: m.BestFinishShareModal })), { ssr: false });
const ProfileShareModal = dynamic(() => import("@/components/profile/ProfileCard").then(m => ({ default: m.ProfileShareModal })), { ssr: false });
const BackgroundChooser = dynamic(() => import("@/components/profile/BackgroundChooser").then(m => ({ default: m.BackgroundChooser })), { ssr: false });

export default function Dashboard() {
  const router = useRouter();
  const { matches, isLoaded } = useMatches();
  const { user, profile, isAdmin, refreshProfile } = useAuth();
  const { entries: lbEntries } = useLeaderboard(true);
  const [shareCopied, setShareCopied] = useState(false);
  const [bestFinishShareOpen, setBestFinishShareOpen] = useState(false);
  const [profileShareOpen, setProfileShareOpen] = useState(false);
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);
  const [savingBackground, setSavingBackground] = useState(false);
  const [kudosTotal, setKudosTotal] = useState<number | null>(null);
  const [filterFormat, setFilterFormat] = useState("all");
  const [filterEventType, setFilterEventType] = useState("all");
  const [filterHero, setFilterHero] = useState("all");
  const [filterRated, setFilterRated] = useState("all");
  const leaderboardUpdated = useRef(false);

  // Load kudos total for the current user
  useEffect(() => {
    if (!user) return;
    loadKudosCounts(user.uid).then((c) => setKudosTotal(c.total > 0 ? c.total : null)).catch(() => {});
  }, [user]);

  // Sync leaderboard entry when matches are loaded
  useEffect(() => {
    if (!isLoaded || !profile || matches.length === 0 || leaderboardUpdated.current) return;
    leaderboardUpdated.current = true;
    updateLeaderboardEntry(profile, matches).catch(() => {});
  }, [isLoaded, profile, matches]);

  // Filtered matches
  const filteredMatches = useMemo(() => {
    let filtered = matches;
    if (filterFormat !== "all") filtered = filtered.filter((m) => m.format === filterFormat);
    if (filterEventType !== "all") filtered = filtered.filter((m) => getEventType(m) === filterEventType);
    if (filterHero !== "all") filtered = filtered.filter((m) => m.heroPlayed === filterHero);
    if (filterRated !== "all") filtered = filtered.filter((m) => filterRated === "rated" ? m.rated === true : m.rated !== true);
    return filtered;
  }, [matches, filterFormat, filterEventType, filterHero, filterRated]);

  // Filter options — single pass: compute all three cross-filtered option lists at once
  const { allFormats, allEventTypes, allHeroes } = useMemo(() => {
    const formats = new Set<string>();
    const eventTypes = new Set<string>();
    const heroes = new Set<string>();

    for (const m of matches) {
      const matchFormat = m.format;
      const matchEventType = getEventType(m);
      const matchHero = m.heroPlayed;
      const matchRated = m.rated === true;

      const passFormat = filterFormat === "all" || matchFormat === filterFormat;
      const passEventType = filterEventType === "all" || matchEventType === filterEventType;
      const passHero = filterHero === "all" || matchHero === filterHero;
      const passRated = filterRated === "all" || (filterRated === "rated" ? matchRated : !matchRated);

      // For each filter option list, include if all OTHER filters pass
      if (passEventType && passHero && passRated && matchFormat) formats.add(matchFormat);
      if (passFormat && passHero && passRated && matchEventType !== "Unknown") eventTypes.add(matchEventType);
      if (passFormat && passEventType && passRated && matchHero && matchHero !== "Unknown") heroes.add(matchHero);
    }

    return {
      allFormats: [...formats].sort(),
      allEventTypes: [...eventTypes].sort(),
      allHeroes: [...heroes].sort(),
    };
  }, [matches, filterFormat, filterEventType, filterHero, filterRated]);

  // Reset filters whose selected value is no longer available
  useEffect(() => {
    if (filterFormat !== "all" && !(allFormats as string[]).includes(filterFormat)) setFilterFormat("all");
    if (filterEventType !== "all" && !allEventTypes.includes(filterEventType)) setFilterEventType("all");
    if (filterHero !== "all" && !allHeroes.includes(filterHero)) setFilterHero("all");
  }, [allFormats, allEventTypes, allHeroes, filterFormat, filterEventType, filterHero]);

  // Stats (filtered)
  const overall = useMemo(() => computeOverallStats(filteredMatches), [filteredMatches]);
  const heroStats = useMemo(() => computeHeroStats(filteredMatches), [filteredMatches]);
  const opponentStats = useMemo(() => computeOpponentStats(filteredMatches), [filteredMatches]);

  // Event stats (unfiltered — used for profile card borders, best finish)
  const eventStats = useMemo(() => computeEventStats(matches), [matches]);
  const filteredEventStats = useMemo(() => computeEventStats(filteredMatches), [filteredMatches]);
  const bestFinish = useMemo(() => computeBestFinish(filteredEventStats), [filteredEventStats]);
  const userRanks = useMemo(() => user ? computeUserRanks(lbEntries, user.uid) : [], [user, lbEntries]);
  const bestRank = useMemo(() => getBestRank(userRanks), [userRanks]);
  const topHero = useMemo(() => {
    const known = heroStats.filter((h) => h.heroName !== "Unknown");
    return known.length > 0 ? known[0] : null;
  }, [heroStats]);

  const sortedByDateDesc = useMemo(() =>
    [...filteredMatches].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      || getRoundNumber(b) - getRoundNumber(a)
      || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [filteredMatches]
  );
  const last30 = useMemo(() => sortedByDateDesc.slice(0, 30).reverse(), [sortedByDateDesc]);
  const latestMatches = useMemo(() => sortedByDateDesc.slice(0, 6), [sortedByDateDesc]);
  const playoffFinishes = useMemo(() => computePlayoffFinishes(eventStats), [eventStats]);
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
  const minorFinishes = useMemo(() => computeMinorEventFinishes(eventStats), [eventStats]);
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

  // Tournament analytics (from rated events)
  const tournamentAnalytics = useMemo(() => {
    const ratedEvents = computeEventStats(matches).filter(e => e.rated);
    return ratedEvents.length > 0 ? computeTournamentAnalytics(ratedEvents) : null;
  }, [matches]);

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
          {/* Profile + sidebar grid */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-4 items-start section-reveal" style={{ '--stagger': 0 } as React.CSSProperties}>
          {/* Left column: Profile card + Filters */}
          <div className="flex flex-col gap-3">
          <div
            className="cursor-pointer"
            onClick={() => {
              const href = profile?.username ? `/player/${profile.username}` : "#";
              if (href !== "#") router.push(href);
            }}
          >
          <CardBorderWrapper cardBorder={cardBorder} borderStyle={profile?.borderStyle || "beam"} underline={underlineConfig} contentClassName="relative bg-fab-surface/80 px-4 py-3 overflow-visible">
              {/* FaB-inspired pitch strip — thin gold accent across the top */}
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-fab-gold/30 to-transparent" />
              {/* Subtle decorative accent + hero card art — clipped to card bounds */}
              <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-fab-gold/5 rounded-full blur-2xl" />
                {topHero && getHeroByName(topHero.heroName)?.imageUrl && (
                  <img
                    src={getHeroByName(topHero.heroName)!.imageUrl}
                    alt=""
                    className="absolute -right-6 -top-2 -bottom-2 w-28 object-cover object-top opacity-[0.08] select-none"
                    loading="lazy"
                  />
                )}
              </div>
              <div className="flex items-center gap-3">
                {profile ? (
                  <Link href={`/player/${profile.username}`} className="relative shrink-0">
                    {profile.username === "azoni" && (
                      <svg className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-6 h-6 text-fab-gold drop-shadow-[0_0_6px_rgba(201,168,76,0.6)] z-10" viewBox="0 0 24 24" fill="currentColor">
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
                  </Link>
                ) : null}
                <div className="flex-1 min-w-0">
                  <Link href={profile?.username ? `/player/${profile.username}` : "#"} className="hover:opacity-80 transition-opacity">
                    <h1 className="text-lg font-bold text-fab-gold truncate">
                      {profile?.displayName || "My Profile"}
                    </h1>
                  </Link>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-fab-muted">
                    <span>{overall.totalMatches + overall.totalByes} matches</span>
                    <span className="text-fab-dim">·</span>
                    <span className={overall.overallWinRate >= 50 ? "text-fab-win" : "text-fab-loss"}>{overall.overallWinRate.toFixed(1)}%</span>
                    {eventStats.length > 0 && (
                      <>
                        <span className="text-fab-dim">·</span>
                        <span>{eventStats.length} events</span>
                      </>
                    )}
                    {topHero && (
                      <>
                        <span className="text-fab-dim hidden sm:inline">·</span>
                        <span className="hidden sm:inline truncate">{topHero.heroName}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
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
                  {profile?.username && (
                    <button
                      onClick={() => setShowBackgroundPicker(true)}
                      className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-md bg-fab-bg border border-fab-border text-fab-dim hover:text-fab-text hover:border-fab-muted transition-colors"
                      title="Change profile background"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15 5.159-5.159a2.25 2.25 0 0 1 3.182 0L15 14.25m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0L21.75 15m-10.5-6h.008v.008h-.008V9Zm-8.25 9h18a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5h-18A1.5 1.5 0 0 0 1.5 6v10.5A1.5 1.5 0 0 0 3 18Z" />
                      </svg>
                      <span className="text-[10px] font-semibold">Background</span>
                    </button>
                  )}
                </div>
              </div>
              <BadgeStrip selectedBadgeIds={profile?.selectedBadgeIds} className="mt-2 ml-1" />
              {profile?.username && (
                <p className="mt-1 ml-1 text-[10px] text-fab-dim">
                  Background sets what visitors see on your public profile.
                </p>
              )}
              {/* Score badges — bottom right */}
              <div className="absolute bottom-1.5 right-2.5 flex items-center gap-1.5 z-10" onClick={(e) => e.stopPropagation()}>
                {kudosTotal !== null && (
                  <Link href="/leaderboard?tab=kudos_total" className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-fab-bg/80 border border-fab-border hover:border-fab-gold/40 transition-colors group" title="Total kudos received">
                    <svg className="w-3 h-3 text-fab-dim group-hover:text-fab-gold transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V2.75a.75.75 0 0 1 .75-.75 2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23H5.904m10.598-9.75H14.25M5.904 18.5c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 0 1-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 9.953 4.167 9.5 5 9.5h1.053c.472 0 .745.556.5.96a8.958 8.958 0 0 0-1.302 4.665c0 1.194.232 2.333.654 3.375Z" />
                    </svg>
                    <span className="text-[10px] font-bold text-fab-dim group-hover:text-fab-gold transition-colors tabular-nums">{kudosTotal}</span>
                  </Link>
                )}
              </div>
            </CardBorderWrapper>
          </div>
          <DashboardFilters
            formats={allFormats}
            eventTypes={allEventTypes}
            heroes={allHeroes}
            filterFormat={filterFormat}
            filterEventType={filterEventType}
            filterHero={filterHero}
            filterRated={filterRated}
            onFormatChange={setFilterFormat}
            onEventTypeChange={setFilterEventType}
            onHeroChange={setFilterHero}
            onRatedChange={setFilterRated}
          />
          </div>

          {/* Sidebar: Tools + Meta */}
          <div className="flex flex-col gap-3">
            {/* Player Tools */}
            {user && (
              <div className="relative group/tools">
                <Link href="/tools" className="block rounded-lg bg-fab-surface border border-fab-border px-4 py-3 hover:border-amber-500/30 transition-colors card-shimmer">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-amber-500/10 flex items-center justify-center ring-1 ring-inset ring-amber-500/20 shrink-0">
                      <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-fab-text">Player Tools</span>
                    <svg className="w-3.5 h-3.5 text-fab-dim ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </Link>
                {/* Hover dropdown */}
                <div className="absolute left-0 right-0 top-full pt-1 z-30 hidden group-hover/tools:block">
                  <div className="rounded-lg bg-fab-surface border border-fab-border shadow-lg overflow-hidden">
                    {[
                      { id: "matrix", label: "Matchup Matrix", icon: "M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" },
                      { id: "prep", label: "Tournament Prep", icon: "M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-2.77.704 6.023 6.023 0 01-2.77-.704" },
                      { id: "notes", label: "Matchup Notes", icon: "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" },
                    ].map((tool) => (
                      <Link
                        key={tool.id}
                        href={`/tools?tab=${tool.id}`}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-fab-muted hover:text-fab-text hover:bg-fab-bg transition-colors"
                      >
                        <svg className="w-3.5 h-3.5 text-amber-400/70 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={tool.icon} />
                        </svg>
                        <span>{tool.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Community */}
            <Link href="/community" className="block rounded-lg bg-fab-surface border border-fab-border px-4 py-3 hover:border-teal-500/30 transition-colors card-shimmer">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md bg-teal-500/10 flex items-center justify-center ring-1 ring-inset ring-teal-500/20 shrink-0">
                  <svg className="w-3.5 h-3.5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-fab-text">Community</span>
                <svg className="w-3.5 h-3.5 text-fab-dim ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </Link>
          </div>
          </div>

          {/* Dashboard stats */}
          <div className="section-reveal" style={{ '--stagger': 1 } as React.CSSProperties}>
            <StatCards overall={overall} eventCount={filteredEventStats.length} bestFinishLabel={bestFinish?.label ?? null} recentMatches={last30} />
          </div>

          {/* Tournament Stats Card */}
          {tournamentAnalytics && tournamentAnalytics.totalEvents >= 3 && (
            <div className="section-reveal" style={{ '--stagger': 2 } as React.CSSProperties}>
              <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden cursor-pointer hover:border-fab-gold/20 transition-colors" onClick={() => router.push("/tournament-stats")}>
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-fab-border/50">
                  <p className="text-sm font-semibold text-fab-text">Tournament Stats</p>
                  <Link href="/tournament-stats" className="text-xs font-semibold text-fab-gold border border-fab-gold/30 hover:bg-fab-gold/10 hover:border-fab-gold/50 px-2.5 py-1 rounded-md transition-colors" onClick={(e) => e.stopPropagation()}>
                    Tournament stats &rarr;
                  </Link>
                </div>
                <div className="p-4 flex flex-col sm:flex-row items-center gap-4 sm:gap-5">
                  {/* R1 Win Rate Ring */}
                  <Link href="/tournament-stats" className="shrink-0 text-center hover:opacity-80 transition-opacity" title="Your win rate in Round 1 of rated events">
                    <WinRateRing value={tournamentAnalytics.r1WinRate} size={56} strokeWidth={5} label={`${Math.round(tournamentAnalytics.r1WinRate)}%`} />
                    <p className="text-[10px] text-fab-muted font-medium mt-1">Win R1</p>
                  </Link>
                  {/* Key stats */}
                  <div className="flex-1 w-full grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-2.5 text-center sm:text-left">
                    <div title="Total rated events played">
                      <p className="text-lg font-bold text-fab-text tabular-nums">{tournamentAnalytics.totalEvents}</p>
                      <p className="text-[10px] text-fab-muted">Events</p>
                    </div>
                    <div title={`${tournamentAnalytics.totalMatches} matches across all rated events`}>
                      <p className={`text-lg font-bold tabular-nums ${tournamentAnalytics.overallWinRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>{tournamentAnalytics.overallWinRate.toFixed(1)}%</p>
                      <p className="text-[10px] text-fab-muted">Win Rate</p>
                    </div>
                    <div title={`Made top 8 in ${tournamentAnalytics.top8Count} of ${tournamentAnalytics.totalEvents} events`}>
                      <p className="text-lg font-bold text-fab-gold tabular-nums">{tournamentAnalytics.top8Count}</p>
                      <p className="text-[10px] text-fab-muted">Top 8s</p>
                    </div>
                    <div title={`You make top 8 in ${Math.round(tournamentAnalytics.top8Rate)}% of your events`}>
                      <p className="text-lg font-bold text-fab-text tabular-nums">{Math.round(tournamentAnalytics.top8Rate)}%</p>
                      <p className="text-[10px] text-fab-muted">Top 8 Rate</p>
                    </div>
                    <div title={`On average you finish ${tournamentAnalytics.avgFinalRecord.wins.toFixed(1)} wins and ${tournamentAnalytics.avgFinalRecord.losses.toFixed(1)} losses per event`}>
                      <p className="text-lg font-bold text-fab-text tabular-nums">{tournamentAnalytics.avgFinalRecord.wins.toFixed(1)}-{tournamentAnalytics.avgFinalRecord.losses.toFixed(1)}</p>
                      <p className="text-[10px] text-fab-muted">Avg W-L / Event</p>
                    </div>
                    <div title="Most consecutive match wins across all events">
                      <p className="text-lg font-bold text-fab-text tabular-nums">{tournamentAnalytics.longestCrossEventWinStreak || <span className="text-fab-dim">N/A</span>}</p>
                      <p className="text-[10px] text-fab-muted">Best Win Streak</p>
                    </div>
                    <div title={`Went undefeated through swiss ${tournamentAnalytics.undefeatedSwissCount} time${tournamentAnalytics.undefeatedSwissCount === 1 ? "" : "s"}`}>
                      <p className={`text-lg font-bold tabular-nums ${tournamentAnalytics.undefeatedSwissCount > 0 ? "text-fab-win" : "text-fab-dim"}`}>{tournamentAnalytics.undefeatedSwissCount || <span className="text-fab-dim">N/A</span>}</p>
                      <p className="text-[10px] text-fab-muted">Undefeated Swiss</p>
                    </div>
                    <div title="Most consecutive events making top 8">
                      <p className="text-lg font-bold text-fab-text tabular-nums">{tournamentAnalytics.consecutiveTop8s || <span className="text-fab-dim">N/A</span>}</p>
                      <p className="text-[10px] text-fab-muted">Consec. Top 8s</p>
                    </div>
                    <div title="Most consecutive tournament wins (champion)">
                      <p className="text-lg font-bold text-fab-gold tabular-nums">{tournamentAnalytics.consecutiveEventWins || <span className="text-fab-dim">N/A</span>}</p>
                      <p className="text-[10px] text-fab-muted">Consec. Wins</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LatestMatches + RecentEvents */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 section-reveal" style={{ '--stagger': 3 } as React.CSSProperties}>
            <LatestMatches matches={latestMatches} />
            <RecentEvents eventStats={filteredEventStats} playerName={profile?.displayName} />
          </div>

          <div className="section-reveal" style={{ '--stagger': 4 } as React.CSSProperties}>
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
            selectedBadgeIds: profile?.selectedBadgeIds,
          }}
          onClose={() => setProfileShareOpen(false)}
        />
      )}

      {showBackgroundPicker && user && profile && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowBackgroundPicker(false)}>
          <div className="bg-fab-surface border border-fab-border rounded-xl max-w-3xl w-full mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
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
                    await updateProfile(user.uid, { siteBackgroundId: id === "none" ? undefined : id });
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
