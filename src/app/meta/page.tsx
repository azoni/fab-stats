"use client";
import { useMemo, useState } from "react";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { computeMetaStats, getAvailableFormats, getAvailableEventTypes, type HeroMetaStats } from "@/lib/meta-stats";
import { getHeroByName } from "@/lib/heroes";
import { HeroClassIcon } from "@/components/heroes/HeroClassIcon";

type SortKey = "popularity" | "winrate" | "players" | "matches";

export default function MetaPage() {
  const { entries, loading } = useLeaderboard();
  const [sortBy, setSortBy] = useState<SortKey>("popularity");
  const [search, setSearch] = useState("");
  const [filterFormat, setFilterFormat] = useState("all");
  const [filterEventType, setFilterEventType] = useState("all");

  const allFormats = useMemo(() => getAvailableFormats(entries), [entries]);
  const allEventTypes = useMemo(() => getAvailableEventTypes(entries), [entries]);

  const { overview, heroStats } = useMemo(
    () => computeMetaStats(
      entries,
      filterFormat !== "all" ? filterFormat : undefined,
      filterEventType !== "all" ? filterEventType : undefined,
    ),
    [entries, filterFormat, filterEventType],
  );

  const sortedHeroes = useMemo(() => {
    let list = [...heroStats];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((h) => h.hero.toLowerCase().includes(q));
    }
    switch (sortBy) {
      case "winrate":
        return list.sort((a, b) => b.avgWinRate - a.avgWinRate || b.totalMatches - a.totalMatches);
      case "players":
        return list.sort((a, b) => b.playerCount - a.playerCount || b.totalMatches - a.totalMatches);
      case "matches":
        return list.sort((a, b) => b.totalMatches - a.totalMatches);
      default:
        return list.sort((a, b) => a.popularityRank - b.popularityRank);
    }
  }, [heroStats, sortBy, search]);

  // Always use the global max for consistent progress bars across sort modes
  const maxMatches = useMemo(
    () => Math.max(...heroStats.map((h) => h.totalMatches), 1),
    [heroStats],
  );

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
      <h1 className="text-2xl font-bold text-fab-gold mb-2">Community Meta</h1>
      <p className="text-fab-muted text-sm mb-6">
        Hero popularity and performance across all public players on FaB Stats.
      </p>

      {/* Community Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-fab-surface border border-fab-border rounded-lg p-4">
          <p className="text-xs text-fab-muted mb-1">Players</p>
          <p className="text-2xl font-bold text-fab-text">{overview.totalPlayers}</p>
        </div>
        <div className="bg-fab-surface border border-fab-border rounded-lg p-4">
          <p className="text-xs text-fab-muted mb-1">Total Matches</p>
          <p className="text-2xl font-bold text-fab-text">{overview.totalMatches.toLocaleString()}</p>
        </div>
        <div className="bg-fab-surface border border-fab-border rounded-lg p-4">
          <p className="text-xs text-fab-muted mb-1">Heroes Tracked</p>
          <p className="text-2xl font-bold text-fab-text">{overview.totalHeroes}</p>
        </div>
        <div className="bg-fab-surface border border-fab-border rounded-lg p-4">
          <p className="text-xs text-fab-muted mb-1">Avg Win Rate</p>
          <p className="text-2xl font-bold text-fab-text">{overview.avgWinRate.toFixed(1)}%</p>
        </div>
      </div>

      {/* Filters + Sort + Search */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search heroes..."
          className="bg-fab-surface border border-fab-border rounded-md px-3 py-1.5 text-fab-text text-sm placeholder:text-fab-dim focus:outline-none focus:border-fab-gold w-40"
        />
        {allFormats.length > 1 && (
          <select
            value={filterFormat}
            onChange={(e) => setFilterFormat(e.target.value)}
            className="bg-fab-surface border border-fab-border rounded-md px-3 py-1.5 text-fab-text text-sm outline-none"
          >
            <option value="all">All Formats</option>
            {allFormats.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        )}
        {allEventTypes.length > 1 && (
          <select
            value={filterEventType}
            onChange={(e) => setFilterEventType(e.target.value)}
            className="bg-fab-surface border border-fab-border rounded-md px-3 py-1.5 text-fab-text text-sm outline-none"
          >
            <option value="all">All Event Types</option>
            {allEventTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        )}
        <div className="flex gap-1 ml-auto">
          {([
            { id: "popularity", label: "Popular" },
            { id: "winrate", label: "Win Rate" },
            { id: "players", label: "Players" },
            { id: "matches", label: "Matches" },
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
            {filterFormat !== "all" || filterEventType !== "all"
              ? "No data for the selected filters. Players need to re-import matches for filtered stats."
              : "Players need to import matches for meta data to appear."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedHeroes.map((hero, i) => (
            <HeroMetaRow key={hero.hero} hero={hero} index={i} sortBy={sortBy} maxMatches={maxMatches} />
          ))}
        </div>
      )}
    </div>
  );
}

function HeroMetaRow({ hero, index, sortBy, maxMatches }: { hero: HeroMetaStats; index: number; sortBy: SortKey; maxMatches: number }) {
  const heroInfo = getHeroByName(hero.hero);

  return (
    <div className="bg-fab-surface border border-fab-border rounded-lg p-4 flex items-center gap-4">
      {/* Rank */}
      <span className="text-lg font-black w-8 text-center shrink-0 text-fab-dim">
        {index + 1}
      </span>

      {/* Hero Icon */}
      <HeroClassIcon heroClass={heroInfo?.classes[0]} size="lg" />

      {/* Name + bar */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-fab-text truncate">{hero.hero}</p>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-2 bg-fab-bg rounded-full overflow-hidden">
            <div
              className="h-full bg-fab-gold/40 rounded-full transition-all"
              style={{ width: `${(hero.totalMatches / maxMatches) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-fab-dim w-16 text-right">{hero.totalMatches} games</span>
        </div>
      </div>

      {/* Stats */}
      <div className="text-right shrink-0">
        {sortBy === "winrate" ? (
          <>
            <p className={`text-lg font-bold ${hero.avgWinRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
              {hero.avgWinRate.toFixed(1)}%
            </p>
            <p className="text-xs text-fab-dim">{hero.playerCount} players</p>
          </>
        ) : (
          <>
            <p className="text-lg font-bold text-fab-text">{hero.playerCount}</p>
            <p className="text-xs text-fab-dim">
              {hero.avgWinRate.toFixed(0)}% WR
            </p>
          </>
        )}
      </div>
    </div>
  );
}
