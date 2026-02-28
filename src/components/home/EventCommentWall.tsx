"use client";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useEventWall } from "@/hooks/useEventWall";
import { useMutedUsers } from "@/hooks/useMutedUsers";
import { rankBorderClass, rankBorderColor } from "@/lib/leaderboard-ranks";
import { containsProfanity } from "@/lib/profanity-filter";
import {
  parseCommentText,
  wrapSelection,
  COLOR_VALUES,
  COLOR_LABELS,
  VALID_COLORS,
  ADMIN_COLORS,
  type TextColor,
  type Segment,
} from "@/lib/comment-format";
import Link from "next/link";
import type { WallComment, ReactionType } from "@/types";

// ── Progressive rate limiting ──
// Cooldown escalates based on how many posts were made in the last 2 minutes.
// Posts:  1st   2nd   3rd   4th   5th+
// Wait:   5s   10s   20s   40s   60s
const RATE_WINDOW_MS = 2 * 60 * 1000; // 2-minute sliding window
const COOLDOWN_TIERS = [5, 10, 20, 40, 60]; // seconds

function getCooldownSeconds(recentTimestamps: number[]): number {
  const now = Date.now();
  const recent = recentTimestamps.filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length === 0) return 0;
  const tierIndex = Math.min(recent.length - 1, COOLDOWN_TIERS.length - 1);
  const lastPost = Math.max(...recent);
  const cooldownMs = COOLDOWN_TIERS[tierIndex] * 1000;
  const elapsed = now - lastPost;
  const remaining = Math.ceil((cooldownMs - elapsed) / 1000);
  return Math.max(0, remaining);
}

// ── Reaction icons (custom SVGs) ──
const REACTION_TYPES: ReactionType[] = ["fire", "heart", "laugh", "thumbsUp", "thinking"];

function ReactionIcon({ type, className = "w-3.5 h-3.5" }: { type: ReactionType; className?: string }) {
  switch (type) {
    case "fire":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 23c-4.97 0-9-3.58-9-8 0-3.07 2.13-5.59 3.5-6.93.37-.36.95-.07.95.43 0 1.1.74 2.13 1.76 2.41.42.11.79-.24.68-.67-.33-1.34-.22-2.86.52-4.24.6-1.12 1.55-2.07 2.44-2.83a.5.5 0 01.8.2c.46 1.28 1.5 2.74 2.85 3.63 1.61 1.06 2.5 2.15 2.5 4 0 .53-.07 1.04-.2 1.52-.1.36.22.68.57.52a3.01 3.01 0 001.63-2.67c0-.07.08-.11.13-.06C22.22 12.55 21 16.47 21 17c0 3.31-4.03 6-9 6z" />
        </svg>
      );
    case "heart":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      );
    case "laugh":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <circle cx="12" cy="12" r="10" />
          <path d="M8 14s1.5 2 4 2 4-2 4-2" strokeLinecap="round" />
          <path d="M9 9.5c0 .28-.22.5-.5.5S8 9.78 8 9.5 8.22 9 8.5 9s.5.22.5.5z" fill="currentColor" stroke="none" />
          <path d="M16 9.5c0 .28-.22.5-.5.5s-.5-.22-.5-.5.22-.5.5-.5.5.22.5.5z" fill="currentColor" stroke="none" />
          <path d="M7 9l2.5 1M17 9l-2.5 1" strokeLinecap="round" />
        </svg>
      );
    case "thumbsUp":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M2 20h2c.55 0 1-.45 1-1v-9c0-.55-.45-1-1-1H2v11zm19.83-7.12c.11-.25.17-.52.17-.8V11c0-1.1-.9-2-2-2h-5.5l.92-4.65c.05-.22.02-.46-.08-.66a4.8 4.8 0 00-.88-1.12L14 2 7.59 8.41C7.21 8.79 7 9.3 7 9.83v7.84C7 18.95 8.05 20 9.34 20h8.11c.7 0 1.36-.37 1.72-.97l2.66-6.15z" />
        </svg>
      );
    case "thinking":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <circle cx="12" cy="12" r="10" />
          <path d="M8 15c1 1.5 3.5 2 5.5.5" strokeLinecap="round" />
          <circle cx="8.5" cy="9.5" r="1" fill="currentColor" stroke="none" />
          <circle cx="15.5" cy="9.5" r="1" fill="currentColor" stroke="none" />
          <path d="M15 8c.5-1 1.5-1.5 2.5-1" strokeLinecap="round" />
        </svg>
      );
  }
}

