import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import { containsProfanity } from "./profanity-filter";
import { incrementArticleCommentCount } from "./articles";
import type { ArticleComment } from "@/types";

function articleCommentsCollection(articleId: string) {
  return collection(db, "articles", articleId, "comments");
}

export function subscribeToArticleComments(
  articleId: string,
  callback: (comments: ArticleComment[]) => void,
): Unsubscribe {
  const q = query(articleCommentsCollection(articleId), orderBy("createdAt", "asc"));

  return onSnapshot(
    q,
    (snapshot) => {
      callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as ArticleComment));
    },
    (error) => {
      console.error("Failed to subscribe to article comments:", error);
      callback([]);
    },
  );
}

export async function addArticleComment(
  articleId: string,
  comment: Omit<ArticleComment, "id" | "articleId" | "createdAt" | "editedAt">,
  skipProfanityCheck = false,
): Promise<void> {
  if (!skipProfanityCheck && containsProfanity(comment.text)) {
    throw new Error("Your comment contains inappropriate language.");
  }

  const now = new Date().toISOString();
  const data: Record<string, unknown> = {
    articleId,
    authorUid: comment.authorUid,
    authorUsername: comment.authorUsername,
    authorName: comment.authorName,
    text: comment.text,
    createdAt: now,
  };

  if (comment.authorPhoto) data.authorPhoto = comment.authorPhoto;
  if (comment.authorDecor) data.authorDecor = comment.authorDecor;
  if (comment.parentId) data.parentId = comment.parentId;
  if (comment.replyToName) data.replyToName = comment.replyToName;

  await addDoc(articleCommentsCollection(articleId), data);
  await incrementArticleCommentCount(articleId, 1);
}

export async function updateArticleComment(
  articleId: string,
  commentId: string,
  text: string,
  skipProfanityCheck = false,
): Promise<void> {
  if (!skipProfanityCheck && containsProfanity(text)) {
    throw new Error("Your comment contains inappropriate language.");
  }

  await updateDoc(doc(db, "articles", articleId, "comments", commentId), {
    text,
    editedAt: new Date().toISOString(),
  });
}

export async function deleteArticleComment(articleId: string, commentId: string): Promise<void> {
  await deleteDoc(doc(db, "articles", articleId, "comments", commentId));
  await incrementArticleCommentCount(articleId, -1);
}
