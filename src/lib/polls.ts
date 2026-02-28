import { doc, getDoc, setDoc, getDocs, deleteDoc, collection, query, where, limit, orderBy, addDoc, updateDoc, onSnapshot, arrayUnion, increment, type Unsubscribe } from "firebase/firestore";
import { db } from "./firebase";
import type { Poll, PollVote, PollResults, PollVoter } from "@/types";

const CACHE_KEY = "fab_poll";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getActivePoll(skipCache = false): Promise<Poll | null> {
  if (!skipCache) {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { poll, ts } = JSON.parse(cached);
        if (Date.now() - ts < CACHE_TTL) return poll;
      }
    } catch {}
  }

  try {
    const q = query(collection(db, "polls"), where("active", "==", true), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const docSnap = snap.docs[0];
    const poll = { ...docSnap.data(), id: docSnap.id } as Poll;
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ poll, ts: Date.now() }));
    } catch {}
    return poll;
  } catch {
    return null;
  }
}

/** Admin: get a specific poll by ID */
export async function getPoll(pollId: string): Promise<Poll | null> {
  try {
    const snap = await getDoc(doc(db, "polls", pollId));
    if (!snap.exists()) return null;
    return { ...snap.data(), id: snap.id } as Poll;
  } catch {
    return null;
  }
}

