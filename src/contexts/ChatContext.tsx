"use client";
import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "./AuthContext";
import {
  subscribeToChatMessages,
  sendChatMessage,
  clearChatHistory,
  type ChatMessage,
  type ChatResponse,
} from "@/lib/chat";

interface RateLimits {
  hourlyRemaining: number;
  dailyRemaining: number;
}

interface ChatContextType {
  messages: ChatMessage[];
  loaded: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  sendMessage: (text: string) => Promise<void>;
  isLoading: boolean;
  rateLimits: RateLimits | null;
  error: string | null;
  clearError: () => void;
  clearHistory: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType>({
  messages: [],
  loaded: false,
  isOpen: false,
  setIsOpen: () => {},
  sendMessage: async () => {},
  isLoading: false,
  rateLimits: null,
  error: null,
  clearError: () => {},
  clearHistory: async () => {},
});

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user, isGuest } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rateLimits, setRateLimits] = useState<RateLimits | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);

  // Keep ref in sync for use in sendMessage closure
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Subscribe to chat messages
  useEffect(() => {
    if (!user || isGuest) {
      setMessages([]);
      setLoaded(false);
      return;
    }

    const unsub = subscribeToChatMessages(user.uid, (msgs) => {
      setMessages(msgs);
      setLoaded(true);
    });

    return unsub;
  }, [user, isGuest]);

  const sendMessage = useCallback(async (text: string) => {
    if (!user || isGuest || isLoading) return;

    setError(null);
    setIsLoading(true);

    // Build history from current messages (last 20 for context)
    const history = messagesRef.current.slice(-20).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const idToken = await user.getIdToken();
      const result: ChatResponse = await sendChatMessage(idToken, text, history);

      setRateLimits(result.rateLimits);
    } catch (err: any) {
      if (err.status === 429) {
        const minutes = err.retryAfter ? Math.ceil(err.retryAfter / 60) : 1;
        const limitType = err.type === "daily" ? "daily" : "hourly";
        setError(`Rate limit reached (${limitType}). Try again in ${minutes} minute${minutes > 1 ? "s" : ""}.`);
        if (err.rateLimits) setRateLimits(err.rateLimits);
      } else if (err.status === 502) {
        setError("AI is temporarily unavailable. Try again in a moment.");
      } else {
        setError(err.message || "Failed to send message.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, isGuest, isLoading]);

  const clearError = useCallback(() => setError(null), []);

  const clearHistoryFn = useCallback(async () => {
    if (!user || isGuest) return;
    try {
      await clearChatHistory(user.uid);
      setMessages([]);
    } catch {
      setError("Failed to clear chat history.");
    }
  }, [user, isGuest]);

  const value = useMemo(() => ({
    messages,
    loaded,
    isOpen,
    setIsOpen,
    sendMessage,
    isLoading,
    rateLimits,
    error,
    clearError,
    clearHistory: clearHistoryFn,
  }), [messages, loaded, isOpen, sendMessage, isLoading, rateLimits, error, clearError, clearHistoryFn]);

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => useContext(ChatContext);
