import {
  collection,
  doc,
  setDoc,
  addDoc,
  getDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Conversation, Message, UserProfile } from "@/types";

/** Generate deterministic conversation ID from two UIDs */
export function getConversationId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join("_");
}

/** Check if a conversation document exists (returns false on permission error for non-existent docs) */
export async function conversationExists(conversationId: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, "conversations", conversationId));
    return snap.exists();
  } catch {
    // Firestore denies reads on non-existent docs when rules reference resource.data
    return false;
  }
}

/** Get or create a conversation between two users */
export async function getOrCreateConversation(
  currentUser: UserProfile,
  otherUser: UserProfile
): Promise<string> {
  const convId = getConversationId(currentUser.uid, otherUser.uid);
  const convRef = doc(db, "conversations", convId);

  // Check if conversation already exists (getDoc throws for non-existent docs due to rules)
  let exists = false;
  try {
    const snap = await getDoc(convRef);
    exists = snap.exists();
  } catch {
    // Permission denied = doc doesn't exist (rules can't evaluate resource.data on missing docs)
  }

  if (!exists) {
    const now = new Date().toISOString();
    await setDoc(convRef, {
      participants: [currentUser.uid, otherUser.uid].sort(),
      participantInfo: {
        [currentUser.uid]: {
          displayName: currentUser.displayName,
          photoUrl: currentUser.photoUrl || "",
          username: currentUser.username,
        },
        [otherUser.uid]: {
          displayName: otherUser.displayName,
          photoUrl: otherUser.photoUrl || "",
          username: otherUser.username,
        },
      },
      lastMessage: "",
      lastMessageAt: now,
      createdAt: now,
    });
  }

  return convId;
}

/** Send a message in a conversation */
export async function sendMessage(
  conversationId: string,
  senderUid: string,
  senderName: string,
  senderPhoto: string | undefined,
  text: string,
  isAdmin: boolean
): Promise<void> {
  const now = new Date().toISOString();
  const messagesRef = collection(db, "conversations", conversationId, "messages");

  const msgData: Record<string, unknown> = {
    senderUid,
    senderName,
    senderPhoto: senderPhoto || "",
    text,
    createdAt: now,
    isAdmin,
  };

  await addDoc(messagesRef, msgData);

  // Update conversation preview
  const convRef = doc(db, "conversations", conversationId);
  await updateDoc(convRef, {
    lastMessage: text.slice(0, 100),
    lastMessageAt: now,
  });
}

/** Create a notification for a message recipient */
export async function sendMessageNotification(
  recipientUid: string,
  conversationId: string,
  senderUid: string,
  senderName: string,
  senderPhoto: string | undefined,
  messagePreview: string
): Promise<void> {
  const notifRef = collection(db, "users", recipientUid, "notifications");
  const data: Record<string, unknown> = {
    type: "message",
    conversationId,
    senderUid,
    senderName,
    senderPhoto: senderPhoto || "",
    messagePreview: messagePreview.slice(0, 100),
    createdAt: new Date().toISOString(),
    read: false,
  };
  await addDoc(notifRef, data);
}

/** Subscribe to a user's conversations (real-time) */
export function subscribeToConversations(
  userId: string,
  callback: (conversations: Conversation[]) => void
): Unsubscribe {
  // Use array-contains only (no orderBy) to avoid requiring a composite index.
  // Sort client-side instead.
  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", userId),
    limit(50)
  );

  return onSnapshot(q, (snapshot) => {
    const conversations = snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }) as Conversation)
      .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
    callback(conversations);
  }, (err) => {
    console.error("Failed to load conversations:", err);
    callback([]);
  });
}

/** Subscribe to messages in a conversation (real-time) */
export function subscribeToMessages(
  conversationId: string,
  callback: (messages: Message[]) => void,
  maxMessages = 100
): Unsubscribe {
  const q = query(
    collection(db, "conversations", conversationId, "messages"),
    orderBy("createdAt", "asc"),
    limit(maxMessages)
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Message[];
    callback(messages);
  }, (err) => {
    console.error("Failed to load messages:", err);
    callback([]);
  });
}
