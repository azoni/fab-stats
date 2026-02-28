"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { getProfile } from "@/lib/firestore-storage";
import type { UserNotification } from "@/types";

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

/** A display-layer group: message notifications from the same sender are merged. */
interface NotificationGroup {
  key: string;
  latest: UserNotification;
  ids: string[];
  isUnread: boolean;
  messageCount: number;
}

/** Group message notifications by sender. Other types pass through as-is. */
function groupNotifications(notifications: UserNotification[]): NotificationGroup[] {
  const groups: NotificationGroup[] = [];
  const msgBySender = new Map<string, UserNotification[]>();

  for (const n of notifications) {
    if (n.type === "message" && n.senderUid) {
      if (!msgBySender.has(n.senderUid)) msgBySender.set(n.senderUid, []);
      msgBySender.get(n.senderUid)!.push(n);
    } else {
      groups.push({
        key: n.id,
        latest: n,
        ids: [n.id],
        isUnread: !n.read,
        messageCount: 0,
      });
    }
  }

  for (const [, notifs] of msgBySender) {
    const sorted = [...notifs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const latest = sorted[0];
    // Sum messageCount across all docs from this sender (new-style have messageCount, old-style default to 1)
    const totalCount = sorted.reduce((sum, n) => sum + (n.messageCount || 1), 0);
    const anyUnread = sorted.some((n) => !n.read);

    groups.push({
      key: `msg_${latest.senderUid}`,
      latest,
      ids: sorted.map((n) => n.id),
      isUnread: anyUnread,
      messageCount: totalCount,
    });
  }

  groups.sort(
    (a, b) => new Date(b.latest.createdAt).getTime() - new Date(a.latest.createdAt).getTime()
  );
  return groups;
}

export default function NotificationsPage() {
  const { user, isGuest } = useAuth();
  const { notifications, loaded, markAsRead, markAllAsRead, deleteNotification, clearMessagesFrom, unreadCount } = useNotifications();
  const router = useRouter();
  const [usernameCache, setUsernameCache] = useState<Record<string, string>>({});

  const groups = useMemo(() => groupNotifications(notifications), [notifications]);

  // Look up usernames for UIDs so we can navigate to profiles
  useEffect(() => {
    const uids = [...new Set(notifications.map((n) => n.matchOwnerUid || n.senderUid || n.friendRequestFromUid).filter(Boolean))] as string[];
    const missing = uids.filter((uid) => !usernameCache[uid]);
    if (missing.length === 0) return;

    Promise.all(
      missing.map(async (uid) => {
        const profile = await getProfile(uid);
        return { uid, username: profile?.username };
      })
    ).then((results) => {
      const updates: Record<string, string> = {};
      for (const r of results) {
        if (r.username) updates[r.uid] = r.username;
      }
      if (Object.keys(updates).length > 0) {
        setUsernameCache((prev) => ({ ...prev, ...updates }));
      }
    });
  }, [notifications, usernameCache]);

  if (!user || isGuest) {
    return (
      <div className="text-center py-16 text-fab-dim">
        <p className="text-lg mb-1">Sign in to view notifications</p>
        <p className="text-sm">You need an account to receive notifications.</p>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-fab-surface rounded animate-pulse" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-fab-surface rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  async function handleGroupClick(group: NotificationGroup) {
    const n = group.latest;

    if (n.type === "message" && n.senderUid) {
      // Delete all message notifications from this sender (ephemeral)
      await clearMessagesFrom(n.senderUid);
      router.push(`/inbox/${n.senderUid}`);
    } else if (n.type === "comment" && n.matchOwnerUid) {
      await markAsRead(n.id);
      const username = usernameCache[n.matchOwnerUid];
      if (username) router.push(`/player/${username}`);
    } else if (n.type === "friendRequest") {
      await markAsRead(n.id);
      router.push("/friends");
    } else if (n.type === "friendAccepted" && n.friendRequestFromUsername) {
      await markAsRead(n.id);
      router.push(`/player/${n.friendRequestFromUsername}`);
    } else if (n.type === "friendAccepted" && n.friendRequestFromUid) {
      await markAsRead(n.id);
      const username = usernameCache[n.friendRequestFromUid];
      if (username) router.push(`/player/${username}`);
    }
  }

  async function handleGroupDelete(group: NotificationGroup) {
    // Delete all notification docs in this group
    await Promise.all(group.ids.map((id) => deleteNotification(id)));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-fab-gold">Notifications</h1>
          {groups.length > 0 && (
            <p className="text-fab-muted text-sm mt-1">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-sm text-fab-gold hover:text-fab-gold-light transition-colors"
          >
            Mark all as read
          </button>
        )}
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-16 text-fab-dim">
          <svg className="w-12 h-12 mx-auto mb-3 text-fab-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <p className="text-lg mb-1">No notifications yet</p>
          <p className="text-sm">When someone messages you or comments on your matches, you&apos;ll see it here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => {
            const n = group.latest;
            return (
              <div
                key={group.key}
                className={`bg-fab-surface border rounded-lg p-4 cursor-pointer transition-colors hover:bg-fab-surface-hover ${
                  group.isUnread ? "border-fab-gold/30" : "border-fab-border"
                }`}
                onClick={() => handleGroupClick(group)}
              >
                <div className="flex items-start gap-3">
                  {/* Unread dot */}
                  <div className="pt-1.5 shrink-0">
                    {group.isUnread ? (
                      <div className="w-2 h-2 rounded-full bg-fab-gold" />
                    ) : (
                      <div className="w-2 h-2" />
                    )}
                  </div>

                  {/* Author avatar */}
                  <div className="shrink-0">
                    {(() => {
                      const photo = n.type === "message" ? n.senderPhoto : n.type === "friendRequest" || n.type === "friendAccepted" ? n.friendRequestFromPhoto : n.commentAuthorPhoto;
                      const name = n.type === "message" ? (n.senderName || "?") : n.type === "friendRequest" || n.type === "friendAccepted" ? (n.friendRequestFromName || "?") : (n.commentAuthorName || "?");
                      return photo ? (
                        <img src={photo} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-fab-gold/20 flex items-center justify-center text-fab-gold text-sm font-bold">
                          {name.charAt(0).toUpperCase()}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {n.type === "message" ? (
                      <>
                        <p className="text-sm text-fab-text">
                          <span className="font-semibold">{n.senderName}</span>{" "}
                          {group.messageCount > 1
                            ? `sent you ${group.messageCount} messages`
                            : "sent you a message"}
                        </p>
                        {n.messagePreview && (
                          <p className="text-xs text-fab-dim mt-1 truncate">
                            &quot;{n.messagePreview}&quot;
                          </p>
                        )}
                      </>
                    ) : n.type === "friendRequest" ? (
                      <p className="text-sm text-fab-text">
                        <span className="font-semibold">{n.friendRequestFromName}</span>{" "}
                        sent you a friend request
                      </p>
                    ) : n.type === "friendAccepted" ? (
                      <p className="text-sm text-fab-text">
                        <span className="font-semibold">{n.friendRequestFromName}</span>{" "}
                        accepted your friend request
                      </p>
                    ) : (
                      <>
                        <p className="text-sm text-fab-text">
                          <span className="font-semibold">{n.commentAuthorName}</span>{" "}
                          commented on your match{" "}
                          <span className="text-fab-muted">{n.matchSummary}</span>
                        </p>
                        {n.commentPreview && (
                          <p className="text-xs text-fab-dim mt-1 truncate">
                            &quot;{n.commentPreview}&quot;
                          </p>
                        )}
                      </>
                    )}
                    <p className="text-xs text-fab-dim mt-1">{timeAgo(n.createdAt)}</p>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGroupDelete(group);
                    }}
                    className="shrink-0 text-fab-dim hover:text-fab-loss transition-colors p-1"
                    title="Delete notification"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
