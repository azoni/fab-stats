"use client";
import { useState, useMemo } from "react";
import { MatchCard } from "./MatchCard";
import { MatchResult, GameFormat, type MatchRecord } from "@/types";

interface MatchListProps {
  matches: MatchRecord[];
  onDelete: (id: string) => void;
}

export function MatchList({ matches, onDelete }: MatchListProps) {
  const [filterResult, setFilterResult] = useState<string>("all");
  const [filterFormat, setFilterFormat] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  const filtered = useMemo(() => {
    let result = [...matches];

    if (filterResult !== "all") {
      result = result.filter((m) => m.result === filterResult);
    }
    if (filterFormat !== "all") {
      result = result.filter((m) => m.format === filterFormat);
    }

    result.sort((a, b) => {
      const diff = new Date(b.date).getTime() - new Date(a.date).getTime();
      return sortOrder === "newest" ? diff : -diff;
    });

    return result;
  }, [matches, filterResult, filterFormat, sortOrder]);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
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

        <button
          onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}
          className="bg-fab-surface border border-fab-border rounded-md px-3 py-1.5 text-fab-muted text-sm hover:text-fab-text transition-colors"
        >
          {sortOrder === "newest" ? "Newest First" : "Oldest First"}
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-fab-dim">
          <p className="text-lg mb-1">No matches found</p>
          <p className="text-sm">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((match) => (
            <MatchCard key={match.id} match={match} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
