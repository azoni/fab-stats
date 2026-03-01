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
import { computePowerLevel, getPowerTier } from "@/lib/power-level";

import { getMatchesByUserId, getProfile } from "@/lib/firestore-storage";
import { normalizeOpponentName, computeOpponentStats } from "@/lib/stats";
import { getH2H } from "@/lib/h2h";
import { getWeekStart, getMonthStart } from "@/lib/leaderboard";
import { MatchResult, type LeaderboardEntry, type MatchRecord, type OpponentStats } from "@/types";

// ── Common Opponents Algorithm ──

interface CommonOpponent {
  name: string;
  p1Wins: number;
  p1Losses: number;
  p1Draws: number;
  p1Total: number;
  p1WinRate: number;
  p2Wins: number;
  p2Losses: number;
  p2Draws: number;
  p2Total: number;
  p2WinRate: number;
  edge: "p1" | "p2" | "both" | "none"; // who has the better record
}

function findCommonOpponents(p1Stats: OpponentStats[], p2Stats: OpponentStats[]): CommonOpponent[] {
  // Build lookup by normalized name for p2
  const p2Map = new Map<string, OpponentStats>();
  for (const opp of p2Stats) {
    p2Map.set(normalizeOpponentName(opp.opponentName), opp);
  }

  const common: CommonOpponent[] = [];
  for (const p1Opp of p1Stats) {
    const norm = normalizeOpponentName(p1Opp.opponentName);
    const p2Opp = p2Map.get(norm);
    if (!p2Opp) continue;

    // Determine edge: who beats this opponent better?
    const p1Better = p1Opp.winRate > p2Opp.winRate;
    const p2Better = p2Opp.winRate > p1Opp.winRate;
    const edge: CommonOpponent["edge"] = p1Better && !p2Better ? "p1" : p2Better && !p1Better ? "p2" : p1Better && p2Better ? "both" : "none";

    common.push({
      name: p1Opp.opponentName,
      p1Wins: p1Opp.wins, p1Losses: p1Opp.losses, p1Draws: p1Opp.draws,
      p1Total: p1Opp.totalMatches, p1WinRate: p1Opp.winRate,
      p2Wins: p2Opp.wins, p2Losses: p2Opp.losses, p2Draws: p2Opp.draws,
      p2Total: p2Opp.totalMatches, p2WinRate: p2Opp.winRate,
      edge,
    });
  }

  // Sort by total matches combined (most relevant first)
  return common.sort((a, b) => (b.p1Total + b.p2Total) - (a.p1Total + a.p2Total));
}

// ── Main Page ──

