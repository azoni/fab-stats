"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { User } from "firebase/auth";
import type { LeaderboardEntry } from "@/types";
import type { HeroMetaStats, CommunityOverview } from "@/lib/meta-stats";
import { VISIBLE_GAMES as GAMES } from "@/lib/games";
import { HeroImg } from "@/components/heroes/HeroImg";
import { ShieldIcon } from "@/components/icons/NavIcons";

interface LoggedOutHomeProps {
  user: User | null;
  communityMeta: { overview: CommunityOverview; heroStats: HeroMetaStats[] };
  lbEntries: LeaderboardEntry[];
  communityCounts?: { userCount: number; matchCount: number };
}

const PRODUCT_PATHS = [
  {
    href: "/login",
    label: "Track Matches",
    eyebrow: "Personal record",
    desc: "Import GEM results and keep a clean history of heroes, events, opponents, and finishes.",
    accent: "text-fab-gold",
  },
  {
    href: "/meta",
    label: "Read the Meta",
    eyebrow: "Community data",
    desc: "See which heroes are actually converting across tracked events and leaderboard profiles.",
    accent: "text-teal-400",
  },
  {
    href: "/games",
    label: "Play Daily Games",
    eyebrow: "Warm up",
    desc: "Quick Flesh and Blood puzzles for hero knowledge, trivia, matchups, and pattern recognition.",
    accent: "text-rose-400",
  },
];

function formatCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 10_000) return `${Math.round(value / 1_000)}k`;
  return value.toLocaleString();
}

function displayPlayerName(player: LeaderboardEntry): string {
  return player.displayName || player.username || "Player";
}

