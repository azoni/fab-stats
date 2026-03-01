"use client";
import { useState, useMemo, useEffect } from "react";
import { MatchCard } from "./MatchCard";
import { MatchResult, GameFormat, type MatchRecord } from "@/types";
import { allHeroes as knownHeroes } from "@/lib/heroes";
import { getEventType, getRoundNumber } from "@/lib/stats";
import { localDate } from "@/lib/constants";

const VALID_HERO_NAMES = new Set(knownHeroes.map((h) => h.name));
const PAGE_SIZE = 25;

const RESULT_PILLS: { value: string; label: string; activeClass: string }[] = [
  { value: "all", label: "All", activeClass: "bg-fab-muted/15 border-fab-muted/40 text-fab-text" },
  { value: MatchResult.Win, label: "Wins", activeClass: "bg-fab-win/15 border-fab-win/40 text-fab-win" },
  { value: MatchResult.Loss, label: "Losses", activeClass: "bg-fab-loss/15 border-fab-loss/40 text-fab-loss" },
  { value: MatchResult.Draw, label: "Draws", activeClass: "bg-fab-draw/15 border-fab-draw/40 text-fab-draw" },
  { value: MatchResult.Bye, label: "Byes", activeClass: "bg-fab-muted/15 border-fab-muted/40 text-fab-dim" },
];

interface MatchListProps {
  matches: MatchRecord[];
  matchOwnerUid?: string;
  enableComments?: boolean;
  editable?: boolean;
  onUpdateMatch?: (id: string, updates: Partial<Omit<MatchRecord, "id" | "createdAt">>) => Promise<void>;
  missingGemId?: boolean;
}

