"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, MessageCircle, Send, Trash2 } from "lucide-react";
import type { FeedEvent, WallComment } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { listFeedComments, addFeedComment, deleteFeedComment, syncFeedCommentCount } from "@/lib/feed-comments";
import { summarizeFeedEvent } from "@/lib/feed";
import { playerHref } from "@/lib/constants";

function timeAgoShort(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString();
}

export function FeedCommentSection({ event, currentUserId, compact }: { event: FeedEvent; currentUserId?: string; compact?: boolean }) {
  const { profile, isAdmin } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState<WallComment[]>([]);
  const [loaded, setLoaded] = useState(false); // full thread loaded (vs. preview only)
  const [previewTried, setPreviewTried] = useState(false);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [posting, setPosting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isOwner = currentUserId === event.userId;
  const serverCount = event.commentCount;
  // Known count: the loaded thread length once we have it, else the denormalized
  // count (null when the event predates commentCount → show a neutral "Comments").
  const count = loaded ? comments.length : (serverCount ?? null);
  const PREVIEW_COUNT = 2;

  const ensureLoaded = useCallback(async () => {
    if (loaded || loading) return;
    setLoading(true);
    try {
      const items = await listFeedComments(event.id);
      setComments(items);
      setLoaded(true);
      // Reconcile the denormalized count if we got the whole thread (not truncated).
      if (items.length < 30 && items.length !== (event.commentCount ?? -1)) {
        syncFeedCommentCount(event.id, items.length);
      }
    } catch {
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [event.id, event.commentCount, loaded, loading]);

  // Load a small preview so a few recent comments show without expanding.
  useEffect(() => {
    if (previewTried || loaded || expanded || !((serverCount ?? 0) > 0)) return;
    setPreviewTried(true);
    listFeedComments(event.id, PREVIEW_COUNT)
      .then((items) => setComments((prev) => (prev.length ? prev : items)))
      .catch(() => {});
  }, [previewTried, loaded, expanded, serverCount, event.id]);

  const toggle = useCallback(async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const next = !expanded;
    setExpanded(next);
    if (next) await ensureLoaded();
  }, [expanded, ensureLoaded]);

  const submit = useCallback(async () => {
    const text = input.trim();
    if (!text || !currentUserId || !profile || posting) return;
    setPosting(true);
    setErrorMsg(null);
    try {
      const created = await addFeedComment(
        event.id,
        {
          authorUid: currentUserId,
          authorName: profile.displayName || profile.username || "Anonymous",
          authorPhoto: profile.photoUrl,
          text,
        },
        {
          ownerUid: event.userId,
          eventSummary: summarizeFeedEvent(event),
        },
      );
      setComments((prev) => [...prev, created]);
      setInput("");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Could not post comment.");
    } finally {
      setPosting(false);
    }
  }, [input, currentUserId, profile, posting, event]);

  const remove = useCallback(async (commentId: string) => {
    if (!confirm("Delete this comment?")) return;
    let removed: WallComment | undefined;
    setComments((prev) => {
      removed = prev.find((c) => c.id === commentId);
      return prev.filter((c) => c.id !== commentId);
    });
    try {
      await deleteFeedComment(event.id, commentId);
    } catch {
      if (removed) {
        const restored = removed;
        setComments((prev) => (prev.some((c) => c.id === commentId) ? prev : [...prev, restored].sort((a, b) => a.createdAt.localeCompare(b.createdAt))));
      }
    }
  }, [event.id]);

  const padded = compact ? "px-2" : "px-3";
  const previewComments = !expanded ? comments.slice(-PREVIEW_COUNT) : [];

  return (
    // Stop clicks anywhere in the comment area (input padding, empty space, the
    // "No comments yet" text, etc.) from bubbling to the card's navigate-to-player
    // handler — otherwise interacting with comments jumps to the player/search page.
    <div
      className={`mt-2 border-t border-fab-border/60 pt-2 ${compact ? "text-[12px]" : "text-sm"}`}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={(e) => { void toggle(e); }}
        aria-expanded={expanded}
        className={`flex w-full items-center justify-between gap-2 rounded-md py-1.5 ${padded} text-xs font-bold text-fab-muted transition-colors hover:bg-fab-bg/40 hover:text-fab-text`}
      >
        <span className="inline-flex items-center gap-1.5">
          <MessageCircle className="h-3.5 w-3.5" />
          {count == null ? "Comments" : count === 0 ? "Be the first to comment" : `${count} comment${count === 1 ? "" : "s"}`}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {/* Collapsed preview — a couple of recent comments, tap to see the rest. */}
      {!expanded && previewComments.length > 0 && (
        <div className={`mt-1 space-y-1.5 ${padded}`}>
          {previewComments.map((c) => (
            <div key={c.id} className="flex items-baseline gap-1.5 text-xs">
              <Link href={playerHref(c.authorName)} className="shrink-0 font-bold text-fab-text hover:text-fab-gold">
                {c.authorName}
              </Link>
              <span className="min-w-0 flex-1 truncate text-fab-muted">{c.text}</span>
              <span className="shrink-0 text-[10px] text-fab-dim">{timeAgoShort(c.createdAt)}</span>
            </div>
          ))}
          {(count ?? 0) > previewComments.length && (
            <button
              type="button"
              onClick={(e) => { void toggle(e); }}
              className="text-[11px] font-bold text-fab-muted hover:text-fab-gold"
            >
              View {(count ?? 0) - previewComments.length} more comment{(count ?? 0) - previewComments.length === 1 ? "" : "s"}
            </button>
          )}
        </div>
      )}

      {expanded && (
        <div className={`mt-2 space-y-2 ${padded}`}>
          {loading && comments.length === 0 ? (
            <p className="text-xs text-fab-dim">Loading comments…</p>
          ) : comments.length === 0 ? (
            <p className="text-xs text-fab-dim">No comments yet.</p>
          ) : (
            <ul className="space-y-2">
              {comments.map((c) => {
                const canDelete = c.authorUid === currentUserId || isOwner || isAdmin;
                return (
                  <li key={c.id} className="flex items-start gap-2">
                    <div className="shrink-0">
                      {c.authorPhoto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.authorPhoto} alt="" className="h-7 w-7 rounded-full border border-fab-border object-cover" />
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-fab-border bg-fab-bg text-[10px] font-bold text-fab-muted">
                          {(c.authorName || "?").charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <Link href={playerHref(c.authorName)} className="truncate text-xs font-bold text-fab-text hover:text-fab-gold">
                          {c.authorName}
                        </Link>
                        <span className="text-[10px] text-fab-dim">{timeAgoShort(c.createdAt)}</span>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); remove(c.id); }}
                            className="ml-auto text-fab-dim hover:text-rose-400"
                            aria-label="Delete comment"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <p className="whitespace-pre-wrap break-words text-xs text-fab-text">{c.text}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {currentUserId ? (
            <div className="flex items-end gap-2 pt-1">
              <textarea
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    submit();
                  }
                }}
                placeholder="Add a comment…"
                rows={1}
                maxLength={500}
                className="min-h-[34px] flex-1 resize-none rounded-md border border-fab-border bg-fab-bg/70 px-2 py-1.5 text-xs text-fab-text placeholder:text-fab-dim focus:border-fab-gold/60 focus:outline-none"
              />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); submit(); }}
                disabled={posting || !input.trim() || !profile}
                className="flex h-[34px] items-center gap-1 rounded-md bg-fab-gold px-3 text-xs font-bold text-fab-bg transition-opacity hover:bg-fab-gold-light disabled:opacity-50"
              >
                <Send className="h-3 w-3" />
                Post
              </button>
            </div>
          ) : (
            <p className="text-xs text-fab-dim">Sign in to comment.</p>
          )}
          {errorMsg && <p className="text-xs text-rose-400">{errorMsg}</p>}
        </div>
      )}
    </div>
  );
}
