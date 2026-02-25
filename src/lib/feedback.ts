import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";
import type { FeedbackItem, UserProfile } from "@/types";

function feedbackCollection() {
  return collection(db, "feedback");
}

export async function submitFeedback(
  profile: UserProfile,
  type: "bug" | "feature",
  message: string
): Promise<void> {
  const data: Omit<FeedbackItem, "id"> = {
    userId: profile.uid,
    username: profile.username,
    displayName: profile.displayName,
    type,
    message,
    status: "new",
    createdAt: new Date().toISOString(),
  };

  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) clean[k] = v;
  }

  await addDoc(feedbackCollection(), clean);
}

export async function getAllFeedback(): Promise<FeedbackItem[]> {
  const q = query(feedbackCollection(), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as FeedbackItem[];
}

export async function updateFeedbackStatus(
  feedbackId: string,
  status: "new" | "reviewed" | "done"
): Promise<void> {
  const ref = doc(db, "feedback", feedbackId);
  await updateDoc(ref, { status });
}
