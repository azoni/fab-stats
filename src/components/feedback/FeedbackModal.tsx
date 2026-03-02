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

          <div className="mt-4 pt-4 border-t border-fab-border">
            <p className="text-xs text-fab-dim text-center mb-2">Or reach out directly</p>
            <div className="flex items-center justify-center gap-3">
              {adminUid && !isAdmin && (
                <button
                  onClick={() => {
                    onClose();
                    router.push(`/inbox/${adminUid}`);
                  }}
                  className="inline-flex items-center gap-1.5 text-sm text-fab-muted hover:text-fab-gold transition-colors"
                  title="Message on FabStats"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Inbox
                </button>
              )}
              <a
                href="https://discord.com/users/azonii"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-fab-muted hover:text-[#5865F2] transition-colors"
                title="Message on Discord"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.947 2.418-2.157 2.418z" />
                </svg>
                azonii
              </a>
              <a
                href="https://x.com/azoniNFT"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-fab-muted hover:text-fab-text transition-colors"
                title="Message on X"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                @azoniNFT
              </a>
            </div>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
