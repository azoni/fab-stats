"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Group, GroupMember, GroupInvite } from "@/types";

// ── Firestore helpers ──

function groupDoc(groupId: string) {
  return doc(db, "groups", groupId);
}

function groupMembersCollection(groupId: string) {
  return collection(db, "groups", groupId, "members");
}

function groupInvitesCollection() {
  return collection(db, "groupInvites");
}

/**
 * Subcollection: `users/{uid}/groups/{groupId}`
 * Each doc contains: { groupId: string, groupName: string, joinedAt: string }
 *
 * TODO: `groups.ts` (lib) needs to be updated to write/delete from
 * `users/{uid}/groups/{groupId}` whenever a user joins, leaves, is kicked,
 * or a group is disbanded. Handle that separately after this file is in place.
 */
function userGroupsCollection(uid: string) {
  return collection(db, "users", uid, "groups");
}

// ── Hooks ──

/** Subscribe to a specific group + its members by ID */
export function useGroup(groupId?: string | null) {
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) {
      setGroup(null);
      setMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubGroup: Unsubscribe = onSnapshot(groupDoc(groupId), (snap) => {
      setGroup(snap.exists() ? (snap.data() as Group) : null);
      setLoading(false);
    });
    const unsubMembers: Unsubscribe = onSnapshot(groupMembersCollection(groupId), (snap) => {
      setMembers(snap.docs.map((d) => d.data() as GroupMember));
    });

    return () => {
      unsubGroup();
      unsubMembers();
    };
  }, [groupId]);

  return { group, members, loading };
}

/**
 * Subscribe to ALL groups the current user belongs to.
 *
 * Reads `users/{uid}/groups` subcollection to get group IDs,
 * then subscribes to each group doc for live updates.
 */
export function useMyGroups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setGroups([]);
      setLoading(false);
      return;
    }

    // First, subscribe to the user's group membership list
    const unsubs: Unsubscribe[] = [];
    const groupMap = new Map<string, Group>();

    const unsubMemberships = onSnapshot(userGroupsCollection(user.uid), (membershipSnap) => {
      // Clean up previous group doc subscriptions
      unsubs.forEach((u) => u());
      unsubs.length = 0;
      groupMap.clear();

      const groupIds = membershipSnap.docs.map((d) => d.id);

      if (groupIds.length === 0) {
        setGroups([]);
        setLoading(false);
        return;
      }

      let resolved = 0;
      for (const gid of groupIds) {
        const unsubGroup = onSnapshot(groupDoc(gid), (snap) => {
          if (snap.exists()) {
            groupMap.set(gid, snap.data() as Group);
          } else {
            groupMap.delete(gid);
          }

          resolved++;
          // Update state once all initial reads are in, and on every change after
          if (resolved >= groupIds.length) {
            setGroups(Array.from(groupMap.values()));
            setLoading(false);
          }
        });
        unsubs.push(unsubGroup);
      }
    });

    return () => {
      unsubMemberships();
      unsubs.forEach((u) => u());
    };
  }, [user]);

  return { groups, loading };
}

/** Subscribe to pending group invites for the current user */
export function useGroupInvites() {
  const { user } = useAuth();
  const [invites, setInvites] = useState<GroupInvite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setInvites([]);
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(
      query(groupInvitesCollection(), where("targetUid", "==", user.uid), where("status", "==", "pending")),
      (snap) => {
        setInvites(snap.docs.map((d) => d.data() as GroupInvite));
        setLoading(false);
      }
    );
    return unsub;
  }, [user]);

  return { invites, loading };
}

/** One-shot async fetch of a group + its members */
export function useGroupOnce(groupId?: string | null) {
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) {
      setGroup(null);
      setMembers([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const [gSnap, mSnap] = await Promise.all([
          getDoc(groupDoc(groupId)),
          getDocs(groupMembersCollection(groupId)),
        ]);
        if (!cancelled) {
          setGroup(gSnap.exists() ? (gSnap.data() as Group) : null);
          setMembers(mSnap.docs.map((d) => d.data() as GroupMember));
        }
      } catch {
        // Group not found or permission denied
      }
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [groupId]);

  return { group, members, loading };
}
