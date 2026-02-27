import {
  collection,
  doc,
  addDoc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  where,
  limit,
  writeBatch,
  runTransaction,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import type { MatchRecord, UserProfile } from "@/types";

/** Build a fingerprint to detect duplicate matches */
function matchFingerprint(m: { date: string; opponentName?: string; notes?: string; result: string }): string {
  return `${m.date}|${(m.opponentName || "").toLowerCase()}|${m.notes || ""}|${m.result}`;
}

function matchesCollection(userId: string) {
  return collection(db, "users", userId, "matches");
}

export function subscribeToMatches(
  userId: string,
  callback: (matches: MatchRecord[]) => void
): Unsubscribe {
  const q = query(matchesCollection(userId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const matches = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as MatchRecord[];
    callback(matches);
  });
}

export async function addMatchFirestore(
  userId: string,
  match: Omit<MatchRecord, "id" | "createdAt">
): Promise<MatchRecord> {
  const now = new Date().toISOString();
  // Firestore rejects undefined values — strip them before writing
  const clean: Record<string, unknown> = { createdAt: now };
  for (const [k, v] of Object.entries(match)) {
    if (v !== undefined) clean[k] = v;
  }
  const docRef = await addDoc(matchesCollection(userId), clean);
  return { ...match, id: docRef.id, createdAt: now };
}

export async function updateMatchFirestore(
  userId: string,
  matchId: string,
  updates: Partial<Omit<MatchRecord, "id" | "createdAt">>
): Promise<void> {
  const docRef = doc(db, "users", userId, "matches", matchId);
  // Strip undefined values before writing to Firestore
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(updates)) {
    if (v !== undefined) clean[k] = v;
  }
  await updateDoc(docRef, clean);
}

export async function deleteMatchFirestore(
  userId: string,
  matchId: string
): Promise<void> {
  const docRef = doc(db, "users", userId, "matches", matchId);
  await deleteDoc(docRef);
}

export async function importMatchesFirestore(
  userId: string,
  matches: Omit<MatchRecord, "id" | "createdAt">[]
): Promise<number> {
  // Fetch existing matches to detect duplicates
  const existing = await getDocs(query(matchesCollection(userId)));
  const existingFingerprints = new Set(
    existing.docs.map((d) => {
      const data = d.data();
      return matchFingerprint({
        date: data.date,
        opponentName: data.opponentName,
        notes: data.notes,
        result: data.result,
      });
    })
  );

  // Filter out duplicates
  const newMatches = matches.filter(
    (m) => !existingFingerprints.has(matchFingerprint(m))
  );

  if (newMatches.length === 0) return 0;

  const batchSize = 500;
  let imported = 0;

  for (let i = 0; i < newMatches.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = newMatches.slice(i, i + batchSize);
    const now = new Date().toISOString();

    for (const match of chunk) {
      const docRef = doc(matchesCollection(userId));
      // Firestore rejects undefined values — strip them before writing
      const clean: Record<string, unknown> = { createdAt: now };
      for (const [k, v] of Object.entries(match)) {
        if (v !== undefined) clean[k] = v;
      }
      batch.set(docRef, clean);
    }

    await batch.commit();
    imported += chunk.length;
  }

  return imported;
}

export async function batchUpdateMatchesFirestore(
  userId: string,
  matchIds: string[],
  changes: Partial<Omit<MatchRecord, "id" | "createdAt">>
): Promise<void> {
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(changes)) {
    if (v !== undefined) clean[k] = v;
  }
  const batchSize = 500;
  for (let i = 0; i < matchIds.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = matchIds.slice(i, i + batchSize);
    for (const matchId of chunk) {
      batch.update(doc(db, "users", userId, "matches", matchId), clean);
    }
    await batch.commit();
  }
}

