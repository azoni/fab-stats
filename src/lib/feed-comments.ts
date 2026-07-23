import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  limit,
  updateDoc,
  increment,
} from "firebase/firestore";
import { db } from "./firebase";
import { containsProfanity } from "./profanity-filter";
import type { WallComment } from "@/types";

const DEFAULT_LIMIT = 30;

function feedCommentsRef(eventId: string) {
  return collection(db, "feedEvents", eventId, "comments");
}

/** One-shot fetch of the most recent N comments on a feed event, oldest-first. */
export async function listFeedComments(eventId: string, max = DEFAULT_LIMIT): Promise<WallComment[]> {
  const q = query(feedCommentsRef(eventId), orderBy("createdAt", "desc"), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as WallComment).reverse();
}

export interface FeedCommentContext {
  ownerUid?: string;
  eventSummary?: string;
}

/** Add a comment on a feed event and (if applicable) notify the event owner. */
export async function addFeedComment(
  eventId: string,
  comment: { authorUid: string; authorName: string; authorPhoto?: string; text: string },
  ctx?: FeedCommentContext,
): Promise<WallComment> {
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

  const ref = await addDoc(feedCommentsRef(eventId), data);
  // Keep the denormalized count fresh (best-effort — the comment write is what matters).
  updateDoc(doc(db, "feedEvents", eventId), { commentCount: increment(1) }).catch(() => {});

  if (ctx?.ownerUid && ctx.ownerUid !== comment.authorUid) {
    const payload: Record<string, unknown> = {
      type: "feedComment",
      commentAuthorUid: comment.authorUid,
      commentAuthorName: comment.authorName,
      commentPreview: comment.text.slice(0, 200),
      feedEventId: eventId,
      createdAt: now,
      read: false,
    };
    if (comment.authorPhoto) payload.commentAuthorPhoto = comment.authorPhoto;
    if (ctx.eventSummary) payload.feedEventSummary = ctx.eventSummary;
    await addDoc(collection(db, "users", ctx.ownerUid, "notifications"), payload).catch(() => {});
  }

  return { id: ref.id, ...(data as Omit<WallComment, "id">) };
}

/** Delete a feed comment. Rules-side allows only the author or the event owner. */
export async function deleteFeedComment(eventId: string, commentId: string): Promise<void> {
  await deleteDoc(doc(db, "feedEvents", eventId, "comments", commentId));
  updateDoc(doc(db, "feedEvents", eventId), { commentCount: increment(-1) }).catch(() => {});
}

/** Best-effort reconcile of the denormalized count with a freshly-loaded full list —
 *  backfills events created before commentCount existed and corrects any drift. */
export function syncFeedCommentCount(eventId: string, count: number): void {
  updateDoc(doc(db, "feedEvents", eventId), { commentCount: count }).catch(() => {});
}
