"use client";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface CommentInputProps {
  onSubmit: (text: string) => Promise<void>;
}

export function CommentInput({ onSubmit }: CommentInputProps) {
  const { profile } = useAuth();
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const initials = profile?.displayName
    ?.split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(text.trim());
      setText("");
    } catch {
      // keep text on error
    } finally {
      setSubmitting(false);
    }
  }

  return (
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
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a comment..."
          className="flex-1 bg-fab-bg border border-fab-border rounded-md px-3 py-1.5 text-fab-text text-sm outline-none focus:border-fab-gold/50 placeholder:text-fab-dim"
          maxLength={500}
        />
        <button
          type="submit"
          disabled={!text.trim() || submitting}
          className="px-3 py-1.5 rounded-md text-xs font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {submitting ? "..." : "Post"}
        </button>
      </div>
    </form>
  );
}
