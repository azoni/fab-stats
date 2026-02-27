import { doc, getDoc, setDoc, getDocs, deleteDoc, collection, query, where, limit, orderBy, addDoc, updateDoc } from "firebase/firestore";
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
