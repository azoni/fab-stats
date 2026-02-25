import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  runTransaction,
} from "firebase/firestore";
import { db } from "./firebase";
import type { MatchComment, UserNotification } from "@/types";

function commentsCollection(ownerUid: string, matchId: string) {
  return collection(db, "users", ownerUid, "matches", matchId, "comments");
}

export async function getComments(
  ownerUid: string,
  matchId: string
): Promise<MatchComment[]> {
  const q = query(commentsCollection(ownerUid, matchId), orderBy("createdAt", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as MatchComment[];
}

export async function addComment(
  ownerUid: string,
  matchId: string,
  comment: Omit<MatchComment, "id">,
  matchSummary: string
): Promise<MatchComment> {
  const now = new Date().toISOString();
  const data = { ...comment, createdAt: now };

  // Strip undefined values
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) clean[k] = v;
  }

  // Add comment and increment commentCount in a transaction
  const matchRef = doc(db, "users", ownerUid, "matches", matchId);
  let commentId = "";

  await runTransaction(db, async (transaction) => {
    const matchSnap = await transaction.get(matchRef);
    const currentCount = matchSnap.data()?.commentCount || 0;
    transaction.update(matchRef, { commentCount: currentCount + 1 });
  });

  // Add the comment doc (outside transaction since subcollection addDoc isn't supported in transactions)
  const docRef = await addDoc(commentsCollection(ownerUid, matchId), clean);
  commentId = docRef.id;

  // Create notification for match owner (if commenter is not the owner)
  if (comment.authorUid !== ownerUid) {
    const notification: Omit<UserNotification, "id"> = {
      type: "comment",
      matchId,
      matchOwnerUid: ownerUid,
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

    await addDoc(
      collection(db, "users", ownerUid, "notifications"),
      notifClean
    );
  }

  return { ...data, id: commentId };
}

export async function updateComment(
  ownerUid: string,
  matchId: string,
  commentId: string,
  newText: string
): Promise<void> {
  const ref = doc(db, "users", ownerUid, "matches", matchId, "comments", commentId);
  await updateDoc(ref, {
    text: newText,
    editedAt: new Date().toISOString(),
  });
}

export async function deleteComment(
  ownerUid: string,
  matchId: string,
  commentId: string
): Promise<void> {
  // Delete comment and decrement commentCount
  const matchRef = doc(db, "users", ownerUid, "matches", matchId);
  const commentRef = doc(db, "users", ownerUid, "matches", matchId, "comments", commentId);

  await deleteDoc(commentRef);

  await runTransaction(db, async (transaction) => {
    const matchSnap = await transaction.get(matchRef);
    const currentCount = matchSnap.data()?.commentCount || 0;
    transaction.update(matchRef, { commentCount: Math.max(0, currentCount - 1) });
  });
}
