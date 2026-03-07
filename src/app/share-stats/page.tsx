"use client";
import { useMemo } from "react";
import Link from "next/link";
import { useMatches } from "@/hooks/useMatches";
import { useAuth } from "@/contexts/AuthContext";
import { computeOverallStats, computeHeroStats, computeEventStats } from "@/lib/stats";
import { computeEloRating, getEloTier } from "@/lib/elo";
import { getHeroByName } from "@/lib/heroes";
import { HeroClassIcon } from "@/components/heroes/HeroClassIcon";
import { MatchResult } from "@/types";

export default function ShareStatsPage() {
  const { user, profile, isGuest } = useAuth();
  const { matches, isLoaded } = useMatches();

  const overall = useMemo(() => computeOverallStats(matches), [matches]);
  const heroStats = useMemo(() => computeHeroStats(matches), [matches]);
  const eventStats = useMemo(() => computeEventStats(matches), [matches]);
  const elo = useMemo(() => computeEloRating(matches), [matches]);
  const eloTier = useMemo(() => getEloTier(elo), [elo]);

  // Top 3 heroes by matches played
  const topHeroes = useMemo(() => heroStats.slice(0, 3), [heroStats]);

  // Weakest matchups (bottom 3 opponent heroes by win rate, min 3 matches)
  const weakestMatchups = useMemo(() => {
    const allMatchups = heroStats.flatMap((h) =>
      h.matchups.filter((m) => m.totalMatches >= 3).map((m) => ({
        hero: h.heroName,
        opponent: m.opponentHero,
        winRate: m.winRate,
        matches: m.totalMatches,
      }))
    );
    return allMatchups.sort((a, b) => a.winRate - b.winRate).slice(0, 3);
  }, [heroStats]);

  // Recent form: last 20 matches
  const recentForm = useMemo(() => {
    const recent = [...matches]
      .filter((m) => m.result !== MatchResult.Bye)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20);
    const wins = recent.filter((m) => m.result === MatchResult.Win).length;
    const losses = recent.filter((m) => m.result === MatchResult.Loss).length;
    return { total: recent.length, wins, losses, winRate: recent.length > 0 ? (wins / recent.length) * 100 : 0 };
  }, [matches]);

  // Best event finishes
  const bestFinishes = useMemo(() => {
    return [...eventStats]
      .filter((e) => e.totalMatches >= 3)
      .sort((a, b) => b.winRate - a.winRate || b.totalMatches - a.totalMatches)
      .slice(0, 3);
  }, [eventStats]);

  if (!user || isGuest) {
    return (
      <div className="text-center py-16">
        <p className="text-fab-muted mb-6">Sign in to view your stats package.</p>
        <Link href="/login" className="inline-block px-6 py-2.5 rounded-lg font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors">
          Sign In
        </Link>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-fab-surface rounded animate-pulse" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-fab-surface border border-fab-border rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center ring-1 ring-inset ring-cyan-500/20">
          <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-bold text-fab-text leading-tight">Stats Package</h1>
          <p className="text-xs text-fab-muted leading-tight">Your competitive stats overview</p>
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-fab-border rounded-lg">
          <p className="text-fab-muted">No match data yet.</p>
          <p className="text-fab-dim text-sm mt-1">Import matches to generate your stats package.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Overall Record */}
          <section className="bg-fab-surface border border-fab-border rounded-lg p-4">
            <h2 className="text-sm font-bold text-fab-text mb-3">Overall Record</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-fab-text">
                  {overall.totalWins}-{overall.totalLosses}
                  {overall.totalDraws > 0 && <span className="text-lg">-{overall.totalDraws}</span>}
                </p>
                <p className="text-[10px] text-fab-dim">Record</p>
              </div>
              <div className="text-center">
                <p className={`text-2xl font-bold ${overall.overallWinRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
                  {overall.overallWinRate.toFixed(1)}%
                </p>
                <p className="text-[10px] text-fab-dim">Win Rate</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold" style={{ color: eloTier.color }}>{elo}</p>
                <p className="text-[10px] text-fab-dim">ELO ({eloTier.label})</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-fab-text">{overall.totalMatches}</p>
                <p className="text-[10px] text-fab-dim">Total Matches</p>
              </div>
            </div>
          </section>

          {/* Top Heroes */}
          {topHeroes.length > 0 && (
            <section className="bg-fab-surface border border-fab-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-fab-text">Top Heroes</h2>
                <Link href="/heroes" className="text-[10px] text-fab-dim hover:text-fab-text transition-colors">View all</Link>
              </div>
              <div className="space-y-2">
                {topHeroes.map((hero, i) => {
                  const heroInfo = getHeroByName(hero.heroName);
                  return (
                    <div key={hero.heroName} className="flex items-center gap-3">
                      <span className="text-xs font-bold w-4 text-center text-fab-dim">{i + 1}</span>
                      <HeroClassIcon heroClass={heroInfo?.classes[0]} size="sm" />
                      <span className="text-sm font-medium text-fab-text flex-1 truncate">{hero.heroName}</span>
                      <span className="text-xs text-fab-dim">{hero.totalMatches} matches</span>
                      <span className={`text-xs font-semibold ${hero.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
                        {hero.winRate.toFixed(0)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Weakest Matchups */}
          {weakestMatchups.length > 0 && (
            <section className="bg-fab-surface border border-fab-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-sm font-bold text-fab-text">Areas to Improve</h2>
                <Link href="/matchups" className="text-[10px] text-fab-dim hover:text-fab-text transition-colors">View all</Link>
              </div>
              <p className="text-[10px] text-fab-dim mb-3">Your toughest matchups (min 3 games)</p>
              <div className="space-y-2">
                {weakestMatchups.map((m, i) => {
                  const oppInfo = getHeroByName(m.opponent);
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <HeroClassIcon heroClass={oppInfo?.classes[0]} size="sm" />
                      <span className="text-sm text-fab-text flex-1 truncate">
                        vs {m.opponent.split(",")[0]}
                      </span>
                      <span className="text-xs text-fab-dim">{m.matches} games</span>
                      <span className="text-xs font-semibold text-fab-loss">
                        {m.winRate.toFixed(0)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Recent Form */}
          {recentForm.total > 0 && (
            <section className="bg-fab-surface border border-fab-border rounded-lg p-4">
              <h2 className="text-sm font-bold text-fab-text mb-3">Recent Form (Last 20)</h2>
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-lg font-bold text-fab-text">
                    {recentForm.wins}-{recentForm.losses}
                  </p>
                  <p className="text-[10px] text-fab-dim">Record</p>
                </div>
                <div>
                  <p className={`text-lg font-bold ${recentForm.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
                    {recentForm.winRate.toFixed(0)}%
                  </p>
                  <p className="text-[10px] text-fab-dim">Win Rate</p>
                </div>
                <div className="flex-1">
                  <div className="h-2 bg-fab-bg rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${recentForm.winRate >= 50 ? "bg-fab-win/60" : "bg-fab-loss/60"}`}
                      style={{ width: `${recentForm.winRate}%` }}
                    />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Best Event Finishes */}
          {bestFinishes.length > 0 && (
            <section className="bg-fab-surface border border-fab-border rounded-lg p-4">
              <h2 className="text-sm font-bold text-fab-text mb-3">Best Events</h2>
              <div className="space-y-2">
                {bestFinishes.map((e, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-bold w-4 text-center text-fab-dim">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-fab-text truncate">{e.eventName}</p>
                      <p className="text-[10px] text-fab-dim">{e.eventDate} · {e.format}</p>
                    </div>
                    <span className={`text-xs font-semibold ${e.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
                      {e.wins}-{e.losses}{e.draws > 0 ? `-${e.draws}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Share link */}
          {profile?.isPublic ? (
            <div className="text-center pt-2">
              <p className="text-xs text-fab-dim mb-2">Share your profile</p>
              <Link
                href={`/player/${profile.username}`}
                className="text-sm font-medium text-fab-gold hover:underline"
              >
                fabstats.net/player/{profile.username}
              </Link>
            </div>
          ) : (
            <div className="text-center pt-2">
              <p className="text-xs text-fab-dim mb-1">Your profile is currently private.</p>
              <Link
                href="/settings"
                className="text-xs font-medium text-fab-gold hover:underline"
              >
                Make it public in Settings to share your stats
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
