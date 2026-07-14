import {
  collection,
  collectionGroup,
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
  orderBy,
  arrayUnion,
  arrayRemove,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import { containsProfanity } from "./profanity-filter";
import { getStoreAliases, buildAliasIndex, groupForSlug } from "./store-aliases";
import type { League, LeagueMember, LeagueJoinRequest, LeagueScoringRules, UserProfile } from "@/types";

function leaguesCollection() {
  return collection(db, "leagues");
}

function leagueMembersCollection(leagueId: string) {
  return collection(db, "leagues", leagueId, "members");
}

function leagueJoinRequestsCollection(leagueId: string) {
  return collection(db, "leagues", leagueId, "joinRequests");
}

/** A league requires organizer approval unless it explicitly opts into open join.
 *  Legacy leagues with no joinPolicy are treated as approval-required. */
export function leagueRequiresApproval(league: Pick<League, "joinPolicy">): boolean {
  return league.joinPolicy !== "open";
}

/** All league IDs the user belongs to (organizer or player). One collection-group
 *  read over `members` — members subcollections are public-readable. */
export async function getMyLeagueIds(uid: string): Promise<Set<string>> {
  const ids = new Set<string>();
  const snap = await getDocs(query(collectionGroup(db, "members"), where("uid", "==", uid)));
  for (const d of snap.docs) {
    const leagueDoc = d.ref.parent.parent; // e.g. leagues/{id} (or teams/groups)
    if (leagueDoc?.parent.id === "leagues") ids.add(leagueDoc.id);
  }
  return ids;
}

export function slugifyLeague(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const DEFAULT_SCORING_RULES: LeagueScoringRules = {
  pointsPerWin: 3,
  pointsPerLoss: 1,
  pointsPerDraw: 1,
  pointsPerMatch: 0,
  eligibleEventTypes: ["Armory"],
};

// ── CRUD ──

export async function createLeague(
  profile: UserProfile,
  opts: {
    name: string;
    slug?: string;
    description?: string;
    city?: string;
    region?: string;
    country?: string;
    startDate: string;
    endDate: string;
    storeSlugs: string[];
    /** Display names for free-typed stores not in the auto-directory, keyed by slug. */
    storeNames?: Record<string, string>;
    scoringRules?: LeagueScoringRules;
    accentColor?: string;
    joinPolicy?: "open" | "approval";
  },
): Promise<string> {
  const trimmedName = opts.name.trim();
  if (!trimmedName || trimmedName.length > 80) {
    throw new Error("League name must be 1-80 characters.");
  }
  if (containsProfanity(trimmedName)) {
    throw new Error("League name contains inappropriate language.");
  }
  if (opts.description && opts.description.length > 1000) {
    throw new Error("Description must be 1000 characters or less.");
  }
  if (opts.description && containsProfanity(opts.description)) {
    throw new Error("Description contains inappropriate language.");
  }
  if (!opts.startDate || !opts.endDate) {
    throw new Error("Start date and end date are required.");
  }
  if (opts.startDate > opts.endDate) {
    throw new Error("End date must be after start date.");
  }
  if (!opts.storeSlugs || opts.storeSlugs.length === 0) {
    throw new Error("Add at least one store to the league.");
  }
  // De-dupe and ensure slug shape
  opts.storeSlugs = Array.from(new Set(opts.storeSlugs.filter(Boolean)));

  const slugBase = opts.slug ? slugifyLeague(opts.slug) : slugifyLeague(trimmedName);
  if (!slugBase || slugBase.length < 2) {
    throw new Error("URL slug must be at least 2 characters.");
  }
  if (slugBase.length > 50) {
    throw new Error("URL slug must be 50 characters or less.");
  }
  const slugTaken = await getDoc(doc(db, "leaguenames", slugBase));
  if (slugTaken.exists()) {
    throw new Error("This league URL slug is already taken.");
  }

  const now = new Date().toISOString();
  const leagueRef = doc(leaguesCollection());
  const leagueId = leagueRef.id;

  const scoringRules: LeagueScoringRules = opts.scoringRules || DEFAULT_SCORING_RULES;

  const leagueData: Record<string, unknown> = {
    id: leagueId,
    name: trimmedName,
    slug: slugBase,
    organizerUid: profile.uid,
    organizerName: profile.displayName,
    startDate: opts.startDate,
    endDate: opts.endDate,
    storeSlugs: opts.storeSlugs,
    scoringRules,
    status: "active",
    joinPolicy: opts.joinPolicy === "open" ? "open" : "approval",
    memberCount: 1,
    createdAt: now,
    updatedAt: now,
  };
  if (opts.description) leagueData.description = opts.description;
  if (opts.city) leagueData.city = opts.city.trim();
  if (opts.region) leagueData.region = opts.region.trim();
  if (opts.country) leagueData.country = opts.country.trim();
  if (opts.accentColor) leagueData.accentColor = opts.accentColor;
  // Only persist display names for stores still in the slug list (free-typed ones).
  if (opts.storeNames) {
    const pruned: Record<string, string> = {};
    for (const s of opts.storeSlugs) if (opts.storeNames[s]) pruned[s] = opts.storeNames[s];
    if (Object.keys(pruned).length) leagueData.storeNames = pruned;
  }

  const memberData: Record<string, unknown> = {
    uid: profile.uid,
    username: profile.username,
    displayName: profile.displayName,
    role: "organizer",
    joinedAt: now,
  };
  if (profile.photoUrl) memberData.photoUrl = profile.photoUrl;

  await setDoc(leagueRef, leagueData);

  const batch = writeBatch(db);
  batch.set(doc(leagueMembersCollection(leagueId), profile.uid), memberData);
  batch.set(doc(db, "leaguenames", slugBase), { leagueId, name: trimmedName });
  await batch.commit();

  return leagueId;
}

export async function updateLeague(
  leagueId: string,
  updates: Partial<
    Pick<
      League,
      | "name"
      | "description"
      | "city"
      | "region"
      | "country"
      | "startDate"
      | "endDate"
      | "storeSlugs"
      | "storeNames"
      | "scoringRules"
      | "status"
      | "accentColor"
      | "joinPolicy"
    >
  >,
): Promise<void> {
  const updateData: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (updates.name !== undefined) {
    const trimmed = updates.name.trim();
    if (!trimmed || trimmed.length > 80) throw new Error("League name must be 1-80 characters.");
    if (containsProfanity(trimmed)) throw new Error("League name contains inappropriate language.");
    updateData.name = trimmed;
  }
  if (updates.description !== undefined) {
    if (updates.description.length > 1000) {
      throw new Error("Description must be 1000 characters or less.");
    }
    if (updates.description && containsProfanity(updates.description)) {
      throw new Error("Description contains inappropriate language.");
    }
    updateData.description = updates.description;
  }
  if (updates.city !== undefined) updateData.city = updates.city.trim();
  if (updates.region !== undefined) updateData.region = updates.region.trim();
  if (updates.country !== undefined) updateData.country = updates.country.trim();
  if (updates.startDate !== undefined) updateData.startDate = updates.startDate;
  if (updates.endDate !== undefined) updateData.endDate = updates.endDate;
  if (updates.storeSlugs !== undefined) {
    // Never let an edit leave a league with zero stores — that silently makes
    // every match ineligible and zeroes all standings. Mirrors createLeague.
    const cleaned = Array.from(new Set(updates.storeSlugs.filter(Boolean)));
    if (cleaned.length === 0) throw new Error("A league must have at least one store.");
    updateData.storeSlugs = cleaned;
  }
  if (updates.storeNames !== undefined) updateData.storeNames = updates.storeNames;
  if (updates.scoringRules !== undefined) updateData.scoringRules = updates.scoringRules;
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.accentColor !== undefined) updateData.accentColor = updates.accentColor;

  if (
    updateData.startDate &&
    updateData.endDate &&
    (updateData.startDate as string) > (updateData.endDate as string)
  ) {
    throw new Error("End date must be after start date.");
  }

  await updateDoc(doc(db, "leagues", leagueId), updateData);
}

export async function addStoreToLeague(leagueId: string, storeSlug: string): Promise<void> {
  await updateDoc(doc(db, "leagues", leagueId), {
    storeSlugs: arrayUnion(storeSlug),
    updatedAt: new Date().toISOString(),
  });
}

export async function removeStoreFromLeague(leagueId: string, storeSlug: string): Promise<void> {
  await updateDoc(doc(db, "leagues", leagueId), {
    storeSlugs: arrayRemove(storeSlug),
    updatedAt: new Date().toISOString(),
  });
}

export async function disbandLeague(leagueId: string, organizerUid: string): Promise<void> {
  const leagueSnap = await getDoc(doc(db, "leagues", leagueId));
  if (!leagueSnap.exists()) throw new Error("League not found.");
  const league = leagueSnap.data() as League;
  if (league.organizerUid !== organizerUid) {
    throw new Error("Only the organizer can disband the league.");
  }

  const membersSnap = await getDocs(leagueMembersCollection(leagueId));
  const memberDocs = membersSnap.docs;
  for (let i = 0; i < memberDocs.length; i += 450) {
    const chunk = memberDocs.slice(i, i + 450);
    const batch = writeBatch(db);
    chunk.forEach((m) => batch.delete(m.ref));
    if (i === 0) {
      batch.delete(doc(db, "leagues", leagueId));
      batch.delete(doc(db, "leaguenames", league.slug));
      batch.delete(doc(db, "leagues", leagueId, "standings", "current"));
    }
    await batch.commit();
  }

  if (memberDocs.length === 0) {
    const batch = writeBatch(db);
    batch.delete(doc(db, "leagues", leagueId));
    batch.delete(doc(db, "leaguenames", league.slug));
    batch.delete(doc(db, "leagues", leagueId, "standings", "current"));
    await batch.commit();
  }
}

// ── Members (open join) ──

/** Join a league. Open leagues add the member immediately ("joined");
 *  approval leagues create a pending join request instead ("requested"). */
export async function joinLeague(
  league: League,
  profile: UserProfile,
): Promise<"joined" | "requested"> {
  const memberRef = doc(leagueMembersCollection(league.id), profile.uid);
  const existing = await getDoc(memberRef);
  if (existing.exists()) return "joined";

  const now = new Date().toISOString();

  if (leagueRequiresApproval(league)) {
    const reqData: Record<string, unknown> = {
      uid: profile.uid,
      username: profile.username,
      displayName: profile.displayName,
      requestedAt: now,
    };
    if (profile.photoUrl) reqData.photoUrl = profile.photoUrl;
    await setDoc(doc(leagueJoinRequestsCollection(league.id), profile.uid), reqData);
    return "requested";
  }

  const memberData: Record<string, unknown> = {
    uid: profile.uid,
    username: profile.username,
    displayName: profile.displayName,
    role: "player",
    joinedAt: now,
  };
  if (profile.photoUrl) memberData.photoUrl = profile.photoUrl;

  const batch = writeBatch(db);
  batch.set(memberRef, memberData);
  batch.update(doc(db, "leagues", league.id), { memberCount: increment(1), updatedAt: now });
  await batch.commit();
  return "joined";
}

/** Organizer approves a pending request: adds the player and removes the request. */
export async function approveJoinRequest(
  leagueId: string,
  request: LeagueJoinRequest,
): Promise<void> {
  const now = new Date().toISOString();
  const memberData: Record<string, unknown> = {
    uid: request.uid,
    username: request.username,
    displayName: request.displayName,
    role: "player",
    joinedAt: now,
  };
  if (request.photoUrl) memberData.photoUrl = request.photoUrl;

  const batch = writeBatch(db);
  batch.set(doc(leagueMembersCollection(leagueId), request.uid), memberData);
  batch.delete(doc(leagueJoinRequestsCollection(leagueId), request.uid));
  batch.update(doc(db, "leagues", leagueId), { memberCount: increment(1), updatedAt: now });
  await batch.commit();
}

/** Organizer rejects, or a requester cancels, a pending join request. */
export async function removeJoinRequest(leagueId: string, uid: string): Promise<void> {
  await deleteDoc(doc(leagueJoinRequestsCollection(leagueId), uid));
}

/** Whether the given user currently has a pending join request. */
export async function hasPendingJoinRequest(leagueId: string, uid: string): Promise<boolean> {
  const snap = await getDoc(doc(leagueJoinRequestsCollection(leagueId), uid));
  return snap.exists();
}

export async function getJoinRequests(leagueId: string): Promise<LeagueJoinRequest[]> {
  const snap = await getDocs(leagueJoinRequestsCollection(leagueId));
  return snap.docs
    .map((d) => d.data() as LeagueJoinRequest)
    .sort((a, b) => a.requestedAt.localeCompare(b.requestedAt));
}

export function subscribeToJoinRequests(
  leagueId: string,
  cb: (requests: LeagueJoinRequest[]) => void,
): Unsubscribe {
  return onSnapshot(leagueJoinRequestsCollection(leagueId), (snap) => {
    cb(
      snap.docs
        .map((d) => d.data() as LeagueJoinRequest)
        .sort((a, b) => a.requestedAt.localeCompare(b.requestedAt)),
    );
  });
}

export async function leaveLeague(leagueId: string, uid: string): Promise<void> {
  const memberSnap = await getDoc(doc(leagueMembersCollection(leagueId), uid));
  if (!memberSnap.exists()) throw new Error("You are not in this league.");
  const member = memberSnap.data() as LeagueMember;
  if (member.role === "organizer") {
    throw new Error("The organizer cannot leave. Transfer organizer role or disband the league.");
  }

  const now = new Date().toISOString();
  const batch = writeBatch(db);
  batch.delete(doc(leagueMembersCollection(leagueId), uid));
  batch.update(doc(db, "leagues", leagueId), { memberCount: increment(-1), updatedAt: now });
  await batch.commit();
}

export async function kickLeagueMember(
  leagueId: string,
  organizerUid: string,
  targetUid: string,
): Promise<void> {
  const league = await getLeague(leagueId);
  if (!league) throw new Error("League not found.");
  if (league.organizerUid !== organizerUid) {
    throw new Error("Only the organizer can remove members.");
  }
  if (targetUid === organizerUid) throw new Error("Cannot remove the organizer.");

  // Verify the target is actually a member before decrementing memberCount,
  // otherwise a stale/duplicate kick drives the count below the real total.
  const memberRef = doc(leagueMembersCollection(leagueId), targetUid);
  const memberSnap = await getDoc(memberRef);
  if (!memberSnap.exists()) throw new Error("That player is not a member of this league.");

  const now = new Date().toISOString();
  const batch = writeBatch(db);
  batch.delete(memberRef);
  batch.update(doc(db, "leagues", leagueId), { memberCount: increment(-1), updatedAt: now });
  await batch.commit();
}

// ── Queries ──

export async function getAllLeagues(): Promise<League[]> {
  const snap = await getDocs(query(leaguesCollection(), orderBy("createdAt", "desc"), limit(100)));
  return snap.docs.map((d) => d.data() as League);
}

export async function getLeague(leagueId: string): Promise<League | null> {
  const snap = await getDoc(doc(db, "leagues", leagueId));
  return snap.exists() ? (snap.data() as League) : null;
}

export async function getLeagueBySlug(slug: string): Promise<League | null> {
  const nameSnap = await getDoc(doc(db, "leaguenames", slug));
  if (!nameSnap.exists()) return null;
  const { leagueId } = nameSnap.data() as { leagueId: string };
  return getLeague(leagueId);
}

export async function getLeagueMembers(leagueId: string): Promise<LeagueMember[]> {
  const snap = await getDocs(leagueMembersCollection(leagueId));
  return snap.docs.map((d) => d.data() as LeagueMember);
}

export async function getLeaguesForStore(storeSlug: string): Promise<League[]> {
  // Include leagues that reference any member of this store's admin-merge group
  // (a league may store the canonical slug or any member slug), deduped by id.
  const index = buildAliasIndex(await getStoreAliases());
  const group = groupForSlug(storeSlug, index);
  const slugs = group ? group.memberSlugs : [storeSlug];
  const snaps = await Promise.all(
    slugs.map((s) =>
      getDocs(query(leaguesCollection(), where("storeSlugs", "array-contains", s), limit(50))),
    ),
  );
  const byId = new Map<string, League>();
  for (const snap of snaps) {
    for (const d of snap.docs) {
      const l = d.data() as League;
      byId.set(l.id, l);
    }
  }
  return [...byId.values()];
}

// ── Subscriptions ──

export function subscribeToLeague(leagueId: string, cb: (league: League | null) => void): Unsubscribe {
  return onSnapshot(doc(db, "leagues", leagueId), (snap) => {
    cb(snap.exists() ? (snap.data() as League) : null);
  });
}

export function subscribeToLeagueMembers(
  leagueId: string,
  cb: (members: LeagueMember[]) => void,
): Unsubscribe {
  return onSnapshot(leagueMembersCollection(leagueId), (snap) => {
    cb(snap.docs.map((d) => d.data() as LeagueMember));
  });
}
