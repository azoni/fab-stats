"use client";
import { useEffect, useMemo, useState } from "react";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { computeMetaStats, getAvailableFormats, getAvailableEventTypes, computeTop8HeroMeta, type HeroMetaStats, type MetaPeriod, type Top8HeroMeta } from "@/lib/meta-stats";
import { getWeekStart, getMonthStart } from "@/lib/leaderboard";
import { getHeroByName } from "@/lib/heroes";
import { HeroClassIcon } from "@/components/heroes/HeroClassIcon";

type SortKey = "usage" | "winrate";
const HERO_PAGE_SIZE = 20;

const PERIOD_TABS: { id: MetaPeriod; label: string }[] = [
  { id: "all", label: "All Time" },
  { id: "monthly", label: "Last 30 Days" },
  { id: "weekly", label: "Last 7 Days" },
];

export default function MetaPage() {
  const { entries, loading } = useLeaderboard(true);
  const [sortBy, setSortBy] = useState<SortKey>("usage");
  const [search, setSearch] = useState("");
  const [filterFormat, setFilterFormat] = useState("all");
  const [filterEventType, setFilterEventType] = useState("all");
  const [period, setPeriod] = useState<MetaPeriod>("all");
  const [heroPage, setHeroPage] = useState(1);
  const [playoffPage, setPlayoffPage] = useState(1);

  const allFormats = useMemo(() => getAvailableFormats(entries), [entries]);
  const allEventTypes = useMemo(() => getAvailableEventTypes(entries), [entries]);

  const { overview, heroStats } = useMemo(
    () => computeMetaStats(
      entries,
      filterFormat !== "all" ? filterFormat : undefined,
      filterEventType !== "all" ? filterEventType : undefined,
      period,
    ),
    [entries, filterFormat, filterEventType, period],
  );

  // Top 8 heroes — filtered by period, format, and event type
  const top8Heroes = useMemo(() => {
    const sinceDate = period === "weekly" ? getWeekStart() : period === "monthly" ? getMonthStart() : undefined;
    return computeTop8HeroMeta(
      entries,
      filterEventType !== "all" ? filterEventType : undefined,
      filterFormat !== "all" ? filterFormat : undefined,
      sinceDate,
    );
  }, [entries, filterEventType, filterFormat, period]);

  const sortedHeroes = useMemo(() => {
    let list = [...heroStats];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((h) => h.hero.toLowerCase().includes(q));
    }
    switch (sortBy) {
      case "winrate":
        return list.sort((a, b) => b.avgWinRate - a.avgWinRate || b.totalMatches - a.totalMatches);
      default:
        return list.sort((a, b) => b.totalMatches - a.totalMatches);
    }
  }, [heroStats, sortBy, search]);

  // Reset hero page when filters change
  useEffect(() => { setHeroPage(1); setPlayoffPage(1); }, [sortBy, search, filterFormat, filterEventType, period]);

  const heroTotalPages = Math.max(1, Math.ceil(sortedHeroes.length / HERO_PAGE_SIZE));
  const heroSafePage = Math.min(heroPage, heroTotalPages);
  const heroStartIdx = (heroSafePage - 1) * HERO_PAGE_SIZE;
  const pageHeroes = sortedHeroes.slice(heroStartIdx, heroStartIdx + HERO_PAGE_SIZE);

  // Top hero for the overview card
  const topHero = heroStats.length > 0
    ? [...heroStats].sort((a, b) => b.totalMatches - a.totalMatches)[0]
    : null;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-fab-surface rounded animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-fab-surface border border-fab-border rounded-lg p-4 h-20 animate-pulse" />
          ))}
        </div>
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-fab-surface border border-fab-border rounded-lg p-4 h-16 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center ring-1 ring-inset ring-teal-500/20">
          <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex items-center gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-fab-text leading-tight">Community Meta</h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-fab-gold/15 text-fab-gold">Beta</span>
            </div>
            <p className="text-xs text-fab-muted leading-tight">
              {overview.totalPlayers} public players{period !== "all" && " · recent imports only"}
            </p>
          </div>
        </div>
      </div>

      {/* Period tabs */}
      <div className="flex gap-1 mb-4">
        {PERIOD_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setPeriod(tab.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              period === tab.id
                ? "bg-fab-gold text-fab-bg"
                : "bg-fab-surface text-fab-muted hover:text-fab-text border border-fab-border"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Community Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-fab-surface border border-fab-border rounded-lg p-4">
          <p className="text-xs text-fab-muted mb-1">Players</p>
          <p className="text-2xl font-bold text-fab-text">{overview.totalPlayers}</p>
        </div>
        <div className="bg-fab-surface border border-fab-border rounded-lg p-4">
          <p className="text-xs text-fab-muted mb-1">Total Matches</p>
          <p className="text-2xl font-bold text-fab-text">{overview.totalMatches.toLocaleString()}</p>
        </div>
        <div className="bg-fab-surface border border-fab-border rounded-lg p-4">
          <p className="text-xs text-fab-muted mb-1">Heroes Played</p>
          <p className="text-2xl font-bold text-fab-text">{overview.totalHeroes}</p>
        </div>
        <div className="bg-fab-surface border border-fab-border rounded-lg p-4">
          <p className="text-xs text-fab-muted mb-1">Most Played</p>
          <p className="text-lg font-bold text-fab-text truncate">{topHero?.hero || "—"}</p>
          {topHero && (
            <p className="text-[10px] text-fab-dim">{topHero.metaShare.toFixed(1)}% of matches</p>
          )}
        </div>
      </div>

      {/* Playoff Heroes — which heroes are making top 8s */}
      {top8Heroes.length > 0 && (() => {
        const pTotalPages = Math.max(1, Math.ceil(top8Heroes.length / 10));
        const pSafePage = Math.min(playoffPage, pTotalPages);
        const pStart = (pSafePage - 1) * 10;
        const pSlice = top8Heroes.slice(pStart, pStart + 10);
        return (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-fab-text mb-1">
              Playoff Heroes
            </h2>
            <p className="text-[10px] text-fab-dim mb-3">
              Heroes making top 8s{period === "weekly" ? " (last 7 days)" : period === "monthly" ? " (last 30 days)" : ""}
              {top8Heroes.length > 10 && ` \u00b7 ${top8Heroes.length} heroes`}
            </p>
            <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
              {pSlice.map((t8, i) => {
                const globalIdx = pStart + i;
                const heroInfo = getHeroByName(t8.hero);
                const heroClass = heroInfo?.classes[0];
                return (
                  <div key={t8.hero} className={`flex items-center gap-3 px-4 py-2.5 ${i > 0 ? "border-t border-fab-border" : ""}`}>
                    <span className={`text-xs font-bold w-5 text-center shrink-0 ${globalIdx === 0 ? "text-amber-400" : globalIdx < 3 ? "text-fab-text" : "text-fab-dim"}`}>
                      {globalIdx + 1}
                    </span>
                    <HeroClassIcon heroClass={heroClass} size="sm" />
                    <span className={`text-sm font-medium flex-1 truncate ${globalIdx === 0 ? "text-amber-400" : "text-fab-text"}`}>
                      {t8.hero}
                    </span>
                    <span className="text-xs text-fab-dim shrink-0">
                      {t8.count} top 8{t8.count !== 1 ? "s" : ""}
                    </span>
                    {t8.champions > 0 && (
                      <span className="text-xs font-semibold text-fab-gold shrink-0">
                        {t8.champions} win{t8.champions !== 1 ? "s" : ""}
                      </span>
                    )}
                    {t8.finalists > 0 && (
                      <span className="text-[10px] text-gray-400 shrink-0">
                        {t8.finalists} final{t8.finalists !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {pTotalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-3">
                <button
                  onClick={() => setPlayoffPage((p) => Math.max(1, p - 1))}
                  disabled={pSafePage <= 1}
                  className="px-3 py-1.5 rounded-md text-sm font-medium bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-fab-dim">
                  Page {pSafePage} of {pTotalPages}
                </span>
                <button
                  onClick={() => setPlayoffPage((p) => Math.min(pTotalPages, p + 1))}
                  disabled={pSafePage >= pTotalPages}
                  className="px-3 py-1.5 rounded-md text-sm font-medium bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {/* Filters + Sort + Search */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search heroes..."
          className="bg-fab-surface border border-fab-border rounded-md px-3 py-1.5 text-fab-text text-sm placeholder:text-fab-dim focus:outline-none focus:border-fab-gold w-40"
        />

        {/* Format pills */}
        {allFormats.length > 1 && (
          <div className="flex gap-0.5 bg-fab-bg rounded-lg p-0.5 border border-fab-border">
            <button
              onClick={() => setFilterFormat("all")}
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                filterFormat === "all" ? "bg-fab-surface text-fab-text shadow-sm" : "text-fab-dim hover:text-fab-muted"
              }`}
            >
              All
            </button>
            {allFormats.map((f) => (
              <button
                key={f}
                onClick={() => setFilterFormat(f)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
                  filterFormat === f ? "bg-fab-surface text-fab-text shadow-sm" : "text-fab-dim hover:text-fab-muted"
                }`}
              >
                {f === "Classic Constructed" ? "CC" : f}
              </button>
            ))}
          </div>
        )}

        {/* Event type pills */}
        {allEventTypes.length > 1 && (
          <div className="flex gap-0.5 bg-fab-bg rounded-lg p-0.5 border border-fab-border overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setFilterEventType("all")}
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                filterEventType === "all" ? "bg-fab-surface text-fab-text shadow-sm" : "text-fab-dim hover:text-fab-muted"
              }`}
            >
              All
            </button>
            {allEventTypes.map((t) => (
              <button
                key={t}
                onClick={() => setFilterEventType(t)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
                  filterEventType === t ? "bg-fab-surface text-fab-text shadow-sm" : "text-fab-dim hover:text-fab-muted"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {/* Sort toggle */}
        <div className="flex gap-1 ml-auto">
          {([
            { id: "usage", label: "Most Played" },
            { id: "winrate", label: "Best Win Rate" },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSortBy(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                sortBy === tab.id
                  ? "bg-fab-gold/15 text-fab-gold"
                  : "bg-fab-surface text-fab-muted hover:text-fab-text"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Hero List */}
      {sortedHeroes.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-fab-muted">No hero data available yet.</p>
          <p className="text-fab-dim text-sm mt-1">
            {period !== "all"
              ? "No data for this time period. Players need to re-import matches for weekly/monthly stats."
              : filterFormat !== "all" || filterEventType !== "all"
                ? "No data for the selected filters. Players need to re-import matches for filtered stats."
                : "Players need to import matches for meta data to appear."}
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-fab-dim mb-2">
            Showing {heroStartIdx + 1}-{Math.min(heroStartIdx + HERO_PAGE_SIZE, sortedHeroes.length)} of {sortedHeroes.length} heroes
          </p>
          <div className="space-y-2">
            {pageHeroes.map((hero, i) => (
              <HeroMetaRow key={hero.hero} hero={hero} index={heroStartIdx + i} />
            ))}
          </div>
          {heroTotalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                onClick={() => setHeroPage((p) => Math.max(1, p - 1))}
                disabled={heroSafePage <= 1}
                className="px-3 py-1.5 rounded-md text-sm font-medium bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-fab-dim">
                Page {heroSafePage} of {heroTotalPages}
              </span>
              <button
                onClick={() => setHeroPage((p) => Math.min(heroTotalPages, p + 1))}
                disabled={heroSafePage >= heroTotalPages}
                className="px-3 py-1.5 rounded-md text-sm font-medium bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function HeroMetaRow({ hero, index }: { hero: HeroMetaStats; index: number }) {
  const heroInfo = getHeroByName(hero.hero);
  const heroClass = heroInfo?.classes[0];

  return (
    <div className="bg-fab-surface border border-fab-border rounded-lg px-4 py-3 flex items-center gap-3">
      {/* Rank */}
      <span className="text-sm font-bold w-6 text-center shrink-0 text-fab-dim">
        {index + 1}
      </span>

      {/* Hero Icon */}
      <HeroClassIcon heroClass={heroClass} size="lg" />

      {/* Name + class + meta share bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <p className="font-semibold text-fab-text truncate">{hero.hero}</p>
          {heroClass && (
            <span className="text-[10px] text-fab-dim shrink-0">{heroClass}</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-1.5 bg-fab-bg rounded-full overflow-hidden">
            <div
              className="h-full bg-fab-gold/40 rounded-full transition-all"
              style={{ width: `${Math.max(hero.metaShare, 0.5)}%` }}
            />
          </div>
          <span className="text-[10px] text-fab-dim shrink-0 w-10 text-right">
            {hero.metaShare.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Stats — all visible always */}
      <div className="flex items-center gap-3 sm:gap-5 shrink-0 text-right">
        <div className="hidden sm:block">
          <p className="text-sm font-semibold text-fab-text">{hero.totalMatches.toLocaleString()}</p>
          <p className="text-[10px] text-fab-dim">matches</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-fab-text">{hero.playerCount}</p>
          <p className="text-[10px] text-fab-dim">players</p>
        </div>
        <div>
          <p className={`text-sm font-semibold ${hero.avgWinRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
            {hero.avgWinRate.toFixed(1)}%
          </p>
          <p className="text-[10px] text-fab-dim">win rate</p>
        </div>
      </div>
    </div>
  );
}
