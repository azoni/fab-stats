"use client";
import { useChat } from "@/contexts/ChatContext";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import Link from "next/link";

export function ChatPanel() {
  const { messages, isOpen, setIsOpen, sendMessage, isLoading, rateLimits, error, clearError, clearHistory } = useChat();

  if (!isOpen) return null;

  return (
    <div className="fixed right-4 bottom-20 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-8rem)] flex flex-col bg-fab-bg border border-fab-border rounded-xl shadow-2xl overflow-hidden md:bottom-20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-fab-border bg-fab-surface">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-fab-text">FaB Stats AI</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-fab-win/15 text-fab-win font-medium">Beta</span>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={clearHistory}
              className="p-1.5 rounded hover:bg-fab-surface-hover transition-colors text-fab-dim hover:text-fab-muted"
              title="Clear history"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
          <Link
            href="/chat"
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded hover:bg-fab-surface-hover transition-colors text-fab-dim hover:text-fab-muted"
            title="Open full page"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </Link>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded hover:bg-fab-surface-hover transition-colors text-fab-dim hover:text-fab-muted"
            title="Close"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <ChatMessages messages={messages} isLoading={isLoading} />

      {/* Input */}
      <ChatInput
        onSend={sendMessage}
        disabled={isLoading}
        rateLimits={rateLimits}
        error={error}
      />
    </div>
  );
}
