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

export function useFriends() {
  const { user, isGuest } = useAuth();
  const [allFriendships, setAllFriendships] = useState<Friendship[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (isGuest || !user) {
      setAllFriendships([]);
      setLoaded(true);
      return;
    }

    return subscribeFriendships(user.uid, (friendships) => {
      setAllFriendships(friendships);
      setLoaded(true);
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
    incomingCount: incomingRequests.length,
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
