"use client";
import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getComments,
  addComment as addCommentFirestore,
  updateComment as updateCommentFirestore,
  deleteComment as deleteCommentFirestore,
  registerParticipant,
} from "@/lib/comments";
import type { MatchComment } from "@/types";

export function useComments(
  fingerprint: string,
  matchOwnerUid: string,
  matchId: string
) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<MatchComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!fingerprint || loaded) return;
    setLoading(true);
    try {
      const data = await getComments(fingerprint);
      setComments(data);
      // Register the match owner as a participant in the shared thread
      if (matchOwnerUid) {
        registerParticipant(fingerprint, matchOwnerUid);
      }
      setLoaded(true);
    } catch (err) {
      console.error("Failed to load comments:", err);
    } finally {
      setLoading(false);
    }
  }, [fingerprint, matchOwnerUid, loaded]);

  const addComment = useCallback(
    async (text: string, matchSummary: string) => {
      if (!user || !profile || !fingerprint) return;
      const comment = {
        authorUid: user.uid,
        authorName: profile.displayName,
        authorPhoto: profile.photoUrl,
        text,
        createdAt: "",
      };
      const created = await addCommentFirestore(
        fingerprint,
        comment,
        matchOwnerUid,
        matchId,
        matchSummary
      );
      setComments((prev) => [...prev, created]);
    },
    [user, profile, fingerprint, matchOwnerUid, matchId]
  );

  const editComment = useCallback(
    async (commentId: string, newText: string) => {
      if (!fingerprint) return;
      await updateCommentFirestore(fingerprint, commentId, newText);
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, text: newText, editedAt: new Date().toISOString() }
            : c
        )
      );
    },
    [fingerprint]
  );

  const removeComment = useCallback(
    async (commentId: string) => {
      if (!fingerprint) return;
      await deleteCommentFirestore(
        fingerprint,
        commentId,
        matchOwnerUid,
        matchId
      );
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    },
    [fingerprint, matchOwnerUid, matchId]
  );

  return {
    comments,
    loading,
    loaded,
    load,
    addComment,
    editComment,
    removeComment,
  };
}
