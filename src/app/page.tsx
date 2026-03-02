"use client";
import { useMemo, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMatches } from "@/hooks/useMatches";
import { useAuth } from "@/contexts/AuthContext";
import { computeOverallStats, computeHeroStats, computeEventStats, computeOpponentStats, computeBestFinish, computePlayoffFinishes, getRoundNumber } from "@/lib/stats";
import { updateLeaderboardEntry } from "@/lib/leaderboard";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { computeUserRanks, getBestRank, computeRankMap, computeEventTierMap, rankBorderClass } from "@/lib/leaderboard-ranks";
import { ShieldIcon, SwordsIcon, CalendarIcon, OpponentsIcon, TrendsIcon } from "@/components/icons/NavIcons";
import { CommunityHighlights } from "@/components/home/CommunityHighlights";
import { useFeaturedEvents } from "@/hooks/useFeaturedEvents";
import { computeMetaStats, computeTop8HeroMeta, detectActiveEventType } from "@/lib/meta-stats";
import { getWeekStart } from "@/lib/leaderboard";
import { useSeasons } from "@/hooks/useSeasons";
import { getCurrentSeason, getSeasonWeeks } from "@/lib/seasons";
import { ActivityFeed } from "@/components/home/ActivityFeed";
import { RecentEvents } from "@/components/home/RecentEvents";
import { QuickStats } from "@/components/home/QuickStats";
import { BestFinishShareModal } from "@/components/profile/BestFinishCard";
import { ProfileShareModal } from "@/components/profile/ProfileCard";
import { MetaSnapshot } from "@/components/home/MetaSnapshot";
import { OnThisDay } from "@/components/home/OnThisDay";
import { FeaturedProfiles } from "@/components/home/FeaturedProfiles";
import { selectFeaturedProfiles } from "@/lib/featured-profiles";
import { useCreators } from "@/hooks/useCreators";
import { getUnlockedColors } from "@/lib/comment-format";
import { getActivePrediction } from "@/lib/polls";
import { getEventShowcase } from "@/lib/event-showcase";
import { EventShowcase } from "@/components/home/EventShowcase";
import { BadgeStrip } from "@/components/profile/BadgeStrip";
import { getHeroByName } from "@/lib/heroes";
import type { Poll, EventShowcaseConfig } from "@/types";

