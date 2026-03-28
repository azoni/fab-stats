import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  onSnapshot,
  query,
  where,
  increment,
  writeBatch,
  limit,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import { containsProfanity } from "./profanity-filter";
import type { Team, TeamMember, TeamInvite, UserProfile } from "@/types";

// ── Helpers ──

function teamsCollection() {
  return collection(db, "teams");
}

function membersCollection(teamId: string) {
  return collection(db, "teams", teamId, "members");
}

function teamNamesCollection() {
  return collection(db, "teamnames");
}

function teamInvitesCollection() {
  return collection(db, "teamInvites");
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function getInviteId(teamId: string, targetUid: string): string {
  return `${teamId}_${targetUid}`;
}

// ── CRUD ──

export async function createTeam(
  profile: UserProfile,
  matchCount: number,
  opts: { name: string; description?: string; joinMode: "open" | "invite" }
): Promise<string> {
  if (matchCount < 25) {
    throw new Error("You need at least 25 logged matches to create a team.");
  }
  if (profile.teamId) {
    throw new Error("You are already on a team. Leave your current team first.");
  }
  const trimmedName = opts.name.trim();
  if (!trimmedName || trimmedName.length > 50) {
    throw new Error("Team name must be 1-50 characters.");
  }
  if (containsProfanity(trimmedName)) {
    throw new Error("Team name contains inappropriate language.");
  }
  if (opts.description && opts.description.length > 500) {
    throw new Error("Description must be 500 characters or less.");
  }
  if (opts.description && containsProfanity(opts.description)) {
    throw new Error("Description contains inappropriate language.");
  }

  const nameLower = slugify(trimmedName);
  if (!nameLower) {
    throw new Error("Team name must contain at least one letter or number.");
  }

  // Check name uniqueness
  const nameDoc = await getDoc(doc(db, "teamnames", nameLower));
  if (nameDoc.exists()) {
    throw new Error("A team with this name already exists.");
  }

  const now = new Date().toISOString();
  const teamRef = doc(teamsCollection());
  const teamId = teamRef.id;

  const teamData: Record<string, unknown> = {
    id: teamId,
    name: trimmedName,
    nameLower,
    ownerUid: profile.uid,
    joinMode: opts.joinMode,
    memberCount: 1,
    createdAt: now,
    updatedAt: now,
  };
  if (opts.description) teamData.description = opts.description;

  const memberData: Record<string, unknown> = {
    uid: profile.uid,
    username: profile.username,
    displayName: profile.displayName,
    role: "owner",
    joinedAt: now,
  };
  if (profile.photoUrl) memberData.photoUrl = profile.photoUrl;

  const batch = writeBatch(db);
  batch.set(teamRef, teamData);
  batch.set(doc(membersCollection(teamId), profile.uid), memberData);
  batch.set(doc(db, "teamnames", nameLower), { teamId, name: trimmedName });
  batch.update(doc(db, "users", profile.uid, "profile", "main"), { teamId });
  await batch.commit();

  return teamId;
}

export async function updateTeam(
  teamId: string,
  updates: Partial<Pick<Team, "name" | "description" | "joinMode">>
): Promise<void> {
  const updateData: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (updates.name !== undefined) {
    const trimmedName = updates.name.trim();
    if (!trimmedName || trimmedName.length > 50) {
      throw new Error("Team name must be 1-50 characters.");
    }
    if (containsProfanity(trimmedName)) {
      throw new Error("Team name contains inappropriate language.");
    }
    const nameLower = slugify(trimmedName);
    if (!nameLower) {
      throw new Error("Team name must contain at least one letter or number.");
    }

    // Check name uniqueness (if changed)
    const teamSnap = await getDoc(doc(db, "teams", teamId));
    const currentTeam = teamSnap.data() as Team | undefined;
    if (currentTeam && currentTeam.nameLower !== nameLower) {
      const nameDoc = await getDoc(doc(db, "teamnames", nameLower));
      if (nameDoc.exists()) {
        throw new Error("A team with this name already exists.");
      }

      const batch = writeBatch(db);
      batch.delete(doc(db, "teamnames", currentTeam.nameLower));
      batch.set(doc(db, "teamnames", nameLower), { teamId, name: trimmedName });
      batch.update(doc(db, "teams", teamId), {
        ...updateData,
        name: trimmedName,
        nameLower,
      });
      await batch.commit();
      return;
    }

    updateData.name = trimmedName;
    updateData.nameLower = nameLower;
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

  await updateDoc(doc(db, "teams", teamId), updateData);
}

export async function disbandTeam(teamId: string, ownerUid: string): Promise<void> {
  const teamSnap = await getDoc(doc(db, "teams", teamId));
  if (!teamSnap.exists()) throw new Error("Team not found.");
  const team = teamSnap.data() as Team;
  if (team.ownerUid !== ownerUid) throw new Error("Only the team owner can disband.");

  // Get all members to clear their teamId
  const membersSnap = await getDocs(membersCollection(teamId));

  // Batch delete in groups of 450 (leaving room for other writes)
  const memberDocs = membersSnap.docs;
  for (let i = 0; i < memberDocs.length; i += 450) {
    const batch = writeBatch(db);
    const chunk = memberDocs.slice(i, i + 450);
    for (const memberDoc of chunk) {
      batch.delete(memberDoc.ref);
      batch.update(doc(db, "users", memberDoc.id, "profile", "main"), { teamId: "" });
    }
    if (i === 0) {
      batch.delete(doc(db, "teams", teamId));
      batch.delete(doc(db, "teamnames", team.nameLower));
    }
    await batch.commit();
  }

  // If no members at all (shouldn't happen), still clean up
  if (memberDocs.length === 0) {
    const batch = writeBatch(db);
    batch.delete(doc(db, "teams", teamId));
    batch.delete(doc(db, "teamnames", team.nameLower));
    await batch.commit();
  }

  // Clean up pending invites for this team
  const invitesSnap = await getDocs(
    query(teamInvitesCollection(), where("teamId", "==", teamId), where("status", "==", "pending"))
  );
  for (let i = 0; i < invitesSnap.docs.length; i += 500) {
    const batch = writeBatch(db);
    invitesSnap.docs.slice(i, i + 500).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

// ── Members ──

export async function joinTeam(teamId: string, profile: UserProfile): Promise<void> {
  if (profile.teamId) {
    throw new Error("You are already on a team.");
  }
  const teamSnap = await getDoc(doc(db, "teams", teamId));
  if (!teamSnap.exists()) throw new Error("Team not found.");
  const team = teamSnap.data() as Team;
  if (team.joinMode !== "open") throw new Error("This team is invite-only.");

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
  batch.set(doc(membersCollection(teamId), profile.uid), memberData);
  batch.update(doc(db, "teams", teamId), { memberCount: increment(1), updatedAt: now });
  batch.update(doc(db, "users", profile.uid, "profile", "main"), { teamId });
  await batch.commit();
}

export async function leaveTeam(teamId: string, uid: string): Promise<void> {
  const memberSnap = await getDoc(doc(membersCollection(teamId), uid));
  if (!memberSnap.exists()) throw new Error("You are not a member of this team.");
  const member = memberSnap.data() as TeamMember;
  if (member.role === "owner") {
    throw new Error("The team owner cannot leave. Transfer ownership or disband the team.");
  }

  const now = new Date().toISOString();
  const batch = writeBatch(db);
  batch.delete(doc(membersCollection(teamId), uid));
  batch.update(doc(db, "teams", teamId), { memberCount: increment(-1), updatedAt: now });
  batch.update(doc(db, "users", uid, "profile", "main"), { teamId: "" });
  await batch.commit();
}

export async function kickMember(teamId: string, kickerUid: string, targetUid: string): Promise<void> {
  // Verify kicker is owner or admin
  const kickerSnap = await getDoc(doc(membersCollection(teamId), kickerUid));
  if (!kickerSnap.exists()) throw new Error("You are not a member of this team.");
  const kicker = kickerSnap.data() as TeamMember;
  if (kicker.role !== "owner" && kicker.role !== "admin") {
    throw new Error("Only owners and admins can kick members.");
  }

  // Can't kick the owner
  const targetSnap = await getDoc(doc(membersCollection(teamId), targetUid));
  if (!targetSnap.exists()) throw new Error("Member not found.");
  const target = targetSnap.data() as TeamMember;
  if (target.role === "owner") throw new Error("Cannot kick the team owner.");

  const now = new Date().toISOString();
  const batch = writeBatch(db);
  batch.delete(doc(membersCollection(teamId), targetUid));
  batch.update(doc(db, "teams", teamId), { memberCount: increment(-1), updatedAt: now });
  batch.update(doc(db, "users", targetUid, "profile", "main"), { teamId: "" });
  await batch.commit();
}

export async function updateMemberRole(
  teamId: string,
  updaterUid: string,
  targetUid: string,
  newRole: "admin" | "member"
): Promise<void> {
  const updaterSnap = await getDoc(doc(membersCollection(teamId), updaterUid));
  if (!updaterSnap.exists()) throw new Error("You are not a member of this team.");
  const updater = updaterSnap.data() as TeamMember;
  if (updater.role !== "owner" && updater.role !== "admin") {
    throw new Error("Only owners and admins can change roles.");
  }

  const targetSnap = await getDoc(doc(membersCollection(teamId), targetUid));
  if (!targetSnap.exists()) throw new Error("Member not found.");
  const target = targetSnap.data() as TeamMember;
  if (target.role === "owner") throw new Error("Cannot change the owner's role.");

  await updateDoc(doc(membersCollection(teamId), targetUid), { role: newRole });
}

// ── Invites ──

export async function sendTeamInvite(
  teamId: string,
  teamName: string,
  teamIconUrl: string | undefined,
  inviter: { uid: string; displayName: string },
  targetUid: string
): Promise<void> {
  // Check target isn't already on a team
  const targetProfileSnap = await getDoc(doc(db, "users", targetUid, "profile", "main"));
  if (targetProfileSnap.exists()) {
    const targetProfile = targetProfileSnap.data() as UserProfile;
    if (targetProfile.teamId) {
      throw new Error("This user is already on a team.");
    }
  }

  const inviteId = getInviteId(teamId, targetUid);

  // Check for existing pending invite
  const existingSnap = await getDoc(doc(db, "teamInvites", inviteId));
  if (existingSnap.exists() && existingSnap.data().status === "pending") {
    throw new Error("An invite has already been sent to this user.");
  }

  const now = new Date().toISOString();

  const inviteData: Record<string, unknown> = {
    id: inviteId,
    teamId,
    teamName,
    inviterUid: inviter.uid,
    inviterName: inviter.displayName,
    targetUid,
    status: "pending",
    createdAt: now,
  };
  if (teamIconUrl) inviteData.teamIconUrl = teamIconUrl;

  // Create invite + notification
  const batch = writeBatch(db);
  batch.set(doc(db, "teamInvites", inviteId), inviteData);

  const notifData: Record<string, unknown> = {
    type: "teamInvite",
    teamInviteId: inviteId,
    teamId,
    teamName,
    teamInviteFromUid: inviter.uid,
    teamInviteFromName: inviter.displayName,
    createdAt: now,
    read: false,
  };
  if (teamIconUrl) notifData.teamIconUrl = teamIconUrl;

  batch.set(doc(collection(db, "users", targetUid, "notifications")), notifData);
  await batch.commit();
}

export async function acceptTeamInvite(inviteId: string, profile: UserProfile): Promise<void> {
  if (profile.teamId) {
    throw new Error("You are already on a team.");
  }

  const inviteSnap = await getDoc(doc(db, "teamInvites", inviteId));
  if (!inviteSnap.exists()) throw new Error("Invite not found.");
  const invite = inviteSnap.data() as TeamInvite;
  if (invite.status !== "pending") throw new Error("This invite is no longer pending.");
  if (invite.targetUid !== profile.uid) throw new Error("This invite is not for you.");

  const teamSnap = await getDoc(doc(db, "teams", invite.teamId));
  if (!teamSnap.exists()) throw new Error("Team no longer exists.");

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
  batch.update(doc(db, "teamInvites", inviteId), { status: "accepted" });
  batch.set(doc(membersCollection(invite.teamId), profile.uid), memberData);
  batch.update(doc(db, "teams", invite.teamId), { memberCount: increment(1), updatedAt: now });
  batch.update(doc(db, "users", profile.uid, "profile", "main"), { teamId: invite.teamId });
  await batch.commit();
}

export async function declineTeamInvite(inviteId: string): Promise<void> {
  await updateDoc(doc(db, "teamInvites", inviteId), { status: "declined" });
}

export async function cancelTeamInvite(inviteId: string): Promise<void> {
  await deleteDoc(doc(db, "teamInvites", inviteId));
}

// ── Queries ──

export async function getTeam(teamId: string): Promise<Team | null> {
  const snap = await getDoc(doc(db, "teams", teamId));
  return snap.exists() ? (snap.data() as Team) : null;
}

export async function getTeamByName(nameLower: string): Promise<Team | null> {
  const nameSnap = await getDoc(doc(db, "teamnames", nameLower));
  if (!nameSnap.exists()) return null;
  const { teamId } = nameSnap.data() as { teamId: string };
  return getTeam(teamId);
}

export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  const snap = await getDocs(membersCollection(teamId));
  return snap.docs.map((d) => d.data() as TeamMember);
}

export async function getPendingInvites(teamId: string): Promise<TeamInvite[]> {
  const snap = await getDocs(
    query(teamInvitesCollection(), where("teamId", "==", teamId), where("status", "==", "pending"))
  );
  return snap.docs.map((d) => d.data() as TeamInvite);
}

export async function getMyPendingInvites(uid: string): Promise<TeamInvite[]> {
  const snap = await getDocs(
    query(teamInvitesCollection(), where("targetUid", "==", uid), where("status", "==", "pending"))
  );
  return snap.docs.map((d) => d.data() as TeamInvite);
}

export async function searchTeams(
  prefix: string,
  maxResults = 10
): Promise<{ teamId: string; name: string; nameLower: string }[]> {
  if (!prefix.trim()) return [];
  const lower = prefix.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!lower) return [];
  const end = lower.slice(0, -1) + String.fromCharCode(lower.charCodeAt(lower.length - 1) + 1);

  const snap = await getDocs(
    query(
      teamNamesCollection(),
      where("__name__", ">=", lower),
      where("__name__", "<", end),
      limit(maxResults)
    )
  );

  return snap.docs.map((d) => ({
    teamId: (d.data() as { teamId: string }).teamId,
    name: (d.data() as { name: string }).name,
    nameLower: d.id,
  }));
}

// ── Subscriptions ──

export function subscribeToTeam(teamId: string, cb: (team: Team | null) => void): Unsubscribe {
  return onSnapshot(doc(db, "teams", teamId), (snap) => {
    cb(snap.exists() ? (snap.data() as Team) : null);
  });
}

export function subscribeToTeamMembers(teamId: string, cb: (members: TeamMember[]) => void): Unsubscribe {
  return onSnapshot(membersCollection(teamId), (snap) => {
    cb(snap.docs.map((d) => d.data() as TeamMember));
  });
}

export function subscribeToMyInvites(uid: string, cb: (invites: TeamInvite[]) => void): Unsubscribe {
  return onSnapshot(
    query(teamInvitesCollection(), where("targetUid", "==", uid), where("status", "==", "pending")),
    (snap) => {
      cb(snap.docs.map((d) => d.data() as TeamInvite));
    }
  );
}
