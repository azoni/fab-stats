"use client";
/**
 * Manager panel: search players by username and invite them to the league.
 * Mirrors TeamInviteSearch — invites land as a notification plus an inline
 * banner on the league page for the invited player.
 */
import { useState, useRef, useEffect } from "react";
import { searchUsernames } from "@/lib/firestore-storage";
import { sendLeagueInvite, cancelLeagueInvite } from "@/lib/leagues";
import type { League, LeagueMember, LeagueInvite } from "@/types";
import { toast } from "sonner";
import { Search, X } from "lucide-react";

interface LeagueInviteSearchProps {
  league: League;
  inviter: { uid: string; displayName: string };
  members: LeagueMember[];
  pendingInvites: LeagueInvite[];
  onChanged: () => void;
}

export function LeagueInviteSearch({ league, inviter, members, pendingInvites, onChanged }: LeagueInviteSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ username: string; userId: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const memberUids = new Set(members.map((m) => m.uid));
  const pendingUids = new Set(pendingInvites.map((i) => i.targetUid));

  useEffect(() => {
    // Empty query clears results in the onChange handler, not here (lint:
    // no synchronous setState in effects).
    if (!query.trim()) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchUsernames(query, 10);
        setResults(res.filter((r) => !memberUids.has(r.userId)));
      } catch {
        setResults([]);
      }
      setSearching(false);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleInvite(userId: string, username?: string) {
    setSending(userId);
    try {
      await sendLeagueInvite(league, inviter, userId, username);
      toast.success("Invite sent!");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send invite.");
    }
    setSending(null);
  }

  async function handleCancel(inviteId: string) {
    try {
      await cancelLeagueInvite(inviteId);
      toast.success("Invite cancelled.");
      onChanged();
    } catch {
      toast.error("Failed to cancel invite.");
    }
  }

  return (
    <div className="rounded-xl border border-fab-border bg-fab-surface p-4">
      <label className="mb-1.5 block text-xs font-medium text-fab-muted">Invite players</label>
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fab-dim" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!e.target.value.trim()) setResults([]);
          }}
          placeholder="Search by username or name..."
          className="w-full rounded-lg border border-fab-border bg-fab-bg py-2 pl-9 pr-8 text-sm text-fab-text placeholder:text-fab-dim transition-colors focus:border-fab-gold/50 focus:outline-none"
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-fab-dim hover:text-fab-muted">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {query.trim() && (
        <div className="mb-4 space-y-1">
          {searching && <p className="py-2 text-xs text-fab-dim">Searching...</p>}
          {!searching && results.length === 0 && query.trim().length >= 2 && (
            <p className="py-2 text-xs text-fab-dim">No users found.</p>
          )}
          {results.map((r) => {
            const isPending = pendingUids.has(r.userId);
            return (
              <div key={r.userId} className="flex items-center justify-between rounded-lg border border-fab-border bg-fab-bg px-3 py-2">
                <span className="text-sm text-fab-text">@{r.username}</span>
                {isPending ? (
                  <span className="text-[11px] text-fab-dim">Invite pending</span>
                ) : (
                  <button
                    onClick={() => handleInvite(r.userId, r.username)}
                    disabled={sending === r.userId}
                    className="rounded bg-fab-gold/15 px-2.5 py-1 text-[11px] text-fab-gold transition-colors hover:bg-fab-gold/25 disabled:opacity-50"
                  >
                    {sending === r.userId ? "Sending..." : "Invite"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {pendingInvites.length > 0 && (
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fab-muted">Pending invites</label>
          <div className="space-y-1">
            {pendingInvites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between rounded-lg border border-fab-border bg-fab-bg px-3 py-2">
                <div>
                  <span className="text-sm text-fab-text">{inv.targetUsername ? `@${inv.targetUsername}` : inv.targetUid}</span>
                  <span className="ml-2 text-xs text-fab-dim">invited by {inv.inviterName}</span>
                </div>
                <button
                  onClick={() => handleCancel(inv.id)}
                  className="rounded bg-fab-loss/10 px-2 py-1 text-[11px] text-fab-loss transition-colors hover:bg-fab-loss/20"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
