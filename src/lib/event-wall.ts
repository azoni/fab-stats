import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import { containsProfanity } from "./profanity-filter";
import type { WallComment } from "@/types";

const WALL_COLLECTION = "eventWalls";
const OLDER_PAGE_SIZE = 30;

function wallCommentsRef(eventId: string) {
  return collection(db, WALL_COLLECTION, eventId, "comments");
}

/** Subscribe to the latest N comments in real-time */
export function subscribeToWallComments(
  eventId: string,
  maxCount: number,
  callback: (comments: WallComment[]) => void
): Unsubscribe {
  const q = query(
    wallCommentsRef(eventId),
    orderBy("createdAt", "desc"),
    limit(maxCount)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const comments = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }) as WallComment)
        .reverse(); // oldest first for chat-like display
      callback(comments);
    },
    (err) => {
      console.error("Failed to subscribe to wall comments:", err);
      callback([]);
    }
  );
}

/** Fetch older comments before a given timestamp (cursor-based pagination) */
export async function getOlderWallComments(
  eventId: string,
  beforeTimestamp: string,
  pageSize: number = OLDER_PAGE_SIZE
): Promise<{ comments: WallComment[]; hasMore: boolean }> {
  const q = query(
    wallCommentsRef(eventId),
    orderBy("createdAt", "desc"),
    startAfter(beforeTimestamp),
    limit(pageSize + 1)
  );

  const snapshot = await getDocs(q);
  const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as WallComment);

  const hasMore = docs.length > pageSize;
  const comments = hasMore ? docs.slice(0, pageSize) : docs;

  // Reverse to oldest-first (consistent with subscription)
  return { comments: comments.reverse(), hasMore };
}

/** Add a comment to the event wall */
export async function addWallComment(
  eventId: string,
  comment: Omit<WallComment, "id">,
  parentComment?: WallComment
): Promise<void> {
  // Defense-in-depth profanity check
  if (containsProfanity(comment.text)) {
    throw new Error("Your comment contains inappropriate language.");
  }

  const now = new Date().toISOString();
  const data: Record<string, unknown> = {
    authorUid: comment.authorUid,
    authorName: comment.authorName,
    text: comment.text,
    createdAt: now,
  };
  if (comment.authorPhoto) data.authorPhoto = comment.authorPhoto;
  if (comment.parentId) data.parentId = comment.parentId;
  if (comment.replyToName) data.replyToName = comment.replyToName;

  await addDoc(wallCommentsRef(eventId), data);

  // Notify parent comment author on reply (non-critical)
  if (parentComment && parentComment.authorUid !== comment.authorUid) {
    try {
      await addDoc(collection(db, "users", parentComment.authorUid, "notifications"), {
        type: "comment",
        commentAuthorUid: comment.authorUid,
        commentAuthorName: comment.authorName,
        commentAuthorPhoto: comment.authorPhoto || "",
        commentPreview: comment.text.slice(0, 80),
        matchSummary: "Event wall reply",
        createdAt: now,
        read: false,
      });
    } catch {
      // notification is non-critical
    }
  }
}

/** Update a wall comment's text */
export async function updateWallComment(
  eventId: string,
  commentId: string,
  newText: string
): Promise<void> {
  const ref = doc(db, WALL_COLLECTION, eventId, "comments", commentId);
  await updateDoc(ref, { text: newText, editedAt: new Date().toISOString() });
}

/** Delete a wall comment */
export async function deleteWallComment(
  eventId: string,
  commentId: string
): Promise<void> {
  const ref = doc(db, WALL_COLLECTION, eventId, "comments", commentId);
  await deleteDoc(ref);
}
