"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { getProfile, updateProfile, updateMatchFirestore } from "@/lib/firestore-storage";
import { propagateHeroToOpponent } from "@/lib/match-linking";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { UserNotification, MatchRecord } from "@/types";
import { toast } from "sonner";

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

/** Notification type icon + color config */
function getNotifIcon(type: string): { bg: string; iconColor: string; icon: React.ReactNode } {
  switch (type) {
    case "badge":
      return {
        bg: "bg-violet-500/15",
        iconColor: "text-violet-400",
        icon: (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l2.09 6.26L20.18 9.27l-4.64 4.14L16.82 20 12 16.77 7.18 20l1.27-6.59L3.82 9.27l6.09-1.01L12 2z" />
          </svg>
        ),
      };
    case "kudos":
      return {
        bg: "bg-fab-gold/15",
        iconColor: "text-fab-gold",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V2.75a.75.75 0 0 1 .75-.75 2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23H5.904m10.598-9.75H14.25M5.904 18.5c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 0 1-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 9.953 4.167 9.5 5 9.5h1.053c.472 0 .745.556.5.96a8.958 8.958 0 0 0-1.302 4.665c0 1.194.232 2.333.654 3.375Z" />
          </svg>
        ),
      };
    case "feedbackStatus":
      return {
        bg: "bg-teal-500/15",
        iconColor: "text-teal-400",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
          </svg>
        ),
      };
    case "heroCorrection":
      return {
        bg: "bg-amber-500/15",
        iconColor: "text-amber-400",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
          </svg>
        ),
      };
    case "friendRequest":
    case "friendAccepted":
      return {
        bg: "bg-sky-500/15",
        iconColor: "text-sky-400",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
          </svg>
        ),
      };
    case "teamInvite":
      return {
        bg: "bg-amber-500/15",
        iconColor: "text-amber-400",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
          </svg>
        ),
      };
    case "message":
      return {
        bg: "bg-emerald-500/15",
        iconColor: "text-emerald-400",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
          </svg>
        ),
      };
    default:
      return {
        bg: "bg-fab-gold/15",
        iconColor: "text-fab-gold",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
          </svg>
        ),
      };
  }
}

