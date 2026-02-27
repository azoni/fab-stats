"use client";
import { useState } from "react";
import Link from "next/link";
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
  if (friendship.requesterUid === myUid) {
    return friendship.recipientInfo;
  }
  return friendship.requesterInfo;
}

function getOtherUid(friendship: Friendship, myUid: string) {
  return friendship.participants.find((p) => p !== myUid) || "";
}

export default function FriendsPage() {
  const { user, isGuest } = useAuth();
  const {
    friends,
    incomingRequests,
    loaded,
    acceptRequest,
    declineRequest,
    removeFriend,
  } = useFriends();
  const [tab, setTab] = useState<"friends" | "requests">("friends");
  const [removing, setRemoving] = useState<string | null>(null);

  if (!user || isGuest) {
    return (
      <div className="text-center py-16">
        <p className="text-fab-muted mb-4">Sign in to add and view friends.</p>
        <Link
          href="/login"
          className="inline-block px-6 py-3 rounded-md font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors"
        >
          Sign In
        </Link>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 bg-fab-surface rounded animate-pulse" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-fab-surface border border-fab-border rounded-lg p-4 h-16 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fab-gold">Friends</h1>
        <p className="text-fab-muted text-sm mt-1">
          {friends.length} {friends.length === 1 ? "friend" : "friends"}
          {incomingRequests.length > 0 && (
            <span className="text-fab-gold ml-2">
              {incomingRequests.length} pending {incomingRequests.length === 1 ? "request" : "requests"}
            </span>
          )}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-fab-border">
        <button
          onClick={() => setTab("friends")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "friends"
              ? "border-fab-gold text-fab-gold"
              : "border-transparent text-fab-muted hover:text-fab-text"
          }`}
        >
          Friends
        </button>
        <button
          onClick={() => setTab("requests")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            tab === "requests"
              ? "border-fab-gold text-fab-gold"
              : "border-transparent text-fab-muted hover:text-fab-text"
          }`}
        >
          Requests
          {incomingRequests.length > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-fab-loss text-white">
              {incomingRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* Friends Tab */}
      {tab === "friends" && (
        <>
          {friends.length === 0 ? (
            <div className="text-center py-16">
              <svg className="w-12 h-12 text-fab-dim mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
              <p className="text-fab-muted mb-2">No friends yet</p>
              <p className="text-fab-dim text-sm">Visit a player&apos;s profile and tap the friend icon to send a request.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {friends.map((friendship) => {
                const other = getOtherUser(friendship, user.uid);
                const otherUid = getOtherUid(friendship, user.uid);
                return (
                  <div
                    key={friendship.id}
                    className="flex items-center gap-3 bg-fab-surface border border-fab-border rounded-lg p-3"
                  >
                    <Link
                      href={`/player/${other.username}`}
                      className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
                    >
                      {other.photoUrl ? (
                        <img src={other.photoUrl} alt="" className="w-10 h-10 rounded-full" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-fab-gold/20 flex items-center justify-center text-fab-gold font-bold">
                          {other.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-fab-text truncate">{other.displayName}</div>
                        <div className="text-xs text-fab-dim">@{other.username}</div>
                      </div>
                    </Link>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/player/${other.username}`}
                        className="text-xs text-fab-muted hover:text-fab-gold transition-colors"
                      >
                        View Profile
                      </Link>
                      <button
                        onClick={async () => {
                          setRemoving(friendship.id);
                          await removeFriend(friendship.id);
                          setRemoving(null);
                        }}
                        disabled={removing === friendship.id}
                        className="p-1.5 rounded text-fab-dim hover:text-fab-loss transition-colors disabled:opacity-50"
                        title="Remove friend"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Requests Tab */}
      {tab === "requests" && (
        <>
          {incomingRequests.length === 0 ? (
            <div className="text-center py-16">
              <svg className="w-12 h-12 text-fab-dim mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              <p className="text-fab-muted mb-2">No pending requests</p>
              <p className="text-fab-dim text-sm">Friend requests from other players will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {incomingRequests.map((friendship) => {
                const requester = friendship.requesterInfo;
                return (
                  <div
                    key={friendship.id}
                    className="flex items-center gap-3 bg-fab-surface border border-fab-gold/30 rounded-lg p-3"
                  >
                    <Link
                      href={`/player/${requester.username}`}
                      className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
                    >
                      {requester.photoUrl ? (
                        <img src={requester.photoUrl} alt="" className="w-10 h-10 rounded-full" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-fab-gold/20 flex items-center justify-center text-fab-gold font-bold">
                          {requester.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-fab-text truncate">{requester.displayName}</div>
                        <div className="text-xs text-fab-dim">@{requester.username}</div>
                        <div className="text-xs text-fab-dim">{timeAgo(friendship.createdAt)}</div>
                      </div>
                    </Link>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => acceptRequest(friendship.id)}
                        className="px-3 py-1.5 rounded-md text-xs font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => declineRequest(friendship.id)}
                        className="px-3 py-1.5 rounded-md text-xs font-semibold bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text hover:border-fab-muted transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
