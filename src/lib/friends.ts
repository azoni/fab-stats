import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Friendship } from "@/types";

export function getFriendshipId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join("_");
}

export async function sendFriendRequest(
  fromUser: { uid: string; username: string; displayName: string; photoUrl?: string },
  toUser: { uid: string; username: string; displayName: string; photoUrl?: string }
): Promise<void> {
  const friendshipId = getFriendshipId(fromUser.uid, toUser.uid);
  const docRef = doc(db, "friendships", friendshipId);

  // Check if a friendship already exists
  const existing = await getDoc(docRef);
  if (existing.exists()) {
    const data = existing.data();
    // If there's a pending request from the other user, auto-accept
    if (data.status === "pending" && data.requesterUid === toUser.uid) {
      await acceptFriendRequest(friendshipId, fromUser.uid);
      return;
    }
    // Already friends or already sent a request
    return;
  }

  const participants = [fromUser.uid, toUser.uid].sort() as [string, string];

  const data: Record<string, unknown> = {
    participants,
    requesterUid: fromUser.uid,
    recipientUid: toUser.uid,
    status: "pending",
    requesterInfo: {
      displayName: fromUser.displayName,
      username: fromUser.username,
    },
    recipientInfo: {
      displayName: toUser.displayName,
      username: toUser.username,
    },
    createdAt: new Date().toISOString(),
  };
  if (fromUser.photoUrl) {
    (data.requesterInfo as Record<string, unknown>).photoUrl = fromUser.photoUrl;
  }
  if (toUser.photoUrl) {
    (data.recipientInfo as Record<string, unknown>).photoUrl = toUser.photoUrl;
  }

  await setDoc(docRef, data);

  // Send notification to the recipient
  const notifData: Record<string, unknown> = {
    type: "friendRequest",
    friendRequestFromUid: fromUser.uid,
    friendRequestFromName: fromUser.displayName,
    friendRequestFromUsername: fromUser.username,
    createdAt: new Date().toISOString(),
    read: false,
  };
  if (fromUser.photoUrl) notifData.friendRequestFromPhoto = fromUser.photoUrl;
  await addDoc(collection(db, "users", toUser.uid, "notifications"), notifData);
}

export async function acceptFriendRequest(
  friendshipId: string,
  acceptorUid: string
): Promise<void> {
  const docRef = doc(db, "friendships", friendshipId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return;

  const data = snap.data();
  if (data.status !== "pending") return;

  await updateDoc(docRef, {
    status: "accepted",
    acceptedAt: new Date().toISOString(),
  });

  // Determine who the acceptor is and notify the requester
  const requesterUid = data.requesterUid as string;
  const acceptorInfo = data.requesterUid === acceptorUid
    ? data.requesterInfo
    : data.recipientInfo;

  const notifData: Record<string, unknown> = {
    type: "friendAccepted",
    friendRequestFromUid: acceptorUid,
    friendRequestFromName: (acceptorInfo as Record<string, unknown>).displayName,
    friendRequestFromUsername: (acceptorInfo as Record<string, unknown>).username,
    createdAt: new Date().toISOString(),
    read: false,
  };
  if ((acceptorInfo as Record<string, unknown>).photoUrl) {
    notifData.friendRequestFromPhoto = (acceptorInfo as Record<string, unknown>).photoUrl;
  }
  await addDoc(collection(db, "users", requesterUid, "notifications"), notifData);
}

export async function declineFriendRequest(friendshipId: string): Promise<void> {
  await deleteDoc(doc(db, "friendships", friendshipId));
}

export async function removeFriend(friendshipId: string): Promise<void> {
  await deleteDoc(doc(db, "friendships", friendshipId));
}

export function subscribeFriendships(
  userId: string,
  callback: (friendships: Friendship[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "friendships"),
    where("participants", "array-contains", userId)
  );
  return onSnapshot(q, (snapshot) => {
    const friendships = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Friendship[];
    callback(friendships);
  });
}

export async function getFriendship(
  uid1: string,
  uid2: string
): Promise<Friendship | null> {
  const docRef = doc(db, "friendships", getFriendshipId(uid1, uid2));
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Friendship;
}