export default function ComparePage() {
  const searchParams = useSearchParams();
  const { entries, loading } = useLeaderboard();
  const { profile, user, isGuest } = useAuth();

  const p2Param = searchParams.get("p2") || searchParams.get("p1") || "";

  const [search2, setSearch2] = useState(p2Param);
  const [pick2, setPick2] = useState<string>(p2Param);
  const [focused, setFocused] = useState(false);

  const entryMap = useMemo(() => new Map(entries.map((e) => [e.username, e])), [entries]);

  // P1 is always the current user
  const player1 = profile ? entryMap.get(profile.username) : undefined;
  const player2 = entryMap.get(pick2);

  const isAuthenticated = user && !isGuest;

  const filtered2 = useMemo(() => {
    if (!search2.trim()) return [];
    const q = search2.toLowerCase();
    return entries
      .filter((e) => {
        if (profile && e.username === profile.username) return false;
        return e.username.toLowerCase().includes(q) || e.displayName.toLowerCase().includes(q);
      })
      .slice(0, 6);
  }, [entries, search2, profile]);

  function selectPlayer(entry: LeaderboardEntry) {
    setPick2(entry.username);
    setSearch2(entry.displayName);
    setFocused(false);
    const params = new URLSearchParams(window.location.search);
    params.set("p2", entry.username);
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

  if (!isAuthenticated || !profile) {
    return (
      <div className="text-center py-20">
        <SwordsIcon className="w-14 h-14 text-fab-muted/30 mx-auto mb-4" />
        <p className="text-xl font-bold text-fab-text mb-2">Versus</p>
        <p className="text-sm text-fab-dim max-w-xs mx-auto mb-6">Sign in to compare your stats head-to-head against any opponent</p>
        <Link href="/login" className="inline-flex px-6 py-2.5 rounded-lg text-sm font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors">
          Sign In
        </Link>
      </div>
    );
  }

  if (!player1) {
    return (
      <div className="text-center py-20">
        <SwordsIcon className="w-14 h-14 text-fab-muted/30 mx-auto mb-4" />
        <p className="text-xl font-bold text-fab-text mb-2">Versus</p>
        <p className="text-sm text-fab-dim max-w-xs mx-auto">Import some matches first to unlock the Versus arena</p>
      </div>
    );
  }

  const bothSelected = player1 && player2;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-fuchsia-500/10 flex items-center justify-center ring-1 ring-inset ring-fuchsia-500/20">
          <SwordsIcon className="w-4 h-4 text-fuchsia-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-fab-text leading-tight">Versus</h1>
          <p className="text-xs text-fab-muted leading-tight">See how you stack up against any opponent</p>
        </div>
      </div>

      {/* Opponent picker */}
      <div className="mb-6">
        <PlayerPicker
          label="Choose your opponent"
          value={search2}
          onChange={(v) => { setSearch2(v); setPick2(""); }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          results={focused ? filtered2 : []}
          onSelect={selectPlayer}
          onClear={() => { setPick2(""); setSearch2(""); }}
          selected={player2}
          placeholder="Search for an opponent..."
          color="text-red-400"
        />
      </div>

      {/* Comparison */}
      {bothSelected ? (
        <ComparisonView p1={player1} p2={player2} allEntries={entries} />
      ) : (
        <div className="text-center py-16">
          <div className="relative inline-block mb-6">
            {/* Animated VS badge */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-fab-gold/20 to-fab-gold/5 border border-fab-gold/30 flex items-center justify-center mx-auto" style={{ animation: "vs-pulse 3s ease-in-out infinite" }}>
              <SwordsIcon className="w-8 h-8 text-fab-gold/60" />
            </div>
          </div>
          <p className="text-lg font-bold text-fab-text mb-1">Choose Your Opponent</p>
          <p className="text-sm text-fab-dim max-w-xs mx-auto">Search for any player above to enter the arena</p>
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
    <div className="relative max-w-md">
      <p className={`text-xs font-semibold uppercase tracking-wider mb-1.5 ${color}`}>{label}</p>
      <div className={`flex items-center gap-2 bg-fab-surface border rounded-lg px-3 py-2.5 transition-colors ${isSearching ? "border-fab-gold" : "border-fab-border"}`}>
        {selected && !isSearching ? (
          selected.photoUrl ? (
            <img src={selected.photoUrl} alt="" className="w-8 h-8 rounded-full shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-fab-gold/20 flex items-center justify-center text-fab-gold text-sm font-bold shrink-0">
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

  // Common opponents
  const [commonOpponents, setCommonOpponents] = useState<CommonOpponent[]>([]);
  const [commonLoading, setCommonLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setH2hLoading(true);
    setCommonLoading(true);
    setH2h(null);
    setCommonOpponents([]);

    (async () => {
      try {
        // Fetch H2H + matches for common opponents in parallel
        const [precomputed, p1Matches, p2Matches, p1Profile, p2Profile] = await Promise.all([
          getH2H(p1.userId, p2.userId),
          getMatchesByUserId(p1.userId).catch(() => [] as MatchRecord[]),
          getMatchesByUserId(p2.userId).catch(() => [] as MatchRecord[]),
          getProfile(p1.userId).catch(() => null),
          getProfile(p2.userId).catch(() => null),
        ]);
        if (cancelled) return;

        // ── H2H calculation ──
        if (precomputed && precomputed.total > 0) {
          const sorted = [p1.userId, p2.userId].sort();
          const p1IsFirst = p1.userId === sorted[0];
          setH2h({
            p1Wins: p1IsFirst ? precomputed.p1Wins : precomputed.p2Wins,
            p2Wins: p1IsFirst ? precomputed.p2Wins : precomputed.p1Wins,
            draws: precomputed.draws,
            total: precomputed.total,
          });
        } else {
          // Fallback: compute from match records
          const p1GemId = p1Profile?.gemId;
          const p2GemId = p2Profile?.gemId;
          let p1VsP2: MatchRecord[] = [];
          let p2VsP1: MatchRecord[] = [];

          if (p2GemId) p1VsP2 = p1Matches.filter((m) => m.opponentGemId === p2GemId);
          if (p1GemId) p2VsP1 = p2Matches.filter((m) => m.opponentGemId === p1GemId);

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
          if (total > 0) setH2h({ p1Wins: p1W, p2Wins: p2W, draws: dr, total });
        }
        setH2hLoading(false);

        // ── Common opponents ──
        const p1OppStats = computeOpponentStats(p1Matches);
        const p2OppStats = computeOpponentStats(p2Matches);
        const common = findCommonOpponents(p1OppStats, p2OppStats);
        if (!cancelled) setCommonOpponents(common);
      } catch { /* profiles might not be public */ }
      if (!cancelled) {
        setH2hLoading(false);
        setCommonLoading(false);
      }
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

    const p1StreakStr = p1.currentStreakType ? `${p1.currentStreakType === "win" ? "W" : "L"}${p1.currentStreakCount}` : "---";
    const p2StreakStr = p2.currentStreakType ? `${p2.currentStreakType === "win" ? "W" : "L"}${p2.currentStreakCount}` : "---";
    const p1StreakVal = p1.currentStreakType === "win" ? p1.currentStreakCount : p1.currentStreakType === "loss" ? -p1.currentStreakCount : 0;
    const p2StreakVal = p2.currentStreakType === "win" ? p2.currentStreakCount : p2.currentStreakType === "loss" ? -p2.currentStreakCount : 0;

    const p1HasMonthly = p1.monthStart === currentMonthStart && (p1.monthlyMatches ?? 0) >= 5;
    const p2HasMonthly = p2.monthStart === currentMonthStart && (p2.monthlyMatches ?? 0) >= 5;

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

  // Common opponent edges for share card
  const commonEdges = useMemo(() => {
    if (commonOpponents.length === 0) return undefined;
    const edges = commonOpponents.filter((o) => {
      const p1Win = o.p1WinRate >= 50;
      const p2Win = o.p2WinRate >= 50;
      return (p1Win && !p2Win) || (!p1Win && p2Win);
    });
    return {
      shared: commonOpponents.length,
      p1Edges: edges.filter((o) => o.p1WinRate >= 50 && o.p2WinRate < 50).length,
      p2Edges: edges.filter((o) => o.p2WinRate >= 50 && o.p1WinRate < 50).length,
    };
  }, [commonOpponents]);

  // Curated stats for share card — only the most interesting categories
  const keyStatLabels = new Set(["Win Rate", "Total Matches", "Event Wins", "Top 8 Finishes", "Earnings", "Longest Win Streak"]);
  const shareStats = scoringStats
    .filter((s) => keyStatLabels.has(s.label))
    .map((s) => ({ label: s.label, v1: s.v1, v2: s.v2, better: s.better }));

  return (
    <div>
      {/* ── Battle Arena Header ── */}
      <div className="bg-fab-surface border border-fab-border rounded-xl overflow-hidden mb-4" style={{ animation: "fade-in-up 0.4s ease-out" }}>
        {/* Gradient accent bar */}
        <div className="h-1 bg-gradient-to-r from-blue-500 via-fab-gold to-red-500" />

        <div className="p-5">
          <div className="flex items-center justify-center gap-4 sm:gap-8">
            {/* Player 1 (You) */}
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
              <p className="text-[10px] text-fab-muted mt-0.5">You</p>
              <p className="text-xs text-fab-dim">{p1.totalMatches + p1.totalByes} matches</p>
              {/* Power Level */}
              <div className="mt-2">
                <span className={`text-2xl font-black bg-gradient-to-r ${p1Tier.color} bg-clip-text text-transparent`} style={{ animation: "fade-in-up 0.5s ease-out 0.2s both" }}>{p1Power}</span>
                <p className={`text-[10px] font-semibold ${p1Tier.textColor}`}>{p1Tier.label}</p>
              </div>
            </div>

            {/* VS */}
            <div className="shrink-0 text-center">
              <div className="text-3xl font-black text-fab-gold" style={{ animation: "vs-pulse 2s ease-in-out infinite" }}>VS</div>
              <p className="text-lg font-black mt-1">
                <span className="text-blue-400">{p1Points}</span>
                <span className="text-fab-dim mx-1">-</span>
                <span className="text-red-400">{p2Points}</span>
              </p>
              <p className="text-[10px] text-fab-dim">dominance</p>
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
              <p className="text-[10px] text-fab-muted mt-0.5">Opponent</p>
              <p className="text-xs text-fab-dim">{p2.totalMatches + p2.totalByes} matches</p>
              {/* Power Level */}
              <div className="mt-2">
                <span className={`text-2xl font-black bg-gradient-to-r ${p2Tier.color} bg-clip-text text-transparent`} style={{ animation: "fade-in-up 0.5s ease-out 0.3s both" }}>{p2Power}</span>
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
      </div>

      {/* ── Stats Table with Sections ── */}
      <div className="space-y-3">
        {sections.map((section, si) => (
          <div key={section.title} className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden" style={{ animation: `fade-in-up 0.3s ease-out ${0.1 + si * 0.08}s both` }}>
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
                  style={{ animation: `fade-in-up 0.3s ease-out ${0.15 + si * 0.08 + i * 0.04}s both` }}
                >
                  {showBars && (
                    <>
                      <div className="absolute inset-y-0 left-0 bg-blue-500/[0.06]" style={{ width: `${Math.min(p1Pct, 50)}%` }} />
                      <div className="absolute inset-y-0 right-0 bg-red-500/[0.06]" style={{ width: `${Math.min(100 - p1Pct, 50)}%` }} />
                    </>
                  )}

                  <div className={`relative text-sm font-semibold text-right ${stat.better === 1 ? "text-blue-400" : "text-fab-text"}`}>
                    {stat.better === 1 && stat.weight > 0 && <CrownBadge />}
                    {renderStatValue(stat.v1, stat.label)}
                  </div>

                  <div className="relative text-center px-3">
                    <p className="text-xs text-fab-muted whitespace-nowrap">{stat.label}</p>
                  </div>

                  <div className={`relative text-sm font-semibold text-left ${stat.better === 2 ? "text-red-400" : "text-fab-text"}`}>
                    {renderStatValue(stat.v2, stat.label)}
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

      {/* ── Common Opponents Web ── */}
      <CommonOpponentsSection
        p1={p1}
        p2={p2}
        opponents={commonOpponents}
        loading={commonLoading}
      />

      {/* Dominance Breakdown */}
      <DominanceBreakdown
        breakdown={breakdown}
        p1Points={p1Points}
        p2Points={p2Points}
        showBreakdown={showBreakdown}
        setShowBreakdown={setShowBreakdown}
      />

      {/* ── Verdict ── */}
      <Verdict p1={p1} p2={p2} p1Points={p1Points} p2Points={p2Points} h2h={h2h} p1Power={p1Power} p2Power={p2Power} />

      {/* Share button */}
      <div className="mt-4 text-center">
        <button
          onClick={() => setShowShareModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text hover:border-fab-gold/30 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Share Versus
        </button>
      </div>

      {showShareModal && (
        <CompareShareModal
          p1={p1}
          p2={p2}
          stats={shareStats}
          p1Points={p1Points}
          p2Points={p2Points}
          p1PowerLevel={p1Power}
          p2PowerLevel={p2Power}
          h2h={h2h}
          commonEdges={commonEdges}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}

// ── Stat value renderer ──

function renderStatValue(v: string | number, label: string) {
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
    <div className="mt-4 bg-fab-surface border border-fab-border rounded-lg overflow-hidden" style={{ animation: "fade-in-up 0.4s ease-out 0.5s both" }}>
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

            <div className="mt-3 h-2.5 rounded-full overflow-hidden flex bg-fab-bg">
              <div className="bg-blue-500 transition-all duration-700" style={{ width: `${(h2h.p1Wins / h2h.total) * 100}%` }} />
              {h2h.draws > 0 && <div className="bg-fab-dim transition-all duration-700" style={{ width: `${(h2h.draws / h2h.total) * 100}%` }} />}
              <div className="bg-red-500 transition-all duration-700" style={{ width: `${(h2h.p2Wins / h2h.total) * 100}%` }} />
            </div>

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
    <div className="mt-4 bg-fab-surface border border-fab-border rounded-lg overflow-hidden" style={{ animation: "fade-in-up 0.4s ease-out 0.6s both" }}>
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

// ── Common Opponents Section ──

function CommonOpponentsSection({ p1, p2, opponents, loading }: {
  p1: LeaderboardEntry; p2: LeaderboardEntry;
  opponents: CommonOpponent[];
  loading: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <div className="mt-4 bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
        <div className="px-4 py-2 border-b border-fab-gold/20 bg-fab-bg">
          <p className="text-[10px] text-fab-gold uppercase tracking-wider font-semibold">Common Opponents</p>
        </div>
        <div className="p-4 space-y-2">
          {[...Array(3)].map((_, i) => <div key={i} className="h-8 bg-fab-bg rounded animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (opponents.length === 0) {
    return (
      <div className="mt-4 bg-fab-surface border border-fab-border rounded-lg overflow-hidden" style={{ animation: "fade-in-up 0.4s ease-out 0.7s both" }}>
        <div className="px-4 py-2 border-b border-fab-gold/20 bg-fab-bg">
          <p className="text-[10px] text-fab-gold uppercase tracking-wider font-semibold">Common Opponents</p>
        </div>
        <div className="text-center py-6">
          <SwordsIcon className="w-7 h-7 text-fab-dim/30 mx-auto mb-2" />
          <p className="text-sm text-fab-dim">No common opponents found</p>
          <p className="text-[10px] text-fab-dim/60 mt-1">These players haven&apos;t faced any of the same opponents yet</p>
        </div>
      </div>
    );
  }

  // Interesting edges: opponents where one player wins but the other loses
  const edges = opponents.filter((o) => {
    const p1Winning = o.p1WinRate >= 50;
    const p2Winning = o.p2WinRate >= 50;
    return (p1Winning && !p2Winning) || (!p1Winning && p2Winning);
  });

  const p1Edges = edges.filter((o) => o.p1WinRate >= 50 && o.p2WinRate < 50);
  const p2Edges = edges.filter((o) => o.p2WinRate >= 50 && o.p1WinRate < 50);

  const displayOpponents = expanded ? opponents : opponents.slice(0, 8);

  return (
    <div className="mt-4 bg-fab-surface border border-fab-border rounded-lg overflow-hidden" style={{ animation: "fade-in-up 0.4s ease-out 0.7s both" }}>
      <div className="px-4 py-2 border-b border-fab-gold/20 bg-fab-bg">
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-fab-gold uppercase tracking-wider font-semibold">
            Common Opponents
            <span className="text-fab-dim ml-1.5 normal-case tracking-normal">({opponents.length} shared)</span>
          </p>
        </div>
      </div>

      {/* Edge Summary — the transitive comparison */}
      {edges.length > 0 && (
        <div className="px-4 py-3 border-b border-fab-border/50 bg-fab-bg/50">
          <div className="grid grid-cols-2 gap-3">
            {p1Edges.length > 0 && (
              <div className="text-center">
                <p className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider mb-1">
                  {p1.displayName} beats
                </p>
                <p className="text-xs text-fab-dim">
                  {p1Edges.length} opponent{p1Edges.length !== 1 ? "s" : ""} that {p2.displayName.split(" ")[0]} loses to
                </p>
              </div>
            )}
            {p2Edges.length > 0 && (
              <div className="text-center">
                <p className="text-[10px] text-red-400 font-semibold uppercase tracking-wider mb-1">
                  {p2.displayName} beats
                </p>
                <p className="text-xs text-fab-dim">
                  {p2Edges.length} opponent{p2Edges.length !== 1 ? "s" : ""} that {p1.displayName.split(" ")[0]} loses to
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Opponent table */}
      <div>
        {/* Header */}
        <div className="grid grid-cols-[1fr_70px_30px_70px] items-center px-4 py-2 border-b border-fab-border/50 bg-fab-bg/30">
          <p className="text-[10px] text-fab-dim uppercase tracking-wider">Opponent</p>
          <p className="text-[10px] text-blue-400 uppercase tracking-wider text-center">You</p>
          <p className="text-[10px] text-fab-dim text-center">vs</p>
          <p className="text-[10px] text-red-400 uppercase tracking-wider text-center">Them</p>
        </div>

        {displayOpponents.map((opp, i) => {
          const p1Winning = opp.p1WinRate >= 50;
          const p2Winning = opp.p2WinRate >= 50;
          const isEdge = (p1Winning && !p2Winning) || (!p1Winning && p2Winning);

          return (
            <div
              key={opp.name}
              className={`grid grid-cols-[1fr_70px_30px_70px] items-center px-4 py-2 ${i > 0 ? "border-t border-fab-border/30" : ""} ${isEdge ? "bg-fab-gold/[0.03]" : ""}`}
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-fab-text truncate">{opp.name}</p>
                <p className="text-[10px] text-fab-dim">{opp.p1Total + opp.p2Total} total games</p>
              </div>
              <div className="text-center">
                <p className={`text-xs font-semibold ${opp.p1WinRate >= 50 ? "text-blue-400" : "text-fab-text"}`}>
                  {opp.p1Wins}W-{opp.p1Losses}L
                </p>
                <p className="text-[10px] text-fab-dim">{opp.p1WinRate.toFixed(0)}%</p>
              </div>
              <div className="text-center">
                {isEdge && (
                  <span className={`text-xs ${p1Winning ? "text-blue-400" : "text-red-400"}`}>
                    {p1Winning ? "\u25C0" : "\u25B6"}
                  </span>
                )}
              </div>
              <div className="text-center">
                <p className={`text-xs font-semibold ${opp.p2WinRate >= 50 ? "text-red-400" : "text-fab-text"}`}>
                  {opp.p2Wins}W-{opp.p2Losses}L
                </p>
                <p className="text-[10px] text-fab-dim">{opp.p2WinRate.toFixed(0)}%</p>
              </div>
            </div>
          );
        })}
      </div>

      {opponents.length > 8 && (
        <div className="px-4 py-2 border-t border-fab-border/50 text-center">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-fab-muted hover:text-fab-gold transition-colors"
          >
            {expanded ? "Show less" : `Show all ${opponents.length} common opponents`}
          </button>
        </div>
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
            <p className="text-[10px] text-blue-400 uppercase tracking-wider text-center">You</p>
            <p className="text-[10px] text-fab-dim uppercase tracking-wider text-center">Max</p>
            <p className="text-[10px] text-red-400 uppercase tracking-wider text-center">Them</p>
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

function getVerdictBullets(p1: LeaderboardEntry, p2: LeaderboardEntry, p1Points: number, p2Points: number, h2h: { p1Wins: number; p2Wins: number; draws: number; total: number } | null): string[] {
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

function Verdict({ p1, p2, p1Points, p2Points, h2h, p1Power, p2Power }: {
  p1: LeaderboardEntry; p2: LeaderboardEntry;
  p1Points: number; p2Points: number;
  h2h: { p1Wins: number; p2Wins: number; draws: number; total: number } | null;
  p1Power: number; p2Power: number;
}) {
  const { title, subtitle, borderStyle } = getVerdictTitle(p1, p2, p1Points, p2Points);
  const bullets = getVerdictBullets(p1, p2, p1Points, p2Points, h2h);

  const powerDiff = Math.abs(p1Power - p2Power);
  const powerWinner = p1Power > p2Power ? p1 : p2;

  return (
    <div className={`mt-4 bg-fab-surface border rounded-lg overflow-hidden ${borderStyle}`} style={{ animation: "fade-in-up 0.4s ease-out 0.8s both" }}>
      {/* Gradient accent bar */}
      <div className="h-0.5 bg-gradient-to-r from-blue-500 via-fab-gold to-red-500" />
      <div className="p-4">
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
    </div>
  );
}

// ── Share Modal ──

function CompareShareModal({
  p1,
  p2,
  stats,
  p1Points,
  p2Points,
  p1PowerLevel,
  p2PowerLevel,
  h2h,
  commonEdges,
  onClose,
}: {
  p1: LeaderboardEntry;
  p2: LeaderboardEntry;
  stats: { label: string; v1: string | number; v2: string | number; better: 1 | 2 | 0 }[];
  p1Points: number;
  p2Points: number;
  p1PowerLevel: number;
  p2PowerLevel: number;
  h2h: { p1Wins: number; p2Wins: number; draws: number; total: number } | null;
  commonEdges?: { shared: number; p1Edges: number; p2Edges: number };
  onClose: () => void;
}) {
  const [selectedTheme, setSelectedTheme] = useState(CARD_THEMES[0]);
  const [shareStatus, setShareStatus] = useState<"idle" | "sharing" | "copied">("idle");
  const cardRef = useRef<HTMLDivElement>(null);

  const { title: verdictTitle, subtitle: verdictSubtitle } = getVerdictTitle(p1, p2, p1Points, p2Points);
  const verdictBullets = getVerdictBullets(p1, p2, p1Points, p2Points, h2h);

  const compareData = {
    p1Name: p1.displayName,
    p2Name: p2.displayName,
    stats,
    p1TopHero: p1.topHero || "",
    p2TopHero: p2.topHero || "",
    p1Matches: p1.totalMatches + p1.totalByes,
    p2Matches: p2.totalMatches + p2.totalByes,
    p1Dominance: p1Points,
    p2Dominance: p2Points,
    p1PowerLevel,
    p2PowerLevel,
    h2h: h2h ?? undefined,
    commonOpponents: commonEdges,
    verdict: verdictTitle,
    verdictSubtitle,
    verdictBullets,
  };

  async function handleCopy() {
    const url = `${window.location.origin}/compare?p2=${p2.username}`;
    setShareStatus("sharing");
    try {
      const { toBlob } = await import("html-to-image");
      const blob = cardRef.current
        ? await toBlob(cardRef.current, { pixelRatio: 2, backgroundColor: selectedTheme.bg })
        : null;

      const isMobile = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      const shareText = `${p1.displayName} vs ${p2.displayName} \u2014 Versus on FaB Stats\n${url}`;

      if (isMobile && blob && navigator.share && navigator.canShare?.({ files: [new File([blob], "versus.png", { type: "image/png" })] })) {
        const file = new File([blob], "versus.png", { type: "image/png" });
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
        await navigator.clipboard.writeText(`${window.location.origin}/compare?p2=${p2.username}`);
      } catch { /* ignore */ }
    }
    setShareStatus("idle");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-fab-surface border border-fab-border rounded-xl max-w-lg w-full mx-4 overflow-hidden max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-fab-border">
          <h3 className="text-sm font-semibold text-fab-text">Share Versus</h3>
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
