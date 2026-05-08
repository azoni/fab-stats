"use client";
import { useMemo, useEffect, useState, type ComponentType } from "react";
import Link from "next/link";
import { Activity, CalendarDays, Gamepad2, Search, Sparkles, Trophy, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCommunityStats } from "@/hooks/useCommunityStats";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useMatches } from "@/hooks/useMatches";
import { computeRankMap, computeEventTierMap, computeUnderlineTierMap } from "@/lib/leaderboard-ranks";
import { computeEventStats, computePlayoffFinishes } from "@/lib/stats";
import { getUnlockedColors } from "@/lib/comment-format";
import { getActivePrediction } from "@/lib/polls";
import { getEventShowcase } from "@/lib/event-showcase";
import { ActivityFeed } from "@/components/home/ActivityFeed";
import { CommunityHighlights } from "@/components/home/CommunityHighlights";
import { EventShowcase } from "@/components/home/EventShowcase";
import { SmartSearch } from "@/components/search/SmartSearch";
import type { Poll, EventShowcaseConfig } from "@/types";

function formatCompact(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0";
  return new Intl.NumberFormat("en-US", { notation: value >= 10000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value);
}

function ActivityStat({ label, value, tone = "gold", className = "" }: { label: string; value: string; tone?: "gold" | "green" | "blue" | "rose"; className?: string }) {
  const toneClass = {
    gold: "text-fab-gold",
    green: "text-emerald-300",
    blue: "text-sky-300",
    rose: "text-rose-300",
  }[tone];

  return (
    <div className={`rounded-xl border border-fab-border/70 bg-fab-bg/45 px-3 py-2.5 shadow-inner shadow-black/10 sm:px-4 sm:py-3 ${className}`}>
      <p className={`text-lg font-black leading-none sm:text-xl ${toneClass}`}>{value}</p>
      <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.14em] text-fab-dim sm:text-[10px] sm:tracking-[0.16em]">{label}</p>
    </div>
  );
}

function QuickLink({ href, icon: Icon, title, text }: { href: string; icon: ComponentType<{ className?: string }>; title: string; text: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-fab-border/70 bg-fab-bg/35 p-3 transition-colors hover:border-fab-gold/50 hover:bg-fab-gold/10"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-fab-border/70 bg-fab-surface/80 text-fab-gold transition-colors group-hover:border-fab-gold/50">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-fab-text">{title}</span>
        <span className="block truncate text-xs text-fab-muted">{text}</span>
      </span>
    </Link>
  );
}

