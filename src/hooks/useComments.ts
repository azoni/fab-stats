"use client";
import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getComments,
  addComment as addCommentFirestore,
  updateComment as updateCommentFirestore,
  deleteComment as deleteCommentFirestore,
} from "@/lib/comments";
import type { MatchComment } from "@/types";

export function useComments(ownerUid: string, matchId: string) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<MatchComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!ownerUid || !matchId || loaded) return;
    setLoading(true);
    try {
      const data = await getComments(ownerUid, matchId);
      setComments(data);
      setLoaded(true);
    } catch (err) {
      console.error("Failed to load comments:", err);
    } finally {
      setLoading(false);
    }
  }, [ownerUid, matchId, loaded]);

  const addComment = useCallback(
    async (text: string, matchSummary: string) => {
      if (!user || !profile) return;
      const comment = {
        authorUid: user.uid,
        authorName: profile.displayName,
        authorPhoto: profile.photoUrl,
        text,
        createdAt: "",
      };
      const created = await addCommentFirestore(ownerUid, matchId, comment, matchSummary);
      setComments((prev) => [...prev, created]);
    },
    [user, profile, ownerUid, matchId]
  );

  const editComment = useCallback(
    async (commentId: string, newText: string) => {
      await updateCommentFirestore(ownerUid, matchId, commentId, newText);
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, text: newText, editedAt: new Date().toISOString() }
            : c
        )
      );
    },
    [ownerUid, matchId]
  );

  const removeComment = useCallback(
    async (commentId: string) => {
      await deleteCommentFirestore(ownerUid, matchId, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    },
    [ownerUid, matchId]
  );

  return { comments, loading, loaded, load, addComment, editComment, removeComment };
}