export function MatchList({ matches, matchOwnerUid, enableComments, editable, onUpdateMatch, missingGemId }: MatchListProps) {
  const [filterResult, setFilterResult] = useState<string>("all");
  const [filterFormat, setFilterFormat] = useState<string>("all");
  const [filterHero, setFilterHero] = useState<string>("all");
  const [filterEventType, setFilterEventType] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Reset to page 1 when filters/search/sort change
  useEffect(() => {
    setPage(1);
  }, [filterResult, filterFormat, filterHero, filterEventType, sortOrder, search]);

  const allHeroes = useMemo(() => {
    const heroes = new Set(matches.map((m) => m.heroPlayed).filter((h) => h && VALID_HERO_NAMES.has(h)));
    return Array.from(heroes).sort();
  }, [matches]);

  const hasUnsetHeroes = useMemo(() => {
    return matches.some((m) => !m.heroPlayed || m.heroPlayed === "Unknown");
  }, [matches]);

  const allEventTypes = useMemo(() => {
    const types = new Set(matches.map((m) => getEventType(m)).filter(Boolean));
    return Array.from(types).sort();
  }, [matches]);

  // Result counts from unfiltered matches (always show total distribution)
  const resultCounts = useMemo(() => {
    const counts: Record<string, number> = { all: matches.length };
    for (const m of matches) {
      counts[m.result] = (counts[m.result] || 0) + 1;
    }
    return counts;
  }, [matches]);

  const filtered = useMemo(() => {
    let result = [...matches];

    if (filterResult !== "all") {
      result = result.filter((m) => m.result === filterResult);
    }
    if (filterFormat !== "all") {
      result = result.filter((m) => m.format === filterFormat);
    }
    if (filterHero === "none") {
      result = result.filter((m) => !m.heroPlayed || m.heroPlayed === "Unknown");
    } else if (filterHero !== "all") {
      result = result.filter((m) => m.heroPlayed === filterHero);
    }
    if (filterEventType !== "all") {
      result = result.filter((m) => getEventType(m) === filterEventType);
    }

    // Smart search across all fields
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((m) => {
        const eventName = m.notes?.split(" | ")[0] || "";
        const haystack = [
          m.opponentName,
          m.heroPlayed,
          m.opponentHero,
          eventName,
          m.venue,
          m.format,
          m.eventType,
          m.date,
          m.result,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    result.sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      const diff = dateDiff
        || getRoundNumber(b) - getRoundNumber(a)
        || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return sortOrder === "newest" ? diff : -diff;
    });

    return result;
  }, [matches, filterResult, filterFormat, filterHero, filterEventType, sortOrder, search]);

  // Stats from filtered matches (reflects current view)
  const stats = useMemo(() => {
    const wins = filtered.filter((m) => m.result === MatchResult.Win).length;
    const losses = filtered.filter((m) => m.result === MatchResult.Loss).length;
    const draws = filtered.filter((m) => m.result === MatchResult.Draw).length;
    const nonBye = wins + losses + draws;
    const winRate = nonBye > 0 ? (wins / nonBye) * 100 : 0;
    return { wins, losses, draws, nonBye, winRate };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const pageMatches = filtered.slice(startIdx, startIdx + PAGE_SIZE);

  return (
    <div>
      {/* Filters */}
      <div className="space-y-2 mb-4">
        {/* Row 1: Search + Result pills */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="bg-fab-surface border border-fab-border rounded-md px-3 py-1.5 text-fab-text text-sm placeholder:text-fab-dim focus:outline-none focus:border-fab-gold w-36 sm:w-44"
          />
          <div className="flex items-center gap-1 ml-auto flex-wrap">
            {RESULT_PILLS.map((pill) => (
              <button
                key={pill.value}
                onClick={() => setFilterResult(pill.value)}
                className={`px-2 py-1 rounded-full text-xs font-medium border transition-colors ${
                  filterResult === pill.value
                    ? pill.activeClass
                    : "border-transparent text-fab-dim hover:text-fab-muted"
                }`}
              >
                {pill.label}
                <span className="ml-1 opacity-60">{resultCounts[pill.value] || 0}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Format / Hero / Event Type / Sort */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterFormat}
            onChange={(e) => setFilterFormat(e.target.value)}
            className="bg-fab-surface border border-fab-border rounded-md px-3 py-1.5 text-fab-text text-sm outline-none"
          >
            <option value="all">All Formats</option>
            {Object.values(GameFormat).map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>

          {(allHeroes.length > 0 || hasUnsetHeroes) && (
            <select
              value={filterHero}
              onChange={(e) => setFilterHero(e.target.value)}
              className="bg-fab-surface border border-fab-border rounded-md px-3 py-1.5 text-fab-text text-sm outline-none"
            >
              <option value="all">All Heroes</option>
              {hasUnsetHeroes && <option value="none">No Hero Set</option>}
              {allHeroes.map((h) => (
                <option key={h} value={h}>{h}</option>
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

          <button
            onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}
            className="bg-fab-surface border border-fab-border rounded-md px-3 py-1.5 text-fab-muted text-sm hover:text-fab-text transition-colors ml-auto"
          >
            {sortOrder === "newest" ? "Newest First" : "Oldest First"}
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-fab-dim">
          <p className="text-lg mb-1">No matches found</p>
          <p className="text-sm">Try adjusting your filters{search ? " or search" : ""}</p>
        </div>
      ) : (
        <>
          {/* Stats Summary Strip */}
          <div className="flex items-center gap-3 mb-3 px-3 py-2.5 bg-fab-surface/50 rounded-lg border border-fab-border/50">
            {/* Record counts */}
            <div className="flex items-center gap-2 text-sm font-semibold shrink-0">
              <span className="text-fab-win">{stats.wins}W</span>
              <span className="text-fab-dim">&middot;</span>
              <span className="text-fab-loss">{stats.losses}L</span>
              {stats.draws > 0 && (
                <>
                  <span className="text-fab-dim">&middot;</span>
                  <span className="text-fab-draw">{stats.draws}D</span>
                </>
              )}
            </div>

            {/* Segmented win rate bar */}
            <div className="flex-1 h-1.5 bg-fab-bg rounded-full overflow-hidden flex min-w-[80px]">
              {stats.nonBye > 0 && (
                <>
                  <div className="h-full bg-fab-win transition-all" style={{ width: `${(stats.wins / stats.nonBye) * 100}%` }} />
                  <div className="h-full bg-fab-draw transition-all" style={{ width: `${(stats.draws / stats.nonBye) * 100}%` }} />
                  <div className="h-full bg-fab-loss transition-all" style={{ width: `${(stats.losses / stats.nonBye) * 100}%` }} />
                </>
              )}
            </div>

            {/* Win rate percentage */}
            <span className={`text-sm font-bold shrink-0 ${stats.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
              {stats.winRate.toFixed(1)}%
            </span>
          </div>

          {/* Match count */}
          <p className="text-xs text-fab-dim mb-2">
            Showing {startIdx + 1}-{Math.min(startIdx + PAGE_SIZE, filtered.length)} of {filtered.length} match{filtered.length !== 1 ? "es" : ""}
          </p>

          {/* Match list with date separators */}
          <div className="space-y-1.5">
            {pageMatches.map((match, idx) => {
              const prevMatch = idx > 0 ? pageMatches[idx - 1] : null;
              const showDate = !prevMatch || match.date !== prevMatch.date;

              return (
                <div key={match.id}>
                  {showDate && (
                    <div className={`flex items-center gap-3 pb-1 ${idx > 0 ? "pt-3" : ""}`}>
                      <span className="text-xs font-medium text-fab-dim whitespace-nowrap">
                        {localDate(match.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                      </span>
                      <div className="flex-1 h-px bg-gradient-to-r from-fab-border/60 to-transparent" />
                    </div>
                  )}
                  <MatchCard
                    match={match}
                    matchOwnerUid={matchOwnerUid}
                    enableComments={enableComments}
                    editable={editable}
                    onUpdateMatch={onUpdateMatch}
                    missingGemId={missingGemId}
                  />
                </div>
              );
            })}
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
