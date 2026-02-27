"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useAuth } from "@/contexts/AuthContext";
import { getHeroByName } from "@/lib/heroes";
import { HeroClassIcon } from "@/components/heroes/HeroClassIcon";
import { CARD_THEMES, type CardTheme } from "@/components/opponents/RivalryCard";
import { CompareCard } from "@/components/compare/CompareCard";
import { toBlob } from "html-to-image";
import { getMatchesByUserId } from "@/lib/firestore-storage";
import { computeOpponentStats } from "@/lib/stats";
import type { LeaderboardEntry } from "@/types";

export default function ComparePage() {
  const searchParams = useSearchParams();
  const { entries, loading } = useLeaderboard();
  const { profile } = useAuth();

  const p1Param = searchParams.get("p1") || "";
  const p2Param = searchParams.get("p2") || "";

  const [search1, setSearch1] = useState(p1Param);
  const [search2, setSearch2] = useState(p2Param);
  const [pick1, setPick1] = useState<string>(p1Param);
  const [pick2, setPick2] = useState<string>(p2Param);
  const [focused, setFocused] = useState<1 | 2 | null>(null);

  // Default player 1 to current user only if user hasn't explicitly cleared it
  const [cleared1, setCleared1] = useState(false);
  const effectivePick1 = cleared1 ? pick1 : (pick1 || profile?.username || "");

  const entryMap = useMemo(() => new Map(entries.map((e) => [e.username, e])), [entries]);
  const player1 = entryMap.get(effectivePick1);
  const player2 = entryMap.get(pick2);

  const filtered1 = useMemo(() => {
    if (!search1.trim()) return [];
    const q = search1.toLowerCase();
    return entries
      .filter((e) => e.username.toLowerCase().includes(q) || e.displayName.toLowerCase().includes(q))
      .slice(0, 6);
  }, [entries, search1]);

  const filtered2 = useMemo(() => {
    if (!search2.trim()) return [];
    const q = search2.toLowerCase();
    return entries
      .filter((e) => e.username.toLowerCase().includes(q) || e.displayName.toLowerCase().includes(q))
      .slice(0, 6);
  }, [entries, search2]);

  function selectPlayer(slot: 1 | 2, entry: LeaderboardEntry) {
    if (slot === 1) {
      setPick1(entry.username);
      setSearch1(entry.displayName);
    } else {
      setPick2(entry.username);
      setSearch2(entry.displayName);
    }
    setFocused(null);
    // Update URL
    const params = new URLSearchParams(window.location.search);
    params.set(slot === 1 ? "p1" : "p2", entry.username);
    window.history.replaceState(null, "", `?${params.toString()}`);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-fab-surface rounded animate-pulse" />
        <div className="h-48 bg-fab-surface rounded animate-pulse" />
      </div>
    );
  }

  const bothSelected = player1 && player2;

  return (
    <div>
      <h1 className="text-2xl font-bold text-fab-gold mb-1">Compare</h1>
      <p className="text-fab-muted text-sm mb-6">Compare stats head-to-head with any player</p>

      {/* Player pickers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <PlayerPicker
          label="Player 1"
          value={search1 || player1?.displayName || effectivePick1}
          onChange={(v) => { setSearch1(v); setPick1(""); setCleared1(true); }}
          onFocus={() => setFocused(1)}
          onBlur={() => setTimeout(() => setFocused(null), 200)}
          results={focused === 1 ? filtered1 : []}
          onSelect={(e) => { selectPlayer(1, e); setCleared1(false); }}
          selected={player1}
          color="text-blue-400"
        />
        <PlayerPicker
          label="Player 2"
          value={search2 || player2?.displayName || ""}
          onChange={(v) => { setSearch2(v); setPick2(""); }}
          onFocus={() => setFocused(2)}
          onBlur={() => setTimeout(() => setFocused(null), 200)}
          results={focused === 2 ? filtered2 : []}
          onSelect={(e) => selectPlayer(2, e)}
          selected={player2}
          placeholder="Search for a player..."
          color="text-red-400"
        />
      </div>

      {/* Comparison */}
      {bothSelected ? (
        <ComparisonView p1={player1} p2={player2} />
      ) : (
        <div className="text-center py-16 text-fab-dim">
          <p className="text-lg mb-1">Select two players to compare</p>
          <p className="text-sm">Search for players above to see side-by-side stats</p>
        </div>
      )}
    </div>
  );
}

