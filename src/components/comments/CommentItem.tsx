"use client";
import { useState } from "react";
import type { MatchComment } from "@/types";

interface CommentItemProps {
  comment: MatchComment;
  currentUid?: string;
  isMatchOwner: boolean;
  onEdit: (commentId: string, newText: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
}

export function CommentItem({ comment, currentUid, isMatchOwner, onEdit, onDelete }: CommentItemProps) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isAuthor = currentUid === comment.authorUid;
  const canEdit = isAuthor;
  const canDelete = isAuthor || isMatchOwner;

  const initials = comment.authorName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function handleSave() {
    if (!editText.trim() || editText.trim() === comment.text) {
      setEditing(false);
      setEditText(comment.text);
      return;
    }
    setSaving(true);
    try {
      await onEdit(comment.id, editText.trim());
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

  const timeAgo = formatTimeAgo(comment.createdAt);

  return (
    <div className="flex gap-3 group">
      {/* Avatar */}
      {comment.authorPhoto ? (
        <img src={comment.authorPhoto} alt="" className="w-8 h-8 rounded-full shrink-0" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-fab-gold/20 flex items-center justify-center text-fab-gold text-xs font-bold shrink-0">
          {initials}
        </div>
      )}

      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-fab-text">{comment.authorName}</span>
          <span className="text-xs text-fab-dim">{timeAgo}</span>
          {comment.editedAt && (
            <span className="text-xs text-fab-dim italic">(edited)</span>
          )}
        </div>

        {/* Body */}
        {editing ? (
          <div className="mt-1">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full bg-fab-bg border border-fab-border rounded-md px-3 py-2 text-fab-text text-sm outline-none focus:border-fab-gold/50 resize-none"
              rows={2}
              autoFocus
            />
            <div className="flex gap-2 mt-1">
              <button
                onClick={handleSave}
                disabled={saving || !editText.trim()}
                className="px-3 py-1 rounded text-xs font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors disabled:opacity-50"
              >
                {saving ? "..." : "Save"}
              </button>
              <button
                onClick={() => { setEditing(false); setEditText(comment.text); }}
                className="px-3 py-1 rounded text-xs font-semibold text-fab-muted hover:text-fab-text transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-fab-muted mt-0.5 whitespace-pre-wrap break-words">{comment.text}</p>
        )}

        {/* Actions */}
        {!editing && (canEdit || canDelete) && (
          <div className="flex gap-3 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {canEdit && (
              <button
                onClick={() => setEditing(true)}
                className="text-xs text-fab-dim hover:text-fab-gold transition-colors"
              >
                Edit
              </button>
            )}
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs text-fab-dim hover:text-fab-loss transition-colors disabled:opacity-50"
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
