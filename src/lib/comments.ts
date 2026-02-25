import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  setDoc,
  query,
  orderBy,
  runTransaction,
} from "firebase/firestore";
import { db } from "./firebase";
import type { MatchComment, UserNotification } from "@/types";

function threadCommentsCollection(fingerprint: string) {
  return collection(db, "matchThreads", fingerprint, "comments");
}

export async function getComments(
  fingerprint: string
): Promise<MatchComment[]> {
  const q = query(
    threadCommentsCollection(fingerprint),
    orderBy("createdAt", "asc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as MatchComment[];
}

/** Register a match owner as a participant in a shared comment thread */
export async function registerParticipant(
  fingerprint: string,
  uid: string
): Promise<void> {
  const threadRef = doc(db, "matchThreads", fingerprint);
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(threadRef);
      if (snap.exists()) {
        const participants: string[] = snap.data().participants || [];
        if (!participants.includes(uid)) {
          tx.update(threadRef, { participants: [...participants, uid] });
        }
      } else {
        tx.set(threadRef, { participants: [uid], commentCount: 0 });
      }
    });
  } catch {
    // Participant registration is non-critical
  }
}

export async function addComment(
  fingerprint: string,
  comment: Omit<MatchComment, "id">,
  matchOwnerUid: string,
  matchId: string,
  matchSummary: string
): Promise<MatchComment> {
  const now = new Date().toISOString();
  const data = { ...comment, createdAt: now };

  // Strip undefined values
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) clean[k] = v;
  }

  // Add comment to shared thread
  const docRef = await addDoc(threadCommentsCollection(fingerprint), clean);

  // Update commentCount on the viewing user's match doc
  const matchRef = doc(db, "users", matchOwnerUid, "matches", matchId);
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(matchRef);
      tx.update(matchRef, {
        commentCount: (snap.data()?.commentCount || 0) + 1,
      });
    });
  } catch {
    // Match doc update is non-critical
  }

  // Update/create thread doc and collect participants for notifications
  const threadRef = doc(db, "matchThreads", fingerprint);
  let participants: string[] = [];
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(threadRef);
      if (snap.exists()) {
        const d = snap.data();
        participants = d.participants || [];
        const newCount = (d.commentCount || 0) + 1;
        // Ensure the match owner is a participant
        const updatedParticipants = participants.includes(matchOwnerUid)
          ? participants
          : [...participants, matchOwnerUid];
        tx.update(threadRef, {
          commentCount: newCount,
          participants: updatedParticipants,
        });
        participants = updatedParticipants;
      } else {
        participants = [matchOwnerUid];
        tx.set(threadRef, { participants, commentCount: 1 });
      }
    });
  } catch {
    participants = [matchOwnerUid];
  }

  // Notify all participants except the commenter
  for (const uid of participants) {
    if (uid === comment.authorUid) continue;

    const notification: Omit<UserNotification, "id"> = {
      type: "comment",
      matchId,
      matchOwnerUid: uid,
      commentAuthorUid: comment.authorUid,
      commentAuthorName: comment.authorName,
      commentAuthorPhoto: comment.authorPhoto,
      commentPreview: comment.text.slice(0, 80),
      matchSummary,
      createdAt: now,
      read: false,
    };

    const notifClean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(notification)) {
      if (v !== undefined) notifClean[k] = v;
    }

    try {
      await addDoc(
        collection(db, "users", uid, "notifications"),
        notifClean
      );
    } catch {
      // Notification delivery is non-critical
    }
  }

  return { ...data, id: docRef.id };
}

export async function updateComment(
  fingerprint: string,
  commentId: string,
  newText: string
): Promise<void> {
  const ref = doc(
    db,
    "matchThreads",
    fingerprint,
    "comments",
    commentId
  );
  await updateDoc(ref, {
    text: newText,
    editedAt: new Date().toISOString(),
  });
}

export async function deleteComment(
  fingerprint: string,
  commentId: string,
  matchOwnerUid: string,
  matchId: string
): Promise<void> {
  const commentRef = doc(
    db,
    "matchThreads",
    fingerprint,
    "comments",
    commentId
  );
  await deleteDoc(commentRef);

  // Decrement commentCount on the viewing user's match doc
  const matchRef = doc(db, "users", matchOwnerUid, "matches", matchId);
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(matchRef);
      tx.update(matchRef, {
        commentCount: Math.max(0, (snap.data()?.commentCount || 0) - 1),
      });
    });
  } catch {
    // Non-critical
  }

  // Decrement commentCount on thread doc
  const threadRef = doc(db, "matchThreads", fingerprint);
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(threadRef);
      if (snap.exists()) {
        tx.update(threadRef, {
          commentCount: Math.max(0, (snap.data().commentCount || 0) - 1),
        });
      }
    });
  } catch {
    // Non-critical
  }
}
