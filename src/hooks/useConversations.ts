"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeToConversations } from "@/lib/messages";
import type { Conversation } from "@/types";

export function useConversations() {
  const { user, isGuest } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (isGuest || !user) {
      setConversations([]);
      setLoaded(false);
      return;
    }

    const unsubscribe = subscribeToConversations(user.uid, (data) => {
      setConversations(data);
      setLoaded(true);
    });

    return unsubscribe;
  }, [user, isGuest]);

  return { conversations, loaded };
}
