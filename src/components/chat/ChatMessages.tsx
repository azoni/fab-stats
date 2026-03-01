"use client";
import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/lib/chat";
import { AchievementIcon } from "@/components/gamification/AchievementIcons";

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-fab-muted"
          style={{
            animation: "chatDot 1.4s ease-in-out infinite",
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes chatDot {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

interface Props {
  messages: ChatMessage[];
  isLoading: boolean;
  emptyState?: React.ReactNode;
}

export function ChatMessages({ messages, isLoading, emptyState }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        {emptyState || (
          <div>
            <AchievementIcon icon="swords" className="w-8 h-8 mx-auto mb-3 text-fab-muted" />
            <p className="text-sm text-fab-muted mb-1">Ask me anything about your stats</p>
            <p className="text-xs text-fab-dim">Win rates, matchups, hero meta, and more</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
              msg.role === "user"
                ? "bg-fab-gold/15 text-fab-text"
                : "bg-fab-surface border border-fab-border text-fab-muted"
            }`}
          >
            <div className="whitespace-pre-wrap break-words">{msg.content}</div>
            <div className={`text-[10px] mt-1 ${msg.role === "user" ? "text-fab-gold/40" : "text-fab-dim"}`}>
              {formatTime(msg.createdAt)}
            </div>
          </div>
        </div>
      ))}
      {isLoading && (
        <div className="flex justify-start">
          <div className="bg-fab-surface border border-fab-border rounded-lg">
            <TypingDots />
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