function SignedOutActivityPanel() {
  return (
    <div className="overflow-hidden rounded-xl border border-fab-border/80 bg-fab-bg/45">
      <div className="border-b border-fab-border/70 bg-fab-surface/65 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-fab-gold/30 bg-fab-gold/10 text-fab-gold">
            <Activity className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-fab-text">Join the live feed</h2>
            <p className="text-sm text-fab-muted">Follow players, react to finishes, and keep up with imports from the community.</p>
          </div>
        </div>
      </div>
      <div className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-sm font-bold text-fab-text">Follow friends</p>
            <p className="mt-1 text-xs text-fab-muted">Build a cleaner feed around people you care about.</p>
          </div>
          <div>
            <p className="text-sm font-bold text-fab-text">Track finishes</p>
            <p className="mt-1 text-xs text-fab-muted">See new Top 8s, wins, and event results as they land.</p>
          </div>
          <div>
            <p className="text-sm font-bold text-fab-text">Compare momentum</p>
            <p className="mt-1 text-xs text-fab-muted">Jump into profiles, teams, and rankings from the feed.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 md:justify-end">
          <Link href="/login" className="rounded-lg bg-fab-gold px-4 py-2 text-sm font-bold text-fab-bg transition-colors hover:bg-fab-gold-light">
            Sign In
          </Link>
          <Link href="/leaderboard" className="rounded-lg border border-fab-border px-4 py-2 text-sm font-bold text-fab-text transition-colors hover:border-fab-gold/60 hover:text-fab-gold">
            Browse Rankings
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ActivityPage() {
  const { user } = useAuth();
  const { userCount, matchCount } = useCommunityStats();
  const { matches } = useMatches();
  const { entries: lbEntries } = useLeaderboard(true);

  const [activePrediction, setActivePrediction] = useState<Poll | null>(null);
  const [showcaseConfig, setShowcaseConfig] = useState<EventShowcaseConfig | null>(null);
  useEffect(() => {
    getActivePrediction().then(setActivePrediction);
    getEventShowcase().then(setShowcaseConfig);
  }, []);

  const rankMap = useMemo(() => computeRankMap(lbEntries), [lbEntries]);
  const eventTierMap = useMemo(() => computeEventTierMap(lbEntries), [lbEntries]);
  const underlineTierMap = useMemo(() => computeUnderlineTierMap(lbEntries), [lbEntries]);
  const heroCompletionMap = useMemo(() => new Map(lbEntries.map((e) => [e.userId, e.heroCompletionPct ?? 0])), [lbEntries]);

  const eventStats = useMemo(() => computeEventStats(matches), [matches]);
  const playoffFinishes = useMemo(() => computePlayoffFinishes(eventStats), [eventStats]);
  const pulseStats = useMemo(() => {
    const activePlayers = lbEntries.filter((e) => e.weeklyMatches > 0 || e.monthlyMatches > 0).length;
    const publicProfiles = lbEntries.filter((e) => e.isPublic).length;
    const rankedPlayers = lbEntries.filter((e) => (e.ratedMatches ?? 0) >= 20 || (e.totalMatches ?? 0) >= 20).length;
    const recentMatches = lbEntries.reduce((sum, e) => sum + (e.weeklyMatches ?? 0), 0);
    const totalTop8s = lbEntries.reduce((sum, e) => sum + (e.totalTop8s ?? 0), 0);

    return {
      players: userCount || publicProfiles,
      matches: matchCount || lbEntries.reduce((sum, e) => sum + (e.totalMatches ?? 0), 0),
      publicProfiles,
      rankedPlayers,
      activePlayers,
      recentMatches,
      totalTop8s,
    };
  }, [lbEntries, matchCount, userCount]);
  const unlockedColors = useMemo(() => {
    if (!user) return [];
    const myLb = lbEntries.find((e) => e.userId === user.uid);
    return getUnlockedColors(
      myLb?.totalMatches ?? matches.length,
      myLb?.totalTop8s ?? 0,
      playoffFinishes
    );
  }, [user, lbEntries, matches.length, playoffFinishes]);

  return (
    <div className="relative space-y-6">
      <div className="pointer-events-none absolute inset-x-0 -top-28 h-80 bg-[radial-gradient(ellipse_55%_45%_at_50%_0%,rgba(245,179,57,0.12),transparent_68%)]" />

      <section className="relative overflow-hidden rounded-2xl border border-fab-border/80 bg-[linear-gradient(135deg,rgba(25,23,18,0.96),rgba(14,15,14,0.94)_58%,rgba(17,24,22,0.92))] shadow-[0_22px_70px_rgba(0,0,0,0.28)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_20%,rgba(38,211,177,0.12),transparent_30%),radial-gradient(circle_at_16%_0%,rgba(245,179,57,0.16),transparent_28%)]" />
        <div className="relative grid gap-4 p-4 sm:gap-6 sm:p-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-fab-border/80 bg-fab-bg/55 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-fab-gold">
              <Sparkles className="h-3.5 w-3.5" />
              Community pulse
            </div>
            <h1 className="mt-3 max-w-2xl text-2xl font-black tracking-normal text-fab-text sm:mt-4 sm:text-4xl">Activity</h1>
            <p className="mt-3 hidden max-w-2xl text-sm leading-6 text-fab-muted sm:block sm:text-base">
              Follow the latest imports, event finishes, daily games, and player updates from across FaB Stats.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 sm:mt-5 sm:gap-3">
              <ActivityStat label="Players" value={formatCompact(pulseStats.players)} />
              <ActivityStat label="Matches" value={formatCompact(pulseStats.matches)} tone="green" />
              <ActivityStat label="This Week" value={formatCompact(pulseStats.recentMatches)} tone="blue" />
              <ActivityStat label="Public" value={formatCompact(pulseStats.publicProfiles)} tone="green" className="hidden sm:block" />
              <ActivityStat label="Ranked" value={formatCompact(pulseStats.rankedPlayers)} tone="gold" className="hidden sm:block" />
              <ActivityStat label="Top 8s" value={formatCompact(pulseStats.totalTop8s)} tone="rose" className="hidden sm:block" />
            </div>
          </div>

          <div className="hidden rounded-xl border border-fab-border/80 bg-fab-bg/45 p-4 shadow-inner shadow-black/20 sm:block">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-fab-border/70 bg-fab-surface/70 text-fab-gold">
                <Search className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-bold text-fab-text">Find the table</p>
                <p className="text-xs text-fab-muted">Search players or teams without leaving the feed.</p>
              </div>
            </div>
            <SmartSearch placeholder="Search players or teams..." />
            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <QuickLink href="/leaderboard" icon={Trophy} title="Rankings" text="See who is moving up." />
              <QuickLink href="/teams" icon={Users} title="Teams" text="Browse community groups." />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 rounded-xl border border-fab-border/80 bg-fab-surface/80 p-4 shadow-[0_16px_48px_rgba(0,0,0,0.22)] backdrop-blur sm:p-5">
          {user ? (
            <ActivityFeed rankMap={rankMap} eventTierMap={eventTierMap} underlineTierMap={underlineTierMap} heroCompletionMap={heroCompletionMap} />
          ) : (
            <SignedOutActivityPanel />
          )}
        </section>

        <aside className="space-y-5">
          <section className="rounded-xl border border-fab-border/80 bg-fab-surface/80 p-4 shadow-[0_16px_48px_rgba(0,0,0,0.18)] backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-fab-border/70 bg-fab-bg/60 text-fab-gold">
                <CalendarDays className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-black uppercase tracking-[0.12em] text-fab-text">Jump Back In</h2>
                <p className="text-xs text-fab-muted">Fast paths for the stuff people check most.</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <QuickLink href="/events" icon={CalendarDays} title="Events" text="Review recent tournament logs." />
              <QuickLink href="/friends" icon={Users} title="Friends" text="Keep your circle close." />
              <QuickLink href="/games" icon={Gamepad2} title="Daily Games" text="Warm up between rounds." />
            </div>
            <div className="mt-4 rounded-lg border border-fab-border/70 bg-fab-bg/45 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-fab-dim">This Week</p>
              <p className="mt-1 text-2xl font-black text-emerald-300">{formatCompact(pulseStats.recentMatches)}</p>
              <p className="text-xs text-fab-muted">matches added by active players</p>
            </div>
          </section>

          {showcaseConfig?.active && (
            <section className="rounded-xl border border-fab-border/80 bg-fab-surface/80 p-4 shadow-[0_16px_48px_rgba(0,0,0,0.18)] backdrop-blur">
              <EventShowcase
                config={showcaseConfig}
                activePrediction={activePrediction}
                rankMap={rankMap}
                unlockedColors={unlockedColors}
              />
            </section>
          )}

          <CommunityHighlights />
        </aside>
      </div>
    </div>
  );
}
