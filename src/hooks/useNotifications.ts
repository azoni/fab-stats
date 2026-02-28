"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribeToNotifications,
  markAsRead as markAsReadFirestore,
  markAllAsRead as markAllAsReadFirestore,
  deleteNotification as deleteNotificationFirestore,
  clearMessageNotificationsFrom as clearMessageFirestore,
} from "@/lib/notifications";
import type { UserNotification } from "@/types";

export function useNotifications() {
  const { user, isGuest } = useAuth();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (isGuest || !user) {
      setNotifications([]);
      setLoaded(false);
      return;
    }

    const unsubscribe = subscribeToNotifications(user.uid, (data) => {
      setNotifications(data);
      setLoaded(true);
    });

    return unsubscribe;
  }, [user, isGuest]);

  // Unread count: group message notifications by sender (each sender = 1 count)
  const unreadCount = useMemo(() => {
    const msgSenders = new Set<string>();
    let count = 0;
    for (const n of notifications) {
      if (n.read) continue;
      if (n.type === "message" && n.senderUid) {
        if (!msgSenders.has(n.senderUid)) {
          msgSenders.add(n.senderUid);
          count++;
        }
      } else {
        count++;
      }
    }
    return count;
  }, [notifications]);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!user) return;
      await markAsReadFirestore(user.uid, notificationId);
    },
    [user]
  );

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    await markAllAsReadFirestore(user.uid);
  }, [user]);

  const deleteNotification = useCallback(
    async (notificationId: string) => {
      if (!user) return;
      await deleteNotificationFirestore(user.uid, notificationId);
    },
    [user]
  );

  /** Delete all message notifications from a specific sender (e.g. when opening their chat) */
  const clearMessagesFrom = useCallback(
    async (senderUid: string) => {
      if (!user) return;
      // Delete the deterministic grouped notification
      await clearMessageFirestore(user.uid, senderUid);
      // Also delete any legacy individual message notifications from this sender
      const legacy = notifications.filter(
        (n) => n.type === "message" && n.senderUid === senderUid && n.id !== `msg_${senderUid}`
      );
      await Promise.all(legacy.map((n) => deleteNotificationFirestore(user.uid, n.id)));
    },
    [user, notifications]
  );

  return { notifications, unreadCount, loaded, markAsRead, markAllAsRead, deleteNotification, clearMessagesFrom };
}