export async function batchDeleteMatchesFirestore(
  userId: string,
  matchIds: string[]
): Promise<void> {
  const batchSize = 500;
  for (let i = 0; i < matchIds.length; i += batchSize) {
    const batch = writeBatch(db);
    matchIds.slice(i, i + batchSize).forEach((id) => batch.delete(doc(db, "users", userId, "matches", id)));
    await batch.commit();
  }
}

export async function clearAllMatchesFirestore(
  userId: string
): Promise<void> {
  const snapshot = await getDocs(query(matchesCollection(userId)));
  const batchSize = 500;

  for (let i = 0; i < snapshot.docs.length; i += batchSize) {
    const batch = writeBatch(db);
    snapshot.docs.slice(i, i + batchSize).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

// ── Profile functions ──

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", userId, "profile", "main"));
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}

export function subscribeToProfile(
  userId: string,
  callback: (profile: UserProfile | null) => void
): Unsubscribe {
  return onSnapshot(doc(db, "users", userId, "profile", "main"), (snap) => {
    callback(snap.exists() ? (snap.data() as UserProfile) : null);
  });
}

export async function isUsernameTaken(username: string): Promise<boolean> {
  const snap = await getDoc(doc(db, "usernames", username.toLowerCase()));
  return snap.exists();
}

export async function createProfile(
  userId: string,
  profile: Omit<UserProfile, "uid" | "createdAt">
): Promise<void> {
  const username = profile.username.toLowerCase();

  await runTransaction(db, async (transaction) => {
    const usernameRef = doc(db, "usernames", username);
    const usernameSnap = await transaction.get(usernameRef);

    if (usernameSnap.exists()) {
      throw new Error("Username is already taken");
    }

    transaction.set(usernameRef, {
      userId,
      displayName: profile.displayName,
      searchName: profile.searchName || profile.displayName.toLowerCase(),
    });
    // Strip undefined values — Firestore rejects them
    const profileData: Record<string, unknown> = {
      username,
      uid: userId,
      createdAt: new Date().toISOString(),
    };
    for (const [k, v] of Object.entries(profile)) {
      if (v !== undefined) profileData[k] = v;
    }
    transaction.set(doc(db, "users", userId, "profile", "main"), profileData);
  });
}

export async function getProfileByUsername(
  username: string
): Promise<UserProfile | null> {
  const usernameSnap = await getDoc(doc(db, "usernames", username.toLowerCase()));
  if (!usernameSnap.exists()) return null;

  const { userId } = usernameSnap.data() as { userId: string };
  return getProfile(userId);
}

export async function getMatchesByUserId(
  userId: string
): Promise<MatchRecord[]> {
  const q = query(matchesCollection(userId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as MatchRecord[];
}

export async function searchUsernames(
  prefix: string,
  maxResults = 20
): Promise<{ username: string; userId: string }[]> {
  if (!prefix.trim()) return [];
  // Strip commas and extra spaces so "Biggs, Ryan" becomes "biggs ryan"
  const lower = prefix.toLowerCase().replace(/,/g, "").replace(/\s+/g, " ").trim();
  const end = lower.slice(0, -1) + String.fromCharCode(lower.charCodeAt(lower.length - 1) + 1);

  // Search by username prefix
  const usernameQ = query(
    collection(db, "usernames"),
    where("__name__", ">=", lower),
    where("__name__", "<", end),
    limit(maxResults)
  );

  // Search by searchName prefix (first/last/display name)
  const nameQ = query(
    collection(db, "usernames"),
    where("searchName", ">=", lower),
    where("searchName", "<", end),
    limit(maxResults)
  );

  const queries = [getDocs(usernameQ), getDocs(nameQ)];

  // Also try reversed word order: "biggs ryan" → "ryan biggs"
  const words = lower.split(" ");
  if (words.length >= 2) {
    const reversed = [...words].reverse().join(" ");
    const revEnd = reversed.slice(0, -1) + String.fromCharCode(reversed.charCodeAt(reversed.length - 1) + 1);
    const revQ = query(
      collection(db, "usernames"),
      where("searchName", ">=", reversed),
      where("searchName", "<", revEnd),
      limit(maxResults)
    );
    queries.push(getDocs(revQ));
  }

  const snaps = await Promise.all(queries);

  const seen = new Set<string>();
  const results: { username: string; userId: string }[] = [];

  for (const snap of snaps) {
    for (const d of snap.docs) {
      if (seen.has(d.id)) continue;
      seen.add(d.id);
      results.push({
        username: d.id,
        userId: (d.data() as { userId: string }).userId,
      });
    }
  }

  return results.slice(0, maxResults);
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, "displayName" | "photoUrl" | "isPublic" | "firstName" | "lastName" | "searchName" | "earnings" | "showNameOnProfiles" | "hideFromSpotlight" | "gemId" | "unlockedCans">>
): Promise<void> {
  const profileRef = doc(db, "users", userId, "profile", "main");
  // Strip undefined values — Firestore rejects them
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(updates)) {
    if (v !== undefined) clean[k] = v;
  }
  await updateDoc(profileRef, clean);

  // Sync searchable fields to usernames collection for name search
  if (updates.displayName || updates.searchName) {
    const profile = await getProfile(userId);
    if (profile) {
      const usernameRef = doc(db, "usernames", profile.username);
      const usernameUpdates: Record<string, string> = {};
      if (updates.displayName) usernameUpdates.displayName = updates.displayName;
      if (updates.searchName) usernameUpdates.searchName = updates.searchName;
      await updateDoc(usernameRef, usernameUpdates);
    }
  }
}

export async function uploadProfilePhoto(
  userId: string,
  dataUrl: string
): Promise<void> {
  await updateProfile(userId, { photoUrl: dataUrl });
}

// ── GEM ID functions ──

export async function registerGemId(userId: string, gemId: string): Promise<void> {
  await setDoc(doc(db, "gemIds", gemId), { userId });
}

export async function lookupGemId(gemId: string): Promise<string | null> {
  const snap = await getDoc(doc(db, "gemIds", gemId));
  if (!snap.exists()) return null;
  return (snap.data() as { userId: string }).userId;
}

export async function deleteGemId(gemId: string): Promise<void> {
  await deleteDoc(doc(db, "gemIds", gemId));
}

export async function updateOpponentHeroForUser(
  targetUserId: string,
  matchId: string,
  opponentHero: string
): Promise<void> {
  const matchRef = doc(db, "users", targetUserId, "matches", matchId);
  await updateDoc(matchRef, { opponentHero });
}

export async function deleteAccountData(userId: string): Promise<void> {
  // Get profile to find username
  const profile = await getProfile(userId);

  // Delete all matches
  await clearAllMatchesFirestore(userId);

  // Delete notifications
  const notifSnap = await getDocs(collection(db, "users", userId, "notifications"));
  if (notifSnap.docs.length > 0) {
    const batch = writeBatch(db);
    notifSnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  // Delete profile
  await deleteDoc(doc(db, "users", userId, "profile", "main"));

  // Delete username reservation
  if (profile?.username) {
    await deleteDoc(doc(db, "usernames", profile.username));
  }

  // Delete GEM ID reservation
  if (profile?.gemId) {
    try {
      await deleteGemId(profile.gemId);
    } catch { /* may not exist */ }
  }

  // Delete leaderboard entry
  try {
    await deleteDoc(doc(db, "leaderboard", userId));
  } catch { /* may not exist */ }

  // Delete friendships
  try {
    const friendshipsSnap = await getDocs(
      query(collection(db, "friendships"), where("participants", "array-contains", userId))
    );
    if (friendshipsSnap.docs.length > 0) {
      const friendBatch = writeBatch(db);
      friendshipsSnap.docs.forEach((d) => friendBatch.delete(d.ref));
      await friendBatch.commit();
    }
  } catch { /* may not exist */ }
}
