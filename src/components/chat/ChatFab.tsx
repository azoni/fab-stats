"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useChat } from "@/contexts/ChatContext";
import { ChatPanel } from "./ChatPanel";
import { usePathname } from "next/navigation";

export function ChatFab() {
  const { user, isGuest } = useAuth();
  const { isOpen, setIsOpen, messages } = useChat();
  const pathname = usePathname();

  // Don't show for guests/logged-out users or on the full chat page
  if (!user || isGuest || pathname === "/chat") return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed right-4 bottom-6 z-40 hidden md:flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 ${
          isOpen
            ? "bg-fab-surface border border-fab-border text-fab-muted"
            : "bg-fab-gold text-fab-bg hover:bg-fab-gold-light"
        }`}
        title={isOpen ? "Close chat" : "Chat with AI"}
      >
        {isOpen ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
          </svg>
        )}
      </button>
      <ChatPanel />
    </>
  );
}
