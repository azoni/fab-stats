"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribeToWallComments,
  getOlderWallComments,
  addWallComment,
  updateWallComment,
  deleteWallComment,
} from "@/lib/event-wall";
import type { WallComment } from "@/types";

const MAX_COMMENTS = 50;

export function useEventWall(eventId: string) {
  const { user, profile } = useAuth();
  const [realtimeComments, setRealtimeComments] = useState<WallComment[]>([]);
  const [olderComments, setOlderComments] = useState<WallComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    setLoading(true);
    setOlderComments([]);
    setHasMore(false);
    const unsubscribe = subscribeToWallComments(eventId, MAX_COMMENTS, (data) => {
      setRealtimeComments(data);
      setLoading(false);
      // If we got exactly MAX_COMMENTS, there might be older ones
      setHasMore(data.length >= MAX_COMMENTS);
    });
    return unsubscribe;
  }, [eventId]);

  // Merge older + realtime, deduplicate by ID
  const comments = useMemo(() => {
    const realtimeIds = new Set(realtimeComments.map((c) => c.id));
    const uniqueOlder = olderComments.filter((c) => !realtimeIds.has(c.id));
    return [...uniqueOlder, ...realtimeComments];
  }, [olderComments, realtimeComments]);

  const loadOlder = useCallback(async () => {
    if (!eventId || loadingMore || !hasMore) return;
    // Find the oldest comment's timestamp to use as cursor
    const oldest = comments[0];
    if (!oldest) return;
    setLoadingMore(true);
    try {
      const result = await getOlderWallComments(eventId, oldest.createdAt);
      setOlderComments((prev) => [...result.comments, ...prev]);
      setHasMore(result.hasMore);
    } catch (err) {
      console.error("Failed to load older comments:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [eventId, loadingMore, hasMore, comments]);

  const addComment = useCallback(
    async (text: string, parentComment?: WallComment) => {
      if (!user || !profile || !eventId) return;
      await addWallComment(
        eventId,
        {
          authorUid: user.uid,
          authorName: profile.displayName,
          authorPhoto: profile.photoUrl,
          text,
          createdAt: "",
          ...(parentComment
            ? { parentId: parentComment.id, replyToName: parentComment.authorName }
            : {}),
        },
        parentComment
      );
    },
    [user, profile, eventId]
  );

  const editComment = useCallback(
    async (commentId: string, newText: string) => {
      if (!eventId) return;
      await updateWallComment(eventId, commentId, newText);
    },
    [eventId]
  );

  const removeComment = useCallback(
    async (commentId: string) => {
      if (!eventId) return;
      await deleteWallComment(eventId, commentId);
    },
    [eventId]
  );

  return { comments, loading, loadingMore, hasMore, loadOlder, addComment, editComment, removeComment };
}