export function LoggedOutHome({ user, communityMeta, lbEntries, communityCounts }: LoggedOutHomeProps) {
  const { overview, heroStats } = communityMeta;
  const totalPlayers = Math.max(overview.totalPlayers, communityCounts?.userCount ?? 0);
  const totalMatches = Math.max(overview.totalMatches, communityCounts?.matchCount ?? 0);

  const topPlayers = useMemo(() =>
    lbEntries
      .filter((entry) => entry.isPublic && entry.username && entry.totalMatches >= 20)
      .sort((a, b) => (b.eloRating ?? 0) - (a.eloRating ?? 0))
      .slice(0, 6),
    [lbEntries],
  );

  const topHeroes = useMemo(() => heroStats.slice(0, 6), [heroStats]);
  const maxMetaShare = Math.max(1, ...topHeroes.map((hero) => hero.metaShare));
  const featuredGames = useMemo(() => GAMES.slice(0, 6), []);

  return (
    <div className="space-y-8">
      <section
        className="relative min-h-[420px] overflow-hidden rounded-xl border border-fab-border/80 bg-fab-bg shadow-[0_24px_60px_-48px_rgba(0,0,0,0.95)]"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(18,16,12,0.98) 0%, rgba(18,16,12,0.9) 44%, rgba(18,16,12,0.58) 72%, rgba(18,16,12,0.86) 100%), url('/brand/hero-marquee.png')",
          backgroundPosition: "center, 112% center",
          backgroundRepeat: "no-repeat, no-repeat",
          backgroundSize: "cover, auto 118%",
        }}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fab-gold/45 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-teal-400/25 to-transparent" />

        <div className="relative flex min-h-[420px] max-w-3xl flex-col justify-center px-5 py-8 sm:px-8 lg:px-10">
          <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-lg border border-fab-border/70 bg-fab-surface/70 px-3 py-2 backdrop-blur">
            <ShieldIcon className="h-4 w-4 text-fab-gold" />
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-fab-muted">
              Flesh and Blood Match Tracker
            </span>
          </div>

          <h1 className="max-w-2xl text-4xl font-black leading-[0.96] tracking-tight text-fab-text sm:text-5xl lg:text-6xl">
            Know your record before the next round.
          </h1>

          <p className="mt-5 max-w-xl text-sm leading-6 text-fab-muted sm:text-base">
            FaB Stats turns match history into a tournament-ready view of your win rate,
            event finishes, opponent records, hero trends, and community meta.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href={user ? "/import" : "/login"}
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-fab-gold px-5 py-2.5 text-sm font-bold text-fab-bg transition-colors hover:bg-fab-gold-light"
            >
              {user ? "Import Matches" : "Start Tracking Free"}
            </Link>
            <Link
              href="/leaderboard"
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-fab-border/80 bg-fab-surface/70 px-5 py-2.5 text-sm font-semibold text-fab-text transition-colors hover:border-fab-gold/35 hover:bg-fab-surface-hover"
            >
              Browse Community Data
            </Link>
          </div>

          {totalPlayers > 0 && (
            <div className="mt-8 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { value: totalPlayers, label: "Players" },
                { value: totalMatches, label: "Matches" },
                { value: overview.totalHeroes, label: "Heroes" },
                { value: overview.totalEvents, label: "Events" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-lg border border-fab-border/60 bg-fab-surface/55 px-3 py-2.5 backdrop-blur">
                  <p className="text-xl font-black leading-none text-fab-text tabular-nums">{formatCount(stat.value)}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-fab-dim">{stat.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="fab-card rounded-xl border border-fab-border bg-fab-surface/95 p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-teal-400/80">Community Meta</p>
              <h2 className="mt-1 text-lg font-bold tracking-tight text-fab-text">Most Played Heroes</h2>
            </div>
            <Link href="/meta" className="text-xs font-semibold text-fab-gold transition-colors hover:text-fab-gold-light">
              Full meta
            </Link>
          </div>

          {topHeroes.length > 0 ? (
            <div className="space-y-2">
              {topHeroes.map((hero, index) => (
                <Link
                  key={hero.hero}
                  href="/meta"
                  className="group grid grid-cols-[2rem_2.25rem_minmax(0,1fr)_4.75rem] items-center gap-3 rounded-lg border border-transparent px-2 py-2 transition-colors hover:border-fab-gold/20 hover:bg-fab-surface-hover/70"
                >
                  <span className={`text-center text-sm font-black tabular-nums ${index === 0 ? "text-fab-gold" : "text-fab-dim"}`}>
                    {index + 1}
                  </span>
                  <HeroImg name={hero.hero} size="sm" />
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <p className={`truncate text-sm font-semibold ${index === 0 ? "text-fab-gold" : "text-fab-text group-hover:text-fab-gold"}`}>
                        {hero.hero}
                      </p>
                      <p className="shrink-0 text-xs font-bold text-fab-muted tabular-nums">
                        {hero.metaShare.toFixed(1)}%
                      </p>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-fab-bg">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-teal-400 to-fab-gold"
                        style={{ width: `${Math.max(8, (hero.metaShare / maxMetaShare) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-black tabular-nums ${hero.avgWinRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
                      {hero.avgWinRate.toFixed(0)}%
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-fab-dim">Win</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-fab-border/70 bg-fab-bg/60 p-4 text-sm text-fab-muted">
              Meta data will appear as more public match records are tracked.
            </p>
          )}
        </div>

        <div className="fab-card rounded-xl border border-fab-border bg-fab-surface/95 p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-400/80">Leaderboard</p>
              <h2 className="mt-1 text-lg font-bold tracking-tight text-fab-text">Players to Watch</h2>
            </div>
            <Link href="/leaderboard" className="text-xs font-semibold text-fab-gold transition-colors hover:text-fab-gold-light">
              Rankings
            </Link>
          </div>

          {topPlayers.length > 0 ? (
            <div className="divide-y divide-fab-border/35">
              {topPlayers.map((player, index) => (
                <Link
                  key={player.userId}
                  href={`/player/${player.username}`}
                  className="flex items-center gap-3 py-2.5 transition-colors hover:text-fab-gold"
                >
                  <span className={`w-5 text-center text-xs font-black tabular-nums ${index < 3 ? "text-fab-gold" : "text-fab-dim"}`}>
                    {index + 1}
                  </span>
                  {player.photoUrl ? (
                    <img src={player.photoUrl} alt="" className="h-8 w-8 rounded-full border border-fab-border/80 object-cover" loading="lazy" />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-fab-border/80 bg-fab-gold/15 text-xs font-bold text-fab-gold">
                      {displayPlayerName(player).charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-fab-text">{displayPlayerName(player)}</p>
                    <p className="text-[10px] font-medium text-fab-dim">@{player.username}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-black tabular-nums ${player.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
                      {player.winRate.toFixed(1)}%
                    </p>
                    <p className="text-[10px] text-fab-dim tabular-nums">{player.totalMatches} matches</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-fab-border/70 bg-fab-bg/60 p-4 text-sm text-fab-muted">
              Public leaderboard entries will appear here once players have enough tracked matches.
            </p>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {PRODUCT_PATHS.map((path) => (
          <Link
            key={path.label}
            href={user && path.href === "/login" ? "/import" : path.href}
            className="fab-card group rounded-xl border border-fab-border bg-fab-surface/95 p-4 transition-colors hover:border-fab-gold/30 hover:bg-fab-surface-hover"
          >
            <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${path.accent}`}>{path.eyebrow}</p>
            <h3 className="mt-2 text-base font-bold text-fab-text transition-colors group-hover:text-fab-gold">{path.label}</h3>
            <p className="mt-1.5 text-sm leading-5 text-fab-muted">{path.desc}</p>
          </Link>
        ))}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-rose-400/80">Daily Games</p>
            <h2 className="mt-1 text-lg font-bold tracking-tight text-fab-text">Quick FaB Warmups</h2>
          </div>
          <Link href="/games" className="text-xs font-semibold text-fab-gold transition-colors hover:text-fab-gold-light">
            All games
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {featuredGames.map((game) => (
            <Link
              key={game.slug}
              href={game.href}
              className="group rounded-xl border border-fab-border bg-fab-surface/90 px-3 py-3 text-left transition-colors hover:border-fab-gold/30 hover:bg-fab-surface-hover"
            >
              <svg className={`mb-2 h-5 w-5 ${game.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                <path strokeLinecap="round" strokeLinejoin="round" d={game.iconPath} />
              </svg>
              <p className="truncate text-xs font-bold text-fab-text transition-colors group-hover:text-fab-gold">{game.label}</p>
              <p className="mt-0.5 truncate text-[10px] text-fab-dim">{game.subtitle}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
