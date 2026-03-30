"use client";
import { useState, useRef, useEffect } from "react";
import { searchUsernames } from "@/lib/firestore-storage";
import { sendGroupInvite, cancelGroupInvite } from "@/lib/groups";
import type { GroupMember, GroupInvite } from "@/types";
import { toast } from "sonner";
import { Search, X } from "lucide-react";

interface GroupInviteSearchProps {
  groupId: string;
  groupName: string;
  groupIconUrl?: string;
  inviter: { uid: string; displayName: string };
  members: GroupMember[];
  pendingInvites: GroupInvite[];
  onInviteSent: () => void;
}

export function GroupInviteSearch({
  groupId, groupName, groupIconUrl, inviter, members, pendingInvites, onInviteSent,
}: GroupInviteSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ username: string; userId: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const memberUids = new Set(members.map((m) => m.uid));
  const pendingUids = new Set(pendingInvites.map((i) => i.targetUid));

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
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
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleInvite(userId: string, username?: string) {
    setSending(userId);
    try {
      await sendGroupInvite(groupId, groupName, groupIconUrl, inviter, userId, username);
      toast.success("Invite sent!");
      onInviteSent();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send invite.");
    }
    setSending(null);
  }

  async function handleCancel(inviteId: string) {
    try {
      await cancelGroupInvite(inviteId);
      toast.success("Invite cancelled.");
      onInviteSent();
    } catch {
      toast.error("Failed to cancel invite.");
    }
  }

  return (
    <div>
      <label className="block text-xs text-fab-muted mb-1.5 font-medium">Invite Members</label>
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fab-dim" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username or name..."
          className="w-full bg-fab-bg border border-fab-border rounded-lg pl-9 pr-8 py-2 text-sm text-fab-text placeholder:text-fab-dim focus:outline-none focus:border-fab-gold/50 transition-colors"
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-fab-dim hover:text-fab-muted">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Search results */}
      {query.trim() && (
        <div className="space-y-1 mb-4">
          {searching && <p className="text-xs text-fab-dim py-2">Searching...</p>}
          {!searching && results.length === 0 && query.trim().length >= 2 && (
            <p className="text-xs text-fab-dim py-2">No users found.</p>
          )}
          {results.map((r) => {
            const isPending = pendingUids.has(r.userId);
            return (
              <div key={r.userId} className="flex items-center justify-between py-2 px-3 rounded-lg bg-fab-bg border border-fab-border">
                <span className="text-sm text-fab-text">@{r.username}</span>
                {isPending ? (
                  <span className="text-[11px] text-fab-dim">Invite pending</span>
                ) : (
                  <button
                    onClick={() => handleInvite(r.userId, r.username)}
                    disabled={sending === r.userId}
                    className="text-[11px] px-2.5 py-1 rounded bg-fab-gold/15 text-fab-gold hover:bg-fab-gold/25 transition-colors disabled:opacity-50"
                  >
                    {sending === r.userId ? "Sending..." : "Invite"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <div>
          <label className="block text-xs text-fab-muted mb-1.5 font-medium">Pending Invites</label>
          <div className="space-y-1">
            {pendingInvites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-fab-bg border border-fab-border">
                <div>
                  <span className="text-sm text-fab-text">{inv.targetUsername ? `@${inv.targetUsername}` : inv.targetUid}</span>
                  <span className="text-xs text-fab-dim ml-2">invited by {inv.inviterName}</span>
                </div>
                <button
                  onClick={() => handleCancel(inv.id)}
                  className="text-[11px] px-2 py-1 rounded bg-fab-loss/10 text-fab-loss hover:bg-fab-loss/20 transition-colors"
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
