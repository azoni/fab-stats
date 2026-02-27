"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { getActivePoll, getUserVote, submitVote } from "@/lib/polls";
import type { Poll, PollVote } from "@/types";

export function PollCard() {
  const { user } = useAuth();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [vote, setVote] = useState<PollVote | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(true);

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
        }
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [user]);

  if (loading || !poll) return null;

  async function handleVote() {
    if (selected === null || !user) return;
    setSubmitting(true);
    try {
      await submitVote(user.uid, selected);
      setVote({ optionIndex: selected, votedAt: new Date().toISOString() });
      setHasVoted(true);
    } catch (err) {
      console.error("Vote error:", err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-fab-surface border border-fab-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-fab-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h3 className="text-sm font-semibold text-fab-text">Community Poll</h3>
      </div>

      <p className="text-sm text-fab-muted mb-3">{poll.question}</p>

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

      {user ? (
        <>
          <button
            onClick={handleVote}
            disabled={selected === null || submitting || (hasVoted && selected === vote?.optionIndex)}
            className="mt-3 w-full py-2 rounded-md text-sm font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors disabled:opacity-50"
          >
            {submitting ? "Submitting..." : hasVoted ? "Change Vote" : "Vote"}
          </button>
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
  );
}
