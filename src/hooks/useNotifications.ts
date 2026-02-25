"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribeToNotifications,
  markAsRead as markAsReadFirestore,
  markAllAsRead as markAllAsReadFirestore,
  deleteNotification as deleteNotificationFirestore,
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

  const unreadCount = notifications.filter((n) => !n.read).length;

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

  return { notifications, unreadCount, loaded, markAsRead, markAllAsRead, deleteNotification };
}