const REACTION_COLORS: Record<ReactionType, string> = {
  fire: "#f97316",
  heart: "#ef4444",
  laugh: "#facc15",
  thumbsUp: "#38bdf8",
  thinking: "#a78bfa",
};

function formatTimeAgo(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoString).toLocaleDateString();
}

// ── Formatted text renderer ──

function FormattedText({ text }: { text: string }) {
  const segments = useMemo(() => parseCommentText(text), [text]);

  return (
    <p className="text-xs text-fab-muted mt-0.5 whitespace-pre-wrap break-words">
      {segments.map((seg, i) => (
        <FormattedSegment key={i} segment={seg} />
      ))}
    </p>
  );
}

function FormattedSegment({ segment }: { segment: Segment }) {
  const [revealed, setRevealed] = useState(false);

  if (segment.type === "text") {
    return <span>{segment.content}</span>;
  }

  if (segment.type === "spoiler") {
    if (revealed) {
      return (
        <span
          className="bg-fab-dim/10 rounded px-1 cursor-pointer"
          onClick={() => setRevealed(false)}
        >
          {segment.content}
        </span>
      );
    }
    return (
      <span
        className="bg-fab-dim/30 rounded px-1 cursor-pointer select-none text-transparent hover:bg-fab-dim/40 transition-colors"
        onClick={() => setRevealed(true)}
        title="Click to reveal spoiler"
      >
        {segment.content}
      </span>
    );
  }

  if (segment.type === "color") {
    return (
      <span style={{ color: COLOR_VALUES[segment.color] }}>
        {segment.content}
      </span>
    );
  }

  return null;
}

// ── Format toolbar ──

interface FormatToolbarProps {
  unlockedColors: TextColor[];
  onFormat: (format: "spoiler" | TextColor) => void;
  isAdmin?: boolean;
}

function FormatToolbar({ unlockedColors, onFormat, isAdmin }: FormatToolbarProps) {
  return (
    <div className="flex items-center gap-1.5 mb-1.5">
      {/* Spoiler button — always available */}
      <button
        type="button"
        onClick={() => onFormat("spoiler")}
        className="text-[10px] px-1.5 py-0.5 rounded bg-fab-dim/20 text-fab-muted hover:bg-fab-dim/40 hover:text-fab-text transition-colors"
        title="Spoiler — hide text behind a click-to-reveal blur"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
        </svg>
      </button>

      <div className="w-px h-3 bg-fab-border/50" />

      {/* Color buttons */}
      {VALID_COLORS.map((color) => {
        const unlocked = isAdmin || unlockedColors.includes(color);
        return (
          <button
            key={color}
            type="button"
            onClick={() => unlocked && onFormat(color)}
            className={`w-4 h-4 rounded-full border transition-all ${
              unlocked
                ? "border-fab-border hover:scale-110 hover:border-fab-text cursor-pointer"
                : "border-fab-border/30 opacity-30 cursor-not-allowed"
            }`}
            style={{ backgroundColor: COLOR_VALUES[color] }}
            title={unlocked ? `${color.charAt(0).toUpperCase() + color.slice(1)} text` : `Unlock: ${COLOR_LABELS[color]}`}
          />
        );
      })}
      {/* Admin-only colors */}
      {isAdmin && ADMIN_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onFormat(color)}
          className="w-4 h-4 rounded-full border border-fab-border hover:scale-110 hover:border-fab-text cursor-pointer transition-all"
          style={{ backgroundColor: COLOR_VALUES[color] }}
          title={`${color.charAt(0).toUpperCase() + color.slice(1)} text (Admin)`}
        />
      ))}
    </div>
  );
}

