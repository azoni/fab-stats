"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribePoll,
  subscribePollResults,
  getUserVote,
  submitVote,
  addPredictionOption,
  normalizeOptionKey,
  getUserOptionCount,
} from "@/lib/polls";
import { containsProfanity } from "@/lib/profanity-filter";
import type { Poll, PollVote, PollResults } from "@/types";

export function PredictionCard({ pollId }: { pollId: string }) {
  const { user } = useAuth();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [results, setResults] = useState<PollResults>({ counts: [], total: 0 });
  const [vote, setVote] = useState<PollVote | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [adding, setAdding] = useState(false);
  const [changing, setChanging] = useState(false);
  const [addError, setAddError] = useState("");

  // Real-time poll document
  useEffect(() => {
    const unsub = subscribePoll(pollId, setPoll);
    return unsub;
  }, [pollId]);

  // Real-time results
  useEffect(() => {
    const unsub = subscribePollResults(pollId, setResults);
    return unsub;
  }, [pollId]);

  // Fetch user's existing vote
  useEffect(() => {
    if (!user) return;
    getUserVote(pollId, user.uid).then((v) => {
      if (v) {
        setVote(v);
        setSelected(v.optionIndex);
      }
    });
  }, [pollId, user]);

  // Filter options by search (excluding merged)
  const visibleOptions = useMemo(() => {
    if (!poll) return [];
    return poll.options
      .map((label, index) => ({ label, index }))
      .filter((opt) => !opt.label.startsWith("[MERGED]"));
  }, [poll?.options]);

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return visibleOptions;
    return visibleOptions.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [visibleOptions, search]);

  // Check if search text is an exact match to an existing option
  const searchNorm = normalizeOptionKey(search);
  const hasExactMatch = visibleOptions.some(
    (opt) => normalizeOptionKey(opt.label) === searchNorm,
  );
  const userAdds = user ? getUserOptionCount(poll, user.uid) : 0;
  const maxAdds = 5;
  const canAddNew = search.trim().length >= 2 && !hasExactMatch && userAdds < maxAdds;

  // Results view — sorted by votes desc (must be before early return to keep hooks stable)
  const sortedResults = useMemo(() => {
    return visibleOptions
      .map((opt) => ({
        ...opt,
        count: results.counts[opt.index] || 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [visibleOptions, results]);

  const hasVoted = vote !== null;
  const votingOpen = poll?.votingOpen ?? false;
  const isResolved = poll?.correctOptionIndex !== undefined && poll?.correctOptionIndex !== null;
  const showVoting = votingOpen && (!hasVoted || changing);
  const showResults = (hasVoted && !changing) || !votingOpen || isResolved;

  if (!poll) return null;

  async function handleVote() {
    if (selected === null || !user || !poll?.id) return;
    setSubmitting(true);
    try {
      await submitVote(poll.id, user.uid, selected);
      setVote({ optionIndex: selected, votedAt: new Date().toISOString() });
      setChanging(false);
    } catch (err) {
      console.error("Vote error:", err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddOption() {
    if (!user || !poll?.id || !search.trim()) return;
    const label = search.trim();
    if (containsProfanity(label)) {
      setAddError("That name contains inappropriate language.");
      return;
    }
    setAdding(true);
    setAddError("");
    try {
      const result = await addPredictionOption(poll.id, label, user.uid);
      setSelected(result.index);
      setSearch("");
      if (result.isDuplicate) {
        setAddError("That option already exists — selected it for you.");
      }
    } catch (err) {
      console.error("Add option error:", err);
      setAddError(err instanceof Error ? err.message : "Failed to add option.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="bg-fab-surface border border-fab-border rounded-lg p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-fab-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <h3 className="text-sm font-semibold text-fab-text flex-1">Predict the Winner</h3>
        {!votingOpen && !isResolved && (
          <span className="text-[10px] text-fab-dim bg-fab-border/50 px-2 py-0.5 rounded-full">Voting Closed</span>
        )}
        {isResolved && (
          <span className="text-[10px] text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">Resolved</span>
        )}
        {votingOpen && (
          <span className="text-[10px] text-fab-gold bg-fab-gold/10 px-2 py-0.5 rounded-full animate-pulse">Live</span>
        )}
      </div>

      <p className="text-xs text-fab-muted mb-3">{poll.question}</p>

      {/* Voting view */}
      {showVoting && user && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Search / Add */}
          <div className="relative mb-2">
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setAddError(""); }}
              placeholder="Search or add a player..."
              className="w-full px-3 py-1.5 rounded-md text-sm border border-fab-border bg-fab-bg text-fab-text placeholder:text-fab-dim focus:outline-none focus:border-fab-gold/50"
            />
          </div>

          {addError && (
            <p className="text-xs text-amber-400 mb-2">{addError}</p>
          )}

          {/* Option list */}
          <div className="flex-1 overflow-y-auto space-y-1 mb-2 max-h-48">
            {filteredOptions.map((opt) => (
              <button
                key={opt.index}
                onClick={() => setSelected(opt.index)}
                className={`w-full text-left px-3 py-1.5 rounded-md text-sm border transition-colors cursor-pointer ${
                  selected === opt.index
                    ? "border-fab-gold bg-fab-gold/10 text-fab-gold"
                    : "border-fab-border bg-fab-bg text-fab-text hover:border-fab-gold/30"
                }`}
              >
                {opt.label}
                {results.total > 0 && (
                  <span className="float-right text-fab-dim text-xs">
                    {results.counts[opt.index] || 0}
                  </span>
                )}
              </button>
            ))}
            {filteredOptions.length === 0 && search.trim() && (
              <p className="text-xs text-fab-dim text-center py-2">No matches found</p>
            )}
          </div>

          {/* Add new option */}
          {canAddNew && poll.allowUserOptions && (
            <button
              onClick={handleAddOption}
              disabled={adding}
              className="w-full text-left px-3 py-1.5 rounded-md text-sm border border-dashed border-fab-gold/30 text-fab-gold hover:bg-fab-gold/5 transition-colors mb-2 cursor-pointer"
            >
              {adding ? "Adding..." : `+ Add "${search.trim()}"`}
              <span className="float-right text-fab-dim text-xs">{maxAdds - userAdds} left</span>
            </button>
          )}
          {search.trim().length >= 2 && !hasExactMatch && userAdds >= maxAdds && poll.allowUserOptions && (
            <p className="text-xs text-fab-dim text-center mb-2">You&apos;ve reached the max of {maxAdds} added options</p>
          )}

          {/* Vote button */}
          <button
            onClick={handleVote}
            disabled={selected === null || submitting}
            className="w-full py-2 rounded-md text-sm font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors disabled:opacity-50 cursor-pointer"
          >
            {submitting ? "Submitting..." : hasVoted ? "Change Vote" : "Vote"}
          </button>
        </div>
      )}

      {/* Results view */}
      {showResults && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto space-y-1.5 mb-2 max-h-56">
            {sortedResults.map((opt) => {
              const pct = results.total > 0 ? (opt.count / results.total) * 100 : 0;
              const isMyVote = vote?.optionIndex === opt.index;
              const isWinner = isResolved && poll.correctOptionIndex === opt.index;
              return (
                <div key={opt.index} className="relative">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border overflow-hidden ${
                    isWinner ? "border-green-400/50 bg-green-400/5" : "border-fab-border bg-fab-bg"
                  }`}>
                    <div
                      className={`absolute inset-0 rounded-md transition-all ${isWinner ? "bg-green-400/10" : "bg-fab-gold/10"}`}
                      style={{ width: `${pct}%` }}
                    />
                    <span className={`relative text-sm flex-1 truncate ${
                      isWinner ? "text-green-400 font-medium" : isMyVote ? "text-fab-gold font-medium" : "text-fab-text"
                    }`}>
                      {isWinner && <span className="mr-1">&#10003;</span>}
                      {opt.label}
                      {isMyVote && !isWinner && <span className="ml-1 text-fab-dim text-xs">(you)</span>}
                    </span>
                    <span className="relative text-xs text-fab-dim">{opt.count}</span>
                    <span className="relative text-xs text-fab-dim w-10 text-right">{pct.toFixed(0)}%</span>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-fab-dim text-center">
            {results.total} vote{results.total !== 1 ? "s" : ""}
            {votingOpen && hasVoted && !changing && (
              <>
                {" "}&middot;{" "}
                <button
                  onClick={() => setChanging(true)}
                  className="text-fab-gold hover:text-fab-gold-light transition-colors cursor-pointer"
                >
                  Change vote
                </button>
              </>
            )}
          </p>

          {isResolved && hasVoted && poll.correctOptionIndex === vote?.optionIndex && (
            <p className="text-xs text-green-400 text-center mt-1 font-medium">You predicted correctly!</p>
          )}
        </div>
      )}

      {/* Not logged in */}
      {!user && (
        <p className="text-xs text-fab-dim text-center mt-2">
          <Link href="/login" className="text-fab-gold hover:text-fab-gold-light">Sign in</Link> to predict
        </p>
      )}
    </div>
  );
}
