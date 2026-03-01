"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMatches } from "@/hooks/useMatches";
import { useAuth } from "@/contexts/AuthContext";
import { computeOpponentStats } from "@/lib/stats";
import { MatchCard } from "@/components/matches/MatchCard";
import { ChevronUpIcon, ChevronDownIcon } from "@/components/icons/NavIcons";
import { MatchResult, type OpponentStats } from "@/types";
import { localDate } from "@/lib/constants";
import { allHeroes as knownHeroes } from "@/lib/heroes";
import { getEventType } from "@/lib/stats";
import { RivalryCard, buildRivalryUrl, CARD_THEMES, type CardTheme } from "@/components/opponents/RivalryCard";


const VALID_HERO_NAMES = new Set(knownHeroes.map((h) => h.name));
const PAGE_SIZE = 25;

const AVATAR_COLORS = [
  "bg-blue-500/20 text-blue-400",
  "bg-purple-500/20 text-purple-400",
  "bg-emerald-500/20 text-emerald-400",
  "bg-amber-500/20 text-amber-400",
  "bg-red-500/20 text-red-400",
  "bg-cyan-500/20 text-cyan-400",
  "bg-pink-500/20 text-pink-400",
];
function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function OpponentsPage() {
  const searchParams = useSearchParams();
  const { matches, isLoaded } = useMatches();
  const { user, profile } = useAuth();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"matches" | "winRate" | "lossRate" | "name" | "recent">("matches");
  const [filterFormat, setFilterFormat] = useState("all");
  const [filterEventType, setFilterEventType] = useState("all");
  const [filterHero, setFilterHero] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Pre-fill search from URL query param (e.g. /opponents?q=PlayerName)
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setSearch(q);
      setExpanded(q);
    }
  }, [searchParams]);

  // Reset to page 1 when filters/search/sort change
  useEffect(() => {
    setPage(1);
  }, [filterFormat, filterEventType, filterHero, sortBy, search]);

  const allFormats = useMemo(() => {
    return [...new Set(matches.map((m) => m.format))];
  }, [matches]);

  const allEventTypes = useMemo(() => {
    const types = new Set<string>();
    for (const m of matches) {
      const et = m.eventType || getEventType(m);
      if (et && et !== "Other") types.add(et);
    }
    if (types.size < matches.length) types.add("Other");
    return [...types].sort();
  }, [matches]);

  const allHeroes = useMemo(() => {
    const heroes = new Set(matches.map((m) => m.heroPlayed).filter((h) => h && VALID_HERO_NAMES.has(h)));
    return Array.from(heroes).sort();
  }, [matches]);

  const filteredMatches = useMemo(() => {
    let filtered = matches;
    if (filterFormat !== "all") {
      filtered = filtered.filter((m) => m.format === filterFormat);
    }
    if (filterEventType !== "all") {
      filtered = filtered.filter((m) => {
        const et = m.eventType || getEventType(m);
        return et === filterEventType;
      });
    }
    if (filterHero !== "all") {
      filtered = filtered.filter((m) => m.heroPlayed === filterHero);
    }
    return filtered;
  }, [matches, filterFormat, filterEventType, filterHero]);

  const opponentStats = useMemo(() => computeOpponentStats(filteredMatches), [filteredMatches]);

  const displayList = useMemo(() => {
    let list = opponentStats.filter((o) => o.opponentName !== "Unknown");
    const unknown = opponentStats.find((o) => o.opponentName === "Unknown");

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((o) => o.opponentName.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      if (sortBy === "winRate") return b.winRate - a.winRate;
      if (sortBy === "lossRate") {
        const aLossRate = a.totalMatches > 0 ? (a.losses / a.totalMatches) * 100 : 0;
        const bLossRate = b.totalMatches > 0 ? (b.losses / b.totalMatches) * 100 : 0;
        return bLossRate - aLossRate;
      }
      if (sortBy === "name") return a.opponentName.localeCompare(b.opponentName);
      if (sortBy === "recent") {
        const aDate = Math.max(...a.matches.map((m) => new Date(m.date).getTime()));
        const bDate = Math.max(...b.matches.map((m) => new Date(m.date).getTime()));
        return bDate - aDate;
      }
      return b.totalMatches - a.totalMatches;
    });

    if (unknown && !search.trim()) list.push(unknown);
    return list;
  }, [opponentStats, sortBy, search]);

  const highlights = useMemo(() => {
    const qualified = opponentStats.filter(o => o.totalMatches >= 3 && o.opponentName !== "Unknown");
    if (qualified.length < 1) return null;

    const nemesis = [...qualified]
      .filter(o => o.losses > o.wins)
      .sort((a, b) => a.winRate - b.winRate || b.losses - a.losses)[0] || null;

    const bestMatchup = [...qualified]
      .filter(o => o.wins > o.losses)
      .sort((a, b) => b.winRate - a.winRate || b.totalMatches - a.totalMatches)[0] || null;

    const mostPlayed = [...qualified]
      .sort((a, b) => b.totalMatches - a.totalMatches)[0] || null;

    if (!nemesis && !bestMatchup && !mostPlayed) return null;
    return { nemesis, bestMatchup, mostPlayed };
  }, [opponentStats]);

  const totalPages = Math.max(1, Math.ceil(displayList.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const pageOpponents = displayList.slice(startIdx, startIdx + PAGE_SIZE);

  if (!isLoaded) {
    return <div className="h-8 w-48 bg-fab-surface rounded animate-pulse" />;
  }

  if (opponentStats.length === 0) {
    return (
      <div className="text-center py-16 text-fab-dim">
        <p className="text-lg mb-1">No opponent data yet</p>
        <p className="text-sm mb-4">
          {user ? "Import your tournament history to see your win rate against each opponent" : "Sign up and import your matches to see head-to-head stats against every opponent"}
        </p>
        {!user && (
          <Link
            href="/login"
            className="inline-block px-6 py-3 rounded-md font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors"
          >
            Sign Up to Get Started
          </Link>
        )}
      </div>
    );
  }

  const totalOpponents = opponentStats.filter((o) => o.opponentName !== "Unknown").length;
  const totalMatchCount = opponentStats.reduce((s, o) => s + o.totalMatches, 0);

  const aggregateStats = useMemo(() => {
    const totalWins = opponentStats.reduce((s, o) => s + o.wins, 0);
    const events = new Set<string>();
    for (const o of opponentStats) {
      for (const m of o.matches) {
        const eventName = m.notes?.split(" | ")[0];
        if (eventName) events.add(eventName);
      }
    }
    return {
      winRate: totalMatchCount > 0 ? (totalWins / totalMatchCount) * 100 : 0,
      uniqueEvents: events.size,
    };
  }, [opponentStats, totalMatchCount]);

  const newOpponents = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoff = thirtyDaysAgo.getTime();

    return opponentStats
      .filter((o) => o.opponentName !== "Unknown")
      .map((o) => {
        const dates = o.matches.map((m) => localDate(m.date).getTime());
        const firstPlayed = Math.min(...dates);
        return { ...o, firstPlayed };
      })
      .filter((o) => o.firstPlayed >= cutoff)
      .sort((a, b) => b.firstPlayed - a.firstPlayed);
  }, [opponentStats]);

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="section-header flex items-center gap-2 flex-1">
          <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center ring-1 ring-inset ring-violet-500/20">
            <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-fab-text leading-tight">Opponents</h1>
            <p className="text-xs text-fab-muted leading-tight">{totalOpponents} opponents across {totalMatchCount} matches</p>
          </div>
        </div>
      </div>

      {/* Aggregate Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        <div className="bg-fab-surface border border-fab-border rounded-lg px-3 py-2 text-center">
          <p className="text-lg font-bold text-fab-text">{totalOpponents}</p>
          <p className="text-[10px] text-fab-dim uppercase tracking-wide">Opponents</p>
        </div>
        <div className="bg-fab-surface border border-fab-border rounded-lg px-3 py-2 text-center">
          <p className="text-lg font-bold text-fab-text">{totalMatchCount}</p>
          <p className="text-[10px] text-fab-dim uppercase tracking-wide">Matches</p>
        </div>
        <div className="bg-fab-surface border border-fab-border rounded-lg px-3 py-2 text-center">
          <p className="text-lg font-bold text-fab-text">{aggregateStats.uniqueEvents}</p>
          <p className="text-[10px] text-fab-dim uppercase tracking-wide">Events</p>
        </div>
        <div className="bg-fab-surface border border-fab-border rounded-lg px-3 py-2 text-center">
          <p className={`text-lg font-bold ${aggregateStats.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>{aggregateStats.winRate.toFixed(1)}%</p>
          <p className="text-[10px] text-fab-dim uppercase tracking-wide">Win Rate</p>
        </div>
      </div>

      {/* Rivalry Highlights */}
      {highlights && (
        <>
        <p className="text-xs uppercase tracking-wider font-semibold text-fab-muted mb-2">Rivalry Highlights</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {highlights.nemesis && (
            <button
              onClick={() => { setSearch(highlights.nemesis!.opponentName); setExpanded(highlights.nemesis!.opponentName); }}
              className="spotlight-card spotlight-nemesis bg-fab-surface border border-fab-border rounded-lg p-4 text-left hover:border-red-400/30 transition-colors"
            >
              <p className="text-[10px] uppercase tracking-wider font-bold text-red-400 mb-2">Nemesis</p>
              <p className="text-lg font-bold text-fab-text truncate">{highlights.nemesis.opponentName}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-fab-loss font-semibold">{highlights.nemesis.winRate.toFixed(0)}%</span>
                <span className="text-xs text-fab-dim">
                  {highlights.nemesis.wins}W - {highlights.nemesis.losses}L
                  {highlights.nemesis.draws > 0 ? ` - ${highlights.nemesis.draws}D` : ""}
                </span>
              </div>
              <div className="mt-2 h-1.5 rounded-full overflow-hidden flex">
                <div className="h-full bg-fab-win" style={{ width: `${(highlights.nemesis.wins / highlights.nemesis.totalMatches) * 100}%` }} />
                <div className="h-full bg-fab-loss/40" style={{ width: `${(highlights.nemesis.losses / highlights.nemesis.totalMatches) * 100}%` }} />
              </div>
            </button>
          )}

          {highlights.bestMatchup && (
            <button
              onClick={() => { setSearch(highlights.bestMatchup!.opponentName); setExpanded(highlights.bestMatchup!.opponentName); }}
              className="spotlight-card spotlight-rising bg-fab-surface border border-fab-border rounded-lg p-4 text-left hover:border-emerald-400/30 transition-colors"
            >
              <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-400 mb-2">Best Matchup</p>
              <p className="text-lg font-bold text-fab-text truncate">{highlights.bestMatchup.opponentName}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-fab-win font-semibold">{highlights.bestMatchup.winRate.toFixed(0)}%</span>
                <span className="text-xs text-fab-dim">
                  {highlights.bestMatchup.wins}W - {highlights.bestMatchup.losses}L
                  {highlights.bestMatchup.draws > 0 ? ` - ${highlights.bestMatchup.draws}D` : ""}
                </span>
              </div>
              <div className="mt-2 h-1.5 rounded-full overflow-hidden flex">
                <div className="h-full bg-fab-win" style={{ width: `${(highlights.bestMatchup.wins / highlights.bestMatchup.totalMatches) * 100}%` }} />
                <div className="h-full bg-fab-loss/40" style={{ width: `${(highlights.bestMatchup.losses / highlights.bestMatchup.totalMatches) * 100}%` }} />
              </div>
            </button>
          )}

          {highlights.mostPlayed && (
            <button
              onClick={() => { setSearch(highlights.mostPlayed!.opponentName); setExpanded(highlights.mostPlayed!.opponentName); }}
              className="spotlight-card spotlight-grinder bg-fab-surface border border-fab-border rounded-lg p-4 text-left hover:border-amber-400/30 transition-colors"
            >
              <p className="text-[10px] uppercase tracking-wider font-bold text-amber-400 mb-2">Most Played</p>
              <p className="text-lg font-bold text-fab-text truncate">{highlights.mostPlayed.opponentName}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-fab-gold font-semibold">{highlights.mostPlayed.totalMatches} matches</span>
                <span className="text-xs text-fab-dim">
                  {highlights.mostPlayed.wins}W - {highlights.mostPlayed.losses}L
                  {highlights.mostPlayed.draws > 0 ? ` - ${highlights.mostPlayed.draws}D` : ""}
                </span>
              </div>
              <div className="mt-2 h-1.5 rounded-full overflow-hidden flex">
                <div className="h-full bg-fab-win" style={{ width: `${(highlights.mostPlayed.wins / highlights.mostPlayed.totalMatches) * 100}%` }} />
                <div className="h-full bg-fab-loss/40" style={{ width: `${(highlights.mostPlayed.losses / highlights.mostPlayed.totalMatches) * 100}%` }} />
              </div>
            </button>
          )}
        </div>
        </>
      )}

      {/* New Opponents */}
      {newOpponents.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-md bg-cyan-500/10 flex items-center justify-center ring-1 ring-inset ring-cyan-500/20">
              <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <p className="text-xs uppercase tracking-wider font-semibold text-fab-muted">New Opponents</p>
            <span className="text-[10px] text-fab-dim">Last 30 days</span>
          </div>
          <div className="flex gap-2 overflow-x-auto feed-scroll pb-2">
            {newOpponents.map((opp) => {
              const daysAgo = Math.floor((Date.now() - opp.firstPlayed) / (1000 * 60 * 60 * 24));
              return (
                <button
                  key={opp.opponentName}
                  onClick={() => { setSearch(opp.opponentName); setExpanded(opp.opponentName); }}
                  className="spotlight-card spotlight-winrate bg-fab-surface border border-fab-border rounded-lg p-3 min-w-[180px] text-left hover:border-cyan-400/30 transition-colors shrink-0"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${getAvatarColor(opp.opponentName)}`}>
                      {opp.opponentName.charAt(0).toUpperCase()}
                    </div>
                    <p className="text-sm font-semibold text-fab-text truncate">{opp.opponentName}</p>
                  </div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs">
                      <span className="text-fab-win font-semibold">{opp.wins}W</span>
                      <span className="text-fab-dim"> - </span>
                      <span className="text-fab-loss font-semibold">{opp.losses}L</span>
                      {opp.draws > 0 && <><span className="text-fab-dim"> - </span><span className="text-fab-muted font-semibold">{opp.draws}D</span></>}
                    </span>
                    <span className={`text-xs font-bold ml-auto ${opp.winRate > 50 ? "text-fab-win" : opp.winRate === 50 ? "text-fab-muted" : "text-fab-loss"}`}>
                      {opp.winRate.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden flex mb-1.5">
                    <div className="h-full bg-fab-win" style={{ width: `${(opp.wins / opp.totalMatches) * 100}%` }} />
                    {opp.draws > 0 && <div className="h-full bg-fab-draw/60" style={{ width: `${(opp.draws / opp.totalMatches) * 100}%` }} />}
                    <div className="h-full bg-fab-loss/40" style={{ width: `${(opp.losses / opp.totalMatches) * 100}%` }} />
                  </div>
                  <p className="text-[10px] text-fab-dim">{daysAgo === 0 ? "First played today" : `First played ${daysAgo}d ago`}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* All Opponents */}
      <p className="text-xs uppercase tracking-wider font-semibold text-fab-muted mb-2">All Opponents</p>

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fab-dim pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="bg-fab-surface border border-fab-border rounded-md pl-8 pr-3 py-1.5 text-fab-text text-sm placeholder:text-fab-dim focus:outline-none focus:border-fab-gold w-36 sm:w-44"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="bg-fab-surface border border-fab-border rounded-md px-3 py-1.5 text-fab-text text-sm outline-none"
          >
            <option value="matches">Most Played</option>
            <option value="winRate">Win Rate</option>
            <option value="lossRate">Loss Rate</option>
            <option value="recent">Most Recent</option>
            <option value="name">Name</option>
          </select>
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
          {allHeroes.length > 1 && (
            <select
              value={filterHero}
              onChange={(e) => setFilterHero(e.target.value)}
              className="bg-fab-surface border border-fab-border rounded-md px-3 py-1.5 text-fab-text text-sm outline-none"
            >
              <option value="all">All Heroes</option>
              {allHeroes.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {displayList.length === 0 ? (
        <div className="text-center py-12 text-fab-dim">
          <p className="text-lg mb-1">No opponents found</p>
          <p className="text-sm">Try adjusting your filters{search ? " or search" : ""}</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-fab-dim mb-2">
            Showing {startIdx + 1}-{Math.min(startIdx + PAGE_SIZE, displayList.length)} of {displayList.length} opponent{displayList.length !== 1 ? "s" : ""}
          </p>

          <div className="space-y-2">
            {pageOpponents.map((opp) => (
              <OpponentRow
                key={opp.opponentName}
                opp={opp}
                isExpanded={expanded === opp.opponentName}
                onToggle={() => setExpanded(expanded === opp.opponentName ? null : opp.opponentName)}
                matchOwnerUid={user?.uid}
                playerName={profile?.displayName}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="px-3 py-1.5 rounded-md text-sm font-medium bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-fab-dim">
                Page {safePage} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
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

function OpponentRow({ opp, isExpanded, onToggle, matchOwnerUid, playerName }: { opp: OpponentStats; isExpanded: boolean; onToggle: () => void; matchOwnerUid?: string; playerName?: string }) {
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "sharing">("idle");
  const [showShareModal, setShowShareModal] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  // Compute streak vs this opponent (most recent results)
  const sortedMatches = [...opp.matches].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  let currentStreak = 0;
  let streakType: MatchResult | null = null;
  for (const m of sortedMatches) {
    if (m.result === MatchResult.Draw) break;
    if (!streakType) {
      streakType = m.result;
      currentStreak = 1;
    } else if (m.result === streakType) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Rated stats
  const ratedMatches = opp.matches.filter((m) => m.rated);
  const ratedWins = ratedMatches.filter((m) => m.result === MatchResult.Win).length;
  const ratedLosses = ratedMatches.filter((m) => m.result === MatchResult.Loss).length;
  const ratedDraws = ratedMatches.filter((m) => m.result === MatchResult.Draw).length;

  // Unique events
  const events = [...new Set(opp.matches.map((m) => m.notes?.split(" | ")[0]).filter(Boolean))];
  // Unique formats
  const formats = [...new Set(opp.matches.map((m) => m.format))];
  // Date range
  const dates = opp.matches.map((m) => localDate(m.date).getTime());
  const firstDate = new Date(Math.min(...dates)).toLocaleDateString();
  const lastDate = new Date(Math.max(...dates)).toLocaleDateString();

  return (
    <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden relative">
      <button onClick={onToggle} className="w-full p-4 text-left hover:bg-fab-surface-hover transition-colors">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${getAvatarColor(opp.opponentName)}`}>
            {opp.opponentName.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/search?q=${encodeURIComponent(opp.opponentName)}`}
                    onClick={(e) => e.stopPropagation()}
                    className="font-semibold text-fab-text hover:text-fab-gold transition-colors"
                  >
                    {opp.opponentName}
                  </Link>
                  {currentStreak > 1 && streakType && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      streakType === MatchResult.Win ? "bg-fab-win/15 text-fab-win" : "bg-fab-loss/15 text-fab-loss"
                    }`}>
                      {currentStreak}{streakType === MatchResult.Win ? "W" : "L"}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-fab-dim flex-wrap">
                  <span>{opp.totalMatches} matches</span>
                  {formats.map((f) => (
                    <span key={f} className="px-1.5 py-0.5 rounded bg-fab-bg">{f}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right hidden sm:block">
                  <span className="text-sm">
                    <span className="text-fab-win font-semibold">{opp.wins}W</span>
                    <span className="text-fab-dim"> - </span>
                    <span className="text-fab-loss font-semibold">{opp.losses}L</span>
                    {opp.draws > 0 && <><span className="text-fab-dim"> - </span><span className="text-fab-muted font-semibold">{opp.draws}D</span></>}
                  </span>
                </div>
                <div className="flex items-center gap-2 w-32">
                  <div className="flex-1 h-2.5 rounded-full overflow-hidden flex">
                    <div className="h-full bg-fab-win" style={{ width: `${(opp.wins / opp.totalMatches) * 100}%` }} />
                    {opp.draws > 0 && <div className="h-full bg-fab-draw/60" style={{ width: `${(opp.draws / opp.totalMatches) * 100}%` }} />}
                    <div className="h-full bg-fab-loss/40" style={{ width: `${(opp.losses / opp.totalMatches) * 100}%` }} />
                  </div>
                  <span className={`text-sm font-bold w-12 text-right ${opp.winRate > 50 ? "text-fab-win" : opp.winRate === 50 ? "text-fab-muted" : "text-fab-loss"}`}>
                    {opp.winRate.toFixed(0)}%
                  </span>
                </div>
                {isExpanded ? <ChevronUpIcon className="w-4 h-4 text-fab-dim" /> : <ChevronDownIcon className="w-4 h-4 text-fab-dim" />}
              </div>
            </div>

            {/* Recent results dots */}
            <div className="mt-2 flex gap-1">
              {sortedMatches.slice(0, 20).reverse().map((m, i) => (
                <div
                  key={i}
                  className={`w-2.5 h-2.5 rounded-full ${
                    m.result === MatchResult.Win ? "bg-fab-win" : m.result === MatchResult.Loss ? "bg-fab-loss" : "bg-fab-draw"
                  }`}
                  title={`${localDate(m.date).toLocaleDateString()} - ${m.result}`}
                />
              ))}
            </div>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-fab-border">
          {/* Stats breakdown */}
          <div className="px-4 py-3 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-fab-bg rounded-lg p-3 text-center border-l-2 border-blue-400/50">
              <p className="text-lg font-bold text-fab-text">{opp.totalMatches}</p>
              <p className="text-xs text-fab-dim">Total Games</p>
            </div>
            <div className={`bg-fab-bg rounded-lg p-3 text-center border-l-2 ${opp.winRate > 50 ? "border-fab-win/50" : opp.winRate === 50 ? "border-fab-border" : "border-fab-loss/50"}`}>
              <p className={`text-lg font-bold ${opp.winRate > 50 ? "text-fab-win" : opp.winRate === 50 ? "text-fab-muted" : "text-fab-loss"}`}>{opp.winRate.toFixed(1)}%</p>
              <p className="text-xs text-fab-dim">Win Rate</p>
            </div>
            <div className="bg-fab-bg rounded-lg p-3 text-center border-l-2 border-purple-400/50">
              <p className="text-lg font-bold text-fab-text">{events.length}</p>
              <p className="text-xs text-fab-dim">Events Together</p>
            </div>
            <div className={`bg-fab-bg rounded-lg p-3 text-center border-l-2 ${streakType === MatchResult.Win ? "border-fab-win/50" : streakType === MatchResult.Loss ? "border-fab-loss/50" : "border-fab-border"}`}>
              <p className={`text-lg font-bold ${streakType === MatchResult.Win ? "text-fab-win" : streakType === MatchResult.Loss ? "text-fab-loss" : "text-fab-text"}`}>
                {currentStreak > 0 ? `${currentStreak}${streakType === MatchResult.Win ? "W" : "L"}` : "-"}
              </p>
              <p className="text-xs text-fab-dim">Current Streak</p>
            </div>
          </div>

          {/* Share button */}
          {playerName && (
            <div className="px-4 pb-2">
              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-fab-bg border border-fab-border text-fab-muted hover:text-fab-text hover:border-fab-gold/30 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share
              </button>
            </div>
          )}

          {/* Share modal with theme picker */}
          {showShareModal && playerName && (
            <ShareModal
              cardRef={cardRef}
              playerName={playerName}
              opp={opp}
              ratedWins={ratedWins}
              ratedLosses={ratedLosses}
              ratedDraws={ratedDraws}
              recentResults={sortedMatches.slice(0, 20).reverse().map((m) => m.result)}
              shareStatus={shareStatus}
              setShareStatus={setShareStatus}
              onClose={() => setShowShareModal(false)}
            />
          )}

          {/* Events list */}
          {events.length > 0 && (
            <div className="px-4 pb-3">
              <p className="text-xs text-fab-muted mb-2">Events</p>
              <div className="flex flex-wrap gap-1">
                {events.map((e, i) => (
                  <span key={i} className="text-xs px-2 py-1 rounded bg-fab-bg text-fab-dim">{e}</span>
                ))}
              </div>
            </div>
          )}

          {/* Match history */}
          <div className="px-4 pb-4">
            <p className="text-xs text-fab-muted mb-2">Match History ({sortedMatches.length})</p>
            <div className="space-y-2">
              {sortedMatches.map((match) => (
                <MatchCard key={match.id} match={match} matchOwnerUid={matchOwnerUid} enableComments />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ShareModal({
  cardRef,
  playerName,
  opp,
  ratedWins,
  ratedLosses,
  ratedDraws,
  recentResults,
  shareStatus,
  setShareStatus,
  onClose,
}: {
  cardRef: React.RefObject<HTMLDivElement | null>;
  playerName: string;
  opp: OpponentStats;
  ratedWins: number;
  ratedLosses: number;
  ratedDraws: number;
  recentResults: MatchResult[];
  shareStatus: "idle" | "copied" | "sharing";
  setShareStatus: (s: "idle" | "copied" | "sharing") => void;
  onClose: () => void;
}) {
  const [selectedTheme, setSelectedTheme] = useState(CARD_THEMES[0]);

  const rivalryData = {
    playerName,
    opponentName: opp.opponentName,
    wins: opp.wins,
    losses: opp.losses,
    draws: opp.draws,
    winRate: opp.winRate,
    matches: opp.totalMatches,
    ratedWins,
    ratedLosses,
    ratedDraws,
    recentResults,
    playerHeroes: opp.heroesPlayed.filter((h) => h !== "Unknown"),
    opponentHeroes: opp.opponentHeroes.filter((h) => h !== "Unknown"),
  };

  async function handleCopy() {
    const url = buildRivalryUrl(
      window.location.origin,
      playerName,
      opp.opponentName,
      opp.wins,
      opp.losses,
      opp.draws,
      recentResults,
      opp.heroesPlayed.filter((h) => h !== "Unknown"),
      opp.opponentHeroes.filter((h) => h !== "Unknown"),
      ratedWins,
      ratedLosses,
      ratedDraws,
    );
    const shareText = `${playerName} vs ${opp.opponentName}: ${opp.wins}W-${opp.losses}L${opp.draws > 0 ? `-${opp.draws}D` : ""} (${opp.winRate.toFixed(0)}%)\n${url}`;

    setShareStatus("sharing");
    try {
      const { toBlob } = await import("html-to-image");
      const blob = cardRef.current
        ? await toBlob(cardRef.current, { pixelRatio: 2, backgroundColor: selectedTheme.bg })
        : null;

      const isMobile = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      if (isMobile && blob && navigator.share && navigator.canShare?.({ files: [new File([blob], "h2h.png", { type: "image/png" })] })) {
        const file = new File([blob], "h2h.png", { type: "image/png" });
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
        const url2 = buildRivalryUrl(window.location.origin, playerName, opp.opponentName, opp.wins, opp.losses, opp.draws, recentResults, [], [], ratedWins, ratedLosses, ratedDraws);
        await navigator.clipboard.writeText(url2);
      } catch { /* ignore */ }
    }
    setShareStatus("idle");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-fab-surface border border-fab-border rounded-xl max-w-lg w-full mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Modal header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-fab-border">
          <h3 className="text-sm font-semibold text-fab-text">Share Head to Head</h3>
          <button onClick={onClose} className="text-fab-muted hover:text-fab-text transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Card preview */}
        <div className="p-4 flex justify-center overflow-x-auto">
          <div ref={cardRef}>
            <RivalryCard data={rivalryData} theme={selectedTheme} />
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
