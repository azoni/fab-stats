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
import { SwordsIcon } from "@/components/icons/NavIcons";
import { computeUserRanks, getBestRank, rankBorderClass } from "@/lib/leaderboard-ranks";

import { getMatchesByUserId, getProfile } from "@/lib/firestore-storage";
import { normalizeOpponentName } from "@/lib/stats";
import { getH2H } from "@/lib/h2h";
import { getWeekStart, getMonthStart } from "@/lib/leaderboard";
import { MatchResult, type LeaderboardEntry, type MatchRecord } from "@/types";

// ── Power Level System ──

function computePowerLevel(e: LeaderboardEntry): number {
  let score = 0;
  const totalMatches = e.totalMatches + e.totalByes;

  // Win rate: max 30pts, scaled by match count (need 20+ for full weight)
  const wrWeight = Math.min(totalMatches / 20, 1);
  score += (e.winRate / 100) * 30 * wrWeight;

  // Volume: max 15pts, log scale capping at 500 matches
  if (totalMatches > 0) {
    score += Math.min(Math.log(totalMatches + 1) / Math.log(501), 1) * 15;
  }

  // Event success: max 20pts (event wins 10, top 8s 6, events played 4)
  score += Math.min(e.eventWins / 10, 1) * 10;
  score += Math.min((e.totalTop8s ?? 0) / 8, 1) * 6;
  score += Math.min(e.eventsPlayed / 20, 1) * 4;

  // Streaks: max 10pts
  score += Math.min(e.longestWinStreak / 15, 1) * 7;
  score += Math.min(e.currentStreakType === "win" ? e.currentStreakCount / 10 : 0, 1) * 3;

  // Hero mastery: max 10pts (unique heroes 5, top hero depth 5)
  score += Math.min(e.uniqueHeroes / 8, 1) * 5;
  score += Math.min(e.topHeroMatches / 100, 1) * 5;

  // Rated performance: max 10pts (requires 5+ rated matches)
  if (e.ratedMatches >= 5) {
    score += (e.ratedWinRate / 100) * 10;
  }

  // Earnings bonus: max 5pts
  const earnings = e.earnings ?? 0;
  if (earnings > 0) {
    score += Math.min(Math.log(earnings + 1) / Math.log(10001), 1) * 5;
  }

  return Math.min(Math.round(score), 99);
}

type PowerTier = { label: string; color: string; glow: string; textColor: string };

function getPowerTier(level: number): PowerTier {
  if (level >= 80) return { label: "Grandmaster", color: "from-fuchsia-500 to-pink-500", glow: "shadow-fuchsia-500/30", textColor: "text-fuchsia-400" };
  if (level >= 65) return { label: "Diamond", color: "from-sky-400 to-blue-500", glow: "shadow-sky-400/30", textColor: "text-sky-400" };
  if (level >= 50) return { label: "Gold", color: "from-yellow-400 to-amber-500", glow: "shadow-yellow-400/30", textColor: "text-yellow-400" };
  if (level >= 35) return { label: "Silver", color: "from-gray-300 to-gray-400", glow: "shadow-gray-400/20", textColor: "text-gray-400" };
  return { label: "Bronze", color: "from-amber-600 to-orange-700", glow: "shadow-amber-600/20", textColor: "text-amber-500" };
}

// ── Main Page ──

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
    const params = new URLSearchParams(window.location.search);
    params.set(slot === 1 ? "p1" : "p2", entry.username);
    window.history.replaceState(null, "", `?${params.toString()}`);
  }

  function swapPlayers() {
    const oldPick1 = effectivePick1;
    const oldPick2 = pick2;
    const oldSearch1 = search1;
    const oldSearch2 = search2;
    setPick1(oldPick2);
    setPick2(oldPick1);
    setSearch1(oldSearch2);
    setSearch2(oldSearch1);
    setCleared1(true);
    const params = new URLSearchParams();
    if (oldPick2) params.set("p1", oldPick2);
    if (oldPick1) params.set("p2", oldPick1);
    window.history.replaceState(null, "", params.toString() ? `?${params.toString()}` : window.location.pathname);
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
      <p className="text-fab-muted text-sm mb-6">Head-to-head player showdown</p>

      {/* Player pickers with swap button */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 sm:gap-4 mb-6 items-end">
        <PlayerPicker
          label="Player 1"
          value={search1}
          onChange={(v) => { setSearch1(v); setPick1(""); setCleared1(true); }}
          onFocus={() => setFocused(1)}
          onBlur={() => setFocused(null)}
          results={focused === 1 ? filtered1 : []}
          onSelect={(e) => { selectPlayer(1, e); setCleared1(false); }}
          onClear={() => { setPick1(""); setSearch1(""); setCleared1(true); }}
          selected={player1}
          color="text-blue-400"
        />
        <button
          onClick={swapPlayers}
          className="mb-[3px] p-2 rounded-lg border border-fab-border bg-fab-surface hover:border-fab-gold/40 hover:bg-fab-surface-hover transition-all group"
          title="Swap players"
        >
          <svg className="w-4 h-4 text-fab-muted group-hover:text-fab-gold transition-colors group-hover:rotate-180 duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
        </button>
        <PlayerPicker
          label="Player 2"
          value={search2}
          onChange={(v) => { setSearch2(v); setPick2(""); }}
          onFocus={() => setFocused(2)}
          onBlur={() => setFocused(null)}
          results={focused === 2 ? filtered2 : []}
          onSelect={(e) => selectPlayer(2, e)}
          onClear={() => { setPick2(""); setSearch2(""); }}
          selected={player2}
          placeholder="Search for a player..."
          color="text-red-400"
        />
      </div>

      {/* Comparison */}
      {bothSelected ? (
        <ComparisonView p1={player1} p2={player2} allEntries={entries} />
      ) : (
        <div className="text-center py-20">
          <SwordsIcon className="w-12 h-12 text-fab-muted/40 mx-auto mb-4" />
          <p className="text-lg font-semibold text-fab-text mb-1">Pick Your Fighters</p>
          <p className="text-sm text-fab-dim max-w-xs mx-auto">Search for two players above to see who dominates the stats showdown</p>
        </div>
      )}
    </div>
  );
}

// ── Player Picker ──

