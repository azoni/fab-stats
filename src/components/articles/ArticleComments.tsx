"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BadgeStrip } from "@/components/profile/BadgeStrip";
import { CardBorderWrapper, type BorderStyleType, type CardBorderConfig, type UnderlineConfig } from "@/components/profile/CardBorderWrapper";
import { useAuth } from "@/contexts/AuthContext";
import { addArticleComment, deleteArticleComment, subscribeToArticleComments, updateArticleComment } from "@/lib/article-comments";
import type { ArticleComment, ArticleCommentAuthorDecor, UserProfile } from "@/types";

const CARD_BORDER_STYLE: Record<string, { border: string; shadow: string; rgb: string }> = {
  "Battle Hardened": { border: "#cd7f32", shadow: "0 0 8px rgba(205,127,50,0.25)", rgb: "205,127,50" },
  "The Calling": { border: "#60a5fa", shadow: "0 0 8px rgba(96,165,250,0.3)", rgb: "96,165,250" },
  Nationals: { border: "#f87171", shadow: "0 0 10px rgba(248,113,113,0.3)", rgb: "248,113,113" },
  "Pro Tour": { border: "#a78bfa", shadow: "0 0 12px rgba(167,139,250,0.35)", rgb: "167,139,250" },
  Worlds: { border: "#fbbf24", shadow: "0 0 12px rgba(251,191,36,0.4), 0 0 24px rgba(251,191,36,0.15)", rgb: "251,191,36" },
};

const CARD_BORDER_PLACEMENT: Record<string, number> = {
  top8: 1,
  top4: 2,
  finalist: 3,
  champion: 4,
};

const UNDERLINE_STYLE: Record<string, { color: string; rgb: string }> = {
  Armory: { color: "#d4975a", rgb: "212,151,90" },
  Skirmish: { color: "#93c5fd", rgb: "147,197,253" },
  "Road to Nationals": { color: "#fca5a5", rgb: "252,165,165" },
  ProQuest: { color: "#c4b5fd", rgb: "196,181,253" },
};

const UNDERLINE_PLACEMENT: Record<string, number> = {
  undefeated: 1,
  top8: 1,
  top4: 2,
  finalist: 3,
  champion: 4,
};

function buildCommentDecor(profile?: UserProfile | null): ArticleCommentAuthorDecor | undefined {
  if (!profile) return undefined;

  const decor: ArticleCommentAuthorDecor = {};
  if (profile.borderStyle) decor.borderStyle = profile.borderStyle;
  if (profile.borderEventType) decor.borderEventType = profile.borderEventType;
  if (profile.borderPlacement) decor.borderPlacement = profile.borderPlacement;
  if (profile.underlineEventType) decor.underlineEventType = profile.underlineEventType;
  if (profile.underlinePlacement) decor.underlinePlacement = profile.underlinePlacement;
  if (profile.selectedBadgeIds?.length) decor.selectedBadgeIds = profile.selectedBadgeIds.slice(0, 4);

  return Object.keys(decor).length > 0 ? decor : undefined;
}

function getCardBorder(decor?: ArticleCommentAuthorDecor): CardBorderConfig | null {
  if (!decor?.borderEventType) return null;
  const style = CARD_BORDER_STYLE[decor.borderEventType];
  if (!style) return null;
  return {
    ...style,
    placement: CARD_BORDER_PLACEMENT[decor.borderPlacement || ""] || 1,
  };
}

function getUnderline(decor?: ArticleCommentAuthorDecor): UnderlineConfig | null {
  if (!decor?.underlineEventType) return null;
  const style = UNDERLINE_STYLE[decor.underlineEventType];
  if (!style) return null;
  return {
    ...style,
    placement: UNDERLINE_PLACEMENT[decor.underlinePlacement || ""] || 1,
  };
}