/** Get avatar for a notification */
function NotifAvatar({ n }: { n: UserNotification }) {
  const { bg, iconColor, icon } = getNotifIcon(n.type);

  if (n.type === "teamInvite") {
    return n.teamIconUrl ? (
      <img src={n.teamIconUrl} alt="" className="w-9 h-9 rounded-full object-cover border border-fab-border" />
    ) : (
      <div className={`w-9 h-9 rounded-full ${bg} flex items-center justify-center ${iconColor}`}>
        {icon}
      </div>
    );
  }

  if (n.type === "badge" || n.type === "kudos" || n.type === "heroCorrection" || n.type === "feedbackStatus") {
    return (
      <div className={`w-9 h-9 rounded-full ${bg} flex items-center justify-center ${iconColor}`}>
        {icon}
      </div>
    );
  }

  const photo = n.type === "message" ? n.senderPhoto : n.type === "friendRequest" || n.type === "friendAccepted" ? n.friendRequestFromPhoto : n.commentAuthorPhoto;
  const name = n.type === "message" ? (n.senderName || "?") : n.type === "friendRequest" || n.type === "friendAccepted" ? (n.friendRequestFromName || "?") : (n.commentAuthorName || "?");

  return photo ? (
    <img src={photo} alt="" className="w-9 h-9 rounded-full" loading="lazy" />
  ) : (
    <div className={`w-9 h-9 rounded-full ${bg} flex items-center justify-center ${iconColor} text-sm font-bold`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function NotificationsPage() {
  const { user, isGuest, profile, refreshProfile } = useAuth();
  const { notifications, loaded, markAsRead, markAllAsRead, deleteNotification, clearMessagesFrom, unreadCount } = useNotifications();
  const router = useRouter();
  const [usernameCache, setUsernameCache] = useState<Record<string, string>>({});
  const [toggling, setToggling] = useState(false);

  const notificationsEnabled = profile?.notificationsEnabled !== false;
  const groups = useMemo(() => groupNotifications(notifications), [notifications]);

  // Look up usernames for UIDs so we can navigate to profiles
  useEffect(() => {
    const uids = [...new Set(notifications.map((n) => n.matchOwnerUid || n.senderUid || n.friendRequestFromUid || n.kudosGiverUid || n.requesterUid).filter(Boolean))] as string[];
    const missing = uids.filter((uid) => !usernameCache[uid]);
    if (missing.length === 0) return;

    Promise.all(
      missing.map(async (uid) => {
        const p = await getProfile(uid);
        return { uid, username: p?.username };
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

  async function handleToggleNotifications() {
    if (!user) return;
    setToggling(true);
    try {
      await updateProfile(user.uid, { notificationsEnabled: !notificationsEnabled });
      await refreshProfile();
    } catch {
      // silently fail
    }
    setToggling(false);
  }

  if (!user || isGuest) {
    return (
      <div className="text-center py-16">
        <p className="text-fab-muted mb-1">Sign in to view notifications</p>
        <p className="text-fab-dim text-sm mb-6">You need an account to receive notifications.</p>
        <Link href="/login" className="inline-block px-6 py-2.5 rounded-lg font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors">
          Sign In
        </Link>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="space-y-4">
        <div className="h-12 w-full bg-fab-surface rounded-lg animate-pulse" />
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
    } else if (n.type === "heroCorrection") {
      // Don't navigate — handled by inline Accept/Dismiss buttons
      await markAsRead(n.id);
    } else if (n.type === "teamInvite") {
      // Don't navigate — handled by inline Accept/Decline buttons
      await markAsRead(n.id);
    } else if (n.type === "feedbackStatus") {
      await markAsRead(n.id);
    }
  }

  async function handleAcceptCorrection(n: UserNotification) {
    if (!user || !n.targetMatchId || !n.suggestedHero) return;

    // Update heroPlayed on the user's own match
    await updateMatchFirestore(user.uid, n.targetMatchId, { heroPlayed: n.suggestedHero });

    // Read the updated match to propagate the change back to the requester
    const matchSnap = await getDoc(doc(db, "users", user.uid, "matches", n.targetMatchId));
    if (matchSnap.exists()) {
      const match = { id: matchSnap.id, ...matchSnap.data() } as MatchRecord;
      propagateHeroToOpponent(user.uid, match, n.suggestedHero).catch(() => {});
    }

    // Delete the notification
    await deleteNotification(n.id);
  }

  async function handleGroupDelete(group: NotificationGroup) {
    // Delete all notification docs in this group
    await Promise.all(group.ids.map((id) => deleteNotification(id)));
  }

  return (
    <div>
      {/* Header with toggle */}
      <div className="bg-fab-surface border border-fab-border rounded-xl p-4 mb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center ring-1 ring-inset ring-amber-500/20">
              <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-fab-text leading-tight">Notifications</h1>
              <p className="text-xs text-fab-muted leading-tight">
                {!notificationsEnabled ? "Notifications are paused" : unreadCount > 0 ? `${unreadCount} unread` : groups.length > 0 ? "All caught up" : "No notifications yet"}
              </p>
            </div>
          </div>

          {/* Toggle switch */}
          <button
            onClick={handleToggleNotifications}
            disabled={toggling}
            className="flex items-center gap-2.5 group"
            title={notificationsEnabled ? "Pause notifications" : "Resume notifications"}
          >
            <span className="text-xs text-fab-muted group-hover:text-fab-text transition-colors hidden sm:block">
              {notificationsEnabled ? "On" : "Off"}
            </span>
            <div className={`relative w-11 h-6 rounded-full transition-colors ${notificationsEnabled ? "bg-fab-gold" : "bg-fab-border"} ${toggling ? "opacity-50" : ""}`}>
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${notificationsEnabled ? "translate-x-5" : "translate-x-0"}`} />
            </div>
          </button>
        </div>

        {/* Mark all as read — only when enabled + has unread */}
        {notificationsEnabled && unreadCount > 0 && (
          <div className="mt-3 pt-3 border-t border-fab-border flex justify-end">
            <button
              onClick={markAllAsRead}
              className="text-xs text-fab-gold hover:text-fab-gold-light transition-colors font-medium"
            >
              Mark all as read
            </button>
          </div>
        )}
      </div>

      {/* Paused state */}
      {!notificationsEnabled && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-fab-surface flex items-center justify-center">
            <svg className="w-8 h-8 text-fab-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.143 17.082a24.248 24.248 0 0 0 5.714 0m-5.714 0a3 3 0 1 1 5.714 0M3.124 13.07A8.967 8.967 0 0 1 6 9.75V9A6 6 0 0 1 18 9v.75a8.967 8.967 0 0 0 2.876 3.32" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
            </svg>
          </div>
          <p className="text-fab-text font-medium mb-1">Notifications paused</p>
          <p className="text-sm text-fab-muted max-w-xs mx-auto">
            You won&apos;t receive alerts for messages, friend requests, or match updates. Toggle back on above to resume.
          </p>
        </div>
      )}

      {/* Active content */}
      {notificationsEnabled && (
        <>
          {groups.length === 0 ? (
            <div className="text-center py-16 text-fab-dim">
              <p className="text-lg mb-1">No notifications yet</p>
              <p className="text-sm">
                When someone messages you, sends a friend request, or interacts with your matches, you&apos;ll see it here.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {groups.map((group) => {
                const n = group.latest;
                const { bg: typeBg } = getNotifIcon(n.type);

                return (
                  <div
                    key={group.key}
                    className={`group relative bg-fab-surface border rounded-xl transition-all hover:bg-fab-surface-hover ${
                      group.isUnread
                        ? "border-fab-gold/20 shadow-[0_0_12px_-4px_rgba(201,168,76,0.15)]"
                        : "border-fab-border"
                    }`}
                  >
                    <div
                      className="flex items-start gap-3 p-3.5 cursor-pointer"
                      onClick={() => handleGroupClick(group)}
                    >
                      {/* Type indicator bar */}
                      {group.isUnread && (
                        <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-r bg-fab-gold" />
                      )}

                      {/* Avatar */}
                      <div className="shrink-0 mt-0.5">
                        <NotifAvatar n={n} />
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
                              <p className="text-xs text-fab-dim mt-0.5 truncate">
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
                            {n.grantedByAdmin
                              ? <>An admin awarded you the <span className="font-semibold text-violet-300">{n.badgeName}</span> badge!</>
                              : <>You earned the <span className="font-semibold text-violet-300">{n.badgeName}</span> badge!</>}
                          </p>
                        ) : n.type === "kudos" ? (
                          <p className="text-sm text-fab-text">
                            <span className="font-semibold">{n.kudosGiverName}</span>{" "}
                            gave you <span className="font-semibold text-fab-gold">{n.kudosType === "good_sport" ? "Good Sport" : n.kudosType === "props" ? "Props" : n.kudosType === "skilled" ? "Skilled" : n.kudosType === "helpful" ? "Helpful" : n.kudosType}</span> kudos
                          </p>
                        ) : n.type === "feedbackStatus" ? (
                          <>
                            <p className="text-sm text-fab-text">
                              Your {n.feedbackType === "feature" ? "feature request" : "bug report"} has been{" "}
                              <span className={`font-semibold ${n.newStatus === "done" ? "text-fab-win" : "text-blue-400"}`}>
                                {n.newStatus === "done" ? "completed" : "reviewed"}
                              </span>
                            </p>
                            {n.feedbackMessage && (
                              <p className="text-xs text-fab-dim mt-0.5 truncate">
                                &quot;{n.feedbackMessage}&quot;
                              </p>
                            )}
                          </>
                        ) : n.type === "teamInvite" ? (
                          <>
                            <p className="text-sm text-fab-text">
                              <span className="font-semibold">{n.teamInviteFromName}</span>{" "}
                              invited you to join{" "}
                              <span className="font-semibold text-amber-400">{n.teamName}</span>
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (!n.teamInviteId || !profile) return;
                                  try {
                                    const { acceptTeamInvite } = await import("@/lib/teams");
                                    await acceptTeamInvite(n.teamInviteId, profile);
                                    handleGroupDelete(group);
                                    toast.success(`Joined ${n.teamName}!`);
                                  } catch (err) {
                                    toast.error(err instanceof Error ? err.message : "Failed to accept invite.");
                                  }
                                }}
                                className="px-3 py-1 rounded-md text-xs font-medium bg-fab-win/20 text-fab-win hover:bg-fab-win/30 transition-colors"
                              >
                                Accept
                              </button>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (!n.teamInviteId) return;
                                  try {
                                    const { declineTeamInvite } = await import("@/lib/teams");
                                    await declineTeamInvite(n.teamInviteId);
                                    handleGroupDelete(group);
                                    toast.success("Invite declined.");
                                  } catch (err) {
                                    toast.error("Failed to decline invite.");
                                  }
                                }}
                                className="px-3 py-1 rounded-md text-xs font-medium text-fab-dim hover:text-fab-text transition-colors"
                              >
                                Decline
                              </button>
                            </div>
                          </>
                        ) : n.type === "heroCorrection" ? (
                          <>
                            <p className="text-sm text-fab-text">
                              <span className="font-semibold">{n.requesterName}</span>{" "}
                              thinks you played{" "}
                              <span className="font-semibold text-fab-gold">{n.suggestedHero}</span>
                              {n.matchSummary && (
                                <span className="text-fab-muted"> in {n.matchSummary}</span>
                              )}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAcceptCorrection(n);
                                }}
                                className="px-3 py-1 rounded-md text-xs font-medium bg-fab-win/20 text-fab-win hover:bg-fab-win/30 transition-colors"
                              >
                                Accept
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleGroupDelete(group);
                                }}
                                className="px-3 py-1 rounded-md text-xs font-medium text-fab-dim hover:text-fab-text transition-colors"
                              >
                                Dismiss
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-sm text-fab-text">
                              <span className="font-semibold">{n.commentAuthorName}</span>{" "}
                              commented on your match{" "}
                              <span className="text-fab-muted">{n.matchSummary}</span>
                            </p>
                            {n.commentPreview && (
                              <p className="text-xs text-fab-dim mt-0.5 truncate">
                                &quot;{n.commentPreview}&quot;
                              </p>
                            )}
                          </>
                        )}
                        <p className="text-[11px] text-fab-dim mt-1">{timeAgo(n.createdAt)}</p>
                      </div>

                      {/* Delete — visible on hover */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGroupDelete(group);
                        }}
                        className="shrink-0 text-fab-dim hover:text-fab-loss transition-colors p-1 opacity-0 group-hover:opacity-100"
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
        </>
      )}
    </div>
  );
}