/** Admin: get all polls ordered by creation date (newest first) */
export async function getAllPolls(): Promise<Poll[]> {
  try {
    const q = query(collection(db, "polls"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Poll);
  } catch {
    return [];
  }
}

export async function getUserVote(pollId: string, userId: string): Promise<PollVote | null> {
  try {
    const snap = await getDoc(doc(db, "polls", pollId, "votes", userId));
    if (!snap.exists()) return null;
    return snap.data() as PollVote;
  } catch {
    return null;
  }
}

export async function submitVote(pollId: string, userId: string, optionIndex: number): Promise<void> {
  await setDoc(doc(db, "polls", pollId, "votes", userId), {
    optionIndex,
    votedAt: new Date().toISOString(),
  });
}

export async function getPollResults(pollId: string): Promise<PollResults> {
  try {
    const snap = await getDocs(collection(db, "polls", pollId, "votes"));
    const counts: number[] = [];
    let total = 0;
    for (const d of snap.docs) {
      const vote = d.data() as PollVote;
      counts[vote.optionIndex] = (counts[vote.optionIndex] || 0) + 1;
      total++;
    }
    return { counts, total };
  } catch {
    return { counts: [], total: 0 };
  }
}

/** Admin: create a new poll or update an existing one. Deactivates other active polls when activating. */
export async function savePoll(poll: Poll): Promise<string> {
  // If activating, deactivate any currently active poll first
  if (poll.active) {
    const q = query(collection(db, "polls"), where("active", "==", true));
    const activeSnap = await getDocs(q);
    const deactivates = activeSnap.docs
      .filter((d) => d.id !== poll.id)
      .map((d) => updateDoc(d.ref, { active: false }));
    await Promise.all(deactivates);
  }

  let pollId: string;
  if (poll.id) {
    // Update existing poll
    pollId = poll.id;
    const { id: _, ...data } = poll;
    await setDoc(doc(db, "polls", pollId), data);
  } else {
    // Create new poll
    const { id: _, ...data } = poll;
    const ref = await addDoc(collection(db, "polls"), data);
    pollId = ref.id;
  }

  // Update cache
  try {
    if (poll.active) {
      const cached = { ...poll, id: pollId };
      localStorage.setItem(CACHE_KEY, JSON.stringify({ poll: cached, ts: Date.now() }));
    } else {
      localStorage.removeItem(CACHE_KEY);
    }
  } catch {}

  return pollId;
}

export async function removePoll(pollId: string): Promise<void> {
  try {
    await updateDoc(doc(db, "polls", pollId), { active: false });
  } catch {}
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {}
}

export async function clearVotes(pollId: string): Promise<void> {
  const snap = await getDocs(collection(db, "polls", pollId, "votes"));
  const deletes = snap.docs.map((d) => deleteDoc(d.ref));
  await Promise.all(deletes);
}

/** Admin: get all individual votes with voter IDs */
export async function getPollVoters(pollId: string): Promise<PollVoter[]> {
  try {
    const snap = await getDocs(collection(db, "polls", pollId, "votes"));
    return snap.docs.map((d) => ({
      userId: d.id,
      ...(d.data() as PollVote),
    }));
  } catch {
    return [];
  }
}

// ── Prediction helpers ──

/** Normalize a player name for dedup matching */
export function normalizeOptionKey(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Subscribe to poll document changes (real-time option list + state) */
export function subscribePoll(pollId: string, callback: (poll: Poll | null) => void): Unsubscribe {
  return onSnapshot(doc(db, "polls", pollId), (snap) => {
    if (!snap.exists()) return callback(null);
    callback({ ...snap.data(), id: snap.id } as Poll);
  });
}

/** Subscribe to poll vote counts (real-time results) */
export function subscribePollResults(pollId: string, callback: (results: PollResults) => void): Unsubscribe {
  return onSnapshot(collection(db, "polls", pollId, "votes"), (snap) => {
    const counts: number[] = [];
    let total = 0;
    for (const d of snap.docs) {
      const vote = d.data() as PollVote;
      if (vote.optionIndex !== undefined && vote.optionIndex !== null) {
        counts[vote.optionIndex] = (counts[vote.optionIndex] || 0) + 1;
        total++;
      }
    }
    callback({ counts, total });
  });
}

/** Get active prediction (separate from regular polls) */
export async function getActivePrediction(): Promise<Poll | null> {
  try {
    const q = query(
      collection(db, "polls"),
      where("active", "==", true),
      where("type", "==", "prediction"),
      limit(1),
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { ...snap.docs[0].data(), id: snap.docs[0].id } as Poll;
  } catch {
    return null;
  }
}

const MAX_OPTIONS_PER_USER = 5;

/** Add a new option to a prediction. Returns index (existing if duplicate found). */
export async function addPredictionOption(
  pollId: string,
  label: string,
  userId: string,
): Promise<{ index: number; isDuplicate: boolean }> {
  const normalizedKey = normalizeOptionKey(label);
  const displayLabel = label.trim();

  // Fetch current poll to check for duplicates
  const pollSnap = await getDoc(doc(db, "polls", pollId));
  if (!pollSnap.exists()) throw new Error("Poll not found");
  const poll = pollSnap.data() as Poll;

  // Check for existing match (case-insensitive, trimmed)
  const existingIndex = poll.options.findIndex(
    (opt) => normalizeOptionKey(opt) === normalizedKey,
  );
  if (existingIndex >= 0) {
    return { index: existingIndex, isDuplicate: true };
  }

  // Check per-user add limit
  const userAddCount = poll.optionAddCount?.[userId] ?? 0;
  if (userAddCount >= MAX_OPTIONS_PER_USER) {
    throw new Error(`You can only add up to ${MAX_OPTIONS_PER_USER} options.`);
  }

  // Append new option and increment user's add count atomically
  await updateDoc(doc(db, "polls", pollId), {
    options: arrayUnion(displayLabel),
    [`optionAddCount.${userId}`]: increment(1),
  });

  // Re-read to get the actual index (handles concurrent adds)
  const updatedSnap = await getDoc(doc(db, "polls", pollId));
  const updatedOptions = (updatedSnap.data() as Poll).options;
  const actualIndex = updatedOptions.findIndex(
    (opt) => normalizeOptionKey(opt) === normalizedKey,
  );

  return { index: actualIndex >= 0 ? actualIndex : updatedOptions.length - 1, isDuplicate: false };
}

/** Get how many options a user has added to a prediction */
export function getUserOptionCount(poll: Poll | null, userId: string): number {
  return poll?.optionAddCount?.[userId] ?? 0;
}

/** Admin: merge source option into target. Reassigns all votes. */
export async function mergeOptions(
  pollId: string,
  sourceIndex: number,
  targetIndex: number,
): Promise<{ votesReassigned: number }> {
  const votesSnap = await getDocs(collection(db, "polls", pollId, "votes"));
  const toReassign = votesSnap.docs.filter(
    (d) => (d.data() as PollVote).optionIndex === sourceIndex,
  );
  await Promise.all(
    toReassign.map((d) => updateDoc(d.ref, { optionIndex: targetIndex })),
  );
  const votesReassigned = toReassign.length;

  // Mark source option as merged
  const pollSnap = await getDoc(doc(db, "polls", pollId));
  if (pollSnap.exists()) {
    const poll = pollSnap.data() as Poll;
    const newOptions = [...poll.options];
    newOptions[sourceIndex] = `[MERGED] ${newOptions[sourceIndex]}`;
    await updateDoc(doc(db, "polls", pollId), { options: newOptions });
  }

  return { votesReassigned };
}

/** Admin: close voting on a prediction */
export async function closePredictionVoting(pollId: string): Promise<void> {
  await updateDoc(doc(db, "polls", pollId), {
    votingOpen: false,
    closedAt: new Date().toISOString(),
  });
}

/** Admin: reopen voting on a prediction */
export async function reopenPredictionVoting(pollId: string): Promise<void> {
  await updateDoc(doc(db, "polls", pollId), {
    votingOpen: true,
    closedAt: null,
  });
}

/** Admin: resolve prediction with correct answer */
export async function resolvePrediction(pollId: string, correctOptionIndex: number): Promise<void> {
  await updateDoc(doc(db, "polls", pollId), {
    correctOptionIndex,
    resolvedAt: new Date().toISOString(),
    votingOpen: false,
    active: false,
  });
}

/** Get all user IDs who voted for the correct option */
export async function getCorrectPredictors(pollId: string, correctOptionIndex: number): Promise<string[]> {
  const votesSnap = await getDocs(collection(db, "polls", pollId, "votes"));
  return votesSnap.docs
    .filter((d) => (d.data() as PollVote).optionIndex === correctOptionIndex)
    .map((d) => d.id);
}
