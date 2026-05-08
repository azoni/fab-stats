"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Lock, Trophy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMatches } from "@/hooks/useMatches";
import {
  computeOverallStats,
  computeHeroStats,
  computeOpponentStats,
} from "@/lib/stats";
import {
  evaluateAchievements,
  getAchievementProgress,
  getAllAchievements,
  rarityColors,
} from "@/lib/achievements";
import { loadKudosCounts } from "@/lib/kudos";
import { loadStats as loadFabdokuStats } from "@/lib/fabdoku/firestore";
import { loadCardStats as loadFabdokuCardStats } from "@/lib/fabdoku/card-firestore";
import { loadStats as loadCrosswordStats } from "@/lib/crossword/firestore";
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
import { AchievementIcon } from "@/components/gamification/AchievementIcons";
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
import type { Achievement, AchievementCategory } from "@/types";

const CATEGORY_COPY: Record<AchievementCategory, { label: string; description: string }> = {
  milestone: { label: "Match Milestones", description: "Long-term progress for logging matches, wins, events, and rated play." },
  streak: { label: "Streaks", description: "Rewards for sustained runs and strong recent form." },
  mastery: { label: "Mastery", description: "Hero loyalty, win-rate benchmarks, and high-skill progression." },
  exploration: { label: "Exploration", description: "Trying more heroes, formats, and ways to play." },
  fun: { label: "Match Variety", description: "Format volume, rivalries, draws, rated matches, and other table stories." },
  games: { label: "Daily Games", description: "Puzzle and mini-game achievements across the daily game suite." },
  social: { label: "Community", description: "Kudos and community recognition from other FaB Stats players." },
  special: { label: "Special", description: "Limited or manually granted badges for special site moments." },
};

const CATEGORY_ORDER: AchievementCategory[] = ["milestone", "mastery", "streak", "exploration", "fun", "games", "social", "special"];
const RARITY_ORDER: Achievement["rarity"][] = ["legendary", "epic", "rare", "uncommon", "common"];

type CategoryFilter = AchievementCategory | "all";

interface GameAchievementStats {
  fabdokuStats?: FaBdokuStats | null;
  fabdokuCardStats?: FaBdokuStats | null;
  crosswordStats?: CrosswordStats | null;
  heroGuesserStats?: HeroGuesserStats | null;
  matchupManiaStats?: MatchupManiaStats | null;
  triviaStats?: TriviaStats | null;
  timelineStats?: TimelineStats | null;
  connectionsStats?: ConnectionsStats | null;
  rampageStats?: RampageStats | null;
  knockoutStats?: KnockoutStats | null;
  brawlStats?: BrawlStats | null;
  ninjaComboStats?: NinjaComboStats | null;
  shadowStrikeStats?: ShadowStrikeStats | null;
  bladeDashStats?: BladeDashStats | null;
}

function sortAchievement(a: Achievement, b: Achievement) {
  const groupCompare = (a.group || a.id).localeCompare(b.group || b.id);
  if (groupCompare !== 0) return groupCompare;
  return (a.tier || 0) - (b.tier || 0);
}

interface AchievementStack {
  id: string;
  achievements: Achievement[];
  earnedAchievements: Achievement[];
  current?: Achievement;
  next?: Achievement;
  display: Achievement;
  nextProgress?: { current: number; target: number };
  pct: number;
}

function buildAchievementStacks(
  items: Achievement[],
  earnedSet: Set<string>,
  progress: Record<string, { current: number; target: number }>,
  isAuthed: boolean,
): AchievementStack[] {
  const map = new Map<string, Achievement[]>();
  for (const achievement of items) {
    const key = achievement.group || achievement.id;
    const achievements = map.get(key) || [];
    achievements.push(achievement);
    map.set(key, achievements);
  }

  return [...map.entries()]
    .map(([id, achievements]) => {
      const sorted = [...achievements].sort(sortAchievement);
      const earnedAchievements = isAuthed ? sorted.filter((achievement) => earnedSet.has(achievement.id)) : [];
      const current = earnedAchievements[earnedAchievements.length - 1];
      const next = isAuthed ? sorted.find((achievement) => !earnedSet.has(achievement.id)) : sorted[0];
      const display = current || next || sorted[0]!;
      const nextProgress = next ? progress[next.id] : undefined;
      const pct = nextProgress?.target
        ? Math.min(100, Math.round((nextProgress.current / nextProgress.target) * 100))
        : current && !next
          ? 100
          : 0;

      return { id, achievements: sorted, earnedAchievements, current, next, display, nextProgress, pct };
    })
    .sort((a, b) => sortAchievement(a.achievements[0]!, b.achievements[0]!));
}

