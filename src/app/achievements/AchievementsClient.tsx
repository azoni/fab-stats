"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Trophy, Lock } from "lucide-react";
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
import { AchievementIcon } from "@/components/gamification/AchievementIcons";
import type { Achievement, AchievementCategory } from "@/types";

const CATEGORY_COPY: Record<AchievementCategory, { label: string; description: string }> = {
  milestone: { label: "Match Milestones", description: "Long-term progress for logging matches, wins, events, and rated play." },
  streak: { label: "Streaks", description: "Rewards for sustained runs and strong recent form." },
  mastery: { label: "Mastery", description: "Hero loyalty, win-rate benchmarks, and high-skill progression." },
  exploration: { label: "Exploration", description: "Trying more heroes, formats, and ways to play." },
  fun: { label: "Daily Games", description: "Puzzle and mini-game achievements across the daily game suite." },
  social: { label: "Community", description: "Kudos and community recognition from other FaB Stats players." },
  special: { label: "Special", description: "Limited or manually granted badges for special site moments." },
};

const CATEGORY_ORDER: AchievementCategory[] = ["milestone", "mastery", "streak", "exploration", "fun", "social", "special"];
const RARITY_ORDER: Achievement["rarity"][] = ["legendary", "epic", "rare", "uncommon", "common"];

function sortAchievement(a: Achievement, b: Achievement) {
  const groupCompare = (a.group || a.id).localeCompare(b.group || b.id);
  if (groupCompare !== 0) return groupCompare;
  return (a.tier || 0) - (b.tier || 0);
}

