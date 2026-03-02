import { doc, getDoc, getDocs, setDoc, collection } from "firebase/firestore";
import { db } from "./firebase";

export interface MatchupNoteDoc {
  general: string;
  matchups: Record<string, string>;
  updatedAt: string;
}

function notesCollection(userId: string) {
  return collection(db, "users", userId, "matchupNotes");
}

function noteDoc(userId: string, heroName: string) {
  return doc(db, "users", userId, "matchupNotes", heroName);
}

export async function getMatchupNotes(
  userId: string,
  heroName: string
): Promise<MatchupNoteDoc | null> {
  const snap = await getDoc(noteDoc(userId, heroName));
  return snap.exists() ? (snap.data() as MatchupNoteDoc) : null;
}

export async function getAllMatchupNotes(
  userId: string
): Promise<Record<string, MatchupNoteDoc>> {
  const snap = await getDocs(notesCollection(userId));
  const result: Record<string, MatchupNoteDoc> = {};
  snap.forEach((d) => {
    result[d.id] = d.data() as MatchupNoteDoc;
  });
  return result;
}

export async function saveGeneralNotes(
  userId: string,
  heroName: string,
  general: string
): Promise<void> {
  const existing = await getMatchupNotes(userId, heroName);
  await setDoc(noteDoc(userId, heroName), {
    general,
    matchups: existing?.matchups || {},
    updatedAt: new Date().toISOString(),
  });
}

export async function saveMatchupNote(
  userId: string,
  heroName: string,
  opponentHero: string,
  note: string
): Promise<void> {
  const existing = await getMatchupNotes(userId, heroName);
  await setDoc(noteDoc(userId, heroName), {
    general: existing?.general || "",
    matchups: { ...(existing?.matchups || {}), [opponentHero]: note },
    updatedAt: new Date().toISOString(),
  });
}
