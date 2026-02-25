"use client";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { FeedbackModal } from "./FeedbackModal";

export function FeedbackFab() {
  const { user, isGuest } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user || isGuest) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-20 md:bottom-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-fab-gold text-fab-bg font-semibold text-sm shadow-lg hover:bg-fab-gold-light transition-all hover:scale-105 active:scale-95"
        title="Send Feedback"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        Feedback
      </button>
      <FeedbackModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
