"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useConversations } from "@/hooks/useConversations";
import { getAdminUid } from "@/lib/admin";

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return d.toLocaleDateString();
}

export default function InboxPage() {
  const { user, isGuest, isAdmin } = useAuth();
  const { conversations, loaded } = useConversations();
  const router = useRouter();
  const [adminUid, setAdminUid] = useState<string | null>(null);

  useEffect(() => {
    if (user && !isAdmin) {
      getAdminUid().then(setAdminUid);
    }
  }, [user, isAdmin]);

  if (!user || isGuest) {
    return (
      <div className="text-center py-24">
        <InboxIcon className="w-14 h-14 text-fab-muted mb-4 mx-auto" />
        <h1 className="text-2xl font-bold text-fab-text mb-2">Inbox</h1>
        <p className="text-fab-muted">Sign in to view your messages.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-fab-gold">Inbox</h1>
        {adminUid && !isAdmin && (
          <button
            onClick={() => router.push(`/inbox/${adminUid}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-gold hover:border-fab-gold/30 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Message Admin
          </button>
        )}
      </div>
      <p className="text-fab-muted text-sm mb-6">Your conversations</p>

      {!loaded && (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-fab-surface border border-fab-border rounded-lg p-4 h-16 animate-pulse" />
          ))}
        </div>
      )}

      {loaded && conversations.length === 0 && (
        <div className="text-center py-16">
          <InboxIcon className="w-14 h-14 text-fab-muted mb-4 mx-auto" />
          <h2 className="text-lg font-semibold text-fab-text mb-2">No messages yet</h2>
          <p className="text-fab-muted text-sm">
            When you receive a message, it will appear here.
          </p>
        </div>
      )}

      {loaded && conversations.length > 0 && (
        <div className="space-y-2">
          {conversations.map((conv) => {
            const otherUid = conv.participants.find((p) => p !== user.uid) || "";
            const other = conv.participantInfo?.[otherUid];
            const initials = (other?.displayName || "?").charAt(0).toUpperCase();

            return (
              <Link
                key={conv.id}
                href={`/inbox/${otherUid}`}
                className="flex items-center gap-3 bg-fab-surface border border-fab-border rounded-lg p-4 hover:border-fab-gold/30 transition-colors"
              >
                {other?.photoUrl ? (
                  <img src={other.photoUrl} alt="" className="w-10 h-10 rounded-full shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-fab-gold/20 flex items-center justify-center text-fab-gold text-sm font-bold shrink-0">
                    {initials}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-fab-text truncate">{other?.displayName || "Unknown"}</p>
                    <span className="text-xs text-fab-dim shrink-0 ml-2">{formatTime(conv.lastMessageAt)}</span>
                  </div>
                  {conv.lastMessage && (
                    <p className="text-sm text-fab-muted truncate mt-0.5">{conv.lastMessage}</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InboxIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-5 h-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}
