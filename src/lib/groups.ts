import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  increment,
  writeBatch,
  limit,
  deleteField,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import { containsProfanity } from "./profanity-filter";
import type { Group, GroupMember, GroupInvite, UserProfile } from "@/types";

// ── Helpers ──

function groupsCollection() {
  return collection(db, "groups");
}

function membersCollection(groupId: string) {
  return collection(db, "groups", groupId, "members");
}

function groupNamesCollection() {
  return collection(db, "groupnames");
}

function groupInvitesCollection() {
  return collection(db, "groupInvites");
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function userGroupsDoc(uid: string, groupId: string) {
  return doc(db, "users", uid, "groups", groupId);
}

function getInviteId(groupId: string, targetUid: string): string {
  return `${groupId}_${targetUid}`;
}

// ── CRUD ──

export async function createGroup(
  profile: UserProfile,
  opts: { name: string; slug?: string; description?: string; joinMode: "open" | "invite"; visibility?: "public" | "private" }
): Promise<string> {
  const trimmedName = opts.name.trim();
  if (!trimmedName || trimmedName.length > 50) {
    throw new Error("Group name must be 1-50 characters.");
  }
  if (containsProfanity(trimmedName)) {
    throw new Error("Group name contains inappropriate language.");
  }
  if (opts.description && opts.description.length > 500) {
    throw new Error("Description must be 500 characters or less.");
  }
  if (opts.description && containsProfanity(opts.description)) {
    throw new Error("Description contains inappropriate language.");
  }

  const nameLower = opts.slug
    ? opts.slug.toLowerCase().replace(/[^a-z0-9]/g, "")
    : slugify(trimmedName);
  if (!nameLower || nameLower.length < 2) {
    throw new Error("URL slug must be at least 2 characters.");
  }
  if (nameLower.length > 30) {
    throw new Error("URL slug must be 30 characters or less.");
  }

  // Check name uniqueness
  const nameDoc = await getDoc(doc(db, "groupnames", nameLower));
  if (nameDoc.exists()) {
    throw new Error("This URL slug is already taken.");
  }

  const now = new Date().toISOString();
  const groupRef = doc(groupsCollection());
  const groupId = groupRef.id;

  const groupData: Record<string, unknown> = {
    id: groupId,
    name: trimmedName,
    nameLower,
    ownerUid: profile.uid,
    joinMode: opts.joinMode,
    visibility: opts.visibility || "public",
    memberCount: 1,
    createdAt: now,
    updatedAt: now,
  };
  if (opts.description) groupData.description = opts.description;

  const memberData: Record<string, unknown> = {
    uid: profile.uid,
    username: profile.username,
    displayName: profile.displayName,
    role: "owner",
    joinedAt: now,
  };
  if (profile.photoUrl) memberData.photoUrl = profile.photoUrl;

  // Create group doc first — member rules use get() on the group doc,
  // and Firestore get() in rules sees pre-batch state, so the group
  // must exist before the member doc can be created.
  await setDoc(groupRef, groupData);

  const batch = writeBatch(db);
  batch.set(doc(membersCollection(groupId), profile.uid), memberData);
  batch.set(doc(db, "groupnames", nameLower), { groupId, name: trimmedName });
  batch.set(userGroupsDoc(profile.uid, groupId), { groupId, groupName: trimmedName, joinedAt: now });
  await batch.commit();

  return groupId;
}

export async function updateGroup(
  groupId: string,
  updates: Partial<Pick<Group, "name" | "description" | "joinMode" | "visibility" | "accentColor">> & { slug?: string }
): Promise<void> {
  const updateData: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  const groupSnap = await getDoc(doc(db, "groups", groupId));
  const currentGroup = groupSnap.data() as Group | undefined;

  // Resolve new slug: explicit slug param > derived from name > unchanged
  let newNameLower: string | null = null;
  if (updates.slug !== undefined) {
    newNameLower = updates.slug.toLowerCase().replace(/[^a-z0-9]/g, "");
  } else if (updates.name !== undefined) {
    newNameLower = slugify(updates.name.trim());
  }

  if (updates.name !== undefined) {
    const trimmedName = updates.name.trim();
    if (!trimmedName || trimmedName.length > 50) {
      throw new Error("Group name must be 1-50 characters.");
    }
    if (containsProfanity(trimmedName)) {
      throw new Error("Group name contains inappropriate language.");
    }
    updateData.name = trimmedName;
  }

  if (updates.description !== undefined) {
    if (updates.description.length > 500) {
      throw new Error("Description must be 500 characters or less.");
    }
    if (updates.description && containsProfanity(updates.description)) {
      throw new Error("Description contains inappropriate language.");
    }
    updateData.description = updates.description;
  }

  if (updates.joinMode !== undefined) {
    updateData.joinMode = updates.joinMode;
  }

  if (updates.visibility !== undefined) {
    updateData.visibility = updates.visibility;
  }

  if (updates.accentColor !== undefined) {
    updateData.accentColor = updates.accentColor;
  }

  if (newNameLower !== null) {
    if (!newNameLower || newNameLower.length < 2) {
      throw new Error("URL slug must be at least 2 characters.");
    }
    if (newNameLower.length > 30) {
      throw new Error("URL slug must be 30 characters or less.");
    }

    if (currentGroup && currentGroup.nameLower !== newNameLower) {
      const nameDoc = await getDoc(doc(db, "groupnames", newNameLower));
      if (nameDoc.exists()) {
        throw new Error("This URL slug is already taken.");
      }

      const batch = writeBatch(db);
      batch.delete(doc(db, "groupnames", currentGroup.nameLower));
      batch.set(doc(db, "groupnames", newNameLower), { groupId, name: (updateData.name as string) || currentGroup.name });
      updateData.nameLower = newNameLower;
      batch.update(doc(db, "groups", groupId), updateData);
      await batch.commit();
      return;
    }
  }

  await updateDoc(doc(db, "groups", groupId), updateData);
}

export async function disbandGroup(groupId: string, ownerUid: string): Promise<void> {
  const groupSnap = await getDoc(doc(db, "groups", groupId));
  if (!groupSnap.exists()) throw new Error("Group not found.");
  const group = groupSnap.data() as Group;
  if (group.ownerUid !== ownerUid) throw new Error("Only the group owner can disband.");

  // Get all members
  const membersSnap = await getDocs(membersCollection(groupId));

  // Batch delete in groups of 225 (each member = 2 ops: member doc + user groups doc)
  const memberDocs = membersSnap.docs;
  for (let i = 0; i < memberDocs.length; i += 225) {
    const batch = writeBatch(db);
    const chunk = memberDocs.slice(i, i + 450);
    for (const memberDoc of chunk) {
      batch.delete(memberDoc.ref);
      batch.delete(userGroupsDoc(memberDoc.id, groupId));
    }
    if (i === 0) {
      batch.delete(doc(db, "groups", groupId));
      batch.delete(doc(db, "groupnames", group.nameLower));
    }
    await batch.commit();
  }

  // If no members at all (shouldn't happen), still clean up
  if (memberDocs.length === 0) {
    const batch = writeBatch(db);
    batch.delete(doc(db, "groups", groupId));
    batch.delete(doc(db, "groupnames", group.nameLower));
    await batch.commit();
  }

  // Clean up pending invites for this group
  const invitesSnap = await getDocs(
    query(groupInvitesCollection(), where("groupId", "==", groupId), where("status", "==", "pending"))
  );
  for (let i = 0; i < invitesSnap.docs.length; i += 500) {
    const batch = writeBatch(db);
    invitesSnap.docs.slice(i, i + 500).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

// ── Members ──

export async function joinGroup(groupId: string, profile: UserProfile): Promise<void> {
  const groupSnap = await getDoc(doc(db, "groups", groupId));
  if (!groupSnap.exists()) throw new Error("Group not found.");
  const group = groupSnap.data() as Group;
  if (group.joinMode !== "open") throw new Error("This group is invite-only.");

  const now = new Date().toISOString();
  const memberData: Record<string, unknown> = {
    uid: profile.uid,
    username: profile.username,
    displayName: profile.displayName,
    role: "member",
    joinedAt: now,
  };
  if (profile.photoUrl) memberData.photoUrl = profile.photoUrl;

  const batch = writeBatch(db);
  batch.set(doc(membersCollection(groupId), profile.uid), memberData);
  batch.update(doc(db, "groups", groupId), { memberCount: increment(1), updatedAt: now });
  batch.set(userGroupsDoc(profile.uid, groupId), { groupId, groupName: group.name, joinedAt: now });
  await batch.commit();
}

export async function leaveGroup(groupId: string, uid: string): Promise<void> {
  const memberSnap = await getDoc(doc(membersCollection(groupId), uid));
  if (!memberSnap.exists()) throw new Error("You are not a member of this group.");
  const member = memberSnap.data() as GroupMember;
  if (member.role === "owner") {
    throw new Error("The group owner cannot leave. Transfer ownership or disband the group.");
  }

  const now = new Date().toISOString();
  const batch = writeBatch(db);
  batch.delete(doc(membersCollection(groupId), uid));
  batch.update(doc(db, "groups", groupId), { memberCount: increment(-1), updatedAt: now });
  batch.delete(userGroupsDoc(uid, groupId));
  await batch.commit();
}

export async function kickMember(groupId: string, kickerUid: string, targetUid: string): Promise<void> {
  // Verify kicker is owner or admin
  const kickerSnap = await getDoc(doc(membersCollection(groupId), kickerUid));
  if (!kickerSnap.exists()) throw new Error("You are not a member of this group.");
  const kicker = kickerSnap.data() as GroupMember;
  if (kicker.role !== "owner" && kicker.role !== "admin") {
    throw new Error("Only owners and admins can kick members.");
  }

  // Can't kick the owner
  const targetSnap = await getDoc(doc(membersCollection(groupId), targetUid));
  if (!targetSnap.exists()) throw new Error("Member not found.");
  const target = targetSnap.data() as GroupMember;
  if (target.role === "owner") throw new Error("Cannot kick the group owner.");

  const now = new Date().toISOString();
  const batch = writeBatch(db);
  batch.delete(doc(membersCollection(groupId), targetUid));
  batch.update(doc(db, "groups", groupId), { memberCount: increment(-1), updatedAt: now });
  batch.delete(userGroupsDoc(targetUid, groupId));
  await batch.commit();
}

export async function updateMemberRole(
  groupId: string,
  updaterUid: string,
  targetUid: string,
  newRole: "admin" | "member"
): Promise<void> {
  const updaterSnap = await getDoc(doc(membersCollection(groupId), updaterUid));
  if (!updaterSnap.exists()) throw new Error("You are not a member of this group.");
  const updater = updaterSnap.data() as GroupMember;
  if (updater.role !== "owner" && updater.role !== "admin") {
    throw new Error("Only owners and admins can change roles.");
  }

  const targetSnap = await getDoc(doc(membersCollection(groupId), targetUid));
  if (!targetSnap.exists()) throw new Error("Member not found.");
  const target = targetSnap.data() as GroupMember;
  if (target.role === "owner") throw new Error("Cannot change the owner's role.");

  await updateDoc(doc(membersCollection(groupId), targetUid), { role: newRole });
}

export async function transferOwnership(groupId: string, ownerUid: string, newOwnerUid: string): Promise<void> {
  // Verify current owner
  const ownerSnap = await getDoc(doc(membersCollection(groupId), ownerUid));
  if (!ownerSnap.exists()) throw new Error("You are not a member of this group.");
  const owner = ownerSnap.data() as GroupMember;
  if (owner.role !== "owner") throw new Error("Only the owner can transfer ownership.");

  // Verify target is a member
  const targetSnap = await getDoc(doc(membersCollection(groupId), newOwnerUid));
  if (!targetSnap.exists()) throw new Error("Target is not a member of this group.");

  const now = new Date().toISOString();
  const batch = writeBatch(db);
  batch.update(doc(membersCollection(groupId), ownerUid), { role: "admin" });
  batch.update(doc(membersCollection(groupId), newOwnerUid), { role: "owner" });
  batch.update(doc(db, "groups", groupId), { ownerUid: newOwnerUid, updatedAt: now });
  await batch.commit();
}

export async function updateMemberTitle(
  groupId: string,
  updaterUid: string,
  targetUid: string,
  title: string
): Promise<void> {
  const updaterSnap = await getDoc(doc(membersCollection(groupId), updaterUid));
  if (!updaterSnap.exists()) throw new Error("You are not a member of this group.");
  const updater = updaterSnap.data() as GroupMember;
  if (updater.role !== "owner" && updater.role !== "admin") {
    throw new Error("Only owners and admins can set titles.");
  }

  const targetSnap = await getDoc(doc(membersCollection(groupId), targetUid));
  if (!targetSnap.exists()) throw new Error("Member not found.");

  const trimmed = title.trim().slice(0, 40);
  await updateDoc(doc(membersCollection(groupId), targetUid), { title: trimmed || deleteField() });
}

// ── Invites ──

export async function sendGroupInvite(
  groupId: string,
  groupName: string,
  groupIconUrl: string | undefined,
  inviter: { uid: string; displayName: string },
  targetUid: string,
  targetUsername?: string
): Promise<void> {
  const inviteId = getInviteId(groupId, targetUid);

  // Check target isn't already a member
  const existingMember = await getDoc(doc(membersCollection(groupId), targetUid));
  if (existingMember.exists()) {
    throw new Error("This user is already in your group.");
  }

  // Check for existing pending invite
  const existingSnap = await getDoc(doc(db, "groupInvites", inviteId));
  if (existingSnap.exists() && existingSnap.data().status === "pending") {
    throw new Error("An invite has already been sent to this user.");
  }

  const now = new Date().toISOString();

  const inviteData: Record<string, unknown> = {
    id: inviteId,
    groupId,
    groupName,
    inviterUid: inviter.uid,
    inviterName: inviter.displayName,
    targetUid,
    status: "pending",
    createdAt: now,
  };
  if (groupIconUrl) inviteData.groupIconUrl = groupIconUrl;
  if (targetUsername) inviteData.targetUsername = targetUsername;

  // Create invite + notification
  const batch = writeBatch(db);
  batch.set(doc(db, "groupInvites", inviteId), inviteData);

  const notifData: Record<string, unknown> = {
    type: "groupInvite",
    groupInviteId: inviteId,
    groupId,
    groupName,
    groupInviteFromUid: inviter.uid,
    groupInviteFromName: inviter.displayName,
    createdAt: now,
    read: false,
  };
  if (groupIconUrl) notifData.groupIconUrl = groupIconUrl;

  batch.set(doc(collection(db, "users", targetUid, "notifications")), notifData);
  await batch.commit();
}

export async function acceptGroupInvite(inviteId: string, profile: UserProfile): Promise<void> {
  const inviteSnap = await getDoc(doc(db, "groupInvites", inviteId));
  if (!inviteSnap.exists()) throw new Error("Invite not found.");
  const invite = inviteSnap.data() as GroupInvite;
  if (invite.status !== "pending") throw new Error("This invite is no longer pending.");
  if (invite.targetUid !== profile.uid) throw new Error("This invite is not for you.");

  const groupSnap = await getDoc(doc(db, "groups", invite.groupId));
  if (!groupSnap.exists()) throw new Error("Group no longer exists.");

  const now = new Date().toISOString();
  const memberData: Record<string, unknown> = {
    uid: profile.uid,
    username: profile.username,
    displayName: profile.displayName,
    role: "member",
    joinedAt: now,
  };
  if (profile.photoUrl) memberData.photoUrl = profile.photoUrl;

  const group = groupSnap.data() as Group;

  const batch = writeBatch(db);
  batch.update(doc(db, "groupInvites", inviteId), { status: "accepted" });
  batch.set(doc(membersCollection(invite.groupId), profile.uid), memberData);
  batch.update(doc(db, "groups", invite.groupId), { memberCount: increment(1), updatedAt: now });
  batch.set(userGroupsDoc(profile.uid, invite.groupId), { groupId: invite.groupId, groupName: group.name, joinedAt: now });
  await batch.commit();
}

export async function declineGroupInvite(inviteId: string): Promise<void> {
  await updateDoc(doc(db, "groupInvites", inviteId), { status: "declined" });
}

export async function cancelGroupInvite(inviteId: string): Promise<void> {
  await deleteDoc(doc(db, "groupInvites", inviteId));
}

// ── Queries ──

export async function getAllGroups(): Promise<Group[]> {
  const snap = await getDocs(query(groupsCollection(), where("memberCount", ">", 0), limit(50)));
  return snap.docs.map((d) => d.data() as Group);
}

export async function getGroup(groupId: string): Promise<Group | null> {
  const snap = await getDoc(doc(db, "groups", groupId));
  return snap.exists() ? (snap.data() as Group) : null;
}

export async function getGroupByName(nameLower: string): Promise<Group | null> {
  const nameSnap = await getDoc(doc(db, "groupnames", nameLower));
  if (!nameSnap.exists()) return null;
  const { groupId } = nameSnap.data() as { groupId: string };
  return getGroup(groupId);
}

export async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  const snap = await getDocs(membersCollection(groupId));
  return snap.docs.map((d) => d.data() as GroupMember);
}

export async function getPendingInvites(groupId: string): Promise<GroupInvite[]> {
  const snap = await getDocs(
    query(groupInvitesCollection(), where("groupId", "==", groupId), where("status", "==", "pending"))
  );
  return snap.docs.map((d) => d.data() as GroupInvite);
}

export async function getMyPendingGroupInvites(uid: string): Promise<GroupInvite[]> {
  const snap = await getDocs(
    query(groupInvitesCollection(), where("targetUid", "==", uid), where("status", "==", "pending"))
  );
  return snap.docs.map((d) => d.data() as GroupInvite);
}

export async function searchGroups(
  prefix: string,
  maxResults = 10
): Promise<{ groupId: string; name: string; nameLower: string }[]> {
  if (!prefix.trim()) return [];
  const lower = prefix.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!lower) return [];
  const end = lower.slice(0, -1) + String.fromCharCode(lower.charCodeAt(lower.length - 1) + 1);

  const snap = await getDocs(
    query(
      groupNamesCollection(),
      where("__name__", ">=", lower),
      where("__name__", "<", end),
      limit(maxResults)
    )
  );

  return snap.docs.map((d) => ({
    groupId: (d.data() as { groupId: string }).groupId,
    name: (d.data() as { name: string }).name,
    nameLower: d.id,
  }));
}

// ── Subscriptions ──

export function subscribeToGroup(groupId: string, cb: (group: Group | null) => void): Unsubscribe {
  return onSnapshot(doc(db, "groups", groupId), (snap) => {
    cb(snap.exists() ? (snap.data() as Group) : null);
  });
}

export function subscribeToGroupMembers(groupId: string, cb: (members: GroupMember[]) => void): Unsubscribe {
  return onSnapshot(membersCollection(groupId), (snap) => {
    cb(snap.docs.map((d) => d.data() as GroupMember));
  });
}

export function subscribeToMyGroupInvites(uid: string, cb: (invites: GroupInvite[]) => void): Unsubscribe {
  return onSnapshot(
    query(groupInvitesCollection(), where("targetUid", "==", uid), where("status", "==", "pending")),
    (snap) => {
      cb(snap.docs.map((d) => d.data() as GroupInvite));
    }
  );
}
