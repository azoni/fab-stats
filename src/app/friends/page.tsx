"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  Clock,
  ExternalLink,
  Inbox,
  Search,
  Sparkles,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFriends } from "@/hooks/useFriends";
import type { Friendship } from "@/types";

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function getOtherUser(friendship: Friendship, myUid: string) {
  return friendship.requesterUid === myUid ? friendship.recipientInfo : friendship.requesterInfo;
}

export default function FriendsPage() {
  const { user, isGuest } = useAuth();
  const {
    friends,
    incomingRequests,
    outgoingRequests,
    loaded,
    acceptRequest,
    declineRequest,
    removeFriend,
  } = useFriends();
  const [tab, setTab] = useState<"friends" | "requests">("friends");
  const [removing, setRemoving] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const pendingCount = incomingRequests.length + outgoingRequests.length;
  const filteredFriends = useMemo(() => {
    if (!user) return [];
    const q = query.trim().toLowerCase();
    return friends
      .map((friendship) => ({ friendship, other: getOtherUser(friendship, user.uid) }))
      .filter(({ other }) => {
        if (!q) return true;
        return other.displayName.toLowerCase().includes(q) || other.username.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        const aTime = new Date(a.friendship.acceptedAt || a.friendship.createdAt).getTime();
        const bTime = new Date(b.friendship.acceptedAt || b.friendship.createdAt).getTime();
        return bTime - aTime;
      });
  }, [friends, query, user]);

  if (!user || isGuest) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <div className="w-14 h-14 mx-auto rounded-xl bg-fab-gold/10 ring-1 ring-fab-gold/20 flex items-center justify-center mb-4">
          <Users className="w-7 h-7 text-fab-gold" />
        </div>
        <h1 className="text-xl font-bold text-fab-text mb-2">Friends are better signed in</h1>
        <p className="text-sm text-fab-muted mb-6">Sign in to add players, manage requests, and follow friend activity.</p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center px-6 py-3 rounded-md font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors"
        >
          Sign In
        </Link>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="space-y-4">
        <div className="bg-fab-surface border border-fab-border rounded-lg p-5 h-36 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-fab-surface border border-fab-border rounded-lg p-4 h-20 animate-pulse" />
          ))}
        </div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-fab-surface border border-fab-border rounded-lg p-4 h-20 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden bg-fab-surface border border-fab-border rounded-lg">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-fab-gold via-sky-400 to-indigo-400" />
        <div className="p-5 sm:p-6 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center ring-1 ring-inset ring-blue-500/20 shrink-0">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-fab-gold mb-1">Community</p>
              <h1 className="text-2xl font-bold text-fab-text leading-tight">Friends</h1>
              <p className="text-sm text-fab-muted mt-1 max-w-xl">
                Keep your favorite players close, jump to their profiles, and handle friend requests from one place.
              </p>
            </div>
          </div>
          <Link
            href="/search"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Find Players
          </Link>
        </div>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Friends" value={friends.length} icon={<Users className="w-4 h-4" />} tone="gold" />
        <StatCard label="Incoming" value={incomingRequests.length} icon={<Inbox className="w-4 h-4" />} tone="blue" />
        <StatCard label="Sent" value={outgoingRequests.length} icon={<Clock className="w-4 h-4" />} tone="muted" />
      </div>

      <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
        <div className="flex flex-col gap-3 p-3 border-b border-fab-border sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1 bg-fab-bg border border-fab-border rounded-lg p-1 w-fit">
            <TabButton active={tab === "friends"} onClick={() => setTab("friends")}>
              Friends
            </TabButton>
            <TabButton active={tab === "requests"} onClick={() => setTab("requests")}>
              Requests
              {pendingCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-fab-loss text-white">
                  {pendingCount}
                </span>
              )}
            </TabButton>
          </div>

          {tab === "friends" && (
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-fab-dim" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search friends..."
                className="w-full bg-fab-bg border border-fab-border rounded-lg pl-8 pr-3 py-2 text-sm text-fab-text placeholder:text-fab-dim focus:outline-none focus:border-fab-gold"
              />
            </div>
          )}
        </div>

        {tab === "friends" ? (
          <FriendsList
            friends={filteredFriends}
            hasAnyFriends={friends.length > 0}
            query={query}
            removing={removing}
            onRemove={async (friendshipId) => {
              setRemoving(friendshipId);
              try {
                await removeFriend(friendshipId);
              } finally {
                setRemoving(null);
              }
            }}
          />
        ) : (
          <RequestsList
            incomingRequests={incomingRequests}
            outgoingRequests={outgoingRequests}
            onAccept={acceptRequest}
            onDecline={declineRequest}
          />
        )}
      </div>
    </div>
  );
}

