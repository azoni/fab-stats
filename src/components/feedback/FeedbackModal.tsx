"use client";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { submitFeedback } from "@/lib/feedback";

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
}

export function FeedbackModal({ open, onClose }: FeedbackModalProps) {
  const { profile } = useAuth();
  const [type, setType] = useState<"bug" | "feature">("bug");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

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
        )}
      </div>
    </div>
  );
}
