import {
  collection,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  where,
  limit,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import type { UserNotification } from "@/types";

function notificationsCollection(userId: string) {
  return collection(db, "users", userId, "notifications");
}

export function subscribeToNotifications(
  userId: string,
  callback: (notifications: UserNotification[]) => void
): Unsubscribe {
  const q = query(notificationsCollection(userId), orderBy("createdAt", "desc"), limit(50));
  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as UserNotification[];
    callback(notifications);
  });
}

export async function markAsRead(
  userId: string,
  notificationId: string
): Promise<void> {
  const ref = doc(db, "users", userId, "notifications", notificationId);
  await updateDoc(ref, { read: true });
}

export async function markAllAsRead(userId: string): Promise<void> {
  const q = query(
    notificationsCollection(userId),
    where("read", "==", false)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return;

  const batch = writeBatch(db);
  for (const d of snapshot.docs) {
    batch.update(d.ref, { read: true });
  }
  await batch.commit();

  // Clean up old notifications (>30 days) to prevent unbounded growth
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const oldQ = query(
    notificationsCollection(userId),
    where("createdAt", "<", cutoff),
    limit(100)
  );
  const oldSnap = await getDocs(oldQ);
  if (!oldSnap.empty) {
    const cleanupBatch = writeBatch(db);
    oldSnap.docs.forEach((d) => cleanupBatch.delete(d.ref));
    await cleanupBatch.commit();
  }
}

export async function deleteNotification(
  userId: string,
  notificationId: string
): Promise<void> {
  const ref = doc(db, "users", userId, "notifications", notificationId);
  await deleteDoc(ref);
}
