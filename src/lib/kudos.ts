import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  increment,
  updateDoc,
  addDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// ── Kudos Types ──

export interface KudosType {
  id: string;
  label: string;
  description: string;
  icon: string;
}

export const KUDOS_TYPES: KudosType[] = [
  { id: "props", label: "Props", description: "This player is great", icon: "thumbsUp" },
  { id: "good_sport", label: "Good Sport", description: "Great sportsmanship and attitude", icon: "handshake" },
  { id: "skilled", label: "Skilled", description: "Impressive gameplay and deck building", icon: "sword" },
  { id: "helpful", label: "Helpful", description: "Goes out of their way to help others", icon: "hand" },
];

export type KudosId = typeof KUDOS_TYPES[number]["id"];

// ── Daily Rate Limit (client-side) ──

const DAILY_LIMIT = 20;
const RATE_KEY = "fab-kudos-daily";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function getDailyUsage(): { date: string; count: number } {
  try {
    const raw = localStorage.getItem(RATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.date === todayStr()) return parsed;
    }
  } catch {}
  return { date: todayStr(), count: 0 };
}

function incrementDailyUsage(): void {
  const usage = getDailyUsage();
  usage.count += 1;
  usage.date = todayStr();
  localStorage.setItem(RATE_KEY, JSON.stringify(usage));
}

function decrementDailyUsage(): void {
  const usage = getDailyUsage();
  usage.count = Math.max(0, usage.count - 1);
  localStorage.setItem(RATE_KEY, JSON.stringify(usage));
}

/** Returns how many kudos the user can still give today. */
export function getRemainingKudos(): number {
  return Math.max(0, DAILY_LIMIT - getDailyUsage().count);
}

// ── Firestore Helpers ──

/** Deterministic doc ID for a single kudos: recipientId_giverId_kudosType */
function kudosDocId(recipientId: string, giverId: string, kudosType: string): string {
  return `${recipientId}_${giverId}_${kudosType}`;
}

/** Give a kudos to another player. Creates the individual doc and increments the counter. */
export async function giveKudos(
  giverId: string,
  giverDisplayName: string,
  recipientId: string,
  kudosType: string,
): Promise<void> {
  if (giverId === recipientId) throw new Error("Cannot give kudos to yourself");
  if (getRemainingKudos() <= 0) throw new Error("Daily kudos limit reached");

  const docId = kudosDocId(recipientId, giverId, kudosType);
  const kudosRef = doc(db, "kudos", docId);

  // Check if already given (prevent double-increment)
  const existing = await getDoc(kudosRef);
  if (existing.exists()) return;

  // Create the individual kudos doc
  await setDoc(kudosRef, {
    giverId,
    recipientId,
    kudosType,
    giverDisplayName,
    createdAt: new Date().toISOString(),
  });

  // Increment the counter
  const countRef = doc(db, "kudosCounts", recipientId);
  const countSnap = await getDoc(countRef);
  if (countSnap.exists()) {
    await updateDoc(countRef, {
      [kudosType]: increment(1),
      total: increment(1),
    });
  } else {
    await setDoc(countRef, {
      [kudosType]: 1,
      total: 1,
    });
  }

  // Track daily usage
  incrementDailyUsage();

  // Send notification to recipient
  await addDoc(collection(db, "users", recipientId, "notifications"), {
    type: "kudos",
    kudosType,
    kudosGiverUid: giverId,
    kudosGiverName: giverDisplayName,
    createdAt: new Date().toISOString(),
    read: false,
  }).catch(() => {});
}

/** Revoke a kudos you previously gave. Deletes the doc and decrements the counter. */
export async function revokeKudos(
  giverId: string,
  recipientId: string,
  kudosType: string,
): Promise<void> {
  const docId = kudosDocId(recipientId, giverId, kudosType);
  const kudosRef = doc(db, "kudos", docId);

  const existing = await getDoc(kudosRef);
  if (!existing.exists()) return;

  await deleteDoc(kudosRef);
  decrementDailyUsage();

  // Decrement the counter
  const countRef = doc(db, "kudosCounts", recipientId);
  await updateDoc(countRef, {
    [kudosType]: increment(-1),
    total: increment(-1),
  }).catch(() => {});
}

/** Load aggregated kudos counts for a player. */
export async function loadKudosCounts(
  recipientId: string,
): Promise<Record<string, number>> {
  const ref = doc(db, "kudosCounts", recipientId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return {};
  return snap.data() as Record<string, number>;
}

/** Load which kudos types the current user has given to a recipient. */
export async function loadGivenKudos(
  giverId: string,
  recipientId: string,
): Promise<Set<string>> {
  const given = new Set<string>();
  for (const kt of KUDOS_TYPES) {
    const docId = kudosDocId(recipientId, giverId, kt.id);
    const snap = await getDoc(doc(db, "kudos", docId));
    if (snap.exists()) given.add(kt.id);
  }
  return given;
}

export interface KudosLeaderEntry {
  uid: string;
  count: number;
}

/** Load top N players for a specific kudos category (or "total"). */
export async function loadKudosLeaderboard(
  category: string,
  max = 10,
): Promise<KudosLeaderEntry[]> {
  const q = query(
    collection(db, "kudosCounts"),
    orderBy(category, "desc"),
    limit(max),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ uid: d.id, count: (d.data()[category] as number) || 0 }))
    .filter((e) => e.count > 0);
}
