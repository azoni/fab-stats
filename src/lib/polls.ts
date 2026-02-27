import { doc, getDoc, setDoc, getDocs, deleteDoc, collection } from "firebase/firestore";
import { db } from "./firebase";
import type { Poll, PollVote, PollResults, PollVoter } from "@/types";

const CACHE_KEY = "fab_poll";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getActivePoll(): Promise<Poll | null> {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { poll, ts } = JSON.parse(cached);
      if (Date.now() - ts < CACHE_TTL) return poll;
    }
  } catch {}

  try {
    const snap = await getDoc(doc(db, "admin", "poll"));
    if (!snap.exists()) return null;
    const poll = snap.data() as Poll;
    if (!poll.active) return null;
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ poll, ts: Date.now() }));
    } catch {}
    return poll;
  } catch {
    return null;
  }
}

/** Admin: get poll config regardless of active status */
export async function getPoll(): Promise<Poll | null> {
  try {
    const snap = await getDoc(doc(db, "admin", "poll"));
    if (!snap.exists()) return null;
    return snap.data() as Poll;
  } catch {
    return null;
  }
}

export async function getUserVote(userId: string): Promise<PollVote | null> {
  try {
    const snap = await getDoc(doc(db, "admin", "poll", "votes", userId));
    if (!snap.exists()) return null;
    return snap.data() as PollVote;
  } catch {
    return null;
  }
}

export async function submitVote(userId: string, optionIndex: number): Promise<void> {
  await setDoc(doc(db, "admin", "poll", "votes", userId), {
    optionIndex,
    votedAt: new Date().toISOString(),
  });
}

export async function getPollResults(): Promise<PollResults> {
  try {
    const snap = await getDocs(collection(db, "admin", "poll", "votes"));
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

export async function savePoll(poll: Poll): Promise<void> {
  await setDoc(doc(db, "admin", "poll"), poll);
  try {
    const cached = poll.active ? poll : null;
    if (cached) {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ poll: cached, ts: Date.now() }));
    } else {
      localStorage.removeItem(CACHE_KEY);
    }
  } catch {}
}

export async function removePoll(): Promise<void> {
  try {
    const snap = await getDoc(doc(db, "admin", "poll"));
    if (snap.exists()) {
      const poll = snap.data() as Poll;
      await setDoc(doc(db, "admin", "poll"), { ...poll, active: false });
    }
  } catch {}
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {}
}

export async function clearVotes(): Promise<void> {
  const snap = await getDocs(collection(db, "admin", "poll", "votes"));
  const deletes = snap.docs.map((d) => deleteDoc(d.ref));
  await Promise.all(deletes);
}

/** Admin: get all individual votes with voter IDs */
export async function getPollVoters(): Promise<PollVoter[]> {
  try {
    const snap = await getDocs(collection(db, "admin", "poll", "votes"));
    return snap.docs.map((d) => ({
      userId: d.id,
      ...(d.data() as PollVote),
    }));
  } catch {
    return [];
  }
}
