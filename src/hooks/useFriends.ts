"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribeFriendships,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  getFriendshipId,
} from "@/lib/friends";
import type { Friendship } from "@/types";

function getCachedIncomingCount(): number {
  if (typeof window === "undefined") return 0;
  try { return Number(localStorage.getItem("fab_incoming_friends")) || 0; } catch { return 0; }
}

export function useFriends() {
  const { user, isGuest } = useAuth();
  const [allFriendships, setAllFriendships] = useState<Friendship[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [cachedIncoming] = useState(getCachedIncomingCount);

  useEffect(() => {
    if (isGuest || !user) {
      setAllFriendships([]);
      setLoaded(true);
      return;
    }

    return subscribeFriendships(user.uid, (friendships) => {
      setAllFriendships(friendships);
      setLoaded(true);
      // Cache incoming count so next page load renders instantly
      const incoming = friendships.filter(
        (f) => f.status === "pending" && f.recipientUid === user.uid
      ).length;
      try { localStorage.setItem("fab_incoming_friends", String(incoming)); } catch {}
    });
  }, [user, isGuest]);

  const friends = useMemo(
    () => allFriendships.filter((f) => f.status === "accepted"),
    [allFriendships]
  );

  const incomingRequests = useMemo(
    () => allFriendships.filter((f) => f.status === "pending" && f.recipientUid === user?.uid),
    [allFriendships, user?.uid]
  );

  const outgoingRequests = useMemo(
    () => allFriendships.filter((f) => f.status === "pending" && f.requesterUid === user?.uid),
    [allFriendships, user?.uid]
  );

  const isFriend = useCallback(
    (uid: string) => friends.some((f) => f.participants.includes(uid)),
    [friends]
  );

  const hasSentRequest = useCallback(
    (uid: string) => outgoingRequests.some((f) => f.participants.includes(uid)),
    [outgoingRequests]
  );

  const hasReceivedRequest = useCallback(
    (uid: string) => incomingRequests.some((f) => f.participants.includes(uid)),
    [incomingRequests]
  );

  const getFriendshipForUser = useCallback(
    (uid: string) => allFriendships.find((f) => f.participants.includes(uid)) ?? null,
    [allFriendships]
  );

  const sendRequest = useCallback(
    async (toUser: { uid: string; username: string; displayName: string; photoUrl?: string }) => {
      if (!user || isGuest) return;
      const profile = await import("@/lib/firestore-storage").then((m) => m.getProfile(user.uid));
      if (!profile) return;
      await sendFriendRequest(
        { uid: user.uid, username: profile.username, displayName: profile.displayName, photoUrl: profile.photoUrl },
        toUser
      );
    },
    [user, isGuest]
  );

  const acceptRequest = useCallback(
    async (friendshipId: string) => {
      if (!user || isGuest) return;
      await acceptFriendRequest(friendshipId, user.uid);
    },
    [user, isGuest]
  );

  const declineRequest = useCallback(
    async (friendshipId: string) => {
      if (!user || isGuest) return;
      await declineFriendRequest(friendshipId);
    },
    [user, isGuest]
  );

  const removeFriendById = useCallback(
    async (friendshipId: string) => {
      if (!user || isGuest) return;
      await removeFriend(friendshipId);
    },
    [user, isGuest]
  );

  return {
    friends,
    incomingRequests,
    outgoingRequests,
    incomingCount: loaded ? incomingRequests.length : cachedIncoming,
    loaded,
    isFriend,
    hasSentRequest,
    hasReceivedRequest,
    getFriendshipForUser,
    getFriendshipId,
    sendRequest,
    acceptRequest,
    declineRequest,
    removeFriend: removeFriendById,
  };
}