// ── Main component ──

interface EventCommentWallProps {
  eventId: string;
  rankMap: Map<string, 1 | 2 | 3 | 4 | 5>;
  unlockedColors?: TextColor[];
}

export function EventCommentWall({ eventId, rankMap, unlockedColors = [] }: EventCommentWallProps) {
  const { user, profile, isGuest, isAdmin } = useAuth();
  const { comments, realtimeCount, loading, loadingMore, hasMore, loadOlder, addComment, editComment, removeComment, toggleReaction } = useEventWall(eventId);
  const { mutedUserIds } = useMutedUsers();
  const [replyingTo, setReplyingTo] = useState<WallComment | null>(null);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevRealtimeCountRef = useRef(0);
  const postTimestampsRef = useRef<number[]>([]);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isLoggedIn = !!user && !isGuest;
  const isMuted = user ? mutedUserIds.has(user.uid) : false;

  // Clean up cooldown timer on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, []);

  // Start a countdown timer that ticks every second
  const startCooldownTimer = useCallback((seconds: number) => {
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    setCooldown(seconds);
    if (seconds <= 0) return;
    cooldownTimerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
          cooldownTimerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Filter out comments from muted users (unless admin)
  const visibleComments = useMemo(() => {
    if (isAdmin) return comments;
    return comments.filter((c) => !mutedUserIds.has(c.authorUid));
  }, [comments, mutedUserIds, isAdmin]);

  // Auto-scroll to bottom only when new realtime comments arrive (not on load-older)
  useEffect(() => {
    if (realtimeCount > prevRealtimeCountRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    prevRealtimeCountRef.current = realtimeCount;
  }, [realtimeCount]);

  // Group comments: top-level + their replies
  const threads = useMemo(() => {
    const topLevelIds = new Set(visibleComments.filter((c) => !c.parentId).map((c) => c.id));
    const topLevel = visibleComments.filter((c) => !c.parentId);
    const replyMap = new Map<string, WallComment[]>();
    const orphaned: WallComment[] = [];
    for (const c of visibleComments) {
      if (c.parentId) {
        if (topLevelIds.has(c.parentId)) {
          const existing = replyMap.get(c.parentId) || [];
          existing.push(c);
          replyMap.set(c.parentId, existing);
        } else {
          orphaned.push(c);
        }
      }
    }
    return [
      ...topLevel.map((tl) => ({ comment: tl, replies: replyMap.get(tl.id) || [] })),
      ...orphaned.map((c) => ({ comment: c, replies: [] as WallComment[] })),
    ];
  }, [visibleComments]);

  const handleFormat = useCallback(
    (format: "spoiler" | TextColor) => {
      const input = inputRef.current;
      if (!input) return;
      const start = input.selectionStart ?? text.length;
      const end = input.selectionEnd ?? text.length;
      const result = wrapSelection(text, start, end, format);
      if (result.text.length > 500) return;
      setText(result.text);
      requestAnimationFrame(() => {
        input.focus();
        input.setSelectionRange(result.cursorPos, result.cursorPos);
      });
    },
    [text]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || submitting || (!isAdmin && cooldown > 0)) return;
    setError(null);

    // Rate limit check (admin bypasses)
    if (!isAdmin) {
      const remaining = getCooldownSeconds(postTimestampsRef.current);
      if (remaining > 0) {
        startCooldownTimer(remaining);
        setError(`Slow down! You can post again in ${remaining}s.`);
        return;
      }
    }

    // Profanity check (admin bypasses)
    if (!isAdmin && containsProfanity(trimmed)) {
      setError("Your comment contains inappropriate language.");
      return;
    }

    setSubmitting(true);
    try {
      await addComment(trimmed, replyingTo || undefined);
      setText("");
      setReplyingTo(null);

      // Record timestamp and start cooldown (admin bypasses)
      if (!isAdmin) {
        const now = Date.now();
        postTimestampsRef.current.push(now);
        // Prune timestamps older than the window
        postTimestampsRef.current = postTimestampsRef.current.filter(
          (t) => now - t < RATE_WINDOW_MS
        );
        const nextCooldown = getCooldownSeconds(postTimestampsRef.current);
        if (nextCooldown > 0) startCooldownTimer(nextCooldown);
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes("inappropriate")) {
        setError(err.message);
      } else {
        setError("Failed to post comment. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const initials =
    profile?.displayName
      ?.split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  return (
    <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-fab-border/50">
        <h3 className="text-sm font-semibold text-fab-text flex items-center gap-2">
          <svg
            className="w-4 h-4 text-fab-gold"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076c1.14-.12 2.266-.26 3.383-.44 1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
            />
          </svg>
          Event Discussion
        </h3>
        <p className="text-[11px] text-fab-dim mt-0.5">Chat about Calling Montreal</p>
      </div>

      {/* Comment list */}
      <div ref={scrollRef} className="max-h-80 overflow-y-auto feed-scroll px-4 py-3 space-y-3">
        {/* Load older button */}
        {hasMore && !loading && (
          <div className="text-center pb-2">
            <button
              onClick={loadOlder}
              disabled={loadingMore}
              className="text-[10px] text-fab-dim hover:text-fab-gold transition-colors disabled:opacity-50"
            >
              {loadingMore ? "Loading..." : "Load older comments"}
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-xs text-fab-dim animate-pulse py-8 text-center">
            Loading comments...
          </div>
        ) : threads.length === 0 ? (
          <p className="text-xs text-fab-dim py-8 text-center">
            No comments yet &mdash; be the first to share your thoughts!
          </p>
        ) : (
          threads.map(({ comment, replies }) => (
            <div key={comment.id}>
              <WallCommentItem
                comment={comment}
                currentUid={user?.uid}
                isLoggedIn={isLoggedIn}
                isAdmin={isAdmin}
                isMuted={mutedUserIds.has(comment.authorUid)}
                rankMap={rankMap}
                onEdit={editComment}
                onDelete={removeComment}
                onReply={() => setReplyingTo(comment)}
                onToggleReaction={toggleReaction}
              />
              {replies.map((reply) => (
                <div key={reply.id} className="ml-4 sm:ml-8 mt-2 pl-3 border-l-2 border-fab-border/50">
                  <WallCommentItem
                    comment={reply}
                    currentUid={user?.uid}
                    isLoggedIn={isLoggedIn}
                    isAdmin={isAdmin}
                    isMuted={mutedUserIds.has(reply.authorUid)}
                    rankMap={rankMap}
                    onEdit={editComment}
                    onDelete={removeComment}
                    onReply={() => setReplyingTo(comment)}
                    onToggleReaction={toggleReaction}
                    isReply
                  />
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-fab-border/50 px-4 py-3">
        {replyingTo && (
          <div className="flex items-center gap-2 mb-2 text-xs text-fab-dim">
            <span>
              Replying to{" "}
              <span className="text-fab-gold font-semibold">@{replyingTo.authorName}</span>
            </span>
            <button
              onClick={() => setReplyingTo(null)}
              className="text-fab-dim hover:text-fab-loss"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        {error && (
          <div className="text-xs text-fab-loss mb-2">{error}</div>
        )}
        {isMuted && !isAdmin ? (
          <div className="text-xs text-fab-dim py-1">
            You have been muted from the event wall.
          </div>
        ) : isLoggedIn ? (
          <div>
            <FormatToolbar unlockedColors={unlockedColors} onFormat={handleFormat} isAdmin={isAdmin} />
            <form onSubmit={handleSubmit} className="flex gap-3">
              {profile?.photoUrl ? (
                <img src={profile.photoUrl} alt="" className="w-8 h-8 rounded-full shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-fab-gold/20 flex items-center justify-center text-fab-gold text-xs font-bold shrink-0">
                  {initials}
                </div>
              )}
              <div className="flex-1 flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={text}
                  onChange={(e) => { setText(e.target.value); setError(null); }}
                  placeholder={
                    replyingTo
                      ? `Reply to @${replyingTo.authorName}...`
                      : "Share your thoughts..."
                  }
                  className="flex-1 bg-fab-bg border border-fab-border rounded-md px-3 py-1.5 text-fab-text text-sm outline-none focus:border-fab-gold/50 placeholder:text-fab-dim"
                  maxLength={500}
                />
                <button
                  type="submit"
                  disabled={!text.trim() || submitting || (!isAdmin && cooldown > 0)}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  {submitting ? "..." : cooldown > 0 && !isAdmin ? `${cooldown}s` : "Post"}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="text-xs text-fab-dim py-1">
            <Link href="/login" className="text-fab-gold hover:text-fab-gold-light">
              Sign in
            </Link>{" "}
            to join the discussion.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Individual comment item ──

interface WallCommentItemProps {
  comment: WallComment;
  currentUid?: string;
  isLoggedIn: boolean;
  isAdmin: boolean;
  isMuted: boolean;
  rankMap: Map<string, 1 | 2 | 3 | 4 | 5>;
  onEdit: (id: string, text: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onReply: () => void;
  onToggleReaction: (commentId: string, reaction: ReactionType, hasReacted: boolean) => Promise<void>;
  isReply?: boolean;
}

function WallCommentItem({
  comment,
  currentUid,
  isLoggedIn,
  isAdmin,
  isMuted,
  rankMap,
  onEdit,
  onDelete,
  onReply,
  onToggleReaction,
}: WallCommentItemProps) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close reaction picker on click outside
  useEffect(() => {
    if (!showPicker) return;
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPicker]);

  const isAuthor = currentUid === comment.authorUid;
  const canEdit = isAuthor || isAdmin;
  const canDelete = isAuthor || isAdmin;
  const rank = rankMap.get(comment.authorUid);
  const borderColor = rankBorderColor(rank);

  // Guest privacy: mask names and photos
  const displayName = isLoggedIn ? comment.authorName : "FaB Player";
  const displayReplyTo = isLoggedIn ? comment.replyToName : "FaB Player";
  const showPhoto = isLoggedIn && comment.authorPhoto;

  const initials = comment.authorName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function handleSave() {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === comment.text) {
      setEditing(false);
      setEditText(comment.text);
      return;
    }
    // Profanity check on edit (admin bypasses)
    if (!isAdmin && containsProfanity(trimmed)) {
      setEditError("Your edit contains inappropriate language.");
      return;
    }
    setEditError(null);
    setSaving(true);
    try {
      await onEdit(comment.id, trimmed);
      setEditing(false);
    } catch {
      // keep editing on error
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete(comment.id);
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div
      className="flex gap-2.5 group"
      style={borderColor ? { borderLeft: `2px solid ${borderColor}`, paddingLeft: "0.5rem" } : undefined}
    >
      {/* Avatar */}
      {showPhoto ? (
        <img
          src={comment.authorPhoto}
          alt=""
          className={`w-7 h-7 rounded-full shrink-0 ${rankBorderClass(rank)}`}
        />
      ) : (
        <div className="w-7 h-7 rounded-full bg-fab-gold/20 flex items-center justify-center text-fab-gold text-[10px] font-bold shrink-0">
          {isLoggedIn ? initials : "?"}
        </div>
      )}

      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-fab-text">{displayName}</span>
          {comment.replyToName && (
            <span className="text-[10px] text-fab-dim">
              replying to @{displayReplyTo}
            </span>
          )}
          <span className="text-[10px] text-fab-dim">{formatTimeAgo(comment.createdAt)}</span>
          {comment.editedAt && (
            <span className="text-[10px] text-fab-dim italic">(edited)</span>
          )}
          {isAdmin && isMuted && (
            <span className="text-[10px] text-fab-loss italic">(muted)</span>
          )}
        </div>

        {/* Body */}
        {editing ? (
          <div className="mt-1">
            <textarea
              value={editText}
              onChange={(e) => { setEditText(e.target.value); setEditError(null); }}
              className="w-full bg-fab-bg border border-fab-border rounded-md px-3 py-2 text-fab-text text-sm outline-none focus:border-fab-gold/50 resize-none"
              rows={2}
              maxLength={500}
              autoFocus
            />
            {editError && (
              <div className="text-[10px] text-fab-loss mt-1">{editError}</div>
            )}
            <div className="flex gap-2 mt-1">
              <button
                onClick={handleSave}
                disabled={saving || !editText.trim()}
                className="px-3 py-1 rounded text-xs font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors disabled:opacity-50"
              >
                {saving ? "..." : "Save"}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setEditText(comment.text);
                  setEditError(null);
                }}
                className="px-3 py-1 rounded text-xs font-semibold text-fab-muted hover:text-fab-text transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <FormattedText text={comment.text} />
        )}

        {/* Reactions display */}
        {!editing && comment.reactions && (() => {
          const activeReactions = REACTION_TYPES.filter(
            (r) => comment.reactions?.[r]?.length
          );
          if (activeReactions.length === 0) return null;
          return (
            <div className="flex gap-1 mt-1 flex-wrap">
              {activeReactions.map((r) => {
                const users = comment.reactions![r]!;
                const hasReacted = !!currentUid && users.includes(currentUid);
                return (
                  <button
                    key={r}
                    onClick={() => isLoggedIn && onToggleReaction(comment.id, r, hasReacted)}
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] transition-colors ${
                      hasReacted
                        ? "bg-fab-gold/15 border border-fab-gold/40"
                        : "bg-fab-dim/10 border border-fab-border/50 hover:border-fab-border"
                    } ${isLoggedIn ? "cursor-pointer" : "cursor-default"}`}
                  >
                    <span style={{ color: REACTION_COLORS[r] }}>
                      <ReactionIcon type={r} className="w-3 h-3" />
                    </span>
                    <span className="text-fab-muted">{users.length}</span>
                  </button>
                );
              })}
            </div>
          );
        })()}

        {/* Actions */}
        {!editing && (
          <div className="flex items-center gap-2.5 mt-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            {isLoggedIn && (
              <div className="relative" ref={pickerRef}>
                <button
                  onClick={() => setShowPicker((p) => !p)}
                  className="text-[10px] text-fab-dim hover:text-fab-gold transition-colors"
                >
                  React
                </button>
                {showPicker && (
                  <div className="absolute bottom-5 left-0 z-10 flex gap-1 bg-fab-surface border border-fab-border rounded-lg px-2 py-1.5 shadow-lg">
                    {REACTION_TYPES.map((r) => {
                      const hasReacted = !!currentUid && !!comment.reactions?.[r]?.includes(currentUid);
                      return (
                        <button
                          key={r}
                          onClick={() => {
                            onToggleReaction(comment.id, r, hasReacted);
                            setShowPicker(false);
                          }}
                          className={`p-1 rounded hover:bg-fab-dim/20 transition-colors ${
                            hasReacted ? "bg-fab-gold/15" : ""
                          }`}
                          title={r}
                        >
                          <span style={{ color: REACTION_COLORS[r] }}>
                            <ReactionIcon type={r} className="w-4 h-4" />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {isLoggedIn && (
              <button
                onClick={onReply}
                className="text-[10px] text-fab-dim hover:text-fab-gold transition-colors"
              >
                Reply
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => setEditing(true)}
                className="text-[10px] text-fab-dim hover:text-fab-gold transition-colors"
              >
                Edit
              </button>
            )}
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-[10px] text-fab-dim hover:text-fab-loss transition-colors disabled:opacity-50"
              >
                {deleting ? "..." : "Delete"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
