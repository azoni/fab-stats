"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useChat } from "@/contexts/ChatContext";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { ChatInput } from "@/components/chat/ChatInput";
import Link from "next/link";

const SUGGESTIONS = [
  "How am I doing this week?",
  "What's the current meta like?",
  "Analyze my hero matchups",
  "Who's my toughest opponent?",
  "What's my best format?",
  "Compare me to the average player",
];

function EmptyState({ onSuggestion }: { onSuggestion: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-4">
      <div className="text-4xl mb-4">⚔️</div>
      <h2 className="text-lg font-semibold text-fab-text mb-2">FaB Stats AI Assistant</h2>
      <p className="text-sm text-fab-muted mb-6 max-w-md">
        Ask me anything about your stats, the community meta, hero matchups, or Flesh and Blood strategy.
      </p>
      <div className="flex flex-wrap justify-center gap-2 max-w-lg">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onSuggestion(s)}
            className="px-3 py-1.5 rounded-full text-xs bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text hover:border-fab-gold/30 transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { user, isGuest, loading } = useAuth();
  const { messages, loaded, sendMessage, isLoading, rateLimits, error, clearError, clearHistory } = useChat();

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4">
        <div className="h-8 w-48 bg-fab-surface rounded animate-pulse mb-4" />
        <div className="h-[500px] bg-fab-surface border border-fab-border rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!user || isGuest) {
    return (
      <div className="max-w-lg mx-auto py-12 px-4 text-center">
        <div className="text-4xl mb-4">⚔️</div>
        <h1 className="text-2xl font-bold text-fab-gold mb-2">AI Chat Assistant</h1>
        <p className="text-sm text-fab-muted mb-6">
          Sign in to chat with the FaB Stats AI about your match history, hero performance, and the community meta.
        </p>
        <Link
          href="/login"
          className="inline-block px-6 py-2.5 rounded-lg font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-fab-gold">AI Chat</h1>
          <p className="text-xs text-fab-dim mt-0.5">Ask about your stats, matchups, and the meta</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearHistory}
            className="text-[11px] text-fab-dim hover:text-fab-muted transition-colors"
          >
            Clear history
          </button>
        )}
      </div>

      {/* Chat container */}
      <div className="bg-fab-surface border border-fab-border rounded-lg flex flex-col" style={{ height: "calc(100vh - 220px)", minHeight: "400px" }}>
        <ChatMessages
          messages={messages}
          isLoading={isLoading}
          emptyState={<EmptyState onSuggestion={sendMessage} />}
        />
        <ChatInput
          onSend={sendMessage}
          disabled={isLoading}
          rateLimits={rateLimits}
          error={error}
          multiline
        />
      </div>

      {/* Footer info */}
      <p className="text-[10px] text-fab-dim text-center mt-3">
        Powered by Claude AI. Responses may be inaccurate — always verify with official sources.
      </p>
    </div>
  );
}
