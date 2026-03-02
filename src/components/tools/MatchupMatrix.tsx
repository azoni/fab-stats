"use client";
import { useState, useMemo } from "react";
import { computeHeroStats } from "@/lib/stats";
import { computeMetaStats, getAvailableFormats, getAvailableEventTypes } from "@/lib/meta-stats";
import { getHeroByName } from "@/lib/heroes";
import type { MatchRecord, LeaderboardEntry, HeroStats, MatchupRecord } from "@/types";
import type { HeroMetaStats } from "@/lib/meta-stats";

type Mode = "personal" | "community";

function HeroIcon({ name }: { name: string }) {
  const hero = getHeroByName(name);
  const cls = hero?.classes[0] || "";
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-fab-surface text-fab-muted text-[9px] font-bold shrink-0 border border-fab-border" title={cls}>
      {cls.charAt(0) || "?"}
    </span>
  );
}

interface MatchupMatrixProps {
  matches: MatchRecord[];
  entries: LeaderboardEntry[];
  isLoaded: boolean;
}

export function MatchupMatrix({ matches, entries, isLoaded }: MatchupMatrixProps) {
  const [mode, setMode] = useState<Mode>("personal");
  const [format, setFormat] = useState<string>("");
  const [eventType, setEventType] = useState<string>("");
  const [selectedCell, setSelectedCell] = useState<{ hero: string; opp: string } | null>(null);

  // Formats for personal data
  const personalFormats = useMemo(() => {
    const set = new Set(matches.map((m) => m.format));
    return [...set].sort();
  }, [matches]);

  // Formats for community data
  const communityFormats = useMemo(() => getAvailableFormats(entries), [entries]);
  const communityEventTypes = useMemo(() => getAvailableEventTypes(entries), [entries]);

  const formats = mode === "personal" ? personalFormats : communityFormats;

  // Filter matches by format
  const filteredMatches = useMemo(() => {
    let m = matches;
    if (format) m = m.filter((match) => match.format === format);
    return m;
  }, [matches, format]);

  // Personal hero stats
  const heroStats = useMemo(
    () => computeHeroStats(filteredMatches).filter((h) => getHeroByName(h.heroName)),
    [filteredMatches]
  );

  const allOpponents = useMemo(
    () =>
      [...new Set(filteredMatches.map((m) => m.opponentHero).filter((h) => h !== "Unknown"))].sort(),
    [filteredMatches]
  );

  // Community meta stats
  const communityStats = useMemo(
    () => computeMetaStats(entries, format || undefined, eventType || undefined),
    [entries, format, eventType]
  );

  if (!isLoaded) {
    return <div className="h-8 w-48 bg-fab-surface rounded animate-pulse" />;
  }

  return (
    <div>
      {/* Mode toggle + filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex rounded-lg border border-fab-border overflow-hidden">
          <button
            onClick={() => { setMode("personal"); setEventType(""); }}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === "personal" ? "bg-fab-gold/15 text-fab-gold" : "text-fab-muted hover:text-fab-text"
            }`}
          >
            Personal
          </button>
          <button
            onClick={() => { setMode("community"); setEventType(""); }}
            className={`px-3 py-1.5 text-sm font-medium transition-colors border-l border-fab-border ${
              mode === "community" ? "bg-fab-gold/15 text-fab-gold" : "text-fab-muted hover:text-fab-text"
            }`}
          >
            Community
          </button>
        </div>

        {/* Format filter */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFormat("")}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              !format ? "bg-fab-gold/15 text-fab-gold" : "bg-fab-surface text-fab-muted hover:text-fab-text border border-fab-border"
            }`}
          >
            All Formats
          </button>
          {formats.map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                format === f ? "bg-fab-gold/15 text-fab-gold" : "bg-fab-surface text-fab-muted hover:text-fab-text border border-fab-border"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Event type filter (community only) */}
        {mode === "community" && communityEventTypes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setEventType("")}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                !eventType ? "bg-teal-500/15 text-teal-400" : "bg-fab-surface text-fab-muted hover:text-fab-text border border-fab-border"
              }`}
            >
              All Events
            </button>
            {communityEventTypes.map((et) => (
              <button
                key={et}
                onClick={() => setEventType(et)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  eventType === et ? "bg-teal-500/15 text-teal-400" : "bg-fab-surface text-fab-muted hover:text-fab-text border border-fab-border"
                }`}
              >
                {et}
              </button>
            ))}
          </div>
        )}
      </div>

      {mode === "personal" ? (
        <PersonalGrid
          heroStats={heroStats}
          allOpponents={allOpponents}
          selectedCell={selectedCell}
          onCellClick={setSelectedCell}
        />
      ) : (
        <CommunityTierList heroStats={communityStats.heroStats} overview={communityStats.overview} />
      )}
    </div>
  );
}

function PersonalGrid({
  heroStats,
  allOpponents,
  selectedCell,
  onCellClick,
}: {
  heroStats: HeroStats[];
  allOpponents: string[];
  selectedCell: { hero: string; opp: string } | null;
  onCellClick: (cell: { hero: string; opp: string } | null) => void;
}) {
  if (heroStats.length === 0 || allOpponents.length === 0) {
    return (
      <div className="text-center py-12 text-fab-dim">
        <p className="text-lg mb-1">No matchup data yet</p>
        <p className="text-sm">Log matches with hero selections to see your matchup grid.</p>
      </div>
    );
  }

  const selectedMu = selectedCell
    ? heroStats
        .find((h) => h.heroName === selectedCell.hero)
        ?.matchups.find((m) => m.opponentHero === selectedCell.opp)
    : null;

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left p-2 text-fab-muted font-medium border-b border-fab-border sticky left-0 bg-fab-bg z-10">
                Your Hero / Opp
              </th>
              {allOpponents.map((opp) => (
                <th
                  key={opp}
                  className="p-2 text-fab-muted font-medium border-b border-fab-border text-center min-w-[90px]"
                >
                  <span className="text-xs">{opp}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {heroStats.map((hero) => (
              <tr key={hero.heroName}>
                <td className="p-2 font-semibold text-fab-text border-b border-fab-border/50 sticky left-0 bg-fab-bg whitespace-nowrap z-10">
                  {hero.heroName}
                  <span className="ml-1.5 text-xs text-fab-dim">({hero.totalMatches})</span>
                </td>
                {allOpponents.map((opp) => {
                  const mu = hero.matchups.find((m) => m.opponentHero === opp);
                  const isSelected = selectedCell?.hero === hero.heroName && selectedCell?.opp === opp;
                  if (!mu) {
                    return (
                      <td key={opp} className="p-2 text-center border-b border-fab-border/50 text-fab-dim">
                        -
                      </td>
                    );
                  }
                  const bgColor =
                    mu.winRate >= 60
                      ? "bg-fab-win/20"
                      : mu.winRate >= 45
                        ? "bg-fab-draw/10"
                        : "bg-fab-loss/20";
                  const textColor =
                    mu.winRate >= 60
                      ? "text-fab-win"
                      : mu.winRate >= 45
                        ? "text-fab-draw"
                        : "text-fab-loss";

                  return (
                    <td
                      key={opp}
                      onClick={() => onCellClick(isSelected ? null : { hero: hero.heroName, opp })}
                      className={`p-2 text-center border-b border-fab-border/50 cursor-pointer transition-all ${bgColor} ${
                        isSelected ? "ring-2 ring-fab-gold ring-inset" : "hover:brightness-125"
                      }`}
                    >
                      <div className={`font-bold ${textColor}`}>{mu.winRate.toFixed(0)}%</div>
                      <div className="text-xs text-fab-dim">
                        {mu.wins}-{mu.losses}
                        {mu.draws > 0 ? `-${mu.draws}` : ""}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail panel */}
      {selectedCell && selectedMu && (
        <div className="mt-3 p-3 bg-fab-surface border border-fab-border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-fab-text">
              {selectedCell.hero} vs {selectedCell.opp}
            </h3>
            <button onClick={() => onCellClick(null)} className="text-fab-dim hover:text-fab-muted">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-fab-win font-semibold">{selectedMu.wins}W</span>
            <span className="text-fab-loss font-semibold">{selectedMu.losses}L</span>
            {selectedMu.draws > 0 && <span className="text-fab-draw font-semibold">{selectedMu.draws}D</span>}
            <span className="text-fab-muted">
              {selectedMu.totalMatches} match{selectedMu.totalMatches !== 1 ? "es" : ""}
            </span>
            <span className={`font-bold ${selectedMu.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
              {selectedMu.winRate.toFixed(1)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function CommunityTierList({
  heroStats,
  overview,
}: {
  heroStats: HeroMetaStats[];
  overview: { totalPlayers: number; totalMatches: number; totalHeroes: number };
}) {
  if (heroStats.length === 0) {
    return (
      <div className="text-center py-12 text-fab-dim">
        <p className="text-lg mb-1">No community data available</p>
        <p className="text-sm">Community data will appear as players log matches.</p>
      </div>
    );
  }

  const maxMatches = heroStats[0]?.totalMatches || 1;

  return (
    <div>
      <div className="flex items-center gap-4 mb-4 text-xs text-fab-dim">
        <span>{overview.totalPlayers} players</span>
        <span>{overview.totalMatches.toLocaleString()} matches</span>
        <span>{overview.totalHeroes} heroes</span>
      </div>

      <div className="space-y-1">
        {heroStats.map((hero, i) => {
          const barWidth = (hero.totalMatches / maxMatches) * 100;
          const wrColor =
            hero.avgWinRate >= 55
              ? "text-fab-win"
              : hero.avgWinRate >= 45
                ? "text-fab-draw"
                : "text-fab-loss";

          return (
            <div
              key={hero.hero}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-fab-surface/50 transition-colors"
            >
              <span className="w-6 text-right text-xs text-fab-dim font-medium">{i + 1}</span>
              <div className="w-40 min-w-[120px] flex items-center gap-2">
                <HeroIcon name={hero.hero} />
                <span className="text-sm font-semibold text-fab-text truncate">{hero.hero}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="h-5 bg-fab-bg rounded-full overflow-hidden">
                  <div
                    className="h-full bg-fab-gold/20 rounded-full"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-fab-muted w-16 text-right">
                  {hero.metaShare.toFixed(1)}%
                </span>
                <span className={`text-xs font-semibold w-14 text-right ${wrColor}`}>
                  {hero.avgWinRate.toFixed(1)}%
                </span>
                <span className="text-xs text-fab-dim w-12 text-right">
                  {hero.playerCount}p
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-fab-border text-xs text-fab-dim">
        <span>Meta Share %</span>
        <span>Win Rate %</span>
        <span>Players</span>
      </div>
    </div>
  );
}
