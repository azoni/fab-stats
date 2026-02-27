"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { getActivePoll, getUserVote, submitVote, getPollResults } from "@/lib/polls";
import type { Poll, PollVote, PollResults } from "@/types";

export function PollCard() {
  const { user } = useAuth();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [vote, setVote] = useState<PollVote | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<PollResults | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const activePoll = await getActivePoll();
      if (cancelled) return;
      setPoll(activePoll);

      if (activePoll && user) {
        const existing = await getUserVote(user.uid);
        if (!cancelled && existing) {
          setVote(existing);
          setSelected(existing.optionIndex);
          setHasVoted(true);
          // Fetch live results if user already voted and results are enabled
          if (activePoll.showResults) {
            const res = await getPollResults();
            if (!cancelled) setResults(res);
          }
        }
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [user]);

  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  if (loading || !poll) return null;

  const showResults = poll.showResults && hasVoted && results;
  const resultCounts = results?.counts || [];
  const resultTotal = results?.total || 0;

  async function handleVote() {
    if (selected === null || !user) return;
    setSubmitting(true);
    try {
      await submitVote(user.uid, selected);
      setVote({ optionIndex: selected, votedAt: new Date().toISOString() });
      setHasVoted(true);
      // Fetch live results right after voting
      if (poll!.showResults) {
        const res = await getPollResults();
        setResults(res);
      }
    } catch (err) {
      console.error("Vote error:", err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-fab-surface border border-fab-border rounded-lg">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 p-4 text-left cursor-pointer"
      >
        <svg className="w-4 h-4 text-fab-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h3 className="text-sm font-semibold text-fab-text flex-1">Community Poll</h3>
        <svg
          className={`w-4 h-4 text-fab-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        ref={contentRef}
        className="overflow-hidden transition-all duration-200 ease-in-out"
        style={{
          maxHeight: open ? contentRef.current?.scrollHeight ?? "none" : 0,
          opacity: open ? 1 : 0,
        }}
      >
        <div className="px-4 pb-4">
          <p className="text-sm text-fab-muted mb-3">{poll.question}</p>

          {showResults ? (
            <div className="space-y-2">
              {poll.options.map((option, i) => {
                const count = resultCounts[i] || 0;
                const pct = resultTotal > 0 ? (count / resultTotal) * 100 : 0;
                const isMyVote = vote?.optionIndex === i;
                return (
                  <div key={i} className="relative">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-fab-border bg-fab-bg overflow-hidden">
                      <div
                        className="absolute inset-0 bg-fab-gold/10 rounded-md transition-all"
                        style={{ width: `${pct}%` }}
                      />
                      <span className={`relative text-sm flex-1 ${isMyVote ? "text-fab-gold font-medium" : "text-fab-text"}`}>
                        {option}
                      </span>
                      <span className="relative text-xs text-fab-dim">{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })}
              <p className="text-xs text-fab-dim text-center mt-1">
                {resultTotal} vote{resultTotal !== 1 ? "s" : ""}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {poll.options.map((option, i) => (
                <button
                  key={i}
                  onClick={() => user && setSelected(i)}
                  disabled={submitting || !user}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm border transition-colors ${
                    selected === i
                      ? "border-fab-gold bg-fab-gold/10 text-fab-gold"
                      : "border-fab-border bg-fab-bg text-fab-text hover:border-fab-gold/30"
                  } ${!user ? "cursor-default opacity-70" : ""}`}
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          {user ? (
            <>
              {!showResults && (
                <button
                  onClick={handleVote}
                  disabled={selected === null || submitting || (hasVoted && selected === vote?.optionIndex)}
                  className="mt-3 w-full py-2 rounded-md text-sm font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : hasVoted ? "Change Vote" : "Vote"}
                </button>
              )}
              {hasVoted && (
                <p className="text-xs text-fab-dim mt-2 text-center">
                  Thanks for voting!
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-fab-dim mt-3 text-center">
              <Link href="/login" className="text-fab-gold hover:text-fab-gold-light">Sign in</Link> to vote
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
