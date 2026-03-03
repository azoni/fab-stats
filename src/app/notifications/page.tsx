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
    const uids = [...new Set(notifications.map((n) => n.matchOwnerUid || n.senderUid || n.friendRequestFromUid || n.kudosGiverUid).filter(Boolean))] as string[];
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
    } else if (n.type === "badge") {
      await markAsRead(n.id);
      if (user) {
        const p = await getProfile(user.uid);
        if (p?.username) router.push(`/player/${p.username}#achievements`);
      }
    } else if (n.type === "kudos" && n.kudosGiverUid) {
      await markAsRead(n.id);
      const username = usernameCache[n.kudosGiverUid];
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
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center ring-1 ring-inset ring-amber-500/20">
            <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-fab-text leading-tight">Notifications</h1>
            {groups.length > 0 && (
              <p className="text-xs text-fab-muted leading-tight">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
              </p>
            )}
          </div>
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
                    {n.type === "badge" ? (
                      <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center">
                        <svg className="w-4 h-4 text-violet-300" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2l2.09 6.26L20.18 9.27l-4.64 4.14L16.82 20 12 16.77 7.18 20l1.27-6.59L3.82 9.27l6.09-1.01L12 2z" />
                        </svg>
                      </div>
                    ) : n.type === "kudos" ? (
                      <div className="w-8 h-8 rounded-full bg-fab-gold/20 flex items-center justify-center">
                        <svg className="w-4 h-4 text-fab-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V2.75a.75.75 0 0 1 .75-.75 2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23H5.904m10.598-9.75H14.25M5.904 18.5c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 0 1-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 9.953 4.167 9.5 5 9.5h1.053c.472 0 .745.556.5.96a8.958 8.958 0 0 0-1.302 4.665c0 1.194.232 2.333.654 3.375Z" />
                        </svg>
                      </div>
                    ) : (() => {
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
                    ) : n.type === "badge" ? (
                      <p className="text-sm text-fab-text">
                        You earned the <span className="font-semibold text-violet-300">{n.badgeName}</span> badge!
                      </p>
                    ) : n.type === "kudos" ? (
                      <p className="text-sm text-fab-text">
                        <span className="font-semibold">{n.kudosGiverName}</span>{" "}
                        gave you <span className="font-semibold text-fab-gold">{n.kudosType === "good_sport" ? "Good Sport" : n.kudosType === "props" ? "Props" : n.kudosType === "skilled" ? "Skilled" : n.kudosType === "helpful" ? "Helpful" : n.kudosType}</span> kudos
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
