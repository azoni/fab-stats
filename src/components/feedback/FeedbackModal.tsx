"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { submitFeedback } from "@/lib/feedback";
import { getAdminUid } from "@/lib/admin";

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
}

export function FeedbackModal({ open, onClose }: FeedbackModalProps) {
  const { profile, isAdmin } = useAuth();
  const router = useRouter();
  const [type, setType] = useState<"bug" | "feature">("bug");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [adminUid, setAdminUid] = useState<string | null>(null);

  useEffect(() => {
    if (open && !isAdmin) {
      getAdminUid().then(setAdminUid);
    }
  }, [open, isAdmin]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !message.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      await submitFeedback(profile, type, message.trim());
      setSubmitted(true);
      setMessage("");
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 1500);
    } catch {
      setError("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-fab-surface border border-fab-border rounded-lg p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-fab-gold mb-4">Send Feedback</h2>

        {submitted ? (
          <div className="text-fab-win text-sm py-4 text-center">
            Thanks for your feedback!
          </div>
        ) : (
          <>
          <form onSubmit={handleSubmit}>
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setType("bug")}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  type === "bug"
                    ? "border-fab-loss bg-fab-loss/10 text-fab-loss"
                    : "border-fab-border text-fab-muted hover:text-fab-text"
                }`}
              >
                Bug Report
              </button>
              <button
                type="button"
                onClick={() => setType("feature")}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  type === "feature"
                    ? "border-fab-gold bg-fab-gold/10 text-fab-gold"
                    : "border-fab-border text-fab-muted hover:text-fab-text"
                }`}
              >
                Feature Request
              </button>
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                type === "bug"
                  ? "Describe the bug you encountered..."
                  : "Describe the feature you'd like..."
              }
              className="w-full bg-fab-bg border border-fab-border text-fab-text rounded-lg px-3 py-2 focus:outline-none focus:border-fab-gold resize-none h-32 text-sm mb-1"
              maxLength={1000}
              required
            />
            <div className="text-xs text-fab-dim text-right mb-3">
              {message.length}/1000
            </div>

            {error && <p className="text-fab-loss text-sm mb-3">{error}</p>}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !message.trim()}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors disabled:opacity-50"
              >
                {submitting ? "Sending..." : "Submit"}
              </button>
            </div>
          </form>

          {adminUid && !isAdmin && (
            <div className="mt-4 pt-4 border-t border-fab-border text-center">
              <button
                onClick={() => {
                  onClose();
                  router.push(`/inbox/${adminUid}`);
                }}
                className="inline-flex items-center gap-1.5 text-sm text-fab-muted hover:text-fab-gold transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Or message the admin directly
              </button>
            </div>
          )}
          </>
        )}
      </div>
    </div>
  );
}
