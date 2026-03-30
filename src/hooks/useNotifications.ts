"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribeToNotifications,
  markAsRead as markAsReadFirestore,
  markAllAsRead as markAllAsReadFirestore,
  deleteNotification as deleteNotificationFirestore,
  clearMessageNotificationsFrom as clearMessageFirestore,
} from "@/lib/notifications";
import type { UserNotification } from "@/types";

export function useNotifications(options?: { immediate?: boolean }) {
  const { user, isGuest, profile } = useAuth();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loaded, setLoaded] = useState(false);
  const immediate = options?.immediate ?? false;

  // Default to true if not explicitly set
  const enabled = profile?.notificationsEnabled !== false;

  const unsubRef = useRef<(() => void) | null>(null);

  // Delay notification listener by 30s to avoid Firestore reads for bounce visits
  // Skip delay when immediate=true (e.g. notifications page)
  useEffect(() => {
    if (isGuest || !user || !enabled) {
      setNotifications([]);
      setLoaded(!user ? false : true);
      return;
    }

    function subscribe() {
      unsubRef.current = subscribeToNotifications(user!.uid, (data) => {
        setNotifications(data);
        setLoaded(true);
      });
    }

    if (immediate) {
      subscribe();
      return () => { unsubRef.current?.(); unsubRef.current = null; };
    }

    const timer = setTimeout(subscribe, 30_000);

    return () => {
      clearTimeout(timer);
      unsubRef.current?.();
      unsubRef.current = null;
    };
  }, [user, isGuest, enabled, immediate]);

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