function formatTimeAgo(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function CommentIdentity({ comment }: { comment: ArticleComment }) {
  const cardBorder = getCardBorder(comment.authorDecor);
  const underline = getUnderline(comment.authorDecor);
  const initials = comment.authorName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <CardBorderWrapper
      cardBorder={cardBorder}
      borderStyle={(comment.authorDecor?.borderStyle || "beam") as BorderStyleType}
      underline={underline}
      contentClassName="bg-fab-bg/70"
    >
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          {comment.authorPhoto ? (
            <img src={comment.authorPhoto} alt="" className="h-9 w-9 rounded-full border border-fab-border object-cover" loading="lazy" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-fab-gold/15 text-xs font-bold text-fab-gold">
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Link href={`/player/${comment.authorUsername}`} className="truncate text-sm font-semibold text-fab-text hover:text-fab-gold">
                {comment.authorName}
              </Link>
              <span className="text-[11px] text-fab-dim">@{comment.authorUsername}</span>
              <span className="text-[11px] text-fab-dim">{formatTimeAgo(comment.createdAt)}</span>
              {comment.editedAt && <span className="text-[11px] text-fab-dim italic">(edited)</span>}
            </div>
            {comment.replyToName && (
              <p className="mt-0.5 text-[11px] text-fab-dim">Replying to {comment.replyToName}</p>
            )}
          </div>
        </div>
        {comment.authorDecor?.selectedBadgeIds?.length ? (
          <BadgeStrip selectedBadgeIds={comment.authorDecor.selectedBadgeIds} className="mt-2" />
        ) : null}
      </div>
    </CardBorderWrapper>
  );
}

function CommentCard({
  articleId,
  comment,
  currentUid,
  canModerate,
  onReply,
}: {
  articleId: string;
  comment: ArticleComment;
  currentUid?: string;
  canModerate: boolean;
  onReply: (comment: ArticleComment) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(comment.text);
  const [saving, setSaving] = useState(false);
  const isAuthor = currentUid === comment.authorUid;
  const canEdit = isAuthor || canModerate;
  const canDelete = isAuthor || canModerate;

  async function handleSave() {
    const trimmed = text.trim();
    if (!trimmed || trimmed === comment.text) {
      setEditing(false);
      setText(comment.text);
      return;
    }

    setSaving(true);
    try {
      await updateArticleComment(articleId, comment.id, trimmed, canModerate);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    await deleteArticleComment(articleId, comment.id);
  }

  return (
    <div className="space-y-2">
      <CommentIdentity comment={comment} />
      <div className="rounded-lg border border-fab-border bg-fab-surface/60 p-3">
        {editing ? (
          <div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full rounded-md border border-fab-border bg-fab-bg px-3 py-2 text-sm text-fab-text outline-none focus:border-fab-gold/40"
            />
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !text.trim()}
                className="rounded-md bg-fab-gold px-3 py-1.5 text-xs font-semibold text-fab-bg disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setText(comment.text);
                }}
                className="rounded-md border border-fab-border px-3 py-1.5 text-xs font-medium text-fab-dim"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-6 text-fab-muted">{comment.text}</p>
        )}

        {!editing && (
          <div className="mt-2 flex items-center gap-3 text-[11px] text-fab-dim">
            {currentUid && (
              <button type="button" onClick={() => onReply(comment)} className="hover:text-fab-gold">
                Reply
              </button>
            )}
            {canEdit && (
              <button type="button" onClick={() => setEditing(true)} className="hover:text-fab-gold">
                Edit
              </button>
            )}
            {canDelete && (
              <button type="button" onClick={handleDelete} className="hover:text-red-400">
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function ArticleComments({
  articleId,
  allowComments,
  onCommentCountChange,
}: {
  articleId: string;
  allowComments: boolean;
  onCommentCountChange?: (count: number) => void;
}) {
  const { user, profile, isAdmin, isGuest } = useAuth();
  const [comments, setComments] = useState<ArticleComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<ArticleComment | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const unsubscribe = subscribeToArticleComments(articleId, (items) => {
      setComments(items);
      onCommentCountChange?.(items.length);
      setLoading(false);
    });
    return unsubscribe;
  }, [articleId, onCommentCountChange]);

  const threads = useMemo(() => {
    const byParent = new Map<string, ArticleComment[]>();
    const commentIds = new Set(comments.map((comment) => comment.id));
    const topLevel: ArticleComment[] = [];
    const orphaned: ArticleComment[] = [];

    for (const comment of comments) {
      if (!comment.parentId) {
        topLevel.push(comment);
        continue;
      }
      if (!commentIds.has(comment.parentId)) {
        orphaned.push(comment);
        continue;
      }
      const group = byParent.get(comment.parentId) || [];
      group.push(comment);
      byParent.set(comment.parentId, group);
    }

    return [
      ...topLevel.map((comment) => ({ comment, replies: byParent.get(comment.id) || [] })),
      ...orphaned.map((comment) => ({ comment, replies: [] as ArticleComment[] })),
    ];
  }, [comments]);

  const canComment = !!user?.uid && !isGuest;

  async function handleSubmit() {
    const trimmed = draft.trim();
    if (!trimmed || !user?.uid || !canComment) return;

    setSaving(true);
    setError(null);
    try {
      await addArticleComment(articleId, {
        authorUid: user.uid,
        authorUsername: profile?.username || user.displayName?.replace(/\s+/g, "").toLowerCase() || "fab-player",
        authorName: profile?.displayName || user.displayName || "FaB Player",
        authorPhoto: profile?.photoUrl || user.photoURL || undefined,
        authorDecor: buildCommentDecor(profile),
        text: trimmed,
        parentId: replyingTo?.id,
        replyToName: replyingTo?.authorName,
      }, isAdmin);
      setDraft("");
      setReplyingTo(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post comment.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-lg border border-fab-border bg-fab-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-fab-text">Discussion</h2>
          <p className="text-sm text-fab-dim">
            {comments.length} comment{comments.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="mt-5">
        {!allowComments ? (
          <p className="rounded-lg border border-fab-border bg-fab-bg px-4 py-3 text-sm text-fab-dim">
            Comments are closed for this article.
          </p>
        ) : canComment ? (
          <div className="rounded-lg border border-fab-border bg-fab-bg p-4">
            {replyingTo && (
              <div className="mb-3 flex items-center justify-between gap-3 rounded-md bg-fab-surface px-3 py-2 text-xs text-fab-dim">
                <span>Replying to {replyingTo.authorName}</span>
                <button type="button" onClick={() => setReplyingTo(null)} className="hover:text-fab-gold">
                  Cancel
                </button>
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Share your thoughts..."
              className="w-full rounded-md border border-fab-border bg-fab-surface px-3 py-2 text-sm text-fab-text outline-none focus:border-fab-gold/40"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-xs text-fab-dim">{draft.trim().length}/500</span>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving || !draft.trim()}
                className="rounded-md bg-fab-gold px-4 py-2 text-xs font-semibold text-fab-bg disabled:opacity-50"
              >
                {saving ? "Posting..." : replyingTo ? "Reply" : "Post Comment"}
              </button>
            </div>
            {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
          </div>
        ) : (
          <p className="rounded-lg border border-fab-border bg-fab-bg px-4 py-3 text-sm text-fab-dim">
            <Link href="/login" className="text-fab-gold hover:text-fab-gold-light">Sign in</Link> to comment and reply.
          </p>
        )}
      </div>

      <div className="mt-6 space-y-5">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg border border-fab-border bg-fab-bg" />
            ))}
          </div>
        ) : threads.length === 0 ? (
          <p className="text-sm text-fab-dim">No comments yet. Start the conversation.</p>
        ) : (
          threads.map(({ comment, replies }) => (
            <div key={comment.id} className="space-y-3">
              <CommentCard
                articleId={articleId}
                comment={comment}
                currentUid={user?.uid}
                canModerate={isAdmin}
                onReply={(item) => {
                  setReplyingTo(item);
                  textareaRef.current?.focus();
                }}
              />
              {replies.length > 0 && (
                <div className="ml-5 space-y-3 border-l border-fab-border pl-4 sm:ml-8 sm:pl-5">
                  {replies.map((reply) => (
                    <CommentCard
                      key={reply.id}
                      articleId={articleId}
                      comment={reply}
                      currentUid={user?.uid}
                      canModerate={isAdmin}
                      onReply={(item) => {
                        setReplyingTo(item);
                        textareaRef.current?.focus();
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
