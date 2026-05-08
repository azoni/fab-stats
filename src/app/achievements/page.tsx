import type { Metadata } from "next";
import Link from "next/link";
import { Trophy, Swords, Gamepad2, Sparkles } from "lucide-react";
import { getAllAchievements, rarityColors } from "@/lib/achievements";
import { AchievementIcon } from "@/components/gamification/AchievementIcons";
import type { Achievement, AchievementCategory } from "@/types";

export const metadata: Metadata = {
  title: "Achievements",
  description: "Browse FaB Stats achievements for match milestones, hero mastery, daily games, kudos, and community progress.",
};

const CATEGORY_COPY: Record<AchievementCategory, { label: string; description: string }> = {
  milestone: {
    label: "Match Milestones",
    description: "Long-term progress for logging matches, wins, events, and rated play.",
  },
  streak: {
    label: "Streaks",
    description: "Rewards for sustained runs and strong recent form.",
  },
  mastery: {
    label: "Mastery",
    description: "Hero loyalty, win-rate benchmarks, and high-skill progression.",
  },
  exploration: {
    label: "Exploration",
    description: "Achievements for trying more heroes, formats, and ways to play.",
  },
  fun: {
    label: "Daily Games",
    description: "Puzzle and mini-game achievements across the daily game suite.",
  },
  social: {
    label: "Community",
    description: "Kudos and community recognition from other FaB Stats players.",
  },
  special: {
    label: "Special",
    description: "Limited or manually granted badges for special site moments.",
  },
};

const CATEGORY_ORDER: AchievementCategory[] = ["milestone", "mastery", "streak", "exploration", "fun", "social", "special"];

const RARITY_ORDER: Achievement["rarity"][] = ["legendary", "epic", "rare", "uncommon", "common"];

function groupAchievements(achievements: Achievement[]) {
  return achievements.reduce<Record<AchievementCategory, Achievement[]>>((acc, achievement) => {
    if (!acc[achievement.category]) acc[achievement.category] = [];
    acc[achievement.category].push(achievement);
    return acc;
  }, {} as Record<AchievementCategory, Achievement[]>);
}

function sortAchievement(a: Achievement, b: Achievement) {
  const groupCompare = (a.group || a.id).localeCompare(b.group || b.id);
  if (groupCompare !== 0) return groupCompare;
  return (a.tier || 0) - (b.tier || 0);
}

