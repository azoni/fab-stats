"use client";
import { useState, useMemo } from "react";
import { computeHeroStats } from "@/lib/stats";
import { computeMetaStats, getAvailableFormats } from "@/lib/meta-stats";
import { useMatchupNotes } from "@/hooks/useMatchupNotes";
import { HeroSelect } from "@/components/heroes/HeroSelect";
import { HeroClassIcon } from "@/components/heroes/HeroClassIcon";
import { getHeroByName } from "@/lib/heroes";
import type { MatchRecord, LeaderboardEntry } from "@/types";

interface CheatSheetProps {
  matches: MatchRecord[];
  entries: LeaderboardEntry[];
  isLoaded: boolean;
  isAuthenticated: boolean;
}

interface CheatRow {
  hero: string;
  heroClass?: string;
  metaShare: number;
  communityWR: number;
  yourWinRate: number | null;
  yourMatches: number;
  yourWins: number;
  yourLosses: number;
  dangerScore: number;
  note: string;
}

type SortKey = "danger" | "meta" | "winrate";

export function CheatSheet({ matches, entries, isLoaded, isAuthenticated }: CheatSheetProps) {
  const [hero, setHero] = useState("");
  const [format, setFormat] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("danger");

  const formats = useMemo(() => getAvailableFormats(entries), [entries]);
  const { matchups: notes } = useMatchupNotes(hero || null);

  // Community meta
  const { heroStats: metaHeroes } = useMemo(
    () => computeMetaStats(entries, format || undefined),
    [entries, format],
  );

  // Your matchup stats for the selected hero
  const yourHeroStats = useMemo(() => {
    if (!hero) return null;
    let filtered = matches;
    if (format) filtered = filtered.filter((m) => m.format === format);
    const all = computeHeroStats(filtered);
    return all.find((h) => h.heroName === hero) || null;
  }, [matches, hero, format]);

  // Top 10 meta heroes as cheat rows
  const rows: CheatRow[] = useMemo(() => {
    const top10 = metaHeroes.slice(0, 10);
    return top10.map((mh) => {
      const mu = yourHeroStats?.matchups.find((m) => m.opponentHero === mh.hero);
      const yourWinRate = mu ? mu.winRate : null;
      // Use community WR (inverted, since high community WR = harder opponent) when no personal data
      const effectiveWR = yourWinRate ?? (100 - mh.avgWinRate);
      const dangerScore = mh.metaShare * ((100 - effectiveWR) / 100);
      const heroInfo = getHeroByName(mh.hero);
      return {
        hero: mh.hero,
        heroClass: heroInfo?.classes[0],
        metaShare: mh.metaShare,
        communityWR: mh.avgWinRate,
        yourWinRate,
        yourMatches: mu?.totalMatches ?? 0,
        yourWins: mu?.wins ?? 0,
        yourLosses: mu?.losses ?? 0,
        dangerScore,
        note: notes[mh.hero] || "",
      };
    }).sort((a, b) => {
      if (sortBy === "meta") return b.metaShare - a.metaShare;
      if (sortBy === "winrate") return (a.yourWinRate ?? 999) - (b.yourWinRate ?? 999);
      return b.dangerScore - a.dangerScore;
    });
  }, [metaHeroes, yourHeroStats, notes, sortBy]);

  if (!isLoaded) {
    return <div className="h-8 w-48 bg-fab-surface rounded animate-pulse" />;
  }

  return (
    <div>
      {/* Compact selectors */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="max-w-[200px]">
          <HeroSelect value={hero} onChange={setHero} label="Your Hero" />
        </div>
        {formats.length > 0 && (
          <div className="flex flex-wrap gap-1 self-end">
            <button
              onClick={() => setFormat("")}
              className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                !format ? "bg-fab-gold/15 text-fab-gold" : "bg-fab-surface text-fab-muted hover:text-fab-text border border-fab-border"
              }`}
            >
              All
            </button>
            {formats.map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`px-2 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                  format === f ? "bg-fab-gold/15 text-fab-gold" : "bg-fab-surface text-fab-muted hover:text-fab-text border border-fab-border"
                }`}
              >
                {f === "Classic Constructed" ? "CC" : f}
              </button>
            ))}
          </div>
        )}
      </div>

      {!hero ? (
        <div className="text-center py-10 text-fab-dim border border-dashed border-fab-border rounded-lg">
          <svg className="w-8 h-8 mx-auto mb-2 text-fab-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
          </svg>
          <p className="text-sm">Select your hero to generate a cheat sheet</p>
          <p className="text-xs text-fab-dim mt-1">Compact scouting report for tournament day</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-fab-muted">No community meta data available.</p>
          <p className="text-fab-dim text-sm mt-1">Try adjusting the format filter.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {/* Column header */}
          <div className="flex items-center gap-2 px-3 py-1 text-[10px] text-fab-dim font-medium uppercase tracking-wider">
            <span className="flex-1">Opponent</span>
            <button onClick={() => setSortBy("meta")} className={`w-12 text-right transition-colors ${sortBy === "meta" ? "text-fab-gold" : "hover:text-fab-text"}`}>
              Meta{sortBy === "meta" ? " ↓" : ""}
            </button>
            <button onClick={() => setSortBy("winrate")} className={`w-16 text-right transition-colors ${sortBy === "winrate" ? "text-fab-gold" : "hover:text-fab-text"}`}>
              Record{sortBy === "winrate" ? " ↑" : ""}
            </button>
            <button onClick={() => setSortBy("danger")} className={`w-12 text-right transition-colors ${sortBy === "danger" ? "text-fab-gold" : "hover:text-fab-text"}`}>
              Danger{sortBy === "danger" ? " ↓" : ""}
            </button>
          </div>

          {rows.map((r) => {
            // Row color based on your win rate
            const rowBg = r.yourWinRate === null
              ? "bg-fab-surface"
              : r.yourWinRate >= 55
                ? "bg-green-500/5 border-green-500/15"
                : r.yourWinRate >= 45
                  ? "bg-yellow-500/5 border-yellow-500/15"
                  : "bg-red-500/5 border-red-500/15";

            const wrColor = r.yourWinRate === null
              ? "text-fab-dim"
              : r.yourWinRate >= 55
                ? "text-fab-win"
                : r.yourWinRate >= 45
                  ? "text-yellow-400"
                  : "text-fab-loss";

            const dangerColor = r.dangerScore > 3
              ? "text-fab-loss"
              : r.dangerScore > 1.5
                ? "text-yellow-400"
                : "text-fab-win";

            return (
              <div key={r.hero} className={`rounded-lg border ${rowBg} px-3 py-2`}>
                <div className="flex items-center gap-2">
                  <HeroClassIcon heroClass={r.heroClass} size="sm" />
                  <span className="text-sm font-medium text-fab-text flex-1 truncate">
                    {r.hero.split(",")[0]}
                  </span>
                  <span className="w-12 text-right text-xs text-fab-muted">
                    {r.metaShare.toFixed(1)}%
                  </span>
                  <span className={`w-16 text-right text-xs font-semibold ${wrColor}`}>
                    {r.yourMatches > 0
                      ? `${r.yourWins}-${r.yourLosses}`
                      : "no data"}
                  </span>
                  <span className={`w-12 text-right text-xs font-bold ${dangerColor}`}>
                    {r.dangerScore.toFixed(1)}
                  </span>
                </div>
                {/* Note inline */}
                {r.note && (
                  <p className="text-[11px] text-fab-dim mt-1 ml-8 italic leading-tight line-clamp-2">
                    {r.note}
                  </p>
                )}
              </div>
            );
          })}

          {/* Legend */}
          <div className="flex items-center gap-4 pt-2 px-1">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500/40" />
              <span className="text-[10px] text-fab-dim">Favorable</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-yellow-500/40" />
              <span className="text-[10px] text-fab-dim">Even</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500/40" />
              <span className="text-[10px] text-fab-dim">Unfavorable</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-fab-surface border border-fab-border" />
              <span className="text-[10px] text-fab-dim">No data</span>
            </div>
          </div>

          {!isAuthenticated && (
            <p className="text-[10px] text-fab-dim mt-2 italic">
              Sign in to see your personal matchup data and notes.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