function PlayerPicker({
  label,
  value,
  onChange,
  onFocus,
  onBlur,
  results,
  onSelect,
  selected,
  placeholder,
  color,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  results: LeaderboardEntry[];
  onSelect: (e: LeaderboardEntry) => void;
  selected?: LeaderboardEntry;
  placeholder?: string;
  color: string;
}) {
  return (
    <div className="relative">
      <p className={`text-xs font-semibold uppercase tracking-wider mb-1.5 ${color}`}>{label}</p>
      {selected ? (
        <div className="flex items-center gap-3 bg-fab-surface border border-fab-border rounded-lg p-3">
          {selected.photoUrl ? (
            <img src={selected.photoUrl} alt="" className="w-10 h-10 rounded-full shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-fab-gold/20 flex items-center justify-center text-fab-gold font-bold shrink-0">
              {selected.displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-fab-text truncate">{selected.displayName}</p>
            <p className="text-xs text-fab-dim">@{selected.username}</p>
          </div>
          <button
            onClick={() => { onChange(""); }}
            className="text-fab-dim hover:text-fab-text transition-colors text-xs px-2 py-1 rounded bg-fab-bg"
          >
            Change
          </button>
        </div>
      ) : (
        <>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={onFocus}
            onBlur={onBlur}
            placeholder={placeholder || "Search..."}
            className="w-full bg-fab-surface border border-fab-border rounded-lg px-3 py-2.5 text-fab-text text-sm placeholder:text-fab-dim focus:outline-none focus:border-fab-gold"
          />
          {results.length > 0 && (
            <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-fab-surface border border-fab-border rounded-lg overflow-hidden shadow-lg">
              {results.map((e) => (
                <button
                  key={e.userId}
                  onMouseDown={() => onSelect(e)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-fab-surface-hover transition-colors"
                >
                  {e.photoUrl ? (
                    <img src={e.photoUrl} alt="" className="w-7 h-7 rounded-full shrink-0" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-fab-gold/20 flex items-center justify-center text-fab-gold text-xs font-bold shrink-0">
                      {e.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-fab-text truncate">{e.displayName}</p>
                    <p className="text-[10px] text-fab-dim">@{e.username} &middot; {e.totalMatches} matches</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ComparisonView({ p1, p2 }: { p1: LeaderboardEntry; p2: LeaderboardEntry }) {
  const [showShareModal, setShowShareModal] = useState(false);
  const [scoreMode, setScoreMode] = useState<"categories" | "points">("categories");
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Head-to-head record
  const [h2h, setH2h] = useState<{ p1Wins: number; p2Wins: number; draws: number; total: number } | null>(null);
  const [h2hLoading, setH2hLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setH2hLoading(true);
    setH2h(null);

    (async () => {
      try {
        const matches = await getMatchesByUserId(p1.userId);
        if (cancelled) return;
        const oppStats = computeOpponentStats(matches);
        // Find p2 by display name (case-insensitive)
        const p2Lower = p2.displayName.toLowerCase();
        const vs = oppStats.find((o) => o.opponentName.toLowerCase() === p2Lower);
        if (vs) {
          setH2h({ p1Wins: vs.wins, p2Wins: vs.losses, draws: vs.draws, total: vs.totalMatches });
        }
      } catch { /* profile might not be public */ }
      if (!cancelled) setH2hLoading(false);
    })();

    return () => { cancelled = true; };
  }, [p1.userId, p2.displayName]);

  type StatRow = { label: string; v1: string | number; v2: string | number; better: 1 | 2 | 0; raw1?: number; raw2?: number; weight: number };
  const stats: StatRow[] = [
    {
      label: "Win Rate",
      v1: `${p1.winRate.toFixed(1)}%`,
      v2: `${p2.winRate.toFixed(1)}%`,
      better: p1.winRate > p2.winRate ? 1 : p2.winRate > p1.winRate ? 2 : 0,
      raw1: p1.winRate, raw2: p2.winRate,
      weight: 3,
    },
    {
      label: "Total Matches",
      v1: p1.totalMatches,
      v2: p2.totalMatches,
      better: p1.totalMatches > p2.totalMatches ? 1 : p2.totalMatches > p1.totalMatches ? 2 : 0,
      raw1: p1.totalMatches, raw2: p2.totalMatches,
      weight: 1,
    },
    {
      label: "Record",
      v1: `${p1.totalWins}W-${p1.totalLosses}L${p1.totalDraws > 0 ? `-${p1.totalDraws}D` : ""}`,
      v2: `${p2.totalWins}W-${p2.totalLosses}L${p2.totalDraws > 0 ? `-${p2.totalDraws}D` : ""}`,
      better: 0,
      weight: 0,
    },
    {
      label: "Events Played",
      v1: p1.eventsPlayed,
      v2: p2.eventsPlayed,
      better: p1.eventsPlayed > p2.eventsPlayed ? 1 : p2.eventsPlayed > p1.eventsPlayed ? 2 : 0,
      raw1: p1.eventsPlayed, raw2: p2.eventsPlayed,
      weight: 1,
    },
    {
      label: "Event Wins",
      v1: p1.eventWins,
      v2: p2.eventWins,
      better: p1.eventWins > p2.eventWins ? 1 : p2.eventWins > p1.eventWins ? 2 : 0,
      raw1: p1.eventWins, raw2: p2.eventWins,
      weight: 3,
    },
    {
      label: "Longest Win Streak",
      v1: p1.longestWinStreak,
      v2: p2.longestWinStreak,
      better: p1.longestWinStreak > p2.longestWinStreak ? 1 : p2.longestWinStreak > p1.longestWinStreak ? 2 : 0,
      raw1: p1.longestWinStreak, raw2: p2.longestWinStreak,
      weight: 2,
    },
    {
      label: "Unique Heroes",
      v1: p1.uniqueHeroes,
      v2: p2.uniqueHeroes,
      better: p1.uniqueHeroes > p2.uniqueHeroes ? 1 : p2.uniqueHeroes > p1.uniqueHeroes ? 2 : 0,
      raw1: p1.uniqueHeroes, raw2: p2.uniqueHeroes,
      weight: 1,
    },
    {
      label: "Rated Win Rate",
      v1: p1.ratedMatches > 0 ? `${p1.ratedWinRate.toFixed(1)}%` : "—",
      v2: p2.ratedMatches > 0 ? `${p2.ratedWinRate.toFixed(1)}%` : "—",
      better: p1.ratedWinRate > p2.ratedWinRate ? 1 : p2.ratedWinRate > p1.ratedWinRate ? 2 : 0,
      raw1: p1.ratedMatches > 0 ? p1.ratedWinRate : undefined,
      raw2: p2.ratedMatches > 0 ? p2.ratedWinRate : undefined,
      weight: 2,
    },
    {
      label: "Armory Win Rate",
      v1: p1.armoryMatches > 0 ? `${p1.armoryWinRate.toFixed(1)}%` : "—",
      v2: p2.armoryMatches > 0 ? `${p2.armoryWinRate.toFixed(1)}%` : "—",
      better: p1.armoryWinRate > p2.armoryWinRate ? 1 : p2.armoryWinRate > p1.armoryWinRate ? 2 : 0,
      raw1: p1.armoryMatches > 0 ? p1.armoryWinRate : undefined,
      raw2: p2.armoryMatches > 0 ? p2.armoryWinRate : undefined,
      weight: 1.5,
    },
  ];

  // Count who "wins" more categories
  const p1Wins = stats.filter((s) => s.better === 1).length;
  const p2Wins = stats.filter((s) => s.better === 2).length;

  // Dominance points: each category contributes 0-10 weighted points based on margin
  type DomBreakdown = { label: string; p1Pts: number; p2Pts: number; weight: number; maxPts: number };
  const { p1Points, p2Points, breakdown } = useMemo(() => {
    let s1 = 0, s2 = 0;
    const rows: DomBreakdown[] = [];
    for (const stat of stats) {
      if (stat.raw1 === undefined || stat.raw2 === undefined || stat.weight === 0) continue;
      const total = stat.raw1 + stat.raw2;
      let r1: number, r2: number;
      if (total === 0) { r1 = 5 * stat.weight; r2 = 5 * stat.weight; }
      else { r1 = (stat.raw1 / total) * 10 * stat.weight; r2 = (stat.raw2 / total) * 10 * stat.weight; }
      s1 += r1; s2 += r2;
      rows.push({ label: stat.label, p1Pts: Math.round(r1 * 10) / 10, p2Pts: Math.round(r2 * 10) / 10, weight: stat.weight, maxPts: 10 * stat.weight });
    }
    return { p1Points: Math.round(s1 * 10) / 10, p2Points: Math.round(s2 * 10) / 10, breakdown: rows };
  }, [p1, p2]);

  const hero1 = p1.topHero ? getHeroByName(p1.topHero) : undefined;
  const hero2 = p2.topHero ? getHeroByName(p2.topHero) : undefined;

  return (
    <div>
      {/* VS Header */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <div className="text-center flex-1">
          <Link href={`/player/${p1.username}`} className="hover:opacity-80 transition-opacity inline-block">
            {p1.photoUrl ? (
              <img src={p1.photoUrl} alt="" className="w-16 h-16 rounded-full mx-auto mb-2" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-fab-gold/20 flex items-center justify-center text-fab-gold text-2xl font-bold mx-auto mb-2">
                {p1.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <p className="font-bold text-fab-text text-sm truncate">{p1.displayName}</p>
          </Link>
          <p className="text-xs text-fab-dim mt-0.5">{p1.totalMatches} matches</p>
        </div>

        <div className="shrink-0 text-center">
          <div className="text-2xl font-black text-fab-gold">VS</div>
          <p className="text-[10px] text-fab-dim mt-1">
            <span className="text-blue-400 font-semibold">{scoreMode === "categories" ? p1Wins : p1Points}</span>
            {" - "}
            <span className="text-red-400 font-semibold">{scoreMode === "categories" ? p2Wins : p2Points}</span>
          </p>
        </div>

        <div className="text-center flex-1">
          <Link href={`/player/${p2.username}`} className="hover:opacity-80 transition-opacity inline-block">
            {p2.photoUrl ? (
              <img src={p2.photoUrl} alt="" className="w-16 h-16 rounded-full mx-auto mb-2" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-fab-gold/20 flex items-center justify-center text-fab-gold text-2xl font-bold mx-auto mb-2">
                {p2.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <p className="font-bold text-fab-text text-sm truncate">{p2.displayName}</p>
          </Link>
          <p className="text-xs text-fab-dim mt-0.5">{p2.totalMatches} matches</p>
        </div>
      </div>

      {/* Top Hero comparison */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-fab-surface border border-fab-border rounded-lg p-3 text-center">
          <p className="text-[10px] text-fab-dim uppercase tracking-wider mb-1">Top Hero</p>
          <div className="flex items-center justify-center gap-2">
            {hero1 && <HeroClassIcon heroClass={hero1.classes[0]} size="sm" />}
            <p className="text-sm font-bold text-fab-text">{p1.topHero || "—"}</p>
          </div>
          <p className="text-xs text-fab-dim">{p1.topHeroMatches} matches</p>
        </div>
        <div className="bg-fab-surface border border-fab-border rounded-lg p-3 text-center">
          <p className="text-[10px] text-fab-dim uppercase tracking-wider mb-1">Top Hero</p>
          <div className="flex items-center justify-center gap-2">
            {hero2 && <HeroClassIcon heroClass={hero2.classes[0]} size="sm" />}
            <p className="text-sm font-bold text-fab-text">{p2.topHero || "—"}</p>
          </div>
          <p className="text-xs text-fab-dim">{p2.topHeroMatches} matches</p>
        </div>
      </div>

      {/* Head-to-Head */}
      {h2hLoading ? (
        <div className="bg-fab-surface border border-fab-border rounded-lg p-4 mb-4">
          <div className="h-4 w-32 bg-fab-bg rounded animate-pulse mx-auto" />
        </div>
      ) : h2h && h2h.total > 0 ? (
        <div className="bg-fab-surface border border-fab-border rounded-lg p-4 mb-4 text-center">
          <p className="text-[10px] text-fab-dim uppercase tracking-wider mb-2">Head-to-Head Record</p>
          <div className="flex items-baseline justify-center gap-3">
            <span className={`text-2xl font-black ${h2h.p1Wins > h2h.p2Wins ? "text-blue-400" : "text-fab-text"}`}>{h2h.p1Wins}</span>
            <span className="text-fab-dim text-sm">W</span>
            {h2h.draws > 0 && (
              <>
                <span className="text-fab-border">-</span>
                <span className="text-2xl font-black text-fab-text">{h2h.draws}</span>
                <span className="text-fab-dim text-sm">D</span>
              </>
            )}
            <span className="text-fab-border">-</span>
            <span className={`text-2xl font-black ${h2h.p2Wins > h2h.p1Wins ? "text-red-400" : "text-fab-text"}`}>{h2h.p2Wins}</span>
            <span className="text-fab-dim text-sm">L</span>
          </div>
          <p className="text-xs text-fab-dim mt-1">{h2h.total} match{h2h.total !== 1 ? "es" : ""} played against each other</p>
        </div>
      ) : null}

      {/* Score mode toggle */}
      <div className="flex items-center justify-center gap-1 mb-4">
        <button
          onClick={() => setScoreMode("categories")}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${scoreMode === "categories" ? "bg-fab-gold/20 text-fab-gold" : "text-fab-muted hover:text-fab-text"}`}
        >
          Categories Won
        </button>
        <button
          onClick={() => setScoreMode("points")}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${scoreMode === "points" ? "bg-fab-gold/20 text-fab-gold" : "text-fab-muted hover:text-fab-text"}`}
        >
          Dominance Score
        </button>
      </div>

      {/* Stats table */}
      <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className={`grid grid-cols-3 items-center px-4 py-3 ${i > 0 ? "border-t border-fab-border" : ""}`}
          >
            <div className={`text-sm font-semibold text-right ${stat.better === 1 ? "text-blue-400" : "text-fab-text"}`}>
              {stat.v1}
            </div>
            <div className="text-center">
              <p className="text-xs text-fab-muted">{stat.label}</p>
            </div>
            <div className={`text-sm font-semibold text-left ${stat.better === 2 ? "text-red-400" : "text-fab-text"}`}>
              {stat.v2}
            </div>
          </div>
        ))}
      </div>

      {/* Dominance Breakdown */}
      {scoreMode === "points" && (
        <div className="mt-3">
          <button
            onClick={() => setShowBreakdown((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-fab-muted hover:text-fab-gold transition-colors mx-auto"
          >
            <svg className={`w-3.5 h-3.5 transition-transform ${showBreakdown ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
            {showBreakdown ? "Hide" : "Show"} scoring breakdown
          </button>
          {showBreakdown && (
            <div className="mt-2 bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-[1fr_60px_40px_60px] items-center px-3 py-2 border-b border-fab-border bg-fab-bg">
                <p className="text-[10px] text-fab-dim uppercase tracking-wider">Category</p>
                <p className="text-[10px] text-blue-400 uppercase tracking-wider text-center">P1</p>
                <p className="text-[10px] text-fab-dim uppercase tracking-wider text-center">Max</p>
                <p className="text-[10px] text-red-400 uppercase tracking-wider text-center">P2</p>
              </div>
              {breakdown.map((row, i) => (
                <div key={row.label} className={`grid grid-cols-[1fr_60px_40px_60px] items-center px-3 py-1.5 ${i > 0 ? "border-t border-fab-border/50" : ""}`}>
                  <p className="text-xs text-fab-muted truncate">
                    {row.label}
                    <span className="text-fab-dim ml-1">x{row.weight}</span>
                  </p>
                  <p className={`text-xs font-semibold text-center ${row.p1Pts > row.p2Pts ? "text-blue-400" : "text-fab-text"}`}>{row.p1Pts}</p>
                  <p className="text-[10px] text-fab-dim text-center">{row.maxPts}</p>
                  <p className={`text-xs font-semibold text-center ${row.p2Pts > row.p1Pts ? "text-red-400" : "text-fab-text"}`}>{row.p2Pts}</p>
                </div>
              ))}
              {/* Totals */}
              <div className="grid grid-cols-[1fr_60px_40px_60px] items-center px-3 py-2 border-t border-fab-border bg-fab-bg">
                <p className="text-xs font-semibold text-fab-text">Total</p>
                <p className={`text-xs font-bold text-center ${p1Points > p2Points ? "text-blue-400" : "text-fab-text"}`}>{p1Points}</p>
                <p className="text-[10px] text-fab-dim text-center">{breakdown.reduce((s, r) => s + r.maxPts, 0)}</p>
                <p className={`text-xs font-bold text-center ${p2Points > p1Points ? "text-red-400" : "text-fab-text"}`}>{p2Points}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Verdict */}
      <Verdict p1={p1} p2={p2} p1Wins={p1Wins} p2Wins={p2Wins} p1Points={p1Points} p2Points={p2Points} h2h={h2h} />

      {/* Share button */}
      <div className="mt-4 text-center">
        <button
          onClick={() => setShowShareModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text hover:border-fab-gold/30 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Share Comparison
        </button>
      </div>

      {showShareModal && (
        <CompareShareModal
          p1={p1}
          p2={p2}
          stats={stats}
          p1CategoryWins={p1Wins}
          p2CategoryWins={p2Wins}
          p1Points={p1Points}
          p2Points={p2Points}
          scoreMode={scoreMode}
          h2h={h2h}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}

function Verdict({ p1, p2, p1Wins, p2Wins, p1Points, p2Points, h2h }: { p1: LeaderboardEntry; p2: LeaderboardEntry; p1Wins: number; p2Wins: number; p1Points: number; p2Points: number; h2h: { p1Wins: number; p2Wins: number; draws: number; total: number } | null }) {
  const verdicts: string[] = [];

  // Use weighted dominance score as the primary winner detection
  const pointDiff = Math.abs(p1Points - p2Points);
  const totalPoints = p1Points + p2Points;
  const margin = totalPoints > 0 ? (pointDiff / totalPoints) * 100 : 0;
  const winner = p1Points > p2Points ? p1 : p2;
  const loser = winner === p1 ? p2 : p1;

  if (margin < 1) {
    verdicts.push("Dead even across the board — these two are perfectly matched.");
  } else if (margin > 15) {
    verdicts.push(`${winner.displayName} dominates, taking ${Math.max(p1Wins, p2Wins)} categories and leading in weighted score.`);
  } else if (margin > 7) {
    verdicts.push(`${winner.displayName} holds a clear edge with a stronger weighted score across key categories.`);
  } else {
    verdicts.push(`${winner.displayName} narrowly edges out ${loser.displayName} when factoring in category importance.`);
  }

  // Win rate comparison
  const wrDiff = Math.abs(p1.winRate - p2.winRate);
  if (wrDiff < 2) {
    verdicts.push("Their win rates are virtually identical.");
  } else if (wrDiff > 15) {
    const better = p1.winRate > p2.winRate ? p1 : p2;
    verdicts.push(`${better.displayName} boasts a ${wrDiff.toFixed(0)}% higher win rate.`);
  }

  // Experience comparison
  const matchDiff = Math.abs(p1.totalMatches - p2.totalMatches);
  if (matchDiff > 50) {
    const more = p1.totalMatches > p2.totalMatches ? p1 : p2;
    verdicts.push(`${more.displayName} has ${matchDiff} more matches of experience.`);
  }

  // H2H verdict
  if (h2h && h2h.total >= 2) {
    if (h2h.p1Wins > h2h.p2Wins) {
      verdicts.push(`${p1.displayName} owns the head-to-head ${h2h.p1Wins}-${h2h.p2Wins}.`);
    } else if (h2h.p2Wins > h2h.p1Wins) {
      verdicts.push(`${p2.displayName} owns the head-to-head ${h2h.p2Wins}-${h2h.p1Wins}.`);
    } else {
      verdicts.push("They're dead even head-to-head.");
    }
  }

  return (
    <div className="mt-4 bg-fab-surface border border-fab-border rounded-lg p-4">
      <p className="text-[10px] text-fab-gold uppercase tracking-wider font-semibold mb-2">Verdict</p>
      <p className="text-sm text-fab-text leading-relaxed">{verdicts.join(" ")}</p>
    </div>
  );
}

function CompareShareModal({
  p1,
  p2,
  stats,
  p1CategoryWins,
  p2CategoryWins,
  p1Points,
  p2Points,
  scoreMode,
  h2h,
  onClose,
}: {
  p1: LeaderboardEntry;
  p2: LeaderboardEntry;
  stats: { label: string; v1: string | number; v2: string | number; better: 1 | 2 | 0 }[];
  p1CategoryWins: number;
  p2CategoryWins: number;
  p1Points: number;
  p2Points: number;
  scoreMode: "categories" | "points";
  h2h: { p1Wins: number; p2Wins: number; draws: number; total: number } | null;
  onClose: () => void;
}) {
  const [selectedTheme, setSelectedTheme] = useState(CARD_THEMES[0]);
  const [shareStatus, setShareStatus] = useState<"idle" | "sharing" | "copied">("idle");
  const cardRef = useRef<HTMLDivElement>(null);

  const compareData = {
    p1Name: p1.displayName,
    p2Name: p2.displayName,
    stats,
    p1TopHero: p1.topHero || "",
    p2TopHero: p2.topHero || "",
    p1Matches: p1.totalMatches,
    p2Matches: p2.totalMatches,
    p1CategoryWins,
    p2CategoryWins,
    p1Dominance: p1Points,
    p2Dominance: p2Points,
    h2h: h2h ?? undefined,
  };

  async function handleCopy() {
    const url = `${window.location.origin}/compare?p1=${p1.username}&p2=${p2.username}`;
    setShareStatus("sharing");
    try {
      const blob = cardRef.current
        ? await toBlob(cardRef.current, { pixelRatio: 2, backgroundColor: selectedTheme.bg })
        : null;

      const isMobile = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      const shareText = `${p1.displayName} vs ${p2.displayName} — Compare stats on FaB Stats\n${url}`;

      if (isMobile && blob && navigator.share && navigator.canShare?.({ files: [new File([blob], "compare.png", { type: "image/png" })] })) {
        const file = new File([blob], "compare.png", { type: "image/png" });
        await navigator.share({ title: "FaB Stats", text: shareText, files: [file] });
      } else if (blob && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        setShareStatus("copied");
        setTimeout(() => { setShareStatus("idle"); onClose(); }, 1500);
        return;
      } else {
        await navigator.clipboard.writeText(url);
        setShareStatus("copied");
        setTimeout(() => { setShareStatus("idle"); onClose(); }, 1500);
        return;
      }
    } catch {
      try {
        await navigator.clipboard.writeText(`${window.location.origin}/compare?p1=${p1.username}&p2=${p2.username}`);
      } catch { /* ignore */ }
    }
    setShareStatus("idle");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-fab-surface border border-fab-border rounded-xl max-w-lg w-full mx-4 overflow-hidden max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Modal header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-fab-border">
          <h3 className="text-sm font-semibold text-fab-text">Share Comparison</h3>
          <button onClick={onClose} className="text-fab-muted hover:text-fab-text transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Card preview */}
        <div className="p-4 flex justify-center overflow-x-auto">
          <div ref={cardRef}>
            <CompareCard data={compareData} theme={selectedTheme} />
          </div>
        </div>

        {/* Theme picker */}
        <div className="px-4 pb-3">
          <p className="text-[10px] text-fab-muted uppercase tracking-wider font-medium mb-2">Theme</p>
          <div className="flex gap-2">
            {CARD_THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setSelectedTheme(theme)}
                className={`flex-1 rounded-lg p-2 text-center transition-all border ${
                  selectedTheme.id === theme.id
                    ? "border-fab-gold ring-1 ring-fab-gold/30"
                    : "border-fab-border hover:border-fab-muted"
                }`}
              >
                <div className="flex gap-0.5 justify-center mb-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.bg }} />
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.accent }} />
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.win }} />
                </div>
                <p className="text-[10px] text-fab-muted">{theme.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Copy button */}
        <div className="px-4 pb-4">
          <button
            onClick={handleCopy}
            disabled={shareStatus === "sharing"}
            className="w-full py-2.5 rounded-lg text-sm font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors disabled:opacity-50"
          >
            {shareStatus === "sharing" ? "Capturing..." : shareStatus === "copied" ? "Copied!" : "Copy Image"}
          </button>
        </div>
      </div>
    </div>
  );
}