function FriendsList({
  friends,
  hasAnyFriends,
  query,
  removing,
  onRemove,
}: {
  friends: { friendship: Friendship; other: ReturnType<typeof getOtherUser> }[];
  hasAnyFriends: boolean;
  query: string;
  removing: string | null;
  onRemove: (friendshipId: string) => Promise<void>;
}) {
  if (friends.length === 0) {
    return (
      <EmptyState
        icon={<UserPlus className="w-7 h-7" />}
        title={hasAnyFriends ? "No friends match that search" : "No friends yet"}
        description={
          hasAnyFriends
            ? "Try a different name or username."
            : "Search for players and send friend requests from their profiles."
        }
        action={hasAnyFriends ? undefined : { href: "/search", label: "Find Players" }}
      />
    );
  }

  return (
    <div className="divide-y divide-fab-border/60">
      {query.trim() && (
        <div className="px-4 py-2 text-xs text-fab-dim">
          Showing {friends.length} {friends.length === 1 ? "friend" : "friends"} for "{query.trim()}"
        </div>
      )}
      {friends.map(({ friendship, other }) => (
        <div key={friendship.id} className="p-3 sm:p-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href={`/player/${other.username}`}
            className="flex items-center gap-3 flex-1 min-w-0 group"
          >
            <Avatar name={other.displayName} photoUrl={other.photoUrl} />
            <div className="min-w-0">
              <div className="font-semibold text-fab-text truncate group-hover:text-fab-gold transition-colors">{other.displayName}</div>
              <div className="text-xs text-fab-dim">@{other.username}</div>
              <div className="text-[11px] text-fab-muted mt-0.5">
                Friends since {timeAgo(friendship.acceptedAt || friendship.createdAt)}
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-2 sm:justify-end">
            <Link
              href={`/player/${other.username}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-fab-bg border border-fab-border text-fab-muted hover:text-fab-text hover:border-fab-muted transition-colors"
            >
              Profile
              <ExternalLink className="w-3 h-3" />
            </Link>
            <button
              onClick={() => onRemove(friendship.id)}
              disabled={removing === friendship.id}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-fab-dim hover:text-fab-loss hover:bg-fab-loss/5 transition-colors disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5" />
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function RequestsList({
  incomingRequests,
  outgoingRequests,
  onAccept,
  onDecline,
}: {
  incomingRequests: Friendship[];
  outgoingRequests: Friendship[];
  onAccept: (friendshipId: string) => Promise<void>;
  onDecline: (friendshipId: string) => Promise<void>;
}) {
  if (incomingRequests.length === 0 && outgoingRequests.length === 0) {
    return (
      <EmptyState
        icon={<Inbox className="w-7 h-7" />}
        title="No pending requests"
        description="Friend requests from other players will appear here."
        action={{ href: "/search", label: "Find Players" }}
      />
    );
  }

  return (
    <div className="p-3 sm:p-4 space-y-5">
      {incomingRequests.length > 0 && (
        <RequestSection title="Incoming" count={incomingRequests.length} highlight>
          {incomingRequests.map((friendship) => (
            <RequestCard
              key={friendship.id}
              friendship={friendship}
              person={friendship.requesterInfo}
              meta={`Sent ${timeAgo(friendship.createdAt)}`}
              actions={
                <>
                  <button
                    onClick={() => onAccept(friendship.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Accept
                  </button>
                  <button
                    onClick={() => onDecline(friendship.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-fab-bg border border-fab-border text-fab-muted hover:text-fab-text hover:border-fab-muted transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    Decline
                  </button>
                </>
              }
            />
          ))}
        </RequestSection>
      )}

      {outgoingRequests.length > 0 && (
        <RequestSection title="Sent" count={outgoingRequests.length}>
          {outgoingRequests.map((friendship) => (
            <RequestCard
              key={friendship.id}
              friendship={friendship}
              person={friendship.recipientInfo}
              meta={`Waiting ${timeAgo(friendship.createdAt)}`}
              actions={
                <>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-fab-dim bg-fab-bg border border-fab-border">
                    <Clock className="w-3.5 h-3.5" />
                    Pending
                  </span>
                  <button
                    onClick={() => onDecline(friendship.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-fab-dim hover:text-fab-loss hover:bg-fab-loss/5 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    Cancel
                  </button>
                </>
              }
            />
          ))}
        </RequestSection>
      )}
    </div>
  );
}

function RequestSection({ title, count, highlight, children }: { title: string; count: number; highlight?: boolean; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <h2 className="text-xs text-fab-muted uppercase tracking-wider font-semibold">{title}</h2>
        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${highlight ? "bg-fab-gold/15 text-fab-gold" : "bg-fab-bg text-fab-dim"}`}>
          {count}
        </span>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function RequestCard({
  person,
  meta,
  actions,
}: {
  friendship: Friendship;
  person: { displayName: string; username: string; photoUrl?: string };
  meta: string;
  actions: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 bg-fab-bg border border-fab-border rounded-lg p-3 sm:flex-row sm:items-center">
      <Link href={`/player/${person.username}`} className="flex items-center gap-3 flex-1 min-w-0 group">
        <Avatar name={person.displayName} photoUrl={person.photoUrl} />
        <div className="min-w-0">
          <div className="font-semibold text-fab-text truncate group-hover:text-fab-gold transition-colors">{person.displayName}</div>
          <div className="text-xs text-fab-dim">@{person.username}</div>
          <div className="text-[11px] text-fab-muted mt-0.5">{meta}</div>
        </div>
      </Link>
      <div className="flex items-center gap-2 sm:justify-end">{actions}</div>
    </div>
  );
}

function StatCard({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone: "gold" | "blue" | "muted" }) {
  const toneClass =
    tone === "gold"
      ? "text-fab-gold bg-fab-gold/10 ring-fab-gold/20"
      : tone === "blue"
      ? "text-blue-400 bg-blue-500/10 ring-blue-500/20"
      : "text-fab-muted bg-fab-bg ring-fab-border";
  return (
    <div className="bg-fab-surface border border-fab-border rounded-lg p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ring-1 ring-inset ${toneClass}`}>{icon}</div>
      <div>
        <div className="text-2xl font-bold text-fab-text tabular-nums leading-none">{value}</div>
        <div className="text-xs text-fab-muted mt-1">{label}</div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
        active ? "bg-fab-gold text-fab-bg" : "text-fab-muted hover:text-fab-text"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="text-center py-14 px-4">
      <div className="w-14 h-14 mx-auto rounded-xl bg-fab-bg border border-fab-border flex items-center justify-center text-fab-dim mb-4">
        {icon}
      </div>
      <p className="text-fab-text font-semibold mb-1">{title}</p>
      <p className="text-fab-dim text-sm max-w-sm mx-auto">{description}</p>
      {action && (
        <Link
          href={action.href}
          className="inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-lg text-sm font-semibold bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text hover:border-fab-muted transition-colors"
        >
          <Sparkles className="w-4 h-4 text-fab-gold" />
          {action.label}
        </Link>
      )}
    </div>
  );
}

function Avatar({ name, photoUrl }: { name: string; photoUrl?: string }) {
  if (photoUrl) {
    return <img src={photoUrl} alt={`${name}'s photo`} className="w-11 h-11 rounded-full object-cover border border-fab-border" loading="lazy" />;
  }
  return (
    <div className="w-11 h-11 rounded-full bg-fab-gold/20 border border-fab-gold/20 flex items-center justify-center text-fab-gold font-bold shrink-0">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
