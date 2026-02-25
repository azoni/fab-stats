"use client";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useComments } from "@/hooks/useComments";
import { computeMatchFingerprint } from "@/lib/match-fingerprint";
import { CommentItem } from "./CommentItem";
import { CommentInput } from "./CommentInput";
import Link from "next/link";
import type { MatchRecord } from "@/types";

interface CommentSectionProps {
  match: MatchRecord;
  matchOwnerUid: string;
}

function getMatchSummary(match: MatchRecord): string {
  const hasHeroes = match.heroPlayed !== "Unknown" || match.opponentHero !== "Unknown";
  const result = match.result.toUpperCase();
  if (hasHeroes) {
    return `${match.heroPlayed} vs ${match.opponentHero} - ${result}`;
  }
  if (match.opponentName) {
    return `vs ${match.opponentName} - ${result}`;
  }
  return `Match - ${result}`;
}

export function CommentSection({ match, matchOwnerUid }: CommentSectionProps) {
  const { user, isGuest } = useAuth();
  const fingerprint = computeMatchFingerprint(match);
  const { comments, loading, loaded, load, addComment, editComment, removeComment } =
    useComments(fingerprint, matchOwnerUid, match.id);

  useEffect(() => {
    load();
  }, [load]);

  const isMatchOwner = user?.uid === matchOwnerUid;
  const canComment = !!user && !isGuest;

  return (
    <div className="border-t border-fab-border/50 pt-3 mt-3 space-y-3">
      {loading && !loaded && (
        <div className="text-xs text-fab-dim animate-pulse py-2">Loading comments...</div>
      )}

      {loaded && comments.length === 0 && (
        <p className="text-xs text-fab-dim py-1">No comments yet — be the first!</p>
      )}

      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          currentUid={user?.uid}
          isMatchOwner={isMatchOwner}
          onEdit={editComment}
          onDelete={removeComment}
        />
      ))}

      {canComment ? (
        <CommentInput
          onSubmit={(text) => addComment(text, getMatchSummary(match))}
        />
      ) : (
        <div className="text-xs text-fab-dim py-1">
          <Link href="/login" className="text-fab-gold hover:text-fab-gold-light">
            Sign in
          </Link>{" "}
          to leave a comment.
        </div>
      )}
    </div>
  );
}
