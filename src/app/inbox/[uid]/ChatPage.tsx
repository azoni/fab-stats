"use client";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useMessages } from "@/hooks/useMessages";
import { getConversationId, sendMessage, sendMessageNotification, getOrCreateConversation, conversationExists } from "@/lib/messages";
import { getProfile } from "@/lib/firestore-storage";
import type { UserProfile } from "@/types";

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function CrownIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-3.5 h-3.5 text-fab-gold"} viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.5 19h19v2h-19zM22.5 7l-4.5 4.5L12 4l-6 7.5L1.5 7 4 17h16z" />
    </svg>
  );
}

export default function ChatPage() {
  const pathname = usePathname();
  const otherUid = pathname.split("/").pop() || "";
  const { user, profile, isAdmin } = useAuth();
  const [otherProfile, setOtherProfile] = useState<UserProfile | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [existenceChecked, setExistenceChecked] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, loaded } = useMessages(conversationId);

  // Load the other user's profile
  useEffect(() => {
    if (!otherUid || otherUid === "_") return;
    getProfile(otherUid).then((p) => {
      if (p) setOtherProfile(p);
    }).catch(() => {});
  }, [otherUid]);

  // Check if conversation already exists; subscribe to messages if so
  useEffect(() => {
    if (!user || !otherUid || otherUid === "_") return;
    const id = getConversationId(user.uid, otherUid);
    conversationExists(id).then((exists) => {
      if (exists) setConversationId(id);
      setExistenceChecked(true);
    });
  }, [user, otherUid]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!user) {
    return (
      <div className="text-center py-24">
        <p className="text-fab-muted">Sign in to view messages.</p>
      </div>
    );
  }

  async function handleSend() {
    if (!text.trim() || !user || !profile || sending) return;

    setSending(true);
    try {
      const convId = getConversationId(user.uid, otherUid);

      // Ensure conversation exists before sending
      if (otherProfile) {
        await getOrCreateConversation(profile, otherProfile);
      }

      await sendMessage(
        convId,
        user.uid,
        profile.displayName,
        profile.photoUrl,
        text.trim(),
        isAdmin
      );

      // Start the listener now that the conversation exists
      if (!conversationId) {
        setConversationId(convId);
      }

      // Notify the other user
      await sendMessageNotification(
        otherUid,
        convId,
        user.uid,
        profile.displayName,
        profile.photoUrl,
        text.trim()
      ).catch(() => {});

      setText("");
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-fab-border mb-4">
        <Link href="/inbox" className="text-fab-muted hover:text-fab-text transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        {otherProfile ? (
          <Link href={`/player/${otherProfile.username}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            {otherProfile.photoUrl ? (
              <img src={otherProfile.photoUrl} alt="" className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-fab-gold/20 flex items-center justify-center text-fab-gold text-sm font-bold">
                {otherProfile.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold text-fab-text text-sm">{otherProfile.displayName}</p>
              <p className="text-xs text-fab-dim">@{otherProfile.username}</p>
            </div>
          </Link>
        ) : (
          <p className="text-fab-muted text-sm">Loading...</p>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {!loaded && !existenceChecked && (
          <div className="text-center py-8">
            <p className="text-fab-dim text-sm">Loading messages...</p>
          </div>
        )}

        {(loaded || (existenceChecked && !conversationId)) && messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-fab-dim text-sm">No messages yet. Start the conversation!</p>
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.senderUid === user.uid;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] ${isMe ? "order-1" : "order-0"}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  {!isMe && msg.isAdmin && <CrownIcon className="w-3 h-3 text-fab-gold" />}
                  <span className={`text-xs ${isMe ? "text-fab-dim" : "text-fab-muted"}`}>
                    {isMe ? "You" : msg.senderName}
                  </span>
                  {isMe && msg.isAdmin && <CrownIcon className="w-3 h-3 text-fab-gold" />}
                  <span className="text-xs text-fab-dim">{formatTime(msg.createdAt)}</span>
                </div>
                <div className={`rounded-lg px-3 py-2 text-sm ${
                  isMe
                    ? "bg-fab-gold/15 text-fab-text"
                    : "bg-fab-surface border border-fab-border text-fab-text"
                }`}>
                  {msg.text}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-fab-border pt-3">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-fab-surface border border-fab-border rounded-lg px-3 py-2 text-sm text-fab-text placeholder:text-fab-dim focus:outline-none focus:border-fab-gold"
            maxLength={1000}
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="px-4 py-2 bg-fab-gold/15 text-fab-gold rounded-lg text-sm font-medium hover:bg-fab-gold/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
