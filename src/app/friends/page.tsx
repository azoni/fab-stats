"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  Clock,
  ExternalLink,
  Inbox,
  Search,
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

type FriendRow = {
  friendship: Friendship;
  other: ReturnType<typeof getOtherUser>;
};

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
      <div className="max-w-md mx-auto py-16 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-fab-border bg-fab-surface text-fab-gold">
          <Users className="h-5 w-5" />
        </div>
        <h1 className="text-xl font-bold text-fab-text">Friends</h1>
        <p className="mt-2 text-sm text-fab-muted">Sign in to view friends and manage requests.</p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-fab-gold px-5 py-2.5 text-sm font-semibold text-fab-bg hover:bg-fab-gold-light"
        >
          Sign In
        </Link>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="h-16 rounded-lg border border-fab-border bg-fab-surface animate-pulse" />
        <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <div className="h-48 rounded-lg border border-fab-border bg-fab-surface animate-pulse" />
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 rounded-lg border border-fab-border bg-fab-surface animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <header className="flex flex-col gap-4 border-b border-fab-border/70 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-fab-text">Friends</h1>
          <p className="mt-1 text-sm text-fab-muted">
            {friends.length} {friends.length === 1 ? "friend" : "friends"} / {incomingRequests.length} incoming / {outgoingRequests.length} sent
          </p>
        </div>
        <Link
          href="/search"
          className="inline-flex w-fit items-center gap-2 rounded-md border border-fab-border bg-fab-surface px-3 py-2 text-sm font-semibold text-fab-text hover:border-fab-gold/50 hover:text-fab-gold"
        >
          <UserPlus className="h-4 w-4" />
          Find Players
        </Link>
      </header>

      <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="space-y-3">
          <nav className="rounded-lg border border-fab-border bg-fab-surface p-2">
            <SideTab
              active={tab === "friends"}
              icon={<Users className="h-4 w-4" />}
              label="Roster"
              detail={`${friends.length} connected`}
              onClick={() => setTab("friends")}
            />
            <SideTab
              active={tab === "requests"}
              icon={<Inbox className="h-4 w-4" />}
              label="Requests"
              detail={pendingCount > 0 ? `${pendingCount} pending` : "Nothing pending"}
              count={pendingCount}
              onClick={() => setTab("requests")}
            />
          </nav>

          <div className="rounded-lg border border-fab-border bg-fab-surface p-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-fab-dim">At a glance</p>
            <SummaryRow label="Friends" value={friends.length} />
            <SummaryRow label="Incoming" value={incomingRequests.length} />
            <SummaryRow label="Sent" value={outgoingRequests.length} />
          </div>
        </aside>

        <section className="overflow-hidden rounded-lg border border-fab-border bg-fab-surface">
          <div className="flex flex-col gap-3 border-b border-fab-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-fab-text">{tab === "friends" ? "Roster" : "Requests"}</h2>
              <p className="text-xs text-fab-dim">
                {tab === "friends"
                  ? "Players you have connected with."
                  : "Incoming requests and invites you have sent."}
              </p>
            </div>

            {tab === "friends" ? (
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fab-dim" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search friends"
                  className="w-full rounded-md border border-fab-border bg-fab-bg py-2 pl-8 pr-3 text-sm text-fab-text placeholder:text-fab-dim focus:border-fab-gold focus:outline-none"
                />
              </div>
            ) : (
              <span className="w-fit rounded-full border border-fab-border bg-fab-bg px-2.5 py-1 text-xs font-semibold text-fab-muted">
                {pendingCount} pending
              </span>
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
        </section>
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
  friends: FriendRow[];
  hasAnyFriends: boolean;
  query: string;
  removing: string | null;
  onRemove: (friendshipId: string) => Promise<void>;
}) {
  if (friends.length === 0) {
    return (
      <EmptyState
        icon={<UserPlus className="h-6 w-6" />}
        title={hasAnyFriends ? "No matching friends" : "No friends yet"}
        description={
          hasAnyFriends
            ? "Try another name or username."
            : "Use search to find a player profile and send a request."
        }
        action={hasAnyFriends ? undefined : { href: "/search", label: "Find Players" }}
      />
    );
  }

  return (
    <div>
      {query.trim() && (
        <div className="border-b border-fab-border/70 px-4 py-2 text-xs text-fab-dim">
          {friends.length} {friends.length === 1 ? "match" : "matches"} for "{query.trim()}"
        </div>
      )}
      <div className="divide-y divide-fab-border/70">
        {friends.map(({ friendship, other }) => (
          <div key={friendship.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
            <Link href={`/player/${other.username}`} className="group flex min-w-0 flex-1 items-center gap-3">
              <Avatar name={other.displayName} photoUrl={other.photoUrl} />
              <div className="min-w-0">
                <div className="truncate font-semibold text-fab-text group-hover:text-fab-gold">{other.displayName}</div>
                <div className="text-xs text-fab-dim">@{other.username}</div>
                <div className="mt-0.5 text-[11px] text-fab-muted">
                  Friends since {timeAgo(friendship.acceptedAt || friendship.createdAt)}
                </div>
              </div>
            </Link>
            <div className="flex items-center gap-2 sm:justify-end">
              <Link
                href={`/player/${other.username}`}
                className="inline-flex items-center gap-1.5 rounded-md border border-fab-border bg-fab-bg px-3 py-1.5 text-xs font-semibold text-fab-muted hover:border-fab-muted hover:text-fab-text"
              >
                Profile
                <ExternalLink className="h-3 w-3" />
              </Link>
              <button
                onClick={() => onRemove(friendship.id)}
                disabled={removing === friendship.id}
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-fab-dim hover:bg-fab-loss/5 hover:text-fab-loss disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
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
        icon={<Inbox className="h-6 w-6" />}
        title="No pending requests"
        description="Friend requests will appear here when players connect with you."
        action={{ href: "/search", label: "Find Players" }}
      />
    );
  }

  return (
    <div className="space-y-5 p-4">
      {incomingRequests.length > 0 && (
        <RequestSection title="Incoming" count={incomingRequests.length}>
          {incomingRequests.map((friendship) => (
            <RequestCard
              key={friendship.id}
              person={friendship.requesterInfo}
              meta={`Sent ${timeAgo(friendship.createdAt)}`}
              actions={
                <>
                  <button
                    onClick={() => onAccept(friendship.id)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-fab-gold px-3 py-1.5 text-xs font-semibold text-fab-bg hover:bg-fab-gold-light"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Accept
                  </button>
                  <button
                    onClick={() => onDecline(friendship.id)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-fab-border bg-fab-bg px-3 py-1.5 text-xs font-semibold text-fab-muted hover:border-fab-muted hover:text-fab-text"
                  >
                    <X className="h-3.5 w-3.5" />
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
              person={friendship.recipientInfo}
              meta={`Waiting ${timeAgo(friendship.createdAt)}`}
              actions={
                <>
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-fab-border bg-fab-bg px-3 py-1.5 text-xs font-semibold text-fab-dim">
                    <Clock className="h-3.5 w-3.5" />
                    Pending
                  </span>
                  <button
                    onClick={() => onDecline(friendship.id)}
                    className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-fab-dim hover:bg-fab-loss/5 hover:text-fab-loss"
                  >
                    <X className="h-3.5 w-3.5" />
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

function SideTab({
  active,
  icon,
  label,
  detail,
  count,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  detail: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors ${
        active ? "bg-fab-bg text-fab-text" : "text-fab-muted hover:bg-fab-bg/70 hover:text-fab-text"
      }`}
    >
      <span className={active ? "text-fab-gold" : "text-fab-dim"}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block truncate text-xs text-fab-dim">{detail}</span>
      </span>
      {!!count && (
        <span className="rounded-full bg-fab-loss px-1.5 py-0.5 text-[10px] font-bold text-white">{count}</span>
      )}
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between border-t border-fab-border/50 py-2 first:border-t-0 first:pt-0 last:pb-0">
      <span className="text-xs text-fab-muted">{label}</span>
      <span className="text-sm font-bold tabular-nums text-fab-text">{value}</span>
    </div>
  );
}

function RequestSection({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-fab-dim">{title}</h3>
        <span className="text-xs font-semibold text-fab-muted">{count}</span>
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
  person: { displayName: string; username: string; photoUrl?: string };
  meta: string;
  actions: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-fab-border bg-fab-bg px-3 py-3 sm:flex-row sm:items-center">
      <Link href={`/player/${person.username}`} className="group flex min-w-0 flex-1 items-center gap-3">
        <Avatar name={person.displayName} photoUrl={person.photoUrl} />
        <div className="min-w-0">
          <div className="truncate font-semibold text-fab-text group-hover:text-fab-gold">{person.displayName}</div>
          <div className="text-xs text-fab-dim">@{person.username}</div>
          <div className="mt-0.5 text-[11px] text-fab-muted">{meta}</div>
        </div>
      </Link>
      <div className="flex items-center gap-2 sm:justify-end">{actions}</div>
    </div>
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
    <div className="px-4 py-14 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-fab-border bg-fab-bg text-fab-dim">
        {icon}
      </div>
      <p className="font-semibold text-fab-text">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-fab-dim">{description}</p>
      {action && (
        <Link
          href={action.href}
          className="mt-5 inline-flex items-center gap-2 rounded-md border border-fab-border bg-fab-bg px-3 py-2 text-sm font-semibold text-fab-muted hover:border-fab-muted hover:text-fab-text"
        >
          <UserPlus className="h-4 w-4 text-fab-gold" />
          {action.label}
        </Link>
      )}
    </div>
  );
}

function Avatar({ name, photoUrl }: { name: string; photoUrl?: string }) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={`${name}'s photo`}
        className="h-11 w-11 shrink-0 rounded-full border border-fab-border object-cover"
        loading="lazy"
      />
    );
  }
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-fab-gold/20 bg-fab-gold/15 font-bold text-fab-gold">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
