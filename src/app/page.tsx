"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useMatches } from "@/hooks/useMatches";
import { computeOverallStats, computeHeroStats, computeEventTypeStats, computeVenueStats, computeEventStats } from "@/lib/stats";
import { MatchCard } from "@/components/matches/MatchCard";
import { EventCard } from "@/components/events/EventCard";
import { ShieldIcon } from "@/components/icons/NavIcons";
import { MatchResult, GameFormat } from "@/types";

export default function Dashboard() {
  const { matches, isLoaded } = useMatches();
  const [filterFormat, setFilterFormat] = useState<string>("all");
  const [filterRated, setFilterRated] = useState<string>("all");

  const allFormats = useMemo(() => {
    const formats = new Set(matches.map((m) => m.format));
    return Array.from(formats).sort();
  }, [matches]);

  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      if (filterFormat !== "all" && m.format !== filterFormat) return false;
      if (filterRated === "rated" && m.rated !== true) return false;
      if (filterRated === "unrated" && m.rated === true) return false;
      return true;
    });
  }, [matches, filterFormat, filterRated]);

  if (!isLoaded) {
    return <DashboardSkeleton />;
  }

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <ShieldIcon className="w-16 h-16 text-fab-gold mb-4" />
        <h1 className="text-2xl font-bold text-fab-gold mb-2">
          Welcome to FaB Stats
        </h1>
        <p className="text-fab-muted mb-6 max-w-md">
          Track your Flesh and Blood matches, analyze your performance, and
          dominate the meta.
        </p>
        <Link
          href="/import"
          className="px-6 py-3 rounded-md font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors"
        >
          Import Your Matches
        </Link>
      </div>
    );
  }

  const isFiltered = filterFormat !== "all" || filterRated !== "all";
  const fm = filteredMatches;

  const overall = computeOverallStats(fm);
  const heroStats = computeHeroStats(fm);
  const eventTypeStats = computeEventTypeStats(fm);
  const venueStats = computeVenueStats(fm).filter((v) => v.venue !== "Unknown");
  const eventStats = computeEventStats(fm);
  const recentEvents = eventStats.slice(0, 5);
  const recentMatches = [...fm]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);
  const realHeroStats = heroStats.filter((h) => h.heroName !== "Unknown");
  const hasRealHeroData = realHeroStats.length > 0;
  const topHeroes = [...realHeroStats]
    .filter((h) => h.totalMatches >= 1)
    .sort((a, b) => b.winRate - a.winRate)
    .slice(0, 3);

  const { streaks } = overall;

  // Build last 30 results for the streak visual
  const last30 = [...fm]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 30)
    .reverse();

  return (
    <div className="space-y-8">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-fab-gold">Dashboard</h1>
        <div className="flex gap-3 flex-wrap">
          <select
            value={filterFormat}
            onChange={(e) => setFilterFormat(e.target.value)}
            className="bg-fab-surface border border-fab-border text-fab-text text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-fab-gold"
          >
            <option value="all">All Formats</option>
            {allFormats.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <select
            value={filterRated}
            onChange={(e) => setFilterRated(e.target.value)}
            className="bg-fab-surface border border-fab-border text-fab-text text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-fab-gold"
          >
            <option value="all">All Events</option>
            <option value="rated">Rated Only</option>
            <option value="unrated">Unrated Only</option>
          </select>
        </div>
      </div>

      {isFiltered && (
        <p className="text-sm text-fab-dim -mt-4">
          Showing {fm.length} of {matches.length} matches
        </p>
      )}

      {fm.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-fab-muted text-lg">No matches found for this filter.</p>
          <button
            onClick={() => { setFilterFormat("all"); setFilterRated("all"); }}
            className="mt-4 text-fab-gold hover:text-fab-gold-light text-sm"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <>
          {/* Streak Banner */}
          <div className={`rounded-xl p-6 border-2 ${
            streaks.currentStreak?.type === MatchResult.Win
              ? "bg-fab-win/8 border-fab-win/30"
              : streaks.currentStreak?.type === MatchResult.Loss
                ? "bg-fab-loss/8 border-fab-loss/30"
                : "bg-fab-surface border-fab-border"
          }`}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-xs text-fab-muted uppercase tracking-wider mb-1">Current Streak</p>
                <div className="flex items-baseline gap-3">
                  <span className={`text-5xl font-black ${
                    streaks.currentStreak?.type === MatchResult.Win
                      ? "text-fab-win"
                      : streaks.currentStreak?.type === MatchResult.Loss
                        ? "text-fab-loss"
                        : "text-fab-dim"
                  }`}>
                    {streaks.currentStreak ? streaks.currentStreak.count : 0}
                  </span>
                  <span className={`text-2xl font-bold ${
                    streaks.currentStreak?.type === MatchResult.Win
                      ? "text-fab-win"
                      : streaks.currentStreak?.type === MatchResult.Loss
                        ? "text-fab-loss"
                        : "text-fab-dim"
                  }`}>
                    {streaks.currentStreak
                      ? streaks.currentStreak.type === MatchResult.Win ? "WINS" : "LOSSES"
                      : "N/A"}
                  </span>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-fab-win">{streaks.longestWinStreak}</p>
                  <p className="text-xs text-fab-dim">Best Win Streak</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-fab-loss">{streaks.longestLossStreak}</p>
                  <p className="text-xs text-fab-dim">Worst Loss Streak</p>
                </div>
              </div>
            </div>
            {/* Last 30 results dots */}
            <div className="mt-4 flex gap-1 flex-wrap">
              {last30.map((m, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full ${
                    m.result === MatchResult.Win ? "bg-fab-win" : m.result === MatchResult.Loss ? "bg-fab-loss" : "bg-fab-draw"
                  }`}
                  title={`${new Date(m.date).toLocaleDateString()} - ${m.result}`}
                />
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Matches" value={overall.totalMatches} />
            <StatCard
              label="Win Rate"
              value={`${overall.overallWinRate.toFixed(1)}%`}
              color={overall.overallWinRate >= 50 ? "text-fab-win" : "text-fab-loss"}
            />
            <StatCard
              label="Record"
              value={`${overall.totalWins}W - ${overall.totalLosses}L`}
            />
            <StatCard
              label="Draws"
              value={overall.totalDraws}
            />
          </div>

          {/* Recent Events */}
          {recentEvents.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-fab-text">Recent Events</h2>
                {eventStats.length > 5 && (
                  <Link href="/events" className="text-sm text-fab-gold hover:text-fab-gold-light">
                    View All ({eventStats.length})
                  </Link>
                )}
              </div>
              <div className="space-y-2">
                {recentEvents.map((event) => (
                  <EventCard key={`${event.eventName}-${event.eventDate}`} event={event} />
                ))}
              </div>
            </div>
          )}

          {/* Event Type Breakdown */}
          {eventTypeStats.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-fab-text mb-4">Win Rate by Event Type</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {eventTypeStats.filter((e) => e.eventType !== "Other" || eventTypeStats.length === 1).map((et) => (
                  <div key={et.eventType} className="bg-fab-surface border border-fab-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-fab-text">{et.eventType}</span>
                      <span className="text-xs text-fab-dim">{et.totalMatches} matches</span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex-1 h-3 bg-fab-bg rounded-full overflow-hidden">
                        <div
                          className="h-full bg-fab-win rounded-full transition-all"
                          style={{ width: `${et.winRate}%` }}
                        />
                      </div>
                      <span className={`text-sm font-bold w-12 text-right ${et.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
                        {et.winRate.toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-xs text-fab-dim">
                      {et.wins}W - {et.losses}L{et.draws > 0 ? ` - ${et.draws}D` : ""}
                    </p>
                  </div>
                ))}
                {eventTypeStats.find((e) => e.eventType === "Other") && eventTypeStats.length > 1 && (
                  <div className="bg-fab-surface border border-fab-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-fab-text">Other</span>
                      <span className="text-xs text-fab-dim">{eventTypeStats.find((e) => e.eventType === "Other")!.totalMatches} matches</span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex-1 h-3 bg-fab-bg rounded-full overflow-hidden">
                        <div
                          className="h-full bg-fab-win rounded-full transition-all"
                          style={{ width: `${eventTypeStats.find((e) => e.eventType === "Other")!.winRate}%` }}
                        />
                      </div>
                      <span className={`text-sm font-bold w-12 text-right ${eventTypeStats.find((e) => e.eventType === "Other")!.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
                        {eventTypeStats.find((e) => e.eventType === "Other")!.winRate.toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-xs text-fab-dim">
                      {eventTypeStats.find((e) => e.eventType === "Other")!.wins}W - {eventTypeStats.find((e) => e.eventType === "Other")!.losses}L
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Venue Breakdown */}
          {venueStats.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-fab-text mb-4">Win Rate by Venue</h2>
              <div className="space-y-2">
                {venueStats.map((v) => (
                  <div key={v.venue} className="bg-fab-surface border border-fab-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-fab-text">{v.venue}</span>
                      <span className="text-xs text-fab-dim">{v.totalMatches} matches</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-3 bg-fab-bg rounded-full overflow-hidden">
                        <div
                          className="h-full bg-fab-win rounded-full transition-all"
                          style={{ width: `${v.winRate}%` }}
                        />
                      </div>
                      <span className={`text-sm font-bold w-12 text-right ${v.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
                        {v.winRate.toFixed(0)}%
                      </span>
                      <span className="text-xs text-fab-dim w-20 text-right">
                        {v.wins}W-{v.losses}L{v.draws > 0 ? `-${v.draws}D` : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Matches */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-fab-text">Recent Matches</h2>
              <Link href="/matches" className="text-sm text-fab-gold hover:text-fab-gold-light">
                View All
              </Link>
            </div>
            <div className="space-y-2">
              {recentMatches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          </div>

          {/* Top Heroes — only show when we have real hero data */}
          {hasRealHeroData && topHeroes.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-fab-text">Top Heroes</h2>
                <Link href="/heroes" className="text-sm text-fab-gold hover:text-fab-gold-light">
                  View All
                </Link>
              </div>
              <div className="space-y-3">
                {topHeroes.map((hero, i) => (
                  <div
                    key={hero.heroName}
                    className="bg-fab-surface border border-fab-border rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-fab-gold font-bold">#{i + 1}</span>
                        <span className="font-semibold text-fab-text">{hero.heroName}</span>
                      </div>
                      <span className="text-sm text-fab-muted">
                        {hero.totalMatches} matches
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-fab-bg rounded-full overflow-hidden">
                        <div
                          className="h-full bg-fab-win rounded-full transition-all"
                          style={{ width: `${hero.winRate}%` }}
                        />
                      </div>
                      <span className={`text-sm font-semibold ${hero.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
                        {hero.winRate.toFixed(0)}%
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-fab-dim">
                      {hero.wins}W - {hero.losses}L{hero.draws > 0 ? ` - ${hero.draws}D` : ""}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color = "text-fab-text",
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="bg-fab-surface border border-fab-border rounded-lg p-4">
      <p className="text-xs text-fab-muted mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="h-8 w-40 bg-fab-surface rounded animate-pulse" />
      <div className="bg-fab-surface border border-fab-border rounded-xl p-6 h-32 animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-fab-surface border border-fab-border rounded-lg p-4 h-20 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