export function AchievementsClient() {
  const { user, isGuest } = useAuth();
  const { matches, isLoaded } = useMatches();
  const isAuthed = !!user && !isGuest;

  const allAchievements = useMemo(() => getAllAchievements(), []);

  // Stats computed from imported matches. Daily-game stats are intentionally
  // omitted — those achievements will show as locked here, which is fine
  // since the player can see them on the relevant game pages too.
  const overall = useMemo(() => computeOverallStats(matches), [matches]);
  const heroStats = useMemo(() => computeHeroStats(matches), [matches]);
  const opponentStats = useMemo(() => computeOpponentStats(matches), [matches]);

  const earned = useMemo(() => {
    if (!isAuthed) return [] as Achievement[];
    return evaluateAchievements(matches, overall, heroStats, opponentStats);
  }, [isAuthed, matches, overall, heroStats, opponentStats]);

  const earnedSet = useMemo(() => new Set(earned.map((a) => a.id)), [earned]);

  const progress = useMemo(() => {
    if (!isAuthed) return {} as Record<string, { current: number; target: number }>;
    return getAchievementProgress(matches, overall, heroStats, opponentStats);
  }, [isAuthed, matches, overall, heroStats, opponentStats]);

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
    return allAchievements
      .filter((a) => !earnedSet.has(a.id) && progress[a.id] && progress[a.id].target > 0 && progress[a.id].current > 0)
      .map((a) => {
        const p = progress[a.id];
        return { achievement: a, current: p.current, target: p.target, pct: Math.min(100, Math.round((p.current / p.target) * 100)) };
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

  return (
    <div className="space-y-8">
      {/* Hero — progress summary */}
      <section className="relative overflow-hidden rounded-xl border border-fab-border bg-fab-surface p-5 sm:p-6">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fab-gold/45 to-transparent" />
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-fab-border/70 bg-fab-bg/70 px-3 py-2">
              <Trophy className="h-4 w-4 text-fab-gold" />
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-fab-muted">
                {isAuthed ? "Your Achievements" : "Achievements"}
              </span>
            </div>
            <h1 className="text-3xl font-black leading-tight text-fab-text sm:text-4xl">
              {isAuthed
                ? `${earnedCount} of ${totalCount} unlocked`
                : `${totalCount} achievements to chase`}
            </h1>
            <p className="mt-3 text-sm leading-6 text-fab-muted">
              {isAuthed ? (
                <>
                  Earned badges appear on your profile and can be pinned in your badge strip.
                  {!isLoaded && " Loading your latest progress…"}
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
              <div className="mt-5">
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
          <div className="grid grid-cols-5 gap-2 lg:w-[28rem]">
            {rarityBreakdown.map(({ rarity, total, earned }) => {
              const colors = rarityColors[rarity];
              const pct = total > 0 ? Math.round((earned / total) * 100) : 0;
              return (
                <div key={rarity} className={`rounded-lg border ${colors.border} ${colors.bg} px-2 py-2.5 text-center`}>
                  <p className={`text-lg font-black tabular-nums ${colors.text}`}>
                    {isAuthed ? earned : total}
                    {isAuthed && <span className="text-fab-dim font-bold text-xs">/{total}</span>}
                  </p>
                  <p className={`mt-0.5 text-[9px] font-bold uppercase tracking-wider ${colors.text}`}>
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

      {/* All achievements by category */}
      <div className="space-y-6">
        {CATEGORY_ORDER.map((category) => {
          const items = [...(grouped[category] || [])].sort(sortAchievement);
          if (items.length === 0) return null;
          const copy = CATEGORY_COPY[category];
          const categoryEarned = isAuthed ? items.filter((a) => earnedSet.has(a.id)).length : 0;
          return (
            <section key={category} className="rounded-xl border border-fab-border bg-fab-surface p-4 sm:p-5">
              <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-fab-dim">
                    {isAuthed ? `${categoryEarned} / ${items.length} unlocked` : `${items.length} achievements`}
                  </p>
                  <h2 className="text-lg font-bold text-fab-text">{copy.label}</h2>
                </div>
                <p className="max-w-xl text-xs leading-5 text-fab-muted">{copy.description}</p>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                {items.map((achievement) => (
                  <AchievementCard
                    key={achievement.id}
                    achievement={achievement}
                    earned={isAuthed && earnedSet.has(achievement.id)}
                    progress={isAuthed ? progress[achievement.id] : undefined}
                    locked={isAuthed && !earnedSet.has(achievement.id)}
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

function AchievementCard({
  achievement,
  earned,
  locked,
  progress,
}: {
  achievement: Achievement;
  earned: boolean;
  locked: boolean;
  progress?: { current: number; target: number };
}) {
  const colors = rarityColors[achievement.rarity];
  const dimmed = locked;
  return (
    <div
      className={`rounded-lg border p-3 transition-opacity ${
        earned ? `${colors.border} bg-fab-bg/55` : "border-fab-border/60 bg-fab-bg/30"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border relative ${
            earned ? `${colors.border} ${colors.bg}` : "border-fab-border/50 bg-fab-bg/40"
          }`}
        >
          <AchievementIcon
            icon={achievement.icon}
            className={`h-5 w-5 ${earned ? colors.text : "text-fab-dim"} ${dimmed ? "opacity-70" : ""}`}
          />
          {locked && (
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-fab-bg border border-fab-border/60">
              <Lock className="h-2.5 w-2.5 text-fab-dim" />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`text-sm font-bold truncate ${earned ? "text-fab-text" : "text-fab-muted"}`}>
              {achievement.name}
            </h3>
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                earned ? `${colors.bg} ${colors.text}` : "bg-fab-bg/60 text-fab-dim border border-fab-border/40"
              }`}
            >
              {achievement.rarity}
            </span>
          </div>
          <p className={`mt-1 text-xs leading-5 ${earned ? "text-fab-muted" : "text-fab-dim"} line-clamp-2`}>
            {achievement.description}
          </p>
          {/* Show progress bar when locked + we have progress data with non-zero target */}
          {locked && progress && progress.target > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full bg-fab-bg overflow-hidden">
                <div
                  className="h-full rounded-full bg-fab-dim"
                  style={{ width: `${Math.min(100, (progress.current / progress.target) * 100)}%` }}
                />
              </div>
              <span className="text-[10px] tabular-nums text-fab-dim font-semibold whitespace-nowrap">
                {progress.current.toLocaleString()}/{progress.target.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
