"use client";
import { useState, useMemo, useEffect } from "react";
import { MatchCard } from "./MatchCard";
import { MatchResult, GameFormat, type MatchRecord } from "@/types";
import { allHeroes as knownHeroes } from "@/lib/heroes";
import { getEventType } from "@/lib/stats";

const VALID_HERO_NAMES = new Set(knownHeroes.map((h) => h.name));
const PAGE_SIZE = 25;

interface MatchListProps {
  matches: MatchRecord[];
  matchOwnerUid?: string;
  enableComments?: boolean;
}

export function MatchList({ matches, matchOwnerUid, enableComments }: MatchListProps) {
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

  const allEventTypes = useMemo(() => {
    const types = new Set(matches.map((m) => getEventType(m)).filter(Boolean));
    return Array.from(types).sort();
  }, [matches]);

  const filtered = useMemo(() => {
    let result = [...matches];

    if (filterResult !== "all") {
      result = result.filter((m) => m.result === filterResult);
    }
    if (filterFormat !== "all") {
      result = result.filter((m) => m.format === filterFormat);
    }
    if (filterHero !== "all") {
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
      const diff = new Date(b.date).getTime() - new Date(a.date).getTime();
      return sortOrder === "newest" ? diff : -diff;
    });

    return result;
  }, [matches, filterResult, filterFormat, filterHero, filterEventType, sortOrder, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const pageMatches = filtered.slice(startIdx, startIdx + PAGE_SIZE);

  return (
    <div>
      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="bg-fab-surface border border-fab-border rounded-md px-3 py-1.5 text-fab-text text-sm placeholder:text-fab-dim focus:outline-none focus:border-fab-gold w-36 sm:w-44"
        />
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          <select
            value={filterResult}
            onChange={(e) => setFilterResult(e.target.value)}
            className="bg-fab-surface border border-fab-border rounded-md px-3 py-1.5 text-fab-text text-sm outline-none"
          >
            <option value="all">All Results</option>
            <option value={MatchResult.Win}>Wins</option>
            <option value={MatchResult.Loss}>Losses</option>
            <option value={MatchResult.Draw}>Draws</option>
          </select>

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
            className="bg-fab-surface border border-fab-border rounded-md px-3 py-1.5 text-fab-muted text-sm hover:text-fab-text transition-colors"
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
          {/* Match count */}
          <p className="text-xs text-fab-dim mb-2">
            Showing {startIdx + 1}-{Math.min(startIdx + PAGE_SIZE, filtered.length)} of {filtered.length} match{filtered.length !== 1 ? "es" : ""}
          </p>

          <div className="space-y-2">
            {pageMatches.map((match) => (
              <MatchCard key={match.id} match={match} matchOwnerUid={matchOwnerUid} enableComments={enableComments} />
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