function ResourcesPopout() {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        menuRef.current && !menuRef.current.contains(e.target as Node)
      ) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.top - 4, left: r.left });
    }
  }, [open]);

  const links = [
    { href: "/docs", label: "Docs", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
    { href: "/changelog", label: "Changelog", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" },
    { href: "/roadmap", label: "Roadmap", badge: "New" as const, icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
  ];

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen(!open)}
        className="group relative flex items-center gap-3 pl-3 pr-5 py-3 rounded-2xl shrink-0 overflow-hidden bg-gradient-to-br from-zinc-500/10 via-zinc-900/20 to-transparent border border-zinc-500/20 hover:border-zinc-400/40 hover:shadow-[0_0_24px_rgba(161,161,170,0.08)] hover:-translate-y-0.5 transition-all duration-300"
      >
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-zinc-400/40 to-transparent" />
        <div className="w-10 h-10 rounded-xl bg-zinc-500/15 flex items-center justify-center shrink-0 ring-1 ring-inset ring-zinc-500/20 group-hover:bg-zinc-500/20 group-hover:ring-zinc-400/30 transition-all">
          <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold text-fab-text leading-tight">Read</p>
          <p className="text-[11px] text-zinc-400/70 font-semibold leading-tight">Resources</p>
        </div>
      </button>

      {open && pos && (
        <div
          ref={menuRef}
          className="fixed w-48 bg-fab-surface border border-fab-border rounded-lg shadow-xl overflow-hidden z-50"
          style={{ top: pos.top, left: pos.left, transform: "translateY(-100%)" }}
        >
          <div className="p-1.5">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium text-fab-muted hover:text-fab-text hover:bg-fab-surface-hover transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
                </svg>
                {link.label}
                {"badge" in link && link.badge && (
                  <span className="ml-auto text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-teal-400/15 text-teal-400 border border-teal-400/25">{link.badge}</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export default function Dashboard() {
  const { matches, isLoaded } = useMatches();
  const { user, profile } = useAuth();
  const { entries: lbEntries } = useLeaderboard(true);
  const featuredEvents = useFeaturedEvents();
  const creators = useCreators();
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
  const { seasons } = useSeasons();
  const currentSeason = useMemo(() => getCurrentSeason(seasons), [seasons]);
  const seasonWeeks = useMemo(() => currentSeason ? getSeasonWeeks(currentSeason) : [], [currentSeason]);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  const activeEventType = useMemo(() => {
    if (currentSeason) return currentSeason.eventType;
    return detectActiveEventType(lbEntries);
  }, [lbEntries, currentSeason]);

  const communityMeta = useMemo(() => {
    if (activeEventType) return computeMetaStats(lbEntries);
    const weekly = computeMetaStats(lbEntries, "Classic Constructed", "Armory", "weekly");
    return weekly.heroStats.length > 0 ? weekly : computeMetaStats(lbEntries);
  }, [lbEntries, activeEventType]);
  const communityTopHeroes = useMemo(() => communityMeta.heroStats.slice(0, 5), [communityMeta]);

  const top8Heroes = useMemo(() => {
    if (currentSeason) {
      // Season mode: filter by season's date range, optionally narrowed to a week
      let sinceDate = currentSeason.startDate;
      let untilDate = currentSeason.endDate;
      if (selectedWeek !== null && seasonWeeks[selectedWeek]) {
        sinceDate = seasonWeeks[selectedWeek].start;
        untilDate = seasonWeeks[selectedWeek].end;
      }
      return computeTop8HeroMeta(lbEntries, currentSeason.eventType, currentSeason.format, sinceDate, untilDate);
    }
    if (!activeEventType) return [];
    return computeTop8HeroMeta(lbEntries, activeEventType, undefined, getWeekStart());
  }, [lbEntries, activeEventType, currentSeason, selectedWeek, seasonWeeks]);
  const rankMap = useMemo(() => computeRankMap(lbEntries), [lbEntries]);
  const featuredProfiles = useMemo(() => selectFeaturedProfiles(lbEntries), [lbEntries]);
  const eventTierMap = useMemo(() => computeEventTierMap(lbEntries), [lbEntries]);
  const isCreator = useMemo(() => {
    if (!profile) return false;
    return creators.some((c) => c.username === profile.username);
  }, [creators, profile]);
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
    <div className="relative space-y-8">
      {/* Ambient page glow — subtle gold atmosphere at the top */}
      <div className="pointer-events-none absolute inset-x-0 -top-24 h-72 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(201,168,76,0.06),transparent)]" />

      {/* Full-width nav bar (logged-in users with matches) */}
      {hasMatches && (
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide pb-0.5">
          {/* My Stats — gold, first position, prominent */}
          <Link href="/trends" className="group relative flex items-center gap-3 pl-3 pr-6 py-3.5 rounded-2xl shrink-0 overflow-hidden bg-gradient-to-br from-fab-gold/15 via-amber-950/20 to-transparent border border-fab-gold/30 hover:border-fab-gold/50 hover:shadow-[0_0_24px_rgba(201,168,76,0.12)] hover:-translate-y-0.5 transition-all duration-300">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-fab-gold/50 to-transparent" />
            <div className="w-11 h-11 rounded-xl bg-fab-gold/15 flex items-center justify-center shrink-0 ring-1 ring-inset ring-fab-gold/30 group-hover:bg-fab-gold/25 group-hover:ring-fab-gold/40 transition-all">
              <TrendsIcon className="w-5.5 h-5.5 text-fab-gold" />
            </div>
            <div>
              <p className="text-sm font-bold text-fab-gold leading-tight">My Stats</p>
              <p className="text-[11px] text-fab-gold/60 font-semibold leading-tight">Your numbers</p>
            </div>
          </Link>

          {/* Matches — crimson combat */}
          <Link href="/matches" className="group relative flex items-center gap-3 pl-3 pr-5 py-3 rounded-2xl shrink-0 overflow-hidden bg-gradient-to-br from-red-500/10 via-red-950/20 to-transparent border border-red-500/20 hover:border-red-400/40 hover:shadow-[0_0_24px_rgba(239,68,68,0.08)] hover:-translate-y-0.5 transition-all duration-300">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-red-400/40 to-transparent" />
            <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0 ring-1 ring-inset ring-red-500/20 group-hover:bg-red-500/20 group-hover:ring-red-400/30 transition-all">
              <SwordsIcon className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-fab-text leading-tight">Matches</p>
              {(overall.totalMatches + overall.totalByes) > 0 && (
                <p className="text-[11px] text-red-400/70 font-semibold leading-tight">{overall.totalMatches + overall.totalByes}</p>
              )}
            </div>
          </Link>

          {/* Events — sapphire strategy */}
          <Link href="/events" className="group relative flex items-center gap-3 pl-3 pr-5 py-3 rounded-2xl shrink-0 overflow-hidden bg-gradient-to-br from-blue-500/10 via-blue-950/20 to-transparent border border-blue-500/20 hover:border-blue-400/40 hover:shadow-[0_0_24px_rgba(59,130,246,0.08)] hover:-translate-y-0.5 transition-all duration-300">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0 ring-1 ring-inset ring-blue-500/20 group-hover:bg-blue-500/20 group-hover:ring-blue-400/30 transition-all">
              <CalendarIcon className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-fab-text leading-tight">Events</p>
              {eventStats.length > 0 && (
                <p className="text-[11px] text-blue-400/70 font-semibold leading-tight">{eventStats.length}</p>
              )}
            </div>
          </Link>

          {/* Opponents — amethyst rivalry */}
          <Link href="/opponents" className="group relative flex items-center gap-3 pl-3 pr-5 py-3 rounded-2xl shrink-0 overflow-hidden bg-gradient-to-br from-purple-500/10 via-purple-950/20 to-transparent border border-purple-500/20 hover:border-purple-400/40 hover:shadow-[0_0_24px_rgba(168,85,247,0.08)] hover:-translate-y-0.5 transition-all duration-300">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-400/40 to-transparent" />
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center shrink-0 ring-1 ring-inset ring-purple-500/20 group-hover:bg-purple-500/20 group-hover:ring-purple-400/30 transition-all">
              <OpponentsIcon className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-fab-text leading-tight">Opponents</p>
              {allOpponentStats.length > 0 && (
                <p className="text-[11px] text-purple-400/70 font-semibold leading-tight">{allOpponentStats.length}</p>
              )}
            </div>
          </Link>

          {/* Versus — violet showdown */}
          <Link href="/compare" className="group relative flex items-center gap-3 pl-3 pr-5 py-3 rounded-2xl shrink-0 overflow-hidden bg-gradient-to-br from-fuchsia-500/10 via-fuchsia-950/20 to-transparent border border-fuchsia-500/20 hover:border-fuchsia-400/40 hover:shadow-[0_0_24px_rgba(217,70,239,0.08)] hover:-translate-y-0.5 transition-all duration-300">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-fuchsia-400/40 to-transparent" />
            <div className="w-10 h-10 rounded-xl bg-fuchsia-500/15 flex items-center justify-center shrink-0 ring-1 ring-inset ring-fuchsia-500/20 group-hover:bg-fuchsia-500/20 group-hover:ring-fuchsia-400/30 transition-all">
              <svg className="w-5 h-5 text-fuchsia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-fab-text leading-tight">Versus</p>
              <p className="text-[11px] text-fuchsia-400/70 font-semibold leading-tight">Head-to-head</p>
            </div>
          </Link>

          {/* Tools — teal beta */}
          <Link href="/tools" className="group relative flex items-center gap-3 pl-3 pr-5 py-3 rounded-2xl shrink-0 overflow-hidden bg-gradient-to-br from-teal-500/10 via-teal-950/20 to-transparent border border-dashed border-teal-500/20 hover:border-teal-400/40 hover:shadow-[0_0_24px_rgba(20,184,166,0.08)] hover:-translate-y-0.5 transition-all duration-300">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-teal-400/40 to-transparent" />
            <div className="w-10 h-10 rounded-xl bg-teal-500/15 flex items-center justify-center shrink-0 ring-1 ring-inset ring-teal-500/20 group-hover:bg-teal-500/20 group-hover:ring-teal-400/30 transition-all">
              <svg className="w-5 h-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold text-fab-text leading-tight">Tools</p>
                <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-teal-400/15 text-teal-400 border border-teal-400/25">Beta</span>
              </div>
              <p className="text-[11px] text-teal-400/70 font-semibold leading-tight">Player tools</p>
            </div>
          </Link>

          {/* Resources — popout with docs/changelog/roadmap */}
          <ResourcesPopout />

          {/* Log — gold action */}
          <Link href="/events?import=1" className="group relative flex items-center gap-3 pl-3 pr-5 py-3 rounded-2xl shrink-0 overflow-hidden bg-gradient-to-br from-fab-gold/10 via-amber-950/20 to-transparent border border-dashed border-fab-gold/25 hover:border-fab-gold/45 hover:shadow-[0_0_24px_rgba(201,168,76,0.08)] hover:-translate-y-0.5 transition-all duration-300">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-fab-gold/40 to-transparent" />
            <div className="w-10 h-10 rounded-xl bg-fab-gold/15 flex items-center justify-center shrink-0 ring-1 ring-inset ring-fab-gold/20 group-hover:bg-fab-gold/20 group-hover:ring-fab-gold/30 transition-all">
              <svg className="w-5 h-5 text-fab-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-fab-text leading-tight">Log</p>
              <p className="text-[11px] text-fab-gold/70 font-semibold leading-tight">Quick add</p>
            </div>
          </Link>
        </div>
      )}

      {/* No matches: welcome card + meta */}
      {!hasMatches && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="flex flex-col gap-6">
            <div className="relative bg-fab-surface border border-fab-border rounded-lg p-5 overflow-hidden">
              {/* FaB-inspired pitch strip */}
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-fab-gold/40 to-transparent" />
              {/* Decorative glow */}
              <div className="absolute -top-16 -right-16 w-48 h-48 bg-fab-gold/5 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

              <div className="relative flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-fab-gold/30 to-amber-600/20 flex items-center justify-center shrink-0 ring-1 ring-fab-gold/20">
                  <ShieldIcon className="w-7 h-7 text-fab-gold" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold text-fab-gold">FaB Stats</h1>
                  <p className="text-xs text-fab-dim">Track your Flesh and Blood tournament history</p>
                </div>
              </div>

              <p className="relative text-sm text-fab-muted mb-4">
                Import your matches to see your win rate, streaks, opponent stats, and more — all in one place.
              </p>

              <div className="relative flex gap-3 flex-wrap">
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

              <div className="relative flex items-center gap-4 mt-5 pt-4 border-t border-fab-border/50">
                {[
                  { href: "/docs", label: "Docs", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
                  { href: "/changelog", label: "Changelog", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" },
                  { href: "/roadmap", label: "Roadmap", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-1.5 text-xs text-fab-dim hover:text-fab-muted transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
                    </svg>
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
            {user && <ActivityFeed rankMap={rankMap} eventTierMap={eventTierMap} />}
          </div>
          <MetaSnapshot topHeroes={communityTopHeroes} top8Heroes={top8Heroes} activeEventType={activeEventType} seasonName={currentSeason?.name} seasonWeeks={seasonWeeks} selectedWeek={selectedWeek} onWeekChange={setSelectedWeek} backgroundImage={currentSeason?.backgroundImage} />
        </div>
      )}

      {/* On This Day — above profile card */}
      {hasMatches && <OnThisDay matches={matches} />}

      {/* Has matches: minimal profile + activity feed | meta snapshot */}
      {hasMatches && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="flex flex-col gap-6">
            {/* Profile card */}
            <div
              className="relative bg-fab-surface border border-fab-border rounded-lg px-4 py-3 overflow-visible"
              style={cardBorder ? { borderColor: cardBorder.border, boxShadow: cardBorder.shadow } : undefined}
            >
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
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-fab-muted">
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
              <BadgeStrip matchCount={matches.length} isCreator={isCreator} className="mt-2 ml-1" />
            </div>
            {/* Quick stats + recent events + player spotlight */}
            <QuickStats overall={overall} last30={last30} />
            <RecentEvents eventStats={eventStats} playerName={profile?.displayName} />
            {(featuredProfiles.length > 0 || creators.length > 0) && (
              <FeaturedProfiles profiles={featuredProfiles} creators={creators} rankMap={rankMap} grid />
            )}
          </div>
          <div className="flex flex-col gap-6">
            <MetaSnapshot topHeroes={communityTopHeroes} top8Heroes={top8Heroes} activeEventType={activeEventType} seasonName={currentSeason?.name} seasonWeeks={seasonWeeks} selectedWeek={selectedWeek} onWeekChange={setSelectedWeek} backgroundImage={currentSeason?.backgroundImage} />
            {user && <ActivityFeed rankMap={rankMap} eventTierMap={eventTierMap} />}
          </div>
        </div>
      )}

      {/* Event Showcase (admin-configurable) */}
      {showcaseConfig?.active && (
        <>
          <div className="h-px bg-gradient-to-r from-transparent via-fab-gold/10 to-transparent" />
          <EventShowcase
            config={showcaseConfig}
            activePrediction={activePrediction}
            rankMap={rankMap}
            unlockedColors={unlockedColors}
          />
        </>
      )}

      {/* Section divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-fab-gold/10 to-transparent" />

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
            bestRank,
            playoffFinishes,
            armoryCount: eventStats.filter(e => e.eventType === "Armory").length,
            armoryUndefeated: eventStats.filter(e => e.eventType === "Armory" && e.losses === 0 && e.wins > 0).length,
            isSiteCreator: profile.username === "azoni",
            isCreator,
          }}
          onClose={() => setProfileShareOpen(false)}
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
