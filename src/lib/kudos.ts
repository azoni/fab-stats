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

// ── Rate Limits (client-side) ──
// Max 1 of each kudos type per giver→recipient (enforced by doc ID).
// 7-day cooldown on non-props types after revoking (prevents toggle spam).
// Global daily limit: 10 kudos per day across all types.

const COOLDOWN_KEY = "fab-kudos-cooldowns";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Get cooldown map: "recipientId_kudosType" → timestamp */
function getCooldowns(): Record<string, number> {
  try {
    const raw = localStorage.getItem(COOLDOWN_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, number>;
      // Clean expired entries
      const now = Date.now();
      const cleaned: Record<string, number> = {};
      for (const [key, ts] of Object.entries(parsed)) {
        if (now - ts < WEEK_MS) cleaned[key] = ts;
      }
      return cleaned;
    }
  } catch {}
  return {};
}

function setCooldown(recipientId: string, kudosType: string): void {
  const cooldowns = getCooldowns();
  cooldowns[`${recipientId}_${kudosType}`] = Date.now();
  localStorage.setItem(COOLDOWN_KEY, JSON.stringify(cooldowns));
}

function clearCooldown(recipientId: string, kudosType: string): void {
  const cooldowns = getCooldowns();
  delete cooldowns[`${recipientId}_${kudosType}`];
  localStorage.setItem(COOLDOWN_KEY, JSON.stringify(cooldowns));
}

/** Check if a non-props kudos type is on cooldown for a recipient. */
export function isOnCooldown(recipientId: string, kudosType: string): boolean {
  if (kudosType === "props") return false;
  const cooldowns = getCooldowns();
  const ts = cooldowns[`${recipientId}_${kudosType}`];
  if (!ts) return false;
  return Date.now() - ts < WEEK_MS;
}

/** Get remaining cooldown time in human-readable form. */
export function getCooldownRemaining(recipientId: string, kudosType: string): string {
  if (kudosType === "props") return "";
  const cooldowns = getCooldowns();
  const ts = cooldowns[`${recipientId}_${kudosType}`];
  if (!ts) return "";
  const remaining = WEEK_MS - (Date.now() - ts);
  if (remaining <= 0) return "";
  const days = Math.ceil(remaining / (24 * 60 * 60 * 1000));
  return days === 1 ? "1 day" : `${days} days`;
}

// ── Daily Global Rate Limit (client-side) ──
// Users can give a maximum of 10 kudos per day (all types combined).

const DAILY_KEY = "fab-kudos-daily";
const DAILY_LIMIT = 10;

interface DailyRecord {
  date: string; // YYYY-MM-DD
  count: number;
}

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function getDailyRecord(): DailyRecord {
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DailyRecord;
      if (parsed.date === getTodayStr()) return parsed;
    }
  } catch {}
  return { date: getTodayStr(), count: 0 };
}

function incrementDaily(): void {
  const record = getDailyRecord();
  record.count += 1;
  localStorage.setItem(DAILY_KEY, JSON.stringify(record));
}

/** Returns how many kudos the user can still give today (max 10/day). */
export function getRemainingKudos(): number {
  const record = getDailyRecord();
  return Math.max(0, DAILY_LIMIT - record.count);
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
  if (isOnCooldown(recipientId, kudosType)) throw new Error("Cooldown active for this kudos type");
  if (getRemainingKudos() <= 0) throw new Error("Daily kudos limit reached");

  const docId = kudosDocId(recipientId, giverId, kudosType);
  const kudosRef = doc(db, "kudos", docId);

  // Check if already given (prevent double-increment)
  const existing = await getDoc(kudosRef);
  if (existing.exists()) return;

  // Track daily usage
  incrementDaily();

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

  // Increment the "given" counter for the giver
  const givenRef = doc(db, "kudosGivenCounts", giverId);
  const givenSnap = await getDoc(givenRef);
  if (givenSnap.exists()) {
    await updateDoc(givenRef, { [kudosType]: increment(1), total: increment(1) });
  } else {
    await setDoc(givenRef, { [kudosType]: 1, total: 1 });
  }

  // Set cooldown for non-props types
  if (kudosType !== "props") {
    setCooldown(recipientId, kudosType);
  }

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

  // Set cooldown for non-props types (prevents re-giving for a week)
  if (kudosType !== "props") {
    setCooldown(recipientId, kudosType);
  }

  // Decrement the recipient counter
  const countRef = doc(db, "kudosCounts", recipientId);
  await updateDoc(countRef, {
    [kudosType]: increment(-1),
    total: increment(-1),
  }).catch(() => {});

  // Decrement the giver counter
  const givenRef = doc(db, "kudosGivenCounts", giverId);
  await updateDoc(givenRef, {
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

/** Load aggregated kudos given counts for a player. */
export async function loadKudosGivenCounts(
  giverId: string,
): Promise<Record<string, number>> {
  const ref = doc(db, "kudosGivenCounts", giverId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return {};
  return snap.data() as Record<string, number>;
}

/** Load all kudos given counts documents (for leaderboard page). */
export async function loadAllKudosGivenCounts(): Promise<KudosCountsEntry[]> {
  const snap = await getDocs(collection(db, "kudosGivenCounts"));
  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        uid: d.id,
        total: (data.total as number) || 0,
        props: (data.props as number) || 0,
        good_sport: (data.good_sport as number) || 0,
        skilled: (data.skilled as number) || 0,
        helpful: (data.helpful as number) || 0,
      };
    })
    .filter((e) => e.total > 0);
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

export interface KudosCountsEntry {
  uid: string;
  total: number;
  props: number;
  good_sport: number;
  skilled: number;
  helpful: number;
}

/** Load all kudos counts documents (for leaderboard page). */
export async function loadAllKudosCounts(): Promise<KudosCountsEntry[]> {
  const snap = await getDocs(collection(db, "kudosCounts"));
  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        uid: d.id,
        total: (data.total as number) || 0,
        props: (data.props as number) || 0,
        good_sport: (data.good_sport as number) || 0,
        skilled: (data.skilled as number) || 0,
        helpful: (data.helpful as number) || 0,
      };
    })
    .filter((e) => e.total > 0);
}