export function AchievementsClient() {
  const { user, isGuest } = useAuth();
  const { matches, isLoaded } = useMatches();
  const isAuthed = !!user && !isGuest;
  const [kudosCounts, setKudosCounts] = useState<Record<string, number>>({});
  const [gameStats, setGameStats] = useState<GameAchievementStats>({});
  const [gameStatsLoaded, setGameStatsLoaded] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  const allAchievements = useMemo(() => getAllAchievements(), []);

  // Stats computed from imported matches. Daily-game stats are intentionally
  // omitted — those achievements will show as locked here, which is fine
  // since the player can see them on the relevant game pages too.
  const overall = useMemo(() => computeOverallStats(matches), [matches]);
  const heroStats = useMemo(() => computeHeroStats(matches), [matches]);
  const opponentStats = useMemo(() => computeOpponentStats(matches), [matches]);

  useEffect(() => {
    if (!isAuthed || !user) {
      setKudosCounts({});
      return;
    }
    loadKudosCounts(user.uid).then(setKudosCounts).catch(() => setKudosCounts({}));
  }, [isAuthed, user]);

  useEffect(() => {
    let cancelled = false;
    if (!isAuthed || !user) {
      setGameStats({});
      setGameStatsLoaded(false);
      return;
    }

    setGameStatsLoaded(false);
    Promise.all([
      loadFabdokuStats(user.uid).catch(() => null),
      loadFabdokuCardStats(user.uid).catch(() => null),
      loadCrosswordStats(user.uid).catch(() => null),
      loadHeroGuesserStats(user.uid).catch(() => null),
      loadMatchupManiaStats(user.uid).catch(() => null),
      loadTriviaStats(user.uid).catch(() => null),
      loadTimelineStats(user.uid).catch(() => null),
      loadConnectionsStats(user.uid).catch(() => null),
      loadRampageStats(user.uid).catch(() => null),
      loadKnockoutStats(user.uid).catch(() => null),
      loadBrawlStats(user.uid).catch(() => null),
      loadNinjaComboStats(user.uid).catch(() => null),
      loadShadowStrikeStats(user.uid).catch(() => null),
      loadBladeDashStats(user.uid).catch(() => null),
    ]).then(([
      fabdokuStats,
      fabdokuCardStats,
      crosswordStats,
      heroGuesserStats,
      matchupManiaStats,
      triviaStats,
      timelineStats,
      connectionsStats,
      rampageStats,
      knockoutStats,
      brawlStats,
      ninjaComboStats,
      shadowStrikeStats,
      bladeDashStats,
    ]) => {
      if (cancelled) return;
      setGameStats({
        fabdokuStats,
        fabdokuCardStats,
        crosswordStats,
        heroGuesserStats,
        matchupManiaStats,
        triviaStats,
        timelineStats,
        connectionsStats,
        rampageStats,
        knockoutStats,
        brawlStats,
        ninjaComboStats,
        shadowStrikeStats,
        bladeDashStats,
      });
      setGameStatsLoaded(true);
    }).catch(() => {
      if (!cancelled) setGameStatsLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, [isAuthed, user]);

  const earned = useMemo(() => {
    if (!isAuthed) return [] as Achievement[];
    return evaluateAchievements(
      matches,
      overall,
      heroStats,
      opponentStats,
      kudosCounts,
      gameStats.fabdokuStats ?? undefined,
      gameStats.heroGuesserStats ?? undefined,
      gameStats.matchupManiaStats ?? undefined,
      gameStats.triviaStats ?? undefined,
      gameStats.timelineStats ?? undefined,
      gameStats.connectionsStats ?? undefined,
      gameStats.fabdokuCardStats ?? undefined,
      gameStats.rampageStats ?? undefined,
      gameStats.knockoutStats ?? undefined,
      gameStats.brawlStats ?? undefined,
      gameStats.ninjaComboStats ?? undefined,
      gameStats.crosswordStats ?? undefined,
      gameStats.shadowStrikeStats ?? undefined,
      gameStats.bladeDashStats ?? undefined,
    );
  }, [isAuthed, matches, overall, heroStats, opponentStats, kudosCounts, gameStats]);

  const earnedSet = useMemo(() => new Set(earned.map((a) => a.id)), [earned]);

  const progress = useMemo(() => {
    if (!isAuthed) return {} as Record<string, { current: number; target: number }>;
    return getAchievementProgress(
      matches,
      overall,
      heroStats,
      opponentStats,
      kudosCounts,
      gameStats.fabdokuStats ?? undefined,
      gameStats.heroGuesserStats ?? undefined,
      gameStats.matchupManiaStats ?? undefined,
      gameStats.triviaStats ?? undefined,
      gameStats.timelineStats ?? undefined,
      gameStats.connectionsStats ?? undefined,
      gameStats.fabdokuCardStats ?? undefined,
      gameStats.rampageStats ?? undefined,
      gameStats.knockoutStats ?? undefined,
      gameStats.brawlStats ?? undefined,
      gameStats.ninjaComboStats ?? undefined,
      gameStats.crosswordStats ?? undefined,
      gameStats.shadowStrikeStats ?? undefined,
      gameStats.bladeDashStats ?? undefined,
    );
  }, [isAuthed, matches, overall, heroStats, opponentStats, kudosCounts, gameStats]);

  const totalCount = allAchievements.length;
  const earnedCount = earned.length;
  const completionPct = totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0;

  const rarityBreakdown = useMemo(
    () =>
      RARITY_ORDER.map((rarity) => {
        const total = allAchievements.filter((a) => a.rarity === rarity).length;
        const earnedInRarity = earned.filter((a) => a.rarity === rarity).length;
        return { rarity, total, earned: earnedInRarity };
      }),
    [allAchievements, earned],
  );

  // In-progress: tiered achievements the user hasn't earned yet, ranked by
  // how close they are to unlocking. Only shown when authed.
  const inProgress = useMemo(() => {
    if (!isAuthed) return [] as { achievement: Achievement; current: number; target: number; pct: number }[];
    return buildAchievementStacks(allAchievements, earnedSet, progress, isAuthed)
      .filter((stack) => stack.next && stack.nextProgress && stack.nextProgress.target > 0 && stack.nextProgress.current > 0)
      .map((stack) => {
        const p = stack.nextProgress!;
        return { achievement: stack.next!, current: p.current, target: p.target, pct: stack.pct };
      })
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 6);
  }, [isAuthed, allAchievements, earnedSet, progress]);

  const grouped = useMemo(() => {
    const map = {} as Record<AchievementCategory, Achievement[]>;
    for (const a of allAchievements) {
      if (!map[a.category]) map[a.category] = [];
      map[a.category].push(a);
    }
    return map;
  }, [allAchievements]);

  const categorySummaries = useMemo(() => {
    return CATEGORY_ORDER.map((category) => {
      const items = grouped[category] || [];
      const earned = isAuthed ? items.filter((a) => earnedSet.has(a.id)).length : 0;
      return { category, total: items.length, earned };
    }).filter((summary) => summary.total > 0);
  }, [grouped, earnedSet, isAuthed]);

  const visibleCategories: AchievementCategory[] = categoryFilter === "all" ? CATEGORY_ORDER : [categoryFilter];

  return (
    <div className="space-y-4 sm:space-y-8">
      {/* Hero — progress summary */}
      <section className="relative overflow-hidden rounded-xl border border-fab-border bg-fab-surface p-3 sm:p-6">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fab-gold/45 to-transparent" />
        <div className="flex flex-col gap-3 sm:gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-fab-border/70 bg-fab-bg/70 px-2.5 py-1.5 sm:mb-4 sm:px-3 sm:py-2">
              <Trophy className="h-4 w-4 text-fab-gold" />
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-fab-muted sm:text-[11px] sm:tracking-[0.16em]">
                {isAuthed ? "Your Achievements" : "Achievements"}
              </span>
            </div>
            <h1 className="text-xl font-black leading-tight text-fab-text sm:text-4xl">
              {isAuthed
                ? `${earnedCount} of ${totalCount} unlocked`
                : `${totalCount} achievements to chase`}
            </h1>
            <p className="mt-3 hidden text-sm leading-6 text-fab-muted sm:block">
              {isAuthed ? (
                <>
                  Earned badges appear on your profile and can be pinned in your badge strip.
                  {(!isLoaded || !gameStatsLoaded) && " Loading your latest progress..."}
                </>
              ) : (
                <>
                  Unlock badges from imported match history, hero mastery, tournament finishes,
                  kudos, and daily games. <Link href="/login" className="text-fab-gold hover:text-fab-gold-light">Sign in</Link> to see your progress.
                </>
              )}
            </p>

            {/* Big progress bar */}
            {isAuthed && (
              <div className="mt-3 sm:mt-5">
                <div className="flex items-center justify-between text-xs text-fab-muted mb-1.5">
                  <span className="font-bold tracking-wider uppercase text-[10px] text-fab-dim">Overall</span>
                  <span className="font-bold tabular-nums text-fab-text">{completionPct}%</span>
                </div>
                <div className="h-2 rounded-full bg-fab-bg overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-fab-gold/70 to-fab-gold transition-all"
                    style={{ width: `${completionPct}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Rarity breakdown */}
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2 lg:w-[28rem]">
            {rarityBreakdown.map(({ rarity, total, earned }) => {
              const colors = rarityColors[rarity];
              const pct = total > 0 ? Math.round((earned / total) * 100) : 0;
              return (
                <div key={rarity} className={`rounded-lg border ${colors.border} ${colors.bg} px-1.5 py-2 text-center sm:px-2 sm:py-2.5`}>
                  <p className={`text-sm font-black tabular-nums sm:text-lg ${colors.text}`}>
                    {isAuthed ? earned : total}
                    {isAuthed && <span className="text-fab-dim font-bold text-[10px] sm:text-xs">/{total}</span>}
                  </p>
                  <p className={`mt-0.5 truncate text-[8px] font-bold uppercase tracking-normal sm:text-[9px] sm:tracking-wider ${colors.text}`}>
                    {rarity}
                  </p>
                  {isAuthed && total > 0 && (
                    <div className="mt-1.5 h-1 rounded-full bg-fab-bg/80 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${colors.text.replace("text-", "bg-")}`}
                        style={{ width: `${pct}%`, opacity: 0.85 }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Empty state when authed but no matches */}
      {isAuthed && isLoaded && matches.length === 0 && (
        <section className="rounded-xl border border-fab-border bg-fab-surface p-6 text-center">
          <Trophy className="mx-auto h-8 w-8 text-fab-gold/60" />
          <h2 className="mt-3 text-base font-bold text-fab-text">Import matches to start unlocking</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-fab-muted">
            Most achievements key off your match history — wins, hero variety, events, and tournament finishes.
          </p>
          <Link
            href="/import"
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-fab-gold px-5 py-2.5 text-sm font-bold text-fab-bg transition-colors hover:bg-fab-gold-light"
          >
            Import matches
          </Link>
        </section>
      )}

      {/* In Progress — tiered achievements close to unlock */}
      {isAuthed && inProgress.length > 0 && (
        <section className="rounded-xl border border-fab-border bg-fab-surface p-4 sm:p-5">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-fab-gold/80">Closest to unlock</p>
              <h2 className="mt-1 text-lg font-bold text-fab-text">In Progress</h2>
            </div>
            <p className="text-xs text-fab-dim hidden sm:block">Top 6 by completion %</p>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {inProgress.map(({ achievement, current, target, pct }) => (
              <ProgressCard key={achievement.id} achievement={achievement} current={current} target={target} pct={pct} />
            ))}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-fab-border bg-fab-surface/95 p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={`rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
              categoryFilter === "all"
                ? "border-fab-gold/45 bg-fab-gold/15 text-fab-gold"
                : "border-fab-border bg-fab-bg/45 text-fab-muted hover:text-fab-text"
            }`}
          >
            All
            <span className="ml-2 text-fab-dim">{isAuthed ? `${earnedCount}/${totalCount}` : totalCount}</span>
          </button>
          {categorySummaries.map(({ category, total, earned }) => {
            const copy = CATEGORY_COPY[category];
            const active = categoryFilter === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setCategoryFilter(category)}
                className={`rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
                  active
                    ? "border-fab-gold/45 bg-fab-gold/15 text-fab-gold"
                    : "border-fab-border bg-fab-bg/45 text-fab-muted hover:text-fab-text"
                }`}
              >
                {copy.label}
                <span className="ml-2 text-fab-dim">{isAuthed ? `${earned}/${total}` : total}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* All achievements by category */}
      <div className="space-y-6">
        {visibleCategories.map((category) => {
          const items = [...(grouped[category] || [])].sort(sortAchievement);
          if (items.length === 0) return null;
          const copy = CATEGORY_COPY[category];
          const categoryEarned = isAuthed ? items.filter((a) => earnedSet.has(a.id)).length : 0;
          const stacks = buildAchievementStacks(items, earnedSet, progress, isAuthed);
          return (
            <section key={category} className="rounded-xl border border-fab-border bg-fab-surface p-4 sm:p-5">
              <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-fab-dim">
                    {isAuthed
                      ? `${categoryEarned} / ${items.length} unlocked across ${stacks.length} paths`
                      : `${items.length} achievements across ${stacks.length} paths`}
                  </p>
                  <h2 className="text-lg font-bold text-fab-text">{copy.label}</h2>
                </div>
                <p className="max-w-xl text-xs leading-5 text-fab-muted">{copy.description}</p>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                {stacks.map((stack) => (
                  <AchievementStackCard
                    key={stack.id}
                    stack={stack}
                    earnedSet={earnedSet}
                    isAuthed={isAuthed}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function ProgressCard({
  achievement,
  current,
  target,
  pct,
}: {
  achievement: Achievement;
  current: number;
  target: number;
  pct: number;
}) {
  const colors = rarityColors[achievement.rarity];
  return (
    <div className={`rounded-lg border ${colors.border} bg-fab-bg/55 p-3`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${colors.border} ${colors.bg}`}>
          <AchievementIcon icon={achievement.icon} className={`h-5 w-5 ${colors.text}`} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-fab-text truncate">{achievement.name}</h3>
          <p className="mt-1 text-xs leading-5 text-fab-muted line-clamp-2">{achievement.description}</p>
          <div className="mt-2">
            <div className="flex items-center justify-between text-[10px] tabular-nums mb-1">
              <span className={`font-bold ${colors.text}`}>{current.toLocaleString()} / {target.toLocaleString()}</span>
              <span className="text-fab-dim font-semibold">{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-fab-bg overflow-hidden">
              <div
                className={`h-full rounded-full ${colors.text.replace("text-", "bg-")}`}
                style={{ width: `${pct}%`, opacity: 0.9 }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AchievementStackCard({
  stack,
  earnedSet,
  isAuthed,
}: {
  stack: AchievementStack;
  earnedSet: Set<string>;
  isAuthed: boolean;
}) {
  const { achievements, current, next, display, nextProgress, pct } = stack;
  const completed = isAuthed && achievements.length > 0 && stack.earnedAchievements.length === achievements.length;
  const untouched = isAuthed && stack.earnedAchievements.length === 0;
  const colors = rarityColors[display.rarity];
  const progressColors = rarityColors[(next || display).rarity];
  const tierLabel = achievements.length > 1
    ? completed
      ? "Complete path"
      : current
        ? "Current tier"
        : "Next tier"
    : completed
      ? "Unlocked"
      : "Achievement";
  const description = next && !completed ? next.description : display.description;

  return (
    <div
      className={`rounded-lg border p-3 transition-colors ${
        completed || current ? `${colors.border} bg-fab-bg/55` : "border-fab-border/60 bg-fab-bg/30"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border relative ${
            completed || current ? `${colors.border} ${colors.bg}` : "border-fab-border/50 bg-fab-bg/40"
          }`}
        >
          <AchievementIcon
            icon={display.icon}
            className={`h-5 w-5 ${completed || current ? colors.text : "text-fab-dim"} ${untouched ? "opacity-70" : ""}`}
          />
          {untouched && (
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-fab-bg border border-fab-border/60">
              <Lock className="h-2.5 w-2.5 text-fab-dim" />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className={`text-[9px] font-bold uppercase tracking-[0.14em] ${completed || current ? colors.text : "text-fab-dim"}`}>
                {tierLabel}
              </p>
              <h3 className={`mt-0.5 text-sm font-bold truncate ${completed || current ? "text-fab-text" : "text-fab-muted"}`}>
                {display.name}
              </h3>
            </div>
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                completed || current ? `${colors.bg} ${colors.text}` : "bg-fab-bg/60 text-fab-dim border border-fab-border/40"
              }`}
            >
              {display.rarity}
            </span>
          </div>
          <p className={`mt-1 text-xs leading-5 ${completed || current ? "text-fab-muted" : "text-fab-dim"} line-clamp-2`}>
            {description}
          </p>

          {achievements.length > 1 && (
            <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(1.35rem,1fr))] gap-1">
              {achievements.map((achievement, index) => {
                const tierEarned = isAuthed && earnedSet.has(achievement.id);
                const tierColors = rarityColors[achievement.rarity];
                return (
                  <div
                    key={achievement.id}
                    title={`${achievement.name}: ${achievement.description}`}
                    aria-label={`${achievement.name}: ${tierEarned ? "unlocked" : "locked"}`}
                    className={`h-6 rounded border text-center text-[10px] font-black leading-6 tabular-nums ${
                      tierEarned
                        ? `${tierColors.border} ${tierColors.bg} ${tierColors.text}`
                        : "border-fab-border/45 bg-fab-bg/35 text-fab-dim"
                    }`}
                  >
                    {achievement.tier || index + 1}
                  </div>
                );
              })}
            </div>
          )}

          {isAuthed && next && nextProgress && nextProgress.target > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full bg-fab-bg overflow-hidden">
                <div
                  className={`h-full rounded-full ${progressColors.text.replace("text-", "bg-")}`}
                  style={{ width: `${pct}%`, opacity: 0.85 }}
                />
              </div>
              <span className="text-[10px] tabular-nums text-fab-dim font-semibold whitespace-nowrap">
                {nextProgress.current.toLocaleString()}/{nextProgress.target.toLocaleString()}
              </span>
            </div>
          )}

          {completed && achievements.length > 1 && (
            <div className="mt-3 h-1 rounded-full bg-fab-bg overflow-hidden">
              <div className={`h-full rounded-full ${colors.text.replace("text-", "bg-")}`} style={{ width: "100%", opacity: 0.9 }} />
            </div>
          )}

          {achievements.length > 1 && (
            <details className="group mt-3 border-t border-fab-border/40 pt-2">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-fab-dim transition-colors hover:text-fab-muted">
                <span>
                  {isAuthed
                    ? `${stack.earnedAchievements.length}/${achievements.length} tiers unlocked`
                    : `${achievements.length} tiers`}
                </span>
                <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-2 space-y-1.5">
                {achievements.map((achievement) => {
                  const tierEarned = isAuthed && earnedSet.has(achievement.id);
                  const tierColors = rarityColors[achievement.rarity];
                  return (
                    <div key={achievement.id} className="flex items-center justify-between gap-3 rounded-md bg-fab-bg/35 px-2 py-1.5">
                      <div className="min-w-0">
                        <p className={`truncate text-xs font-bold ${tierEarned ? "text-fab-text" : "text-fab-muted"}`}>
                          {achievement.name}
                        </p>
                        <p className="truncate text-[10px] text-fab-dim">{achievement.description}</p>
                      </div>
                      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${tierEarned ? `${tierColors.bg} ${tierColors.text}` : "text-fab-dim"}`}>
                        {achievement.rarity}
                      </span>
                    </div>
                  );
                })}
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
