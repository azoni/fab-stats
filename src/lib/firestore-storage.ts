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

export async function clearAllMatchesFirestore(
  userId: string
): Promise<void> {
  const q = query(matchesCollection(userId));
  return new Promise((resolve) => {
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      unsubscribe();
      const batchSize = 500;
      const docs = snapshot.docs;

      for (let i = 0; i < docs.length; i += batchSize) {
        const batch = writeBatch(db);
        docs.slice(i, i + batchSize).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
      resolve();
    });
  });
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
    transaction.set(doc(db, "users", userId, "profile", "main"), {
      ...profile,
      username,
      uid: userId,
      createdAt: new Date().toISOString(),
    });
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
  const lower = prefix.toLowerCase();
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

  const [usernameSnap, nameSnap] = await Promise.all([
    getDocs(usernameQ),
    getDocs(nameQ),
  ]);

  const seen = new Set<string>();
  const results: { username: string; userId: string }[] = [];

  for (const d of [...usernameSnap.docs, ...nameSnap.docs]) {
    if (seen.has(d.id)) continue;
    seen.add(d.id);
    results.push({
      username: d.id,
      userId: (d.data() as { userId: string }).userId,
    });
  }

  return results.slice(0, maxResults);
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, "displayName" | "photoUrl" | "isPublic" | "firstName" | "lastName" | "searchName">>
): Promise<void> {
  const profileRef = doc(db, "users", userId, "profile", "main");
  await updateDoc(profileRef, updates);

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
