"use client";
import { useMemo } from "react";
import Link from "next/link";
import type { User } from "firebase/auth";
import type { LeaderboardEntry } from "@/types";
import type { HeroMetaStats, CommunityOverview } from "@/lib/meta-stats";
import { selectFeaturedProfiles } from "@/lib/featured-profiles";
import { VISIBLE_GAMES as GAMES } from "@/lib/games";
import { MetaSnapshot } from "@/components/home/MetaSnapshot";
import { FeaturedProfiles } from "@/components/home/FeaturedProfiles";
import { ShieldIcon } from "@/components/icons/NavIcons";

interface LoggedOutHomeProps {
  user: User | null;
  communityMeta: { overview: CommunityOverview; heroStats: HeroMetaStats[] };
  lbEntries: LeaderboardEntry[];
}

const FEATURES = [
  {
    href: "/login",
    label: "Match Tracking",
    desc: "Import matches and track your win rate, streaks, and trends over time.",
    color: "text-fab-gold",
    bgColor: "bg-fab-gold/10 ring-fab-gold/20",
    icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z",
  },
  {
    href: "/meta",
    label: "Community Meta",
    desc: "See which heroes dominate and their real community win rates.",
    color: "text-teal-400",
    bgColor: "bg-teal-500/10 ring-teal-500/20",
    icon: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  {
    href: "/leaderboard",
    label: "Leaderboard",
    desc: "90+ rankings: ELO, win rate, streaks, events, kudos, and more.",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10 ring-amber-500/20",
    icon: "M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-2.77.704 6.023 6.023 0 01-2.77-.704",
  },
  {
    href: "/games",
    label: "Daily Games",
    desc: "14 daily mini-games: FaBdoku, Hero Guesser, Trivia, Crossword, and more.",
    color: "text-rose-400",
    bgColor: "bg-rose-500/10 ring-rose-500/20",
    icon: "M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.959.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z",
  },
  {
    href: "/compare",
    label: "Head to Head",
    desc: "Compare your stats against any player side by side.",
    color: "text-violet-400",
    bgColor: "bg-violet-500/10 ring-violet-500/20",
    icon: "M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5",
  },
  {
    href: "/tournaments",
    label: "Tournaments",
    desc: "Browse tournament results from events worldwide.",
    color: "text-sky-400",
    bgColor: "bg-sky-500/10 ring-sky-500/20",
    icon: "M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418",
  },
];

export function LoggedOutHome({ user, communityMeta, lbEntries }: LoggedOutHomeProps) {
  const { overview, heroStats } = communityMeta;

  const featuredProfiles = useMemo(() => selectFeaturedProfiles(lbEntries), [lbEntries]);

  const topPlayers = useMemo(() =>
    lbEntries
      .filter((e) => e.isPublic && e.username && e.totalMatches >= 20)
      .sort((a, b) => (b.eloRating ?? 0) - (a.eloRating ?? 0))
      .slice(0, 5),
    [lbEntries],
  );

  const featuredGames = useMemo(() => GAMES.slice(0, 6), []);

  return (
    <div className="space-y-10">
      {/* ── Section 1: Hero Banner ── */}
      <div className="relative bg-fab-surface border border-fab-border rounded-xl p-6 sm:p-8 overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-fab-gold/50 to-transparent" />
        <div className="absolute -top-20 -right-20 w-56 h-56 bg-fab-gold/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-fab-gold/30 to-amber-600/20 flex items-center justify-center shrink-0 ring-1 ring-fab-gold/20">
            <ShieldIcon className="w-7 h-7 text-fab-gold" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-fab-gold">FaB Stats</h1>
            <p className="text-xs text-fab-dim">Flesh and Blood Tournament Tracker</p>
          </div>
        </div>

        <h2 className="relative text-lg sm:text-xl font-bold text-fab-text mb-2">
          Your Flesh and Blood Stats, Unlocked
        </h2>
        <p className="relative text-sm text-fab-muted mb-6 max-w-lg">
          Track matches, analyze the meta, climb the leaderboard, and play daily games — all in one place.
        </p>

        <div className="relative flex gap-3 flex-wrap mb-6">
          {user ? (
            <Link
              href="/import"
              className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors"
            >
              Import Your Matches
            </Link>
          ) : (
            <Link
              href="/login"
              className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors"
            >
              Sign Up Free
            </Link>
          )}
          <Link
            href="/leaderboard"
            className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-fab-bg border border-fab-border text-fab-text hover:bg-fab-surface-hover transition-colors"
          >
            Browse Leaderboard
          </Link>
        </div>

        {/* Community stats counters */}
        {overview.totalPlayers > 0 && (
          <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { value: overview.totalPlayers, label: "Players" },
              { value: overview.totalMatches, label: "Matches Logged" },
              { value: overview.totalHeroes, label: "Heroes in Meta" },
              { value: overview.totalEvents, label: "Events Tracked" },
            ].map((s) => (
              <div key={s.label} className="bg-fab-bg/60 rounded-lg px-3 py-2 border border-fab-border/50">
                <div className="text-lg font-bold text-fab-text tabular-nums">{s.value.toLocaleString()}</div>
                <div className="text-[11px] text-fab-dim">{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Section 2: Meta Snapshot ── */}
      {heroStats.length > 0 && (
        <MetaSnapshot topHeroes={heroStats.slice(0, 5)} />
      )}

      {/* ── Section 3: Feature Showcase Grid ── */}
      <div>
        <h3 className="text-sm font-semibold text-fab-text mb-3">Everything You Need</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FEATURES.map((f) => (
            <Link
              key={f.label}
              href={f.href}
              className="group bg-fab-surface border border-fab-border rounded-lg p-4 hover:border-fab-gold/30 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg ${f.bgColor} flex items-center justify-center ring-1 ring-inset shrink-0`}>
                  <svg className={`w-4 h-4 ${f.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={f.icon} />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-fab-text group-hover:text-fab-gold transition-colors">{f.label}</div>
                  <p className="text-xs text-fab-dim mt-0.5">{f.desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Section 4: Leaderboard Preview ── */}
      {topPlayers.length > 0 && (
        <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-fab-border/50">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-amber-500/10 flex items-center justify-center ring-1 ring-inset ring-amber-500/20">
                <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-2.77.704 6.023 6.023 0 01-2.77-.704" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-fab-text">Top Players</h3>
            </div>
            <Link href="/leaderboard" className="text-xs text-fab-gold hover:text-fab-gold-light transition-colors font-medium">
              View All
            </Link>
          </div>
          <div className="divide-y divide-fab-border/30">
            {topPlayers.map((p, i) => (
              <Link
                key={p.userId}
                href={`/player/${p.username}`}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-fab-bg/50 transition-colors"
              >
                <span className={`w-5 text-xs font-bold tabular-nums ${i < 3 ? "text-fab-gold" : "text-fab-dim"}`}>
                  {i + 1}
                </span>
                {p.photoUrl ? (
                  <img src={p.photoUrl} alt="" className="w-7 h-7 rounded-full" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-fab-gold/15 flex items-center justify-center text-fab-gold text-xs font-bold">
                    {p.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-fab-text truncate block">{p.displayName}</span>
                </div>
                <span className={`text-xs font-semibold tabular-nums ${p.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
                  {p.winRate.toFixed(1)}%
                </span>
                <span className="text-xs text-fab-dim tabular-nums">{p.totalMatches}m</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Section 5: Daily Games Teaser ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-rose-500/10 flex items-center justify-center ring-1 ring-inset ring-rose-500/20">
              <svg className="w-3.5 h-3.5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.959.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-fab-text">Daily Mini-Games</h3>
          </div>
          <Link href="/games" className="text-xs text-fab-gold hover:text-fab-gold-light transition-colors font-medium">
            Play All 14
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {featuredGames.map((g) => (
            <Link
              key={g.slug}
              href={g.href}
              className="group bg-fab-surface border border-fab-border rounded-lg px-3 py-2.5 hover:border-fab-gold/30 transition-colors text-center"
            >
              <div className="flex justify-center mb-1.5">
                <svg className={`w-5 h-5 ${g.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={g.iconPath} />
                </svg>
              </div>
              <div className="text-xs font-semibold text-fab-text group-hover:text-fab-gold transition-colors">{g.label}</div>
              <div className="text-[10px] text-fab-dim mt-0.5">{g.subtitle}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Section 6: Player Spotlights ── */}
      {featuredProfiles.length > 0 && (
        <FeaturedProfiles profiles={featuredProfiles} grid />
      )}

      {/* ── Section 7: Closing CTA ── */}
      <div className="relative bg-fab-surface border border-fab-border rounded-lg p-6 text-center overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-fab-gold/30 to-transparent" />
        <h3 className="text-lg font-bold text-fab-text mb-1">Ready to track your journey?</h3>
        {overview.totalPlayers > 0 && (
          <p className="text-sm text-fab-muted mb-4">
            Join {overview.totalPlayers.toLocaleString()} players already tracking their stats.
          </p>
        )}
        <div className="flex justify-center gap-3 flex-wrap mb-5">
          {user ? (
            <Link
              href="/import"
              className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors"
            >
              Import Your Matches
            </Link>
          ) : (
            <Link
              href="/login"
              className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors"
            >
              Sign Up Free
            </Link>
          )}
          <Link
            href="/leaderboard"
            className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-fab-bg border border-fab-border text-fab-text hover:bg-fab-surface-hover transition-colors"
          >
            Browse as Guest
          </Link>
        </div>
        <div className="flex items-center justify-center gap-4">
          {[
            { href: "/docs", label: "Docs", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
            { href: "/changelog", label: "Changelog", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" },
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
    </div>
  );
}
