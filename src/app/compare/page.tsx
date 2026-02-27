"use client";
import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useAuth } from "@/contexts/AuthContext";
import { getHeroByName } from "@/lib/heroes";
import { HeroClassIcon } from "@/components/heroes/HeroClassIcon";
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

  // Default player 1 to current user if not set
  const effectivePick1 = pick1 || profile?.username || "";

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
          onChange={(v) => { setSearch1(v); setPick1(""); }}
          onFocus={() => setFocused(1)}
          onBlur={() => setTimeout(() => setFocused(null), 200)}
          results={focused === 1 ? filtered1 : []}
          onSelect={(e) => selectPlayer(1, e)}
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
  const [shareCopied, setShareCopied] = useState(false);
  const stats: { label: string; v1: string | number; v2: string | number; better: 1 | 2 | 0; format?: "pct" }[] = [
    {
      label: "Win Rate",
      v1: `${p1.winRate.toFixed(1)}%`,
      v2: `${p2.winRate.toFixed(1)}%`,
      better: p1.winRate > p2.winRate ? 1 : p2.winRate > p1.winRate ? 2 : 0,
    },
    {
      label: "Total Matches",
      v1: p1.totalMatches,
      v2: p2.totalMatches,
      better: p1.totalMatches > p2.totalMatches ? 1 : p2.totalMatches > p1.totalMatches ? 2 : 0,
    },
    {
      label: "Record",
      v1: `${p1.totalWins}W-${p1.totalLosses}L${p1.totalDraws > 0 ? `-${p1.totalDraws}D` : ""}`,
      v2: `${p2.totalWins}W-${p2.totalLosses}L${p2.totalDraws > 0 ? `-${p2.totalDraws}D` : ""}`,
      better: 0,
    },
    {
      label: "Events Played",
      v1: p1.eventsPlayed,
      v2: p2.eventsPlayed,
      better: p1.eventsPlayed > p2.eventsPlayed ? 1 : p2.eventsPlayed > p1.eventsPlayed ? 2 : 0,
    },
    {
      label: "Event Wins",
      v1: p1.eventWins,
      v2: p2.eventWins,
      better: p1.eventWins > p2.eventWins ? 1 : p2.eventWins > p1.eventWins ? 2 : 0,
    },
    {
      label: "Longest Win Streak",
      v1: p1.longestWinStreak,
      v2: p2.longestWinStreak,
      better: p1.longestWinStreak > p2.longestWinStreak ? 1 : p2.longestWinStreak > p1.longestWinStreak ? 2 : 0,
    },
    {
      label: "Unique Heroes",
      v1: p1.uniqueHeroes,
      v2: p2.uniqueHeroes,
      better: p1.uniqueHeroes > p2.uniqueHeroes ? 1 : p2.uniqueHeroes > p1.uniqueHeroes ? 2 : 0,
    },
    {
      label: "Rated Win Rate",
      v1: p1.ratedMatches > 0 ? `${p1.ratedWinRate.toFixed(1)}%` : "—",
      v2: p2.ratedMatches > 0 ? `${p2.ratedWinRate.toFixed(1)}%` : "—",
      better: p1.ratedWinRate > p2.ratedWinRate ? 1 : p2.ratedWinRate > p1.ratedWinRate ? 2 : 0,
    },
    {
      label: "Armory Win Rate",
      v1: p1.armoryMatches > 0 ? `${p1.armoryWinRate.toFixed(1)}%` : "—",
      v2: p2.armoryMatches > 0 ? `${p2.armoryWinRate.toFixed(1)}%` : "—",
      better: p1.armoryWinRate > p2.armoryWinRate ? 1 : p2.armoryWinRate > p1.armoryWinRate ? 2 : 0,
    },
  ];

  // Count who "wins" more categories
  const p1Wins = stats.filter((s) => s.better === 1).length;
  const p2Wins = stats.filter((s) => s.better === 2).length;

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
            <span className="text-blue-400 font-semibold">{p1Wins}</span>
            {" - "}
            <span className="text-red-400 font-semibold">{p2Wins}</span>
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

      {/* Share button */}
      <div className="mt-4 text-center">
        <button
          onClick={async () => {
            const url = `${window.location.origin}/compare?p1=${p1.username}&p2=${p2.username}`;
            try {
              await navigator.clipboard.writeText(url);
            } catch {
              // Fallback for browsers that block clipboard API
              const input = document.createElement("input");
              input.value = url;
              document.body.appendChild(input);
              input.select();
              document.execCommand("copy");
              document.body.removeChild(input);
            }
            setShareCopied(true);
            setTimeout(() => setShareCopied(false), 2000);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text hover:border-fab-gold/30 transition-colors"
        >
          {shareCopied ? (
            <>
              <svg className="w-4 h-4 text-fab-win" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-fab-win">Link Copied!</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share Comparison
            </>
          )}
        </button>
      </div>
    </div>
  );
}