function PlayerPicker({
  label,
  value,
  onChange,
  onFocus,
  onBlur,
  results,
  onSelect,
  onClear,
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
  onClear: () => void;
  selected?: LeaderboardEntry;
  placeholder?: string;
  color: string;
}) {
  const [hlIndex, setHlIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevResultsLen = useRef(0);

  if (results.length !== prevResultsLen.current) {
    prevResultsLen.current = results.length;
    if (hlIndex >= results.length) setHlIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setIsSearching(false);
      inputRef.current?.blur();
      return;
    }
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHlIndex((i) => (i < results.length - 1 ? i + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHlIndex((i) => (i > 0 ? i - 1 : results.length - 1));
    } else if (e.key === "Enter" && hlIndex >= 0 && hlIndex < results.length) {
      e.preventDefault();
      onSelect(results[hlIndex]);
      setHlIndex(-1);
      setIsSearching(false);
      inputRef.current?.blur();
    }
  }

  function handleFocus() {
    setIsSearching(true);
    onFocus();
    if (selected) onChange("");
  }

  function handleBlur() {
    setTimeout(() => {
      setIsSearching(false);
      onBlur();
    }, 200);
  }

  const showDropdown = isSearching && results.length > 0;

  return (
    <div className="relative">
      <p className={`text-xs font-semibold uppercase tracking-wider mb-1.5 ${color}`}>{label}</p>
      <div className={`flex items-center gap-2 bg-fab-surface border rounded-lg px-3 py-2 transition-colors ${isSearching ? "border-fab-gold" : "border-fab-border"}`}>
        {selected && !isSearching ? (
          selected.photoUrl ? (
            <img src={selected.photoUrl} alt="" className="w-7 h-7 rounded-full shrink-0" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-fab-gold/20 flex items-center justify-center text-fab-gold text-xs font-bold shrink-0">
              {selected.displayName.charAt(0).toUpperCase()}
            </div>
          )
        ) : (
          <svg className="w-4 h-4 text-fab-dim shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        )}
        <input
          ref={inputRef}
          type="text"
          value={isSearching ? value : (selected ? selected.displayName : value)}
          onChange={(e) => onChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Search for a player..."}
          className="flex-1 bg-transparent text-fab-text text-sm placeholder:text-fab-dim focus:outline-none min-w-0"
        />
        {selected && !isSearching && (
          <button
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="text-fab-dim hover:text-fab-text transition-colors p-0.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {showDropdown && (
        <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-fab-surface border border-fab-border rounded-lg overflow-hidden shadow-lg max-h-64 overflow-y-auto">
          {results.map((e, i) => {
            const hero = e.topHero ? getHeroByName(e.topHero) : undefined;
            return (
              <button
                key={e.userId}
                onMouseDown={() => { onSelect(e); setIsSearching(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${i === hlIndex ? "bg-fab-gold/10" : "hover:bg-fab-surface-hover"}`}
              >
                {e.photoUrl ? (
                  <img src={e.photoUrl} alt="" className="w-7 h-7 rounded-full shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-fab-gold/20 flex items-center justify-center text-fab-gold text-xs font-bold shrink-0">
                    {e.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-fab-text truncate">{e.displayName}</p>
                  <div className="flex items-center gap-2 text-[10px] text-fab-dim">
                    <span>@{e.username}</span>
                    <span>{e.winRate.toFixed(0)}% WR</span>
                    <span>{e.totalMatches + e.totalByes} matches</span>
                  </div>
                </div>
                {hero && <HeroClassIcon heroClass={hero.classes[0]} size="sm" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Crown Badge ──

function CrownBadge() {
  return (
    <span className="inline-flex items-center ml-1" style={{ animation: "pop-in 0.4s ease-out" }}>
      <svg className="w-3.5 h-3.5 text-fab-gold" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 2l2.5 4 4.5 1-3 3.5.5 4.5L10 13l-4.5 2 .5-4.5-3-3.5 4.5-1z" />
      </svg>
    </span>
  );
}

// ── Comparison View ──

type StatRow = { label: string; v1: string | number; v2: string | number; better: 1 | 2 | 0; raw1?: number; raw2?: number; weight: number };
type StatSection = { title: string; rows: StatRow[] };

function ComparisonView({ p1, p2, allEntries }: { p1: LeaderboardEntry; p2: LeaderboardEntry; allEntries: LeaderboardEntry[] }) {
  const [showShareModal, setShowShareModal] = useState(false);
  const [scoreMode, setScoreMode] = useState<"categories" | "points">("categories");
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Power levels
  const p1Power = useMemo(() => computePowerLevel(p1), [p1]);
  const p2Power = useMemo(() => computePowerLevel(p2), [p2]);
  const p1Tier = getPowerTier(p1Power);
  const p2Tier = getPowerTier(p2Power);

  // Rank badges
  const p1Rank = useMemo(() => getBestRank(computeUserRanks(allEntries, p1.userId)), [allEntries, p1.userId]);
  const p2Rank = useMemo(() => getBestRank(computeUserRanks(allEntries, p2.userId)), [allEntries, p2.userId]);

  // Head-to-head record
  const [h2h, setH2h] = useState<{ p1Wins: number; p2Wins: number; draws: number; total: number } | null>(null);
  const [h2hLoading, setH2hLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setH2hLoading(true);
    setH2h(null);

    (async () => {
      try {
        const precomputed = await getH2H(p1.userId, p2.userId);
        if (cancelled) return;

        if (precomputed && precomputed.total > 0) {
          const sorted = [p1.userId, p2.userId].sort();
          const p1IsFirst = p1.userId === sorted[0];
          setH2h({
            p1Wins: p1IsFirst ? precomputed.p1Wins : precomputed.p2Wins,
            p2Wins: p1IsFirst ? precomputed.p2Wins : precomputed.p1Wins,
            draws: precomputed.draws,
            total: precomputed.total,
          });
          setH2hLoading(false);
          return;
        }

        const [p1Matches, p2Matches, p1Profile, p2Profile] = await Promise.all([
          getMatchesByUserId(p1.userId).catch(() => [] as MatchRecord[]),
          getMatchesByUserId(p2.userId).catch(() => [] as MatchRecord[]),
          getProfile(p1.userId).catch(() => null),
          getProfile(p2.userId).catch(() => null),
        ]);
        if (cancelled) return;

        const p1GemId = p1Profile?.gemId;
        const p2GemId = p2Profile?.gemId;
        let p1VsP2: MatchRecord[] = [];
        let p2VsP1: MatchRecord[] = [];

        if (p2GemId) {
          p1VsP2 = p1Matches.filter((m) => m.opponentGemId === p2GemId);
        }
        if (p1GemId) {
          p2VsP1 = p2Matches.filter((m) => m.opponentGemId === p1GemId);
        }

        if (p1VsP2.length === 0 && p2VsP1.length === 0) {
          const p2Names = new Set([normalizeOpponentName(p2.displayName), p2.username.toLowerCase()]);
          const p1Names = new Set([normalizeOpponentName(p1.displayName), p1.username.toLowerCase()]);
          if (p1Profile?.firstName && p1Profile?.lastName) {
            p1Names.add(`${p1Profile.firstName} ${p1Profile.lastName}`.toLowerCase());
            p1Names.add(`${p1Profile.lastName}, ${p1Profile.firstName}`.toLowerCase());
          }
          if (p2Profile?.firstName && p2Profile?.lastName) {
            p2Names.add(`${p2Profile.firstName} ${p2Profile.lastName}`.toLowerCase());
            p2Names.add(`${p2Profile.lastName}, ${p2Profile.firstName}`.toLowerCase());
          }

          p1VsP2 = p1Matches.filter((m) => m.opponentName && p2Names.has(normalizeOpponentName(m.opponentName)));
          p2VsP1 = p2Matches.filter((m) => m.opponentName && p1Names.has(normalizeOpponentName(m.opponentName)));
        }

        let p1W = 0, p2W = 0, dr = 0;
        if (p1VsP2.length >= p2VsP1.length) {
          for (const m of p1VsP2) {
            if (m.result === MatchResult.Win) p1W++;
            else if (m.result === MatchResult.Loss) p2W++;
            else if (m.result === MatchResult.Draw) dr++;
          }
        } else {
          for (const m of p2VsP1) {
            if (m.result === MatchResult.Win) p2W++;
            else if (m.result === MatchResult.Loss) p1W++;
            else if (m.result === MatchResult.Draw) dr++;
          }
        }

        const total = p1W + p2W + dr;
        if (total > 0) {
          setH2h({ p1Wins: p1W, p2Wins: p2W, draws: dr, total });
        }
      } catch { /* profiles might not be public */ }
      if (!cancelled) setH2hLoading(false);
    })();

    return () => { cancelled = true; };
  }, [p1.userId, p1.displayName, p1.username, p2.userId, p2.displayName, p2.username]);

  // Current week/month for checking freshness
  const currentWeekStart = useMemo(() => getWeekStart(), []);
  const currentMonthStart = useMemo(() => getMonthStart(), []);

  // ── Build stat sections ──
  const sections: StatSection[] = useMemo(() => {
    function cmp(a: number, b: number): 1 | 2 | 0 { return a > b ? 1 : b > a ? 2 : 0; }

    const core: StatRow[] = [
      {
        label: "Win Rate",
        v1: `${p1.winRate.toFixed(1)}%`, v2: `${p2.winRate.toFixed(1)}%`,
        better: cmp(p1.winRate, p2.winRate),
        raw1: p1.winRate, raw2: p2.winRate, weight: 3,
      },
      {
        label: "Total Matches",
        v1: p1.totalMatches + p1.totalByes, v2: p2.totalMatches + p2.totalByes,
        better: cmp(p1.totalMatches + p1.totalByes, p2.totalMatches + p2.totalByes),
        raw1: p1.totalMatches + p1.totalByes, raw2: p2.totalMatches + p2.totalByes, weight: 1,
      },
      {
        label: "Record",
        v1: `${p1.totalWins}W-${p1.totalLosses}L${p1.totalDraws > 0 ? `-${p1.totalDraws}D` : ""}`,
        v2: `${p2.totalWins}W-${p2.totalLosses}L${p2.totalDraws > 0 ? `-${p2.totalDraws}D` : ""}`,
        better: 0, weight: 0,
      },
    ];

    const competitive: StatRow[] = [
      {
        label: "Event Wins",
        v1: p1.eventWins, v2: p2.eventWins,
        better: cmp(p1.eventWins, p2.eventWins),
        raw1: p1.eventWins, raw2: p2.eventWins, weight: 3,
      },
      {
        label: "Events Played",
        v1: p1.eventsPlayed, v2: p2.eventsPlayed,
        better: cmp(p1.eventsPlayed, p2.eventsPlayed),
        raw1: p1.eventsPlayed, raw2: p2.eventsPlayed, weight: 1,
      },
      {
        label: "Top 8 Finishes",
        v1: p1.totalTop8s ?? 0, v2: p2.totalTop8s ?? 0,
        better: cmp(p1.totalTop8s ?? 0, p2.totalTop8s ?? 0),
        raw1: p1.totalTop8s ?? 0, raw2: p2.totalTop8s ?? 0, weight: 2.5,
      },
      {
        label: "Earnings",
        v1: (p1.earnings ?? 0) > 0 ? `$${(p1.earnings!).toLocaleString()}` : "---",
        v2: (p2.earnings ?? 0) > 0 ? `$${(p2.earnings!).toLocaleString()}` : "---",
        better: cmp(p1.earnings ?? 0, p2.earnings ?? 0),
        raw1: p1.earnings ?? 0, raw2: p2.earnings ?? 0, weight: 2,
      },
    ];

    // Current streak display
    const p1StreakStr = p1.currentStreakType ? `${p1.currentStreakType === "win" ? "W" : "L"}${p1.currentStreakCount}` : "---";
    const p2StreakStr = p2.currentStreakType ? `${p2.currentStreakType === "win" ? "W" : "L"}${p2.currentStreakCount}` : "---";
    const p1StreakVal = p1.currentStreakType === "win" ? p1.currentStreakCount : p1.currentStreakType === "loss" ? -p1.currentStreakCount : 0;
    const p2StreakVal = p2.currentStreakType === "win" ? p2.currentStreakCount : p2.currentStreakType === "loss" ? -p2.currentStreakCount : 0;

    // Monthly data checks
    const p1HasMonthly = p1.monthStart === currentMonthStart && (p1.monthlyMatches ?? 0) >= 5;
    const p2HasMonthly = p2.monthStart === currentMonthStart && (p2.monthlyMatches ?? 0) >= 5;

    // Weekly data
    const p1HasWeekly = p1.weekStart === currentWeekStart && p1.weeklyMatches > 0;
    const p2HasWeekly = p2.weekStart === currentWeekStart && p2.weeklyMatches > 0;
    const p1WeekStr = p1HasWeekly ? `${p1.weeklyWins}W / ${p1.weeklyMatches}` : "---";
    const p2WeekStr = p2HasWeekly ? `${p2.weeklyWins}W / ${p2.weeklyMatches}` : "---";

    const streaks: StatRow[] = [
      {
        label: "Longest Win Streak",
        v1: p1.longestWinStreak, v2: p2.longestWinStreak,
        better: cmp(p1.longestWinStreak, p2.longestWinStreak),
        raw1: p1.longestWinStreak, raw2: p2.longestWinStreak, weight: 2,
      },
      {
        label: "Current Streak",
        v1: p1StreakStr, v2: p2StreakStr,
        better: cmp(p1StreakVal, p2StreakVal),
        raw1: p1StreakVal > 0 ? p1StreakVal : undefined, raw2: p2StreakVal > 0 ? p2StreakVal : undefined, weight: 1.5,
      },
      {
        label: "Rated Win Streak",
        v1: p1.ratedWinStreak, v2: p2.ratedWinStreak,
        better: cmp(p1.ratedWinStreak, p2.ratedWinStreak),
        raw1: p1.ratedWinStreak, raw2: p2.ratedWinStreak, weight: 1.5,
      },
      {
        label: "Monthly Win Rate",
        v1: p1HasMonthly ? `${p1.monthlyWinRate.toFixed(1)}%` : "---",
        v2: p2HasMonthly ? `${p2.monthlyWinRate.toFixed(1)}%` : "---",
        better: (p1HasMonthly && p2HasMonthly) ? cmp(p1.monthlyWinRate, p2.monthlyWinRate) : 0,
        raw1: p1HasMonthly ? p1.monthlyWinRate : undefined, raw2: p2HasMonthly ? p2.monthlyWinRate : undefined, weight: 1.5,
      },
      {
        label: "Weekly Activity",
        v1: p1WeekStr, v2: p2WeekStr,
        better: 0, weight: 0,
      },
    ];

    const formats: StatRow[] = [
      {
        label: "Rated Win Rate",
        v1: p1.ratedMatches > 0 ? `${p1.ratedWinRate.toFixed(1)}%` : "---",
        v2: p2.ratedMatches > 0 ? `${p2.ratedWinRate.toFixed(1)}%` : "---",
        better: (p1.ratedMatches > 0 && p2.ratedMatches > 0) ? cmp(p1.ratedWinRate, p2.ratedWinRate) : 0,
        raw1: p1.ratedMatches > 0 ? p1.ratedWinRate : undefined,
        raw2: p2.ratedMatches > 0 ? p2.ratedWinRate : undefined, weight: 2,
      },
      {
        label: "Armory Win Rate",
        v1: p1.armoryMatches > 0 ? `${p1.armoryWinRate.toFixed(1)}%` : "---",
        v2: p2.armoryMatches > 0 ? `${p2.armoryWinRate.toFixed(1)}%` : "---",
        better: (p1.armoryMatches > 0 && p2.armoryMatches > 0) ? cmp(p1.armoryWinRate, p2.armoryWinRate) : 0,
        raw1: p1.armoryMatches > 0 ? p1.armoryWinRate : undefined,
        raw2: p2.armoryMatches > 0 ? p2.armoryWinRate : undefined, weight: 1.5,
      },
      {
        label: "Unique Heroes",
        v1: p1.uniqueHeroes, v2: p2.uniqueHeroes,
        better: cmp(p1.uniqueHeroes, p2.uniqueHeroes),
        raw1: p1.uniqueHeroes, raw2: p2.uniqueHeroes, weight: 1,
      },
    ];

    return [
      { title: "Core Stats", rows: core },
      { title: "Competitive", rows: competitive },
      { title: "Streaks & Momentum", rows: streaks },
      { title: "Format Breakdown", rows: formats },
    ];
  }, [p1, p2, currentWeekStart, currentMonthStart]);

  // Flatten for scoring
  const allStats = useMemo(() => sections.flatMap((s) => s.rows), [sections]);

  // H2H stat row
  const h2hStatRow: StatRow | null = useMemo(() => {
    if (h2hLoading) return { label: "H2H Record", v1: "...", v2: "...", better: 0 as const, weight: 0 };
    if (h2h && h2h.total > 0) return {
      label: "H2H Record",
      v1: `${h2h.p1Wins}W-${h2h.p2Wins}L${h2h.draws > 0 ? `-${h2h.draws}D` : ""}`,
      v2: `${h2h.p2Wins}W-${h2h.p1Wins}L${h2h.draws > 0 ? `-${h2h.draws}D` : ""}`,
      better: h2h.p1Wins > h2h.p2Wins ? 1 : h2h.p2Wins > h2h.p1Wins ? 2 : 0,
      raw1: h2h.p1Wins, raw2: h2h.p2Wins, weight: 4,
    };
    return null;
  }, [h2h, h2hLoading]);

  const scoringStats = useMemo(() => [...allStats, ...(h2hStatRow && h2hStatRow.weight > 0 ? [h2hStatRow] : [])], [allStats, h2hStatRow]);

  const p1Wins = scoringStats.filter((s) => s.better === 1).length;
  const p2Wins = scoringStats.filter((s) => s.better === 2).length;

  type DomBreakdown = { label: string; p1Pts: number; p2Pts: number; weight: number; maxPts: number };
  const { p1Points, p2Points, breakdown } = useMemo(() => {
    let s1 = 0, s2 = 0;
    const rows: DomBreakdown[] = [];
    for (const stat of scoringStats) {
      if (stat.raw1 === undefined || stat.raw2 === undefined || stat.weight === 0) continue;
      const total = stat.raw1 + stat.raw2;
      let r1: number, r2: number;
      if (total === 0) { r1 = 5 * stat.weight; r2 = 5 * stat.weight; }
      else { r1 = (stat.raw1 / total) * 10 * stat.weight; r2 = (stat.raw2 / total) * 10 * stat.weight; }
      s1 += r1; s2 += r2;
      rows.push({ label: stat.label, p1Pts: Math.round(r1 * 10) / 10, p2Pts: Math.round(r2 * 10) / 10, weight: stat.weight, maxPts: 10 * stat.weight });
    }
    return { p1Points: Math.round(s1 * 10) / 10, p2Points: Math.round(s2 * 10) / 10, breakdown: rows };
  }, [scoringStats]);

  const hero1 = p1.topHero ? getHeroByName(p1.topHero) : undefined;
  const hero2 = p2.topHero ? getHeroByName(p2.topHero) : undefined;

  // For share card
  const shareStats = scoringStats.map((s) => ({ label: s.label, v1: s.v1, v2: s.v2, better: s.better }));

  return (
    <div>
      {/* ── Battle Arena Header ── */}
      <div className="bg-fab-surface border border-fab-border rounded-xl p-5 mb-4">
        <div className="flex items-center justify-center gap-4 sm:gap-8">
          {/* Player 1 */}
          <div className="text-center flex-1 min-w-0">
            <Link href={`/player/${p1.username}`} className="hover:opacity-80 transition-opacity inline-block">
              <div className={`w-18 h-18 sm:w-20 sm:h-20 rounded-full mx-auto mb-2 p-[3px] ${p1Rank ? rankBorderClass(p1Rank) : ""}`}>
                {p1.photoUrl ? (
                  <img src={p1.photoUrl} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <div className="w-full h-full rounded-full bg-fab-gold/20 flex items-center justify-center text-fab-gold text-2xl font-bold">
                    {p1.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <p className="font-bold text-fab-text text-sm truncate">{p1.displayName}</p>
            </Link>
            <p className="text-xs text-fab-dim mt-0.5">{p1.totalMatches + p1.totalByes} matches</p>
            {/* Power Level */}
            <div className="mt-2">
              <span className={`text-2xl font-black bg-gradient-to-r ${p1Tier.color} bg-clip-text text-transparent`}>{p1Power}</span>
              <p className={`text-[10px] font-semibold ${p1Tier.textColor}`}>{p1Tier.label}</p>
            </div>
          </div>

          {/* VS */}
          <div className="shrink-0 text-center">
            <div className="text-3xl font-black text-fab-gold" style={{ animation: "vs-pulse 2s ease-in-out infinite" }}>VS</div>
            <p className="text-lg font-black mt-1">
              <span className="text-blue-400">{scoreMode === "categories" ? p1Wins : p1Points}</span>
              <span className="text-fab-dim mx-1">-</span>
              <span className="text-red-400">{scoreMode === "categories" ? p2Wins : p2Points}</span>
            </p>
            <p className="text-[10px] text-fab-dim">{scoreMode === "categories" ? "categories" : "points"}</p>
          </div>

          {/* Player 2 */}
          <div className="text-center flex-1 min-w-0">
            <Link href={`/player/${p2.username}`} className="hover:opacity-80 transition-opacity inline-block">
              <div className={`w-18 h-18 sm:w-20 sm:h-20 rounded-full mx-auto mb-2 p-[3px] ${p2Rank ? rankBorderClass(p2Rank) : ""}`}>
                {p2.photoUrl ? (
                  <img src={p2.photoUrl} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <div className="w-full h-full rounded-full bg-fab-gold/20 flex items-center justify-center text-fab-gold text-2xl font-bold">
                    {p2.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <p className="font-bold text-fab-text text-sm truncate">{p2.displayName}</p>
            </Link>
            <p className="text-xs text-fab-dim mt-0.5">{p2.totalMatches + p2.totalByes} matches</p>
            {/* Power Level */}
            <div className="mt-2">
              <span className={`text-2xl font-black bg-gradient-to-r ${p2Tier.color} bg-clip-text text-transparent`}>{p2Power}</span>
              <p className={`text-[10px] font-semibold ${p2Tier.textColor}`}>{p2Tier.label}</p>
            </div>
          </div>
        </div>

        {/* Top Heroes */}
        <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-fab-border/50">
          <div className="flex items-center justify-center gap-2">
            {hero1 && <HeroClassIcon heroClass={hero1.classes[0]} size="sm" />}
            <div className="text-center">
              <p className="text-xs font-semibold text-fab-text">{p1.topHero || "---"}</p>
              <p className="text-[10px] text-fab-dim">{p1.topHeroMatches} matches</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2">
            {hero2 && <HeroClassIcon heroClass={hero2.classes[0]} size="sm" />}
            <div className="text-center">
              <p className="text-xs font-semibold text-fab-text">{p2.topHero || "---"}</p>
              <p className="text-[10px] text-fab-dim">{p2.topHeroMatches} matches</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Score Mode Toggle ── */}
      <div className="flex items-center justify-center mb-4">
        <div className="flex bg-fab-bg rounded-full p-0.5 border border-fab-border">
          <button
            onClick={() => setScoreMode("categories")}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
              scoreMode === "categories" ? "bg-fab-gold/20 text-fab-gold" : "text-fab-dim hover:text-fab-muted"
            }`}
          >
            Categories Won
          </button>
          <button
            onClick={() => setScoreMode("points")}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
              scoreMode === "points" ? "bg-fab-gold/20 text-fab-gold" : "text-fab-dim hover:text-fab-muted"
            }`}
          >
            Dominance Score
          </button>
        </div>
      </div>

      {/* ── Stats Table with Sections ── */}
      <div className="space-y-3">
        {sections.map((section) => (
          <div key={section.title} className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
            {/* Section header */}
            <div className="px-4 py-2 border-b border-fab-gold/20 bg-fab-bg">
              <p className="text-[10px] text-fab-gold uppercase tracking-wider font-semibold">{section.title}</p>
            </div>
            {section.rows.map((stat, i) => {
              const barTotal = (stat.raw1 ?? 0) + (stat.raw2 ?? 0);
              const p1Pct = barTotal > 0 && stat.raw1 !== undefined && stat.raw2 !== undefined ? (stat.raw1 / barTotal) * 100 : 50;
              const showBars = stat.raw1 !== undefined && stat.raw2 !== undefined && barTotal > 0;

              return (
                <div
                  key={stat.label}
                  className={`relative grid grid-cols-[1fr_auto_1fr] items-center px-4 py-3 ${i > 0 ? "border-t border-fab-border/50" : ""}`}
                  style={{ animation: `fade-in-up 0.3s ease-out ${i * 0.06}s both` }}
                >
                  {/* Background comparison bars */}
                  {showBars && (
                    <>
                      <div className="absolute inset-y-0 left-0 bg-blue-500/[0.06]" style={{ width: `${Math.min(p1Pct, 50)}%` }} />
                      <div className="absolute inset-y-0 right-0 bg-red-500/[0.06]" style={{ width: `${Math.min(100 - p1Pct, 50)}%` }} />
                    </>
                  )}

                  {/* P1 value */}
                  <div className={`relative text-sm font-semibold text-right ${stat.better === 1 ? "text-blue-400" : "text-fab-text"}`}>
                    {stat.better === 1 && stat.weight > 0 && <CrownBadge />}
                    {renderStatValue(stat.v1, stat.label, 1)}
                  </div>

                  {/* Label */}
                  <div className="relative text-center px-3">
                    <p className="text-xs text-fab-muted whitespace-nowrap">{stat.label}</p>
                  </div>

                  {/* P2 value */}
                  <div className={`relative text-sm font-semibold text-left ${stat.better === 2 ? "text-red-400" : "text-fab-text"}`}>
                    {renderStatValue(stat.v2, stat.label, 2)}
                    {stat.better === 2 && stat.weight > 0 && <CrownBadge />}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* ── H2H Arena ── */}
      <H2HArena p1={p1} p2={p2} h2h={h2h} h2hLoading={h2hLoading} />

      {/* ── Hero Roster ── */}
      <HeroRoster p1={p1} p2={p2} />

      {/* ── Nemesis Corner ── */}
      {(p1.nemesis || p2.nemesis) && (
        <div className="mt-4">
          <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
            <div className="px-4 py-2 border-b border-fab-gold/20 bg-fab-bg">
              <p className="text-[10px] text-fab-gold uppercase tracking-wider font-semibold">Nemesis Corner</p>
            </div>
            <div className="grid grid-cols-2 divide-x divide-fab-border/50">
              <NemesisCard name={p1.displayName} nemesis={p1.nemesis} winRate={p1.nemesisWinRate} matches={p1.nemesisMatches} />
              <NemesisCard name={p2.displayName} nemesis={p2.nemesis} winRate={p2.nemesisWinRate} matches={p2.nemesisMatches} />
            </div>
          </div>
        </div>
      )}

      {/* Dominance Breakdown */}
      {scoreMode === "points" && (
        <DominanceBreakdown
          breakdown={breakdown}
          p1Points={p1Points}
          p2Points={p2Points}
          showBreakdown={showBreakdown}
          setShowBreakdown={setShowBreakdown}
        />
      )}

      {/* ── Verdict ── */}
      <Verdict p1={p1} p2={p2} p1Wins={p1Wins} p2Wins={p2Wins} p1Points={p1Points} p2Points={p2Points} h2h={h2h} p1Power={p1Power} p2Power={p2Power} />

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
          stats={shareStats}
          p1CategoryWins={p1Wins}
          p2CategoryWins={p2Wins}
          p1Points={p1Points}
          p2Points={p2Points}
          p1PowerLevel={p1Power}
          p2PowerLevel={p2Power}
          scoreMode={scoreMode}
          h2h={h2h}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}

// ── Stat value renderer (streak pills, etc) ──

function renderStatValue(v: string | number, label: string, _side: 1 | 2) {
  const str = String(v);
  if (label === "Current Streak" && str !== "---" && str !== "...") {
    const isWin = str.startsWith("W");
    return (
      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
        isWin ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
      }`}>
        {str}
      </span>
    );
  }
  return <span>{v}</span>;
}

// ── H2H Arena ──

function H2HArena({ p1, p2, h2h, h2hLoading }: {
  p1: LeaderboardEntry; p2: LeaderboardEntry;
  h2h: { p1Wins: number; p2Wins: number; draws: number; total: number } | null;
  h2hLoading: boolean;
}) {
  return (
    <div className="mt-4 bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
      <div className="px-4 py-2 border-b border-fab-gold/20 bg-fab-bg">
        <p className="text-[10px] text-fab-gold uppercase tracking-wider font-semibold">Head-to-Head Arena</p>
      </div>
      <div className="p-4">
        {h2hLoading && (
          <div className="flex items-center justify-center gap-3 py-4">
            <div className="h-10 w-16 bg-fab-bg rounded animate-pulse" />
            <div className="h-6 w-8 bg-fab-bg rounded animate-pulse" />
            <div className="h-10 w-16 bg-fab-bg rounded animate-pulse" />
          </div>
        )}
        {!h2hLoading && h2h && h2h.total > 0 && (
          <>
            {/* Big numbers */}
            <div className="flex items-center justify-center gap-6">
              <div className="text-center">
                <p className={`text-4xl font-black ${h2h.p1Wins > h2h.p2Wins ? "text-blue-400" : "text-fab-text"}`}>{h2h.p1Wins}</p>
                <p className="text-[10px] text-fab-dim mt-1">wins</p>
              </div>
              {h2h.draws > 0 && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-fab-dim">{h2h.draws}</p>
                  <p className="text-[10px] text-fab-dim mt-1">draws</p>
                </div>
              )}
              <div className="text-center">
                <p className={`text-4xl font-black ${h2h.p2Wins > h2h.p1Wins ? "text-red-400" : "text-fab-text"}`}>{h2h.p2Wins}</p>
                <p className="text-[10px] text-fab-dim mt-1">wins</p>
              </div>
            </div>

            {/* Win rate bar */}
            <div className="mt-3 h-2.5 rounded-full overflow-hidden flex bg-fab-bg">
              <div className="bg-blue-500 transition-all" style={{ width: `${(h2h.p1Wins / h2h.total) * 100}%` }} />
              {h2h.draws > 0 && <div className="bg-fab-dim transition-all" style={{ width: `${(h2h.draws / h2h.total) * 100}%` }} />}
              <div className="bg-red-500 transition-all" style={{ width: `${(h2h.p2Wins / h2h.total) * 100}%` }} />
            </div>

            {/* Series leader text */}
            <p className="text-center text-xs text-fab-muted mt-2">
              {h2h.p1Wins > h2h.p2Wins
                ? `${p1.displayName} leads the series ${h2h.p1Wins}-${h2h.p2Wins}`
                : h2h.p2Wins > h2h.p1Wins
                  ? `${p2.displayName} leads the series ${h2h.p2Wins}-${h2h.p1Wins}`
                  : "Series is tied"}
              {` \u00B7 ${h2h.total} game${h2h.total !== 1 ? "s" : ""} played`}
            </p>
          </>
        )}
        {!h2hLoading && (!h2h || h2h.total === 0) && (
          <div className="text-center py-4">
            <SwordsIcon className="w-8 h-8 text-fab-dim/30 mx-auto mb-2" />
            <p className="text-sm text-fab-dim">No head-to-head matches found</p>
            <p className="text-[10px] text-fab-dim/60 mt-1">These players haven&apos;t faced each other yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Hero Roster ──

function HeroRoster({ p1, p2 }: { p1: LeaderboardEntry; p2: LeaderboardEntry }) {
  const p1Heroes = (p1.heroBreakdown ?? []).slice(0, 5);
  const p2Heroes = (p2.heroBreakdown ?? []).slice(0, 5);

  if (p1Heroes.length === 0 && p2Heroes.length === 0) return null;

  return (
    <div className="mt-4 bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
      <div className="px-4 py-2 border-b border-fab-gold/20 bg-fab-bg">
        <p className="text-[10px] text-fab-gold uppercase tracking-wider font-semibold">Hero Roster</p>
      </div>
      <div className="grid grid-cols-2 divide-x divide-fab-border/50">
        <div className="p-3 space-y-1.5">
          {p1Heroes.map((h) => {
            const heroData = getHeroByName(h.hero);
            return (
              <div key={h.hero} className="flex items-center gap-2">
                {heroData && <HeroClassIcon heroClass={heroData.classes[0]} size="sm" />}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-fab-text truncate">{h.hero}</p>
                  <p className="text-[10px] text-fab-dim">{h.matches}m &middot; {h.winRate.toFixed(0)}%</p>
                </div>
              </div>
            );
          })}
          {p1Heroes.length === 0 && <p className="text-xs text-fab-dim text-center py-3">No hero data</p>}
        </div>
        <div className="p-3 space-y-1.5">
          {p2Heroes.map((h) => {
            const heroData = getHeroByName(h.hero);
            return (
              <div key={h.hero} className="flex items-center gap-2">
                {heroData && <HeroClassIcon heroClass={heroData.classes[0]} size="sm" />}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-fab-text truncate">{h.hero}</p>
                  <p className="text-[10px] text-fab-dim">{h.matches}m &middot; {h.winRate.toFixed(0)}%</p>
                </div>
              </div>
            );
          })}
          {p2Heroes.length === 0 && <p className="text-xs text-fab-dim text-center py-3">No hero data</p>}
        </div>
      </div>
    </div>
  );
}

// ── Nemesis Card ──

function NemesisCard({ name, nemesis, winRate, matches }: { name: string; nemesis?: string; winRate?: number; matches?: number }) {
  return (
    <div className="p-3 text-center">
      {nemesis ? (
        <>
          <p className="text-[10px] text-fab-dim">{name}&apos;s Nemesis</p>
          <p className="text-sm font-bold text-red-400 mt-1">{nemesis}</p>
          <p className="text-[10px] text-fab-dim mt-0.5">
            {winRate !== undefined ? `${winRate.toFixed(0)}% WR` : ""}
            {matches ? ` in ${matches} matches` : ""}
          </p>
        </>
      ) : (
        <p className="text-xs text-fab-dim py-2">No nemesis</p>
      )}
    </div>
  );
}

// ── Dominance Breakdown ──

function DominanceBreakdown({ breakdown, p1Points, p2Points, showBreakdown, setShowBreakdown }: {
  breakdown: { label: string; p1Pts: number; p2Pts: number; weight: number; maxPts: number }[];
  p1Points: number; p2Points: number;
  showBreakdown: boolean; setShowBreakdown: (v: boolean) => void;
}) {
  return (
    <div className="mt-3">
      <button
        onClick={() => setShowBreakdown(!showBreakdown)}
        className="flex items-center gap-1.5 text-xs text-fab-muted hover:text-fab-gold transition-colors mx-auto"
      >
        <svg className={`w-3.5 h-3.5 transition-transform ${showBreakdown ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
        {showBreakdown ? "Hide" : "Show"} scoring breakdown
      </button>
      {showBreakdown && (
        <div className="mt-2 bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
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
          <div className="grid grid-cols-[1fr_60px_40px_60px] items-center px-3 py-2 border-t border-fab-border bg-fab-bg">
            <p className="text-xs font-semibold text-fab-text">Total</p>
            <p className={`text-xs font-bold text-center ${p1Points > p2Points ? "text-blue-400" : "text-fab-text"}`}>{p1Points}</p>
            <p className="text-[10px] text-fab-dim text-center">{breakdown.reduce((s, r) => s + r.maxPts, 0)}</p>
            <p className={`text-xs font-bold text-center ${p2Points > p1Points ? "text-red-400" : "text-fab-text"}`}>{p2Points}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Verdict ──

function getVerdictTitle(p1: LeaderboardEntry, p2: LeaderboardEntry, p1Points: number, p2Points: number): { title: string; subtitle: string; borderStyle: string } {
  const totalPoints = p1Points + p2Points;
  const pointDiff = Math.abs(p1Points - p2Points);
  const margin = totalPoints > 0 ? (pointDiff / totalPoints) * 100 : 0;
  const winner = p1Points > p2Points ? p1 : p2;

  if (margin < 1) return { title: "MIRROR MATCH!", subtitle: "These two are carbon copies", borderStyle: "border-fab-gold/40" };
  if (margin < 5) return { title: "TOO CLOSE TO CALL!", subtitle: "This rivalry is just heating up", borderStyle: "border-fab-gold/30" };
  if (margin < 12) return { title: `${winner.displayName} edges it out`, subtitle: "A close battle with a slim advantage", borderStyle: "border-fab-gold/40" };
  if (margin < 20) return { title: `${winner.displayName} FLEXES`, subtitle: "A convincing display of dominance", borderStyle: "border-fab-gold/50 shadow-lg shadow-fab-gold/5" };
  return { title: `${winner.displayName} OBLITERATES`, subtitle: "Playing in a different league entirely", borderStyle: "border-fab-gold/60 shadow-lg shadow-fab-gold/10" };
}

function getVerdictBullets(p1: LeaderboardEntry, p2: LeaderboardEntry, p1Wins: number, p2Wins: number, p1Points: number, p2Points: number, h2h: { p1Wins: number; p2Wins: number; draws: number; total: number } | null): string[] {
  const bullets: string[] = [];

  const wrDiff = Math.abs(p1.winRate - p2.winRate);
  if (wrDiff < 2) {
    bullets.push("Win rates are virtually identical");
  } else {
    const better = p1.winRate > p2.winRate ? p1 : p2;
    bullets.push(`${better.displayName} has a ${wrDiff.toFixed(0)}% higher win rate`);
  }

  const p1Total = p1.totalMatches + p1.totalByes;
  const p2Total = p2.totalMatches + p2.totalByes;
  const matchDiff = Math.abs(p1Total - p2Total);
  if (matchDiff > 50) {
    const more = p1Total > p2Total ? p1 : p2;
    bullets.push(`${more.displayName} has ${matchDiff} more matches of experience`);
  }

  const catWinner = p1Wins > p2Wins ? p1 : p2;
  const catMax = Math.max(p1Wins, p2Wins);
  const catMin = Math.min(p1Wins, p2Wins);
  if (catMax > catMin) {
    bullets.push(`${catWinner.displayName} wins ${catMax} categories vs ${catMin}`);
  }

  if (h2h && h2h.total >= 2) {
    if (h2h.p1Wins > h2h.p2Wins) {
      bullets.push(`${p1.displayName} owns the head-to-head ${h2h.p1Wins}-${h2h.p2Wins}`);
    } else if (h2h.p2Wins > h2h.p1Wins) {
      bullets.push(`${p2.displayName} owns the head-to-head ${h2h.p2Wins}-${h2h.p1Wins}`);
    } else {
      bullets.push("Dead even in the head-to-head");
    }
  }

  return bullets;
}

function Verdict({ p1, p2, p1Wins, p2Wins, p1Points, p2Points, h2h, p1Power, p2Power }: {
  p1: LeaderboardEntry; p2: LeaderboardEntry;
  p1Wins: number; p2Wins: number;
  p1Points: number; p2Points: number;
  h2h: { p1Wins: number; p2Wins: number; draws: number; total: number } | null;
  p1Power: number; p2Power: number;
}) {
  const { title, subtitle, borderStyle } = getVerdictTitle(p1, p2, p1Points, p2Points);
  const bullets = getVerdictBullets(p1, p2, p1Wins, p2Wins, p1Points, p2Points, h2h);

  const powerDiff = Math.abs(p1Power - p2Power);
  const powerWinner = p1Power > p2Power ? p1 : p2;

  return (
    <div className={`mt-4 bg-fab-surface border rounded-lg p-4 ${borderStyle}`}>
      <p className="text-[10px] text-fab-gold uppercase tracking-wider font-semibold mb-1">Verdict</p>
      <p className="text-lg font-black text-fab-text leading-tight">{title}</p>
      <p className="text-xs text-fab-muted mt-0.5 mb-3">{subtitle}</p>

      <div className="space-y-1.5">
        {bullets.map((b, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="text-fab-gold mt-0.5 text-xs">&#x2022;</span>
            <p className="text-sm text-fab-text leading-snug">{b}</p>
          </div>
        ))}
        {powerDiff >= 5 && (
          <div className="flex items-start gap-2">
            <span className="text-fab-gold mt-0.5 text-xs">&#x2022;</span>
            <p className="text-sm text-fab-text leading-snug">
              {powerWinner.displayName} has a higher Power Level ({Math.max(p1Power, p2Power)} vs {Math.min(p1Power, p2Power)})
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Share Modal ──

function CompareShareModal({
  p1,
  p2,
  stats,
  p1CategoryWins,
  p2CategoryWins,
  p1Points,
  p2Points,
  p1PowerLevel,
  p2PowerLevel,
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
  p1PowerLevel: number;
  p2PowerLevel: number;
  scoreMode: "categories" | "points";
  h2h: { p1Wins: number; p2Wins: number; draws: number; total: number } | null;
  onClose: () => void;
}) {
  const [selectedTheme, setSelectedTheme] = useState(CARD_THEMES[0]);
  const [shareStatus, setShareStatus] = useState<"idle" | "sharing" | "copied">("idle");
  const cardRef = useRef<HTMLDivElement>(null);

  const { title: verdictTitle } = getVerdictTitle(p1, p2, p1Points, p2Points);

  const compareData = {
    p1Name: p1.displayName,
    p2Name: p2.displayName,
    stats: stats.slice(0, 12),
    p1TopHero: p1.topHero || "",
    p2TopHero: p2.topHero || "",
    p1Matches: p1.totalMatches + p1.totalByes,
    p2Matches: p2.totalMatches + p2.totalByes,
    p1CategoryWins,
    p2CategoryWins,
    p1Dominance: p1Points,
    p2Dominance: p2Points,
    p1PowerLevel,
    p2PowerLevel,
    h2h: h2h ?? undefined,
    verdict: verdictTitle,
  };

  async function handleCopy() {
    const url = `${window.location.origin}/compare?p1=${p1.username}&p2=${p2.username}`;
    setShareStatus("sharing");
    try {
      const { toBlob } = await import("html-to-image");
      const blob = cardRef.current
        ? await toBlob(cardRef.current, { pixelRatio: 2, backgroundColor: selectedTheme.bg })
        : null;

      const isMobile = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      const shareText = `${p1.displayName} vs ${p2.displayName} \u2014 Compare stats on FaB Stats\n${url}`;

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
        <div className="flex items-center justify-between px-4 py-3 border-b border-fab-border">
          <h3 className="text-sm font-semibold text-fab-text">Share Comparison</h3>
          <button onClick={onClose} className="text-fab-muted hover:text-fab-text transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 flex justify-center overflow-x-auto">
          <div ref={cardRef}>
            <CompareCard data={compareData} theme={selectedTheme} />
          </div>
        </div>

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