export default function AchievementsPage() {
  const achievements = getAllAchievements();
  const grouped = groupAchievements(achievements);
  const rarityCounts = RARITY_ORDER.map((rarity) => ({
    rarity,
    count: achievements.filter((achievement) => achievement.rarity === rarity).length,
  }));
  const featured = achievements
    .filter((achievement) => achievement.rarity === "legendary")
    .slice(0, 6);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-xl border border-fab-border bg-fab-surface p-5 sm:p-6">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fab-gold/45 to-transparent" />
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-fab-border/70 bg-fab-bg/70 px-3 py-2">
              <Trophy className="h-4 w-4 text-fab-gold" />
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-fab-muted">Achievements</span>
            </div>
            <h1 className="text-3xl font-black leading-tight text-fab-text sm:text-4xl">Track the whole FaB journey.</h1>
            <p className="mt-3 text-sm leading-6 text-fab-muted">
              Achievements unlock from imported match history, hero mastery, tournament finishes, kudos, and daily games.
              Earned badges appear on your profile and can be pinned in your badge strip.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[28rem]">
            <Stat value={achievements.length} label="Total" />
            <Stat value={grouped.fun?.length || 0} label="Game" />
            <Stat value={grouped.mastery?.length || 0} label="Mastery" />
            <Stat value={grouped.social?.length || 0} label="Social" />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Link href="/import" className="group rounded-lg border border-fab-border bg-fab-surface p-4 transition-colors hover:border-fab-gold/30 hover:bg-fab-surface-hover">
          <Swords className="mb-3 h-5 w-5 text-fab-gold" />
          <h2 className="text-sm font-bold text-fab-text group-hover:text-fab-gold">Import matches</h2>
          <p className="mt-1.5 text-xs leading-5 text-fab-muted">Match, win, event, hero, and tournament achievements are evaluated after imports.</p>
        </Link>
        <Link href="/games" className="group rounded-lg border border-fab-border bg-fab-surface p-4 transition-colors hover:border-fab-gold/30 hover:bg-fab-surface-hover">
          <Gamepad2 className="mb-3 h-5 w-5 text-teal-400" />
          <h2 className="text-sm font-bold text-fab-text group-hover:text-fab-gold">Play daily games</h2>
          <p className="mt-1.5 text-xs leading-5 text-fab-muted">Puzzle, knowledge, Brute Dice, and Ninja game milestones all feed into the achievement system.</p>
        </Link>
        <Link href="/leaderboard" className="group rounded-lg border border-fab-border bg-fab-surface p-4 transition-colors hover:border-fab-gold/30 hover:bg-fab-surface-hover">
          <Sparkles className="mb-3 h-5 w-5 text-violet-400" />
          <h2 className="text-sm font-bold text-fab-text group-hover:text-fab-gold">Compare progress</h2>
          <p className="mt-1.5 text-xs leading-5 text-fab-muted">Use rankings, kudos, and public profiles to see how your progress stacks up.</p>
        </Link>
      </section>

      <section className="rounded-xl border border-fab-border bg-fab-surface p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-fab-gold/80">Rarity</p>
            <h2 className="mt-1 text-lg font-bold text-fab-text">Badge Tiers</h2>
          </div>
          <p className="text-xs text-fab-dim">Harder achievements use higher rarity colors on profiles and showcase cards.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {rarityCounts.map(({ rarity, count }) => {
            const colors = rarityColors[rarity];
            return (
              <div key={rarity} className={`rounded-lg border ${colors.border} ${colors.bg} p-3`}>
                <p className={`text-sm font-black capitalize ${colors.text}`}>{rarity}</p>
                <p className="mt-1 text-xs text-fab-muted">{count} badges</p>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-400/80">Top end</p>
            <h2 className="mt-1 text-lg font-bold text-fab-text">Legendary Examples</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {featured.map((achievement) => (
            <AchievementCard key={achievement.id} achievement={achievement} />
          ))}
        </div>
      </section>

      <div className="space-y-6">
        {CATEGORY_ORDER.map((category) => {
          const items = [...(grouped[category] || [])].sort(sortAchievement);
          if (items.length === 0) return null;
          const copy = CATEGORY_COPY[category];
          return (
            <section key={category} className="rounded-xl border border-fab-border bg-fab-surface p-4 sm:p-5">
              <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-fab-dim">{items.length} achievements</p>
                  <h2 className="text-lg font-bold text-fab-text">{copy.label}</h2>
                </div>
                <p className="max-w-xl text-xs leading-5 text-fab-muted">{copy.description}</p>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                {items.map((achievement) => (
                  <AchievementCard key={achievement.id} achievement={achievement} compact />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-lg border border-fab-border/70 bg-fab-bg/70 px-3 py-2.5">
      <p className="text-xl font-black leading-none text-fab-text tabular-nums">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-fab-dim">{label}</p>
    </div>
  );
}

function AchievementCard({ achievement, compact = false }: { achievement: Achievement; compact?: boolean }) {
  const colors = rarityColors[achievement.rarity];
  return (
    <div className={`rounded-lg border ${colors.border} bg-fab-bg/55 p-3 ${compact ? "" : "min-h-[8rem]"}`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${colors.border} ${colors.bg}`}>
          <AchievementIcon icon={achievement.icon} className={`h-5 w-5 ${colors.text}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-bold text-fab-text">{achievement.name}</h3>
            <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${colors.bg} ${colors.text}`}>
              {achievement.rarity}
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-fab-muted">{achievement.description}</p>
          {achievement.tier && (
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-fab-dim">Tier {achievement.tier}</p>
          )}
        </div>
      </div>
    </div>
  );
}
