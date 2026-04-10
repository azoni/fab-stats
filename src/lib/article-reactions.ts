import {
  doc,
  getDoc,
  increment,
  runTransaction,
} from "firebase/firestore";
import { db } from "./firebase";
import type { ArticleReactionKey } from "@/types";

export const ARTICLE_REACTIONS = [
  { key: "heart", label: "Love", color: "text-rose-400" },
  { key: "fire", label: "Fire", color: "text-orange-400" },
  { key: "insight", label: "Insight", color: "text-sky-400" },
] as const satisfies readonly { key: ArticleReactionKey; label: string; color: string }[];

function articleRef(articleId: string) {
  return doc(db, "articles", articleId);
}

function articleReactionRef(articleId: string, userId: string) {
  return doc(db, "articles", articleId, "reactions", userId);
}

export async function getArticleReaction(
  articleId: string,
  userId: string,
): Promise<ArticleReactionKey | null> {
  const snapshot = await getDoc(articleReactionRef(articleId, userId));
  if (!snapshot.exists()) return null;
  const key = snapshot.data().key;
  return key === "heart" || key === "fire" || key === "insight" ? key : null;
}

export async function toggleArticleReaction(
  articleId: string,
  userId: string,
  nextKey: ArticleReactionKey,
): Promise<ArticleReactionKey | null> {
  const itemRef = articleReactionRef(articleId, userId);

  return runTransaction(db, async (transaction) => {
    const itemSnapshot = await transaction.get(itemRef);
    const currentKey = itemSnapshot.exists()
      ? itemSnapshot.data().key as ArticleReactionKey | undefined
      : null;

    if (currentKey === nextKey) {
      transaction.update(articleRef(articleId), {
        [`reactionCounts.${nextKey}`]: increment(-1),
      });
      transaction.delete(itemRef);
      return null;
    }

    if (currentKey) {
      transaction.update(articleRef(articleId), {
        [`reactionCounts.${currentKey}`]: increment(-1),
      });
    }

    transaction.update(articleRef(articleId), {
      [`reactionCounts.${nextKey}`]: increment(1),
    });
    transaction.set(itemRef, {
      key: nextKey,
      updatedAt: new Date().toISOString(),
    });

    return nextKey;
  });
}
