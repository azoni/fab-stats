"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Gamepad2, Share2, Sparkles } from "lucide-react";
import { VISIBLE_GAMES, GAME_CATEGORIES } from "@/lib/games";
import { AllGamesShareCard } from "@/components/games/AllGamesShareCard";

function getTodayDateStr(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
}

function dateOffsetStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

function completedOn(slug: string, dateStr: string): boolean {
  try {
    const raw = localStorage.getItem(`${slug}-${dateStr}`);
    // Games persist state on the first move, so key-existence over-counts
    // abandoned games as "done". Require an explicit completion flag.
    return raw ? JSON.parse(raw).completed === true : false;
  } catch {
    return false;
  }
}

function hasPlayedToday(slug: string): boolean {
  if (typeof window === "undefined") return false;
  return completedOn(slug, getTodayDateStr());
}

function playedAnyOn(dateStr: string): boolean {
  return VISIBLE_GAMES.some((g) => completedOn(g.slug, dateStr));
}

/**
 * Overall daily-play streak from localStorage: consecutive days on which you
 * completed at least one game. Counts today if done, and doesn't break until a
 * full day is actually missed (so an as-yet-unplayed today still shows the
 * streak earned through yesterday). Free + client-side — no Firestore reads.
 */
function computeOverallStreak(): number {
  if (typeof window === "undefined") return 0;
  const today = getTodayDateStr();
  let cursor = playedAnyOn(today) ? today : dateOffsetStr(today, -1);
  let streak = 0;
  for (let i = 0; i < 400 && playedAnyOn(cursor); i++) {
    streak++;
    cursor = dateOffsetStr(cursor, -1);
  }
  return streak;
}

const CATEGORY_BORDER_COLORS: Record<string, string> = {
  puzzle: "border-l-emerald-500/50",
  knowledge: "border-l-purple-500/50",
  dice: "border-l-red-500/50",
  ninja: "border-l-cyan-500/50",
};

export default function GamesPage() {
  const [showShare, setShowShare] = useState(false);
  const [playedSlugs, setPlayedSlugs] = useState<Set<string>>(() => new Set());
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    setPlayedSlugs(new Set(VISIBLE_GAMES.filter((game) => hasPlayedToday(game.slug)).map((game) => game.slug)));
    setStreak(computeOverallStreak());
  }, []);

  const completed = playedSlugs.size;
  const playedToday = completed > 0;
  const remaining = Math.max(0, VISIBLE_GAMES.length - completed);
  const categoryStats = useMemo(
    () =>
      GAME_CATEGORIES.map((cat) => ({
        ...cat,
        games: VISIBLE_GAMES.filter((game) => game.category === cat.id),
      })).filter((cat) => cat.games.length > 0),
    []
  );

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <section className="relative overflow-hidden rounded-xl border border-fab-border/80 bg-[linear-gradient(135deg,rgba(25,23,18,0.96),rgba(14,15,14,0.95)_58%,rgba(17,24,22,0.92))] p-3 shadow-[0_16px_48px_rgba(0,0,0,0.22)] sm:p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(245,179,57,0.16),transparent_30%),radial-gradient(circle_at_86%_18%,rgba(38,211,177,0.11),transparent_28%)]" />
        <div className="relative flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-fab-border/80 bg-fab-bg/55 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-fab-gold">
              <Sparkles className="h-3.5 w-3.5" />
              Daily warmups
            </div>
            <h1 className="mt-2 text-xl font-black text-fab-text sm:text-3xl">Daily Games</h1>
            <p className="mt-1 hidden max-w-2xl text-sm leading-6 text-fab-muted sm:block">
              Quick FaB puzzles for hero knowledge, matchups, trivia, pattern recognition, and between-round brain reps.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-1.5 sm:min-w-[28rem] sm:grid-cols-4 sm:gap-2">
            <GameMetric label="Day streak" value={`🔥 ${streak}`} tone="flame" />
            <GameMetric label="Games" value={VISIBLE_GAMES.length.toString()} />
            <GameMetric label="Done" value={completed.toString()} tone="green" />
            <GameMetric label="Left" value={remaining.toString()} tone="blue" />
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 rounded-xl border border-fab-border/80 bg-fab-surface/85 p-4 shadow-[0_16px_48px_rgba(0,0,0,0.16)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-fab-gold/25 bg-fab-gold/10 text-fab-gold">
            <Gamepad2 className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-black uppercase tracking-[0.12em] text-fab-text">Today&apos;s run</p>
            <p className="text-xs text-fab-muted">
              {streak > 0
                ? playedToday
                  ? `🔥 ${streak}-day streak going — new challenges at midnight UTC.`
                  : `🔥 ${streak}-day streak — play one today to keep it alive.`
                : "Play any game daily to start a streak. Refreshes at midnight UTC."}
            </p>
          </div>
        </div>
        {completed >= 2 && (
          <button
            onClick={() => setShowShare(true)}
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-fab-gold/35 bg-fab-gold/15 px-3 py-2 text-xs font-bold text-fab-gold transition-colors hover:bg-fab-gold/25"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share Run
          </button>
        )}
      </div>

      <div className="space-y-6">
        {categoryStats.map((cat) => (
          <section key={cat.id} className="space-y-3">
            <div className={`border-l-2 ${CATEGORY_BORDER_COLORS[cat.id] || "border-l-fab-border"} pl-3`}>
              <div className="flex items-center gap-2">
                <h2 className={`text-base font-black ${cat.color}`}>{cat.label}</h2>
                <span className="rounded-full border border-fab-border/70 bg-fab-bg/45 px-2 py-0.5 text-[10px] font-bold text-fab-dim">
                  {cat.games.length}
                </span>
              </div>
              <p className="text-xs text-fab-muted">{cat.description}</p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {cat.games.map((game) => {
                const played = playedSlugs.has(game.slug);
                return (
                  <Link
                    key={game.slug}
                    href={game.href}
                    className="group relative min-h-36 overflow-hidden rounded-xl border border-fab-border/80 bg-fab-surface/85 p-4 shadow-[0_12px_36px_rgba(0,0,0,0.14)] transition-colors hover:border-fab-gold/50 hover:bg-fab-gold/10"
                  >
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fab-gold/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    <div className="flex items-start gap-3">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-fab-border/70 bg-fab-bg/65 ${game.color}`}>
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={game.iconPath} />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-base font-black text-fab-text transition-colors group-hover:text-fab-gold">{game.label}</h3>
                          {played && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-fab-win" />}
                        </div>
                        <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-fab-dim">{game.subtitle}</p>
                        <p className="mt-2 text-sm leading-5 text-fab-muted">{game.description}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {showShare && <AllGamesShareCard onClose={() => setShowShare(false)} />}
    </div>
  );
}

function GameMetric({ label, value, tone = "gold" }: { label: string; value: string; tone?: "gold" | "green" | "blue" | "flame" }) {
  const color = tone === "green" ? "text-emerald-300" : tone === "blue" ? "text-sky-300" : tone === "flame" ? "text-orange-300" : "text-fab-gold";
  return (
    <div className="rounded-lg border border-fab-border/70 bg-fab-bg/45 px-3 py-2 shadow-inner shadow-black/10">
      <p className={`text-lg font-black leading-none sm:text-xl ${color}`}>{value}</p>
      <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-fab-dim sm:text-[10px]">{label}</p>
    </div>
  );
}
