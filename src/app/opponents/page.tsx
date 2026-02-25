"use client";
import { useState, useMemo } from "react";
import { useMatches } from "@/hooks/useMatches";
import { useAuth } from "@/contexts/AuthContext";
import { computeOpponentStats } from "@/lib/stats";
import { MatchCard } from "@/components/matches/MatchCard";
import { ChevronUpIcon, ChevronDownIcon } from "@/components/icons/NavIcons";
import { MatchResult, type OpponentStats } from "@/types";

function guessEventTypeFromNotes(notes: string): string {
  const lower = notes.toLowerCase();
  if (lower.includes("proquest")) return "ProQuest";
  if (lower.includes("calling")) return "The Calling";
  if (lower.includes("battle hardened")) return "Battle Hardened";
  if (lower.includes("pre release") || lower.includes("pre-release")) return "Pre-Release";
  if (lower.includes("skirmish")) return "Skirmish";
  if (lower.includes("road to nationals")) return "Road to Nationals";
  if (lower.includes("national")) return "Nationals";
  if (lower.includes("armory")) return "Armory";
  return "Other";
}

export default function OpponentsPage() {
  const { matches, isLoaded } = useMatches();
  const { user } = useAuth();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"matches" | "winRate" | "lossRate" | "name" | "recent">("matches");
  const [filterFormat, setFilterFormat] = useState("all");
  const [filterEventType, setFilterEventType] = useState("all");
  const [search, setSearch] = useState("");

  const allFormats = useMemo(() => {
    return [...new Set(matches.map((m) => m.format))];
  }, [matches]);

  const allEventTypes = useMemo(() => {
    const types = new Set<string>();
    for (const m of matches) {
      const et = m.eventType || guessEventTypeFromNotes(m.notes || "");
      if (et && et !== "Other") types.add(et);
    }
    if (types.size < matches.length) types.add("Other");
    return [...types].sort();
  }, [matches]);

  const filteredMatches = useMemo(() => {
    let filtered = matches;
    if (filterFormat !== "all") {
      filtered = filtered.filter((m) => m.format === filterFormat);
    }
    if (filterEventType !== "all") {
      filtered = filtered.filter((m) => {
        const et = m.eventType || guessEventTypeFromNotes(m.notes || "");
        return et === filterEventType;
      });
    }
    return filtered;
  }, [matches, filterFormat, filterEventType]);

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

  if (!isLoaded) {
    return <div className="h-8 w-48 bg-fab-surface rounded animate-pulse" />;
  }

  if (opponentStats.length === 0) {
    return (
      <div className="text-center py-16 text-fab-dim">
        <p className="text-lg mb-1">No opponent data yet</p>
        <p className="text-sm">Import your tournament history to see your win rate against each opponent</p>
      </div>
    );
  }

  const totalOpponents = opponentStats.filter((o) => o.opponentName !== "Unknown").length;
  const totalMatches = opponentStats.reduce((s, o) => s + o.totalMatches, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-fab-gold mb-2">Opponents</h1>
      <p className="text-fab-muted text-sm mb-4">
        Your head-to-head record against {totalOpponents} opponents across {totalMatches} matches
      </p>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search opponent..."
          className="bg-fab-surface border border-fab-border rounded-md px-3 py-1.5 text-fab-text text-sm outline-none focus:border-fab-gold/50 placeholder:text-fab-dim w-48"
        />
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
      </div>

      <div className="space-y-2">
        {displayList.map((opp) => (
          <OpponentRow
            key={opp.opponentName}
            opp={opp}
            isExpanded={expanded === opp.opponentName}
            onToggle={() => setExpanded(expanded === opp.opponentName ? null : opp.opponentName)}
            matchOwnerUid={user?.uid}
          />
        ))}
      </div>
    </div>
  );
}

function OpponentRow({ opp, isExpanded, onToggle, matchOwnerUid }: { opp: OpponentStats; isExpanded: boolean; onToggle: () => void; matchOwnerUid?: string }) {
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

  // Unique events
  const events = [...new Set(opp.matches.map((m) => m.notes?.split(" | ")[0]).filter(Boolean))];
  // Unique formats
  const formats = [...new Set(opp.matches.map((m) => m.format))];
  // Date range
  const dates = opp.matches.map((m) => new Date(m.date).getTime());
  const firstDate = new Date(Math.min(...dates)).toLocaleDateString();
  const lastDate = new Date(Math.max(...dates)).toLocaleDateString();

  return (
    <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
      <button onClick={onToggle} className="w-full p-4 text-left hover:bg-fab-surface-hover transition-colors">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-fab-text text-lg">{opp.opponentName}</span>
              {currentStreak > 1 && streakType && (
                <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                  streakType === MatchResult.Win ? "bg-fab-win/15 text-fab-win" : "bg-fab-loss/15 text-fab-loss"
                }`}>
                  {currentStreak} {streakType === MatchResult.Win ? "W" : "L"} streak
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-fab-dim flex-wrap">
              <span>{opp.totalMatches} matches</span>
              <span>{firstDate === lastDate ? firstDate : `${firstDate} - ${lastDate}`}</span>
              {formats.map((f) => (
                <span key={f} className="px-1.5 py-0.5 rounded bg-fab-bg">{f}</span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <span className="text-sm text-fab-muted">
                {opp.wins}W - {opp.losses}L{opp.draws > 0 ? ` - ${opp.draws}D` : ""}
              </span>
            </div>
            <div className="flex items-center gap-2 w-28">
              <div className="flex-1 h-2.5 bg-fab-bg rounded-full overflow-hidden">
                <div className="h-full bg-fab-win rounded-full transition-all" style={{ width: `${opp.winRate}%` }} />
              </div>
              <span className={`text-sm font-bold w-12 text-right ${opp.winRate >= 50 ? "text-fab-win" : opp.winRate === 50 ? "text-fab-draw" : "text-fab-loss"}`}>
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
              title={`${new Date(m.date).toLocaleDateString()} - ${m.result}`}
            />
          ))}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-fab-border">
          {/* Stats breakdown */}
          <div className="px-4 py-3 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-fab-bg rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-fab-text">{opp.totalMatches}</p>
              <p className="text-xs text-fab-dim">Total Games</p>
            </div>
            <div className="bg-fab-bg rounded-lg p-3 text-center">
              <p className={`text-lg font-bold ${opp.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>{opp.winRate.toFixed(1)}%</p>
              <p className="text-xs text-fab-dim">Win Rate</p>
            </div>
            <div className="bg-fab-bg rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-fab-text">{events.length}</p>
              <p className="text-xs text-fab-dim">Events Together</p>
            </div>
            <div className="bg-fab-bg rounded-lg p-3 text-center">
              <p className={`text-lg font-bold ${streakType === MatchResult.Win ? "text-fab-win" : streakType === MatchResult.Loss ? "text-fab-loss" : "text-fab-text"}`}>
                {currentStreak > 0 ? `${currentStreak}${streakType === MatchResult.Win ? "W" : "L"}` : "-"}
              </p>
              <p className="text-xs text-fab-dim">Current Streak</p>
            </div>
          </div>

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
