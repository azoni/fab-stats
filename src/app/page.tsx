"use client";
import { useMemo, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMatches } from "@/hooks/useMatches";
import { useAuth } from "@/contexts/AuthContext";
import { computeOverallStats, computeHeroStats, computeEventStats, computeBestFinish, computePlayoffFinishes, computeMinorEventFinishes, getRoundNumber } from "@/lib/stats";
import { updateLeaderboardEntry } from "@/lib/leaderboard";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { computeUserRanks, getBestRank, rankBorderClass } from "@/lib/leaderboard-ranks";
import { ShieldIcon } from "@/components/icons/NavIcons";
import { computeMetaStats } from "@/lib/meta-stats";
import { RecentEvents } from "@/components/home/RecentEvents";
import { QuickStats } from "@/components/home/QuickStats";
import { BestFinishShareModal } from "@/components/profile/BestFinishCard";
import { ProfileShareModal } from "@/components/profile/ProfileCard";
import { OnThisDay } from "@/components/home/OnThisDay";
import { BadgeStrip } from "@/components/profile/BadgeStrip";
import { getHeroByName } from "@/lib/heroes";
import { loadKudosCounts } from "@/lib/kudos";
import { CardBorderWrapper } from "@/components/profile/CardBorderWrapper";
import type { UnderlineConfig } from "@/components/profile/CardBorderWrapper";

export default function Dashboard() {
  const { matches, isLoaded } = useMatches();
  const { user, profile } = useAuth();
  const { entries: lbEntries } = useLeaderboard(true);
  const [shareCopied, setShareCopied] = useState(false);
  const [bestFinishShareOpen, setBestFinishShareOpen] = useState(false);
  const [profileShareOpen, setProfileShareOpen] = useState(false);
  const [kudosTotal, setKudosTotal] = useState<number | null>(null);
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

  // Stats for snapshot (unfiltered)
  const overall = useMemo(() => computeOverallStats(matches), [matches]);
  const heroStats = useMemo(() => computeHeroStats(matches), [matches]);
  const eventStats = useMemo(() => computeEventStats(matches), [matches]);
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

  // Community meta (compact — top 3 heroes for mini widget)
  const communityMeta = useMemo(() => computeMetaStats(lbEntries), [lbEntries]);
  const communityTopHeroes = useMemo(() => communityMeta.heroStats.slice(0, 3), [communityMeta]);


  if (!isLoaded) {
    return <DashboardSkeleton />;
  }

  const hasMatches = matches.length > 0;
  const { streaks } = overall;

  return (
    <div className="relative space-y-8">
      {/* Ambient page glow — subtle gold atmosphere at the top */}
      <div className="pointer-events-none absolute inset-x-0 -top-24 h-72 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(201,168,76,0.06),transparent)]" />

      {/* No matches: welcome card */}
      {!hasMatches && (
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
          {/* Compact meta snapshot */}
          {communityTopHeroes.length > 0 && (
            <Link href="/meta" className="flex items-center gap-4 rounded-lg bg-fab-surface border border-fab-border px-4 py-3 hover:border-teal-500/30 transition-colors group">
              <div className="w-7 h-7 rounded-lg bg-teal-500/10 flex items-center justify-center ring-1 ring-inset ring-teal-500/20 shrink-0">
                <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex items-center gap-4 flex-1 min-w-0 overflow-x-auto scrollbar-hide">
                {communityTopHeroes.slice(0, 3).map((hero, i) => (
                  <div key={hero.hero} className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-xs font-medium ${i === 0 ? "text-fab-gold" : "text-fab-text"}`}>{hero.hero}</span>
                    <span className="text-[10px] text-fab-muted tabular-nums">{hero.metaShare.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
              <span className="text-xs text-fab-gold group-hover:text-fab-gold-light transition-colors font-semibold shrink-0">View Meta</span>
            </Link>
          )}
        </div>
      )}


      {/* On This Day — above profile card */}
      {hasMatches && <OnThisDay matches={matches} />}

      {/* Has matches: profile + stats */}
      {hasMatches && (
        <div className="flex flex-col gap-6">
          {/* Profile card */}
          <CardBorderWrapper cardBorder={cardBorder} borderStyle={profile?.borderStyle || "beam"} underline={underlineConfig} contentClassName="relative bg-fab-surface px-4 py-3 overflow-visible">
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
              <BadgeStrip selectedBadgeIds={profile?.selectedBadgeIds} className="mt-2 ml-1" />
              {/* Score badges — bottom right */}
              <div className="absolute bottom-1.5 right-2.5 flex items-center gap-1.5 z-10">
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
          {/* Quick stats */}
          <QuickStats overall={overall} last30={last30} />
          {/* Compact meta snapshot */}
          {communityTopHeroes.length > 0 && (
            <Link href="/meta" className="flex items-center gap-4 rounded-lg bg-fab-surface border border-fab-border px-4 py-3 hover:border-teal-500/30 transition-colors group">
              <div className="w-7 h-7 rounded-lg bg-teal-500/10 flex items-center justify-center ring-1 ring-inset ring-teal-500/20 shrink-0">
                <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex items-center gap-4 flex-1 min-w-0 overflow-x-auto scrollbar-hide">
                {communityTopHeroes.slice(0, 3).map((hero, i) => (
                  <div key={hero.hero} className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-xs font-medium ${i === 0 ? "text-fab-gold" : "text-fab-text"}`}>{hero.hero}</span>
                    <span className="text-[10px] text-fab-muted tabular-nums">{hero.metaShare.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
              <span className="text-xs text-fab-gold group-hover:text-fab-gold-light transition-colors font-semibold shrink-0">View Meta</span>
            </Link>
          )}
          <RecentEvents eventStats={eventStats} playerName={profile?.displayName} />
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
