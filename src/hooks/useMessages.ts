"use client";
import { useState, useEffect } from "react";
import { subscribeToMessages } from "@/lib/messages";
import type { Message } from "@/types";

export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setLoaded(false);
      return;
    }

    const unsubscribe = subscribeToMessages(conversationId, (data) => {
      setMessages(data);
      setLoaded(true);
    });

    return unsubscribe;
  }, [conversationId]);

  return { messages, loaded };
}
