import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  limit as fbLimit,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";

// ── Types ──

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;
}

export interface ChatStats {
  totalMessages: number;
  totalResponses: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  lastMessageAt: string;
  hourlyCount: number;
  dailyCount: number;
}

export interface ChatResponse {
  response: string;
  messageId: string;
  usage: { inputTokens: number; outputTokens: number; cost: number };
  rateLimits: { hourlyRemaining: number; dailyRemaining: number };
}

export interface ChatErrorResponse {
  error: string;
  retryAfter?: number;
  type?: "hourly" | "daily";
  rateLimits?: { hourlyRemaining: number; dailyRemaining: number };
}

// ── Firestore Operations ──

/** Subscribe to chat messages in real-time */
export function subscribeToChatMessages(
  userId: string,
  callback: (messages: ChatMessage[]) => void,
  messageLimit: number = 100,
): Unsubscribe {
  const q = query(
    collection(db, "users", userId, "chatMessages"),
    orderBy("createdAt", "asc"),
    fbLimit(messageLimit),
  );

  return onSnapshot(q, (snap) => {
    const messages = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as ChatMessage[];
    callback(messages);
  });
}

/** Get chat stats for a user (one-time read) */
export async function getChatStats(userId: string): Promise<ChatStats | null> {
  const snap = await getDoc(doc(db, "users", userId, "chatStats", "main"));
  return snap.exists() ? (snap.data() as ChatStats) : null;
}

/** Send a message to the AI chat function */
export async function sendChatMessage(
  idToken: string,
  message: string,
  history: { role: string; content: string }[],
): Promise<ChatResponse> {
  const res = await fetch("/.netlify/functions/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ message, history }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw Object.assign(new Error(data.error || "Chat request failed"), {
      status: res.status,
      retryAfter: data.retryAfter,
      type: data.type,
      rateLimits: data.rateLimits,
    });
  }

  return data as ChatResponse;
}

/** Clear all chat messages for a user */
export async function clearChatHistory(userId: string): Promise<void> {
  const snap = await getDocs(collection(db, "users", userId, "chatMessages"));
  if (snap.empty) return;

  const batch = writeBatch(db);
  for (const d of snap.docs) {
    batch.delete(d.ref);
  }
  await batch.commit();
}
